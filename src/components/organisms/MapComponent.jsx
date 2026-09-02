import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { localitiesMap } from '../../data/bikeSegments';
import { caiPoints } from '../../data/caiPoints';
import { robberyReports } from '../../data/robberyReports';
import { accidentPoints } from '../../data/accidentPoints';
import { calculateRisk, evaluateCoordinateRisk } from '../../utils/riskCalculator';

// Helper to check if a point is inside a polygon (Ray-Casting Algorithm)
function isPointInPolygon(point, polygonCoords) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
        const xi = polygonCoords[i][0], yi = polygonCoords[i][1];
        const xj = polygonCoords[j][0], yj = polygonCoords[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

// Helper: check if a [lat, lng] point is within thresholdMeters of any segment in routeCoords
function isNearRoute(lat, lng, routeCoords, thresholdMeters = 200) {
    if (!routeCoords || routeCoords.length === 0) return false;
    const thresholdDeg = thresholdMeters / 111000;
    const thresholdSq = thresholdDeg * thresholdDeg;
    for (const pt of routeCoords) {
        const dLat = pt[0] - lat;
        const dLng = pt[1] - lng;
        if ((dLat * dLat + dLng * dLng) <= thresholdSq) return true;
    }
    return false;
}

// Helper: determine if a marker should be rendered based on active route OR map zoom level
function shouldShowMarker(lat, lng, routeCoords, currentZoom, minZoomWithoutRoute = 14, thresholdMeters = 200) {
    if (routeCoords && routeCoords.length > 0) {
        return isNearRoute(lat, lng, routeCoords, thresholdMeters);
    }
    return currentZoom >= minZoomWithoutRoute;
}

// Get HEX color for a risk level
function getRiskColor(level) {
    if (level === 'Alto') return '#ef4444';
    if (level === 'Medio') return '#f59e0b';
    return '#10b981';
}

// Get local key for a LocNombre from GeoJSON
function getLocalityKey(locNombre) {
    if (!locNombre) return null;
    // Normalize to uppercase and strip out Spanish accents/diacritics for robust matching
    const name = locNombre.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (name.includes('USAQUEN')) return 'usaquen';
    if (name.includes('CHAPINERO')) return 'chapinero';
    if (name.includes('SANTA FE') || name.includes('SANTAFE')) return 'santafe';
    if (name.includes('SAN CRISTOBAL')) return 'sancristobal';
    if (name.includes('USME')) return 'usme';
    if (name.includes('TUNJUELITO')) return 'tunjuelito';
    if (name.includes('BOSA')) return 'bosa';
    if (name.includes('KENNEDY')) return 'kennedy';
    if (name.includes('FONTIBON')) return 'fontibon';
    if (name.includes('ENGATIVA')) return 'engativa';
    if (name.includes('SUBA')) return 'suba';
    if (name.includes('BARRIOS UNIDOS')) return 'barriosunidos';
    if (name.includes('TEUSAQUILLO')) return 'teusaquillo';
    if (name.includes('MARTIRES')) return 'losmartires';
    if (name.includes('ANTONIO NARI')) return 'antonionarino';
    if (name.includes('PUENTE ARANDA')) return 'puentearanda';
    if (name.includes('CANDELARIA')) return 'lacandelaria';
    if (name.includes('RAFAEL URIBE')) return 'ruu';
    if (name.includes('CIUDAD BOLIVAR')) return 'ciudadbolivar';
    if (name.includes('SUMAPAZ')) return 'sumapaz';
    return null;
}

export default function MapComponent({
    mapStyle = 'light',
    navigationMode = 'simulated',
    localidad,
    onLocalidadChange,
    selectedSegmentId,
    onSelectSegment,
    onMapAuditClick,
    routePoints,
    selectingLocationMode,
    onLocationSelect,
    generatedRoutes = [],
    activeRouteId,
    onSelectRoute,
    simulationState,
    bikeSegments,
    constructionZones = [],
    showConstruction = true,
    mapLayers = { localities: true, cais: true, construction: true, accidents: true, robberies: true, trafficJams: true, citizenReports: true, trafficLights: true },
    trafficJams = [],
    citizenReports = [],
    onUpvoteReport,
    zoomToCoords,
    trafficLights = [],
    isNavigating = false,
    cyclistCoords = null,
    cyclistIndex = 0,
    activeRoute = null,
    leftDrawerOpen = true,
    rightDrawerOpen = true,
    isMobile = false
}) {
    // Derive the active route's coordinates for proximity filtering
    const activeRouteCoords = activeRoute ? activeRoute.coordinates : null;
    const mapContainerRef = useRef(null);
    const wazeViewportRef = useRef(null);
    const mapRef = useRef(null);
    const localidadesLayerRef = useRef(null);
    const activePolygonsRef = useRef({});
    const segmentLayersRef = useRef({});
    const routeLayersRef = useRef([]);
    const routeMarkersRef = useRef({});
    const customAuditMarkerRef = useRef(null);
    const constructionLayersRef = useRef([]);
    const caiLayersRef = useRef([]);
    const robberyLayersRef = useRef([]);
    const accidentLayersRef = useRef([]);
    const trafficJamLayersRef = useRef([]);
    const citizenReportLayersRef = useRef([]);
    const trafficLightLayersRef = useRef([]);
    const cyclistMarkerRef = useRef(null);
    const tileLayerRef = useRef(null);

    // Keep refs of callbacks to avoid re-triggering effects
    const callbacksRef = useRef({});
    callbacksRef.current = {
        onSelectSegment,
        onMapAuditClick,
        onLocationSelect,
        onSelectRoute,
        onLocalidadChange,
        onUpvoteReport
    };

    // Keep ref of selecting location mode
    const selectingModeRef = useRef(selectingLocationMode);
    selectingModeRef.current = selectingLocationMode;

    const localidadRef = useRef(localidad);
    localidadRef.current = localidad;

    const simulationStateRef = useRef(simulationState);
    simulationStateRef.current = simulationState;

    const bikeSegmentsRef = useRef(bikeSegments);
    bikeSegmentsRef.current = bikeSegments;

    const activeRouteCoordsRef = useRef(activeRouteCoords);
    activeRouteCoordsRef.current = activeRouteCoords;

    // Track map zoom level to control marker density
    const [currentZoom, setCurrentZoom] = useState(13);

    // 1. Initial Mount: Initialize Leaflet Map and Fetch GeoJSON Boundaries
    useEffect(() => {
        if (!mapContainerRef.current) return;

        let active = true;

        // Center initially in Usme
        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: true
        }).setView([4.506, -74.115], 13);

        // Add custom zoom control in the bottom-right corner
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapRef.current = map;

        // Update zoom state on zoom changes
        map.on('zoomend', () => {
            setCurrentZoom(map.getZoom());
        });

        // Initial Tile Layer based on mapStyle
        let initialUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        let initialAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        
        if (mapStyle === 'terrain') {
            initialUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
            initialAttr = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)';
        }

        const initialTiles = L.tileLayer(
            initialUrl,
            {
                attribution: initialAttr,
                subdomains: mapStyle === 'terrain' ? 'abc' : 'abc',
                maxZoom: mapStyle === 'terrain' ? 17 : 19,
                className: mapStyle === 'dark' ? 'dark-tiles' : ''
            }
        ).addTo(map);

        tileLayerRef.current = initialTiles;

        // Fetch official Bogotá Localities GeoJSON
        fetch(`${import.meta.env.BASE_URL}localidades.json`)
            .then(res => res.json())
            .then(data => {
                if (!active || !mapRef.current) return;

                const geoJsonLayer = L.geoJSON(data, {
                    style: (feature) => {
                        const locNameRaw = feature.properties.LocNombre;
                        const key = getLocalityKey(locNameRaw);
                        const config = localitiesMap[key];
                        
                        if (config) {
                            const isActive = localidadRef.current === key;
                            const isShown = mapLayers.localities;
                            return {
                                color: isShown ? config.color : 'rgba(0,0,0,0)',
                                weight: isShown ? (isActive ? 4.5 : 2.2) : 0,
                                opacity: isShown ? (isActive ? 1.0 : 0.65) : 0,
                                fillColor: isShown ? config.color : 'rgba(0,0,0,0)',
                                fillOpacity: isShown ? (isActive ? 0.12 : 0.035) : 0
                            };
                        } else {
                            return {
                                color: 'rgba(255, 255, 255, 0.0)',
                                weight: 0,
                                fillColor: 'rgba(255, 255, 255, 0.0)',
                                fillOpacity: 0.0
                            };
                        }
                    },
                    onEachFeature: (feature, layer) => {
                        const locNameRaw = feature.properties.LocNombre;
                        // Clean encoding discrepancies
                        let locName = locNameRaw;
                        if (locNameRaw.includes('NARI')) locName = 'Antonio Nariño';
                        else if (locNameRaw.includes('ENGATIVA')) locName = 'Engativá';
                        else if (locNameRaw.includes('SAN CRISTOBAL')) locName = 'San Cristóbal';
                        else if (locNameRaw.includes('USAQUEN')) locName = 'Usaquén';
                        else if (locNameRaw.includes('MARTIRES')) locName = 'Los Mártires';
                        else if (locNameRaw.includes('FONTI')) locName = 'Fontibón';
                        else if (locNameRaw.includes('CIUDAD BOLIVAR')) locName = 'Ciudad Bolívar';
                        else if (locNameRaw.includes('FONTIBON')) locName = 'Fontibón';
                        else {
                            locName = locNameRaw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
                        }

                        // Store references to the polygons
                        const key = getLocalityKey(locNameRaw);
                        if (key) {
                            activePolygonsRef.current[key] = layer;
                        }

                        // Bind hover tooltip
                        layer.bindTooltip(`<div class="locality-map-tooltip"><b>Localidad de ${locName}</b></div>`, {
                            sticky: true,
                            className: 'custom-tooltip'
                        });

                        // Interactive features
                        layer.on({
                            mouseover: (e) => {
                                const l = e.target;
                                const k = getLocalityKey(locNameRaw);
                                const config = localitiesMap[k];
                                if (config) {
                                    const isActive = localidadRef.current === k;
                                    l.setStyle({
                                        color: config.color,
                                        weight: isActive ? 5 : 3,
                                        opacity: 1.0,
                                        fillOpacity: isActive ? 0.2 : 0.08
                                    });
                                }
                            },
                            mouseout: (e) => {
                                const l = e.target;
                                const k = getLocalityKey(locNameRaw);
                                const config = localitiesMap[k];
                                if (config) {
                                    const isActive = localidadRef.current === k;
                                    l.setStyle({
                                        color: config.color,
                                        weight: isActive ? 4.5 : 2.2,
                                        opacity: isActive ? 1.0 : 0.65,
                                        fillOpacity: isActive ? 0.12 : 0.035
                                    });
                                }
                            },
                            click: (e) => {
                                if (selectingModeRef.current) {
                                    L.DomEvent.stopPropagation(e);
                                    callbacksRef.current.onLocationSelect(e.latlng, selectingModeRef.current);
                                    return;
                                }

                                const k = getLocalityKey(locNameRaw);
                                if (k && localitiesMap[k]) {
                                    callbacksRef.current.onLocalidadChange(k);
                                }
                            }
                        });
                    }
                }).addTo(map);

                localidadesLayerRef.current = geoJsonLayer;
            })
            .catch(err => console.error("Error loading localidades GeoJSON:", err));

        // Draw initial segments
        Object.keys(bikeSegmentsRef.current).forEach(id => {
            const segment = bikeSegmentsRef.current[id];
            const polyline = L.polyline(segment.coordinates, {
                color: '#6366f1',
                weight: 0,
                opacity: 0,
                lineJoin: 'round',
                interactive: false
            }).addTo(map);

            segmentLayersRef.current[id] = polyline;
        });

        // Listen for Map Clicks
        map.on('click', (e) => {
            if (selectingModeRef.current) {
                callbacksRef.current.onLocationSelect(e.latlng, selectingModeRef.current);
                return;
            }

            const clickedPoint = [e.latlng.lat, e.latlng.lng];
            let insideActive = false;
            
            const activeLoc = localidadRef.current;
            const activeLayer = activePolygonsRef.current[activeLoc];
            
            if (activeLayer) {
                let latlngs = activeLayer.getLatLngs();
                let coords = [];
                if (Array.isArray(latlngs[0])) {
                    if (Array.isArray(latlngs[0][0])) {
                        coords = latlngs[0][0].map(ll => [ll.lat, ll.lng]);
                    } else {
                        coords = latlngs[0].map(ll => [ll.lat, ll.lng]);
                    }
                } else {
                    coords = latlngs.map(ll => [ll.lat, ll.lng]);
                }
                insideActive = isPointInPolygon(clickedPoint, coords);
            }
            
            if (insideActive) {
                callbacksRef.current.onMapAuditClick(e.latlng);
            }
        });

        return () => {
            active = false;
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // 1b. Dynamically toggle Map tile layers on mapStyle state changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !tileLayerRef.current) return;

        // Remove old tile layer
        map.removeLayer(tileLayerRef.current);

        // Add new tile layer based on mapStyle
        let newUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        let attr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        
        if (mapStyle === 'terrain') {
            newUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
            attr = 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)';
        }

        const newTiles = L.tileLayer(
            newUrl,
            {
                attribution: attr,
                subdomains: mapStyle === 'terrain' ? 'abc' : 'abc',
                maxZoom: mapStyle === 'terrain' ? 17 : 19,
                className: mapStyle === 'dark' ? 'dark-tiles' : ''
            }
        ).addTo(map);

        tileLayerRef.current = newTiles;
    }, [mapStyle]);

    // 2. Adjust cursor based on selecting location mode
    useEffect(() => {
        const container = mapContainerRef.current;
        if (container) {
            if (selectingLocationMode) {
                container.style.cursor = 'crosshair';
            } else {
                container.style.cursor = '';
            }
        }
    }, [selectingLocationMode]);

    // 3. Pan and update styles when Localidad changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Update GeoJSON styles dynamically
        if (localidadesLayerRef.current) {
            localidadesLayerRef.current.setStyle((feature) => {
                const locNameRaw = feature.properties.LocNombre;
                const key = getLocalityKey(locNameRaw);
                const config = localitiesMap[key];

                if (config) {
                    const isActive = localidad === key;
                    const isShown = mapLayers.localities;
                    return {
                        color: isShown ? config.color : 'rgba(0,0,0,0)',
                        weight: isShown ? (isActive ? 4.5 : 2.2) : 0,
                        opacity: isShown ? (isActive ? 1.0 : 0.65) : 0,
                        fillColor: isShown ? config.color : 'rgba(0,0,0,0)',
                        fillOpacity: isShown ? (isActive ? 0.12 : 0.035) : 0
                    };
                } else {
                    return {
                        color: 'rgba(255, 255, 255, 0.0)',
                        weight: 0,
                        fillColor: 'rgba(255, 255, 255, 0.0)',
                        fillOpacity: 0.0
                    };
                }
            });
        }

        const activeLocConfig = localitiesMap[localidad];
        if (activeLocConfig) {
            map.flyTo(activeLocConfig.center, activeLocConfig.zoom, { duration: 1.5 });
        }
    }, [localidad, mapLayers.localities]);

    // 4. Update route markers (Origin/Destination Pins)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing markers
        ['origin', 'destination'].forEach(mode => {
            if (routeMarkersRef.current[mode]) {
                map.removeLayer(routeMarkersRef.current[mode]);
                routeMarkersRef.current[mode] = null;
            }
        });

        // Add new markers if coordinates are set
        ['origin', 'destination'].forEach(mode => {
            const pt = routePoints[mode];
            if (pt) {
                const iconColor = mode === 'origin' ? '#10b981' : '#ef4444';
                const label = mode === 'origin' ? 'Origen' : 'Destino';
                
                const marker = L.marker([pt.lat, pt.lng], {
                    icon: L.divIcon({
                        className: 'route-point-marker',
                        html: `<i class="fa-solid fa-location-dot" style="font-size: 24px; color: ${iconColor}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 24]
                    })
                }).addTo(map);

                marker.bindTooltip(`<strong>${label}</strong><br>Lat: ${pt.lat.toFixed(4)}, Lng: ${pt.lng.toFixed(4)}`, {
                    className: 'custom-tooltip'
                });

                routeMarkersRef.current[mode] = marker;
            }
        });
    }, [routePoints]);

    // 5. Update custom audit marker
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing
        if (customAuditMarkerRef.current) {
            map.removeLayer(customAuditMarkerRef.current);
            customAuditMarkerRef.current = null;
        }

        // Add if custom segment exists and is active
        if (selectedSegmentId === 'custom_audit' && bikeSegments.custom_audit) {
            const seg = bikeSegments.custom_audit;
            const latlng = seg.coordinates[0];

            const marker = L.marker([latlng[0], latlng[1]], {
                icon: L.divIcon({
                    className: 'custom-audit-pin',
                    html: '<i class="fa-solid fa-location-crosshairs text-accent" style="font-size: 22px; filter: drop-shadow(0 0 5px rgba(99,102,241,0.8));"></i>',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11]
                })
            }).addTo(map);

            marker.bindTooltip(`<strong>Punto de Auditoría</strong><br>Lat: ${latlng[0].toFixed(4)} Lng: ${latlng[1].toFixed(4)}`, {
                sticky: true,
                className: 'custom-tooltip'
            });

            customAuditMarkerRef.current = marker;
        }
    }, [selectedSegmentId, bikeSegments.custom_audit]);

    // 5b. Update active construction zones overlays on the map
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing construction layers
        constructionLayersRef.current.forEach(layer => {
            map.removeLayer(layer);
        });
        constructionLayersRef.current = [];

        if (!showConstruction || !mapLayers.construction) return;

        constructionZones.forEach(zone => {
            if (!shouldShowMarker(zone.lat, zone.lng, activeRouteCoordsRef.current, currentZoom, 13, 200)) return;
            
            // 1. Circle representing the impact radius
            const circle = L.circle([zone.lat, zone.lng], {
                radius: zone.radius,
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.15,
                weight: 1.5,
                dashArray: '4, 4',
                interactive: true
            });

            // 2. Minimalist micro-marker
            const marker = L.marker([zone.lat, zone.lng], {
                icon: L.divIcon({
                    className: 'construction-marker',
                    html: `
                        <div style="
                            width: 20px;
                            height: 20px;
                            background: #ea580c;
                            border: 1.5px solid #fff;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #fff;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                        ">
                            <i class="fa-solid fa-person-digging" style="font-size: 9px;"></i>
                        </div>
                    `,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            });

            // Bind detailed popup
            const popupContent = `
                <div style="color: #f8fafc; font-family: var(--font-body); font-size: 0.78rem; padding: 0.25rem; min-width: 200px;">
                    <h4 style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: #f97316; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fa-solid fa-triangle-exclamation"></i> Zona de Obra Activa
                    </h4>
                    <p style="margin: 0 0 0.4rem 0; font-weight: 600; color: #f1f5f9;">${zone.name}</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.7rem; color: #94a3b8;"><b>Contratista:</b> ${zone.contratista}</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.72rem; color: #cbd5e1; line-height: 1.35;">${zone.description}</p>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.4rem; margin-top: 0.4rem; font-size: 0.65rem; color: #94a3b8;">
                        <span><b>Fin Estimado:</b> ${zone.endDate}</span>
                        <span style="color: #ef4444; font-weight: 700;">Riesgo: +${zone.riskWeight.toFixed(1)}</span>
                    </div>
                </div>
            `;
            
            circle.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            circle.bindTooltip(`<strong>Obra:</strong> ${zone.name}`, { sticky: true, className: 'custom-tooltip' });

            circle.addTo(map);
            marker.addTo(map);

            constructionLayersRef.current.push(circle);
            constructionLayersRef.current.push(marker);
        });
    }, [constructionZones, showConstruction, mapLayers.construction, activeRoute, currentZoom]);

    // 5c. Update active CAIs overlays on the map
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing CAI layers
        caiLayersRef.current.forEach(layer => {
            map.removeLayer(layer);
        });
        caiLayersRef.current = [];

        if (!mapLayers.cais) return;

        caiPoints.forEach(cai => {
            if (!shouldShowMarker(cai.lat, cai.lng, activeRouteCoordsRef.current, currentZoom, 13, 300)) return;

            const marker = L.marker([cai.lat, cai.lng], {
                icon: L.divIcon({
                    className: 'cai-marker-wrapper',
                    html: `
                        <div class="cai-marker" style="
                            width: 20px;
                            height: 20px;
                            background: #1e3a8a;
                            border: 1.5px solid #60a5fa;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #fff;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                            cursor: pointer;
                        ">
                            <i class="fa-solid fa-shield-halved" style="font-size: 9px;"></i>
                        </div>
                    `,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            });

            const popupContent = `
                <div style="color: #f8fafc; font-family: var(--font-body); font-size: 0.78rem; padding: 0.25rem; min-width: 180px;">
                    <h4 style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: #38bdf8; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fa-solid fa-shield-halved"></i> ${cai.name}
                    </h4>
                    <p style="margin: 0 0 0.4rem 0; font-weight: 600; color: #f1f5f9;">Policía Metropolitana de Bogotá</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.7rem; color: #94a3b8;"><b>Localidad:</b> ${cai.localidad.toUpperCase()}</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.72rem; color: #cbd5e1; line-height: 1.35;"><b>Dirección:</b> ${cai.address}</p>
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.4rem; margin-top: 0.4rem; font-size: 0.65rem; color: #10b981; font-weight: 700; display: flex; align-items: center; gap: 0.25rem;">
                        <span style="display:inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
                        <span>Activo • Vigilancia 24h</span>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            marker.bindTooltip(`<strong>CAI:</strong> ${cai.name}`, { sticky: true, className: 'custom-tooltip' });

            marker.addTo(map);
            caiLayersRef.current.push(marker);
        });
    }, [mapLayers.cais, activeRoute, currentZoom]);

    // 5d. Update active Robbery Reports overlays on the map
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing robbery layers
        robberyLayersRef.current.forEach(layer => {
            map.removeLayer(layer);
        });
        robberyLayersRef.current = [];

        if (!mapLayers.robberies) return;

        robberyReports.forEach(report => {
            if (!shouldShowMarker(report.lat, report.lng, activeRouteCoordsRef.current, currentZoom, 14, 150)) return;

            const marker = L.marker([report.lat, report.lng], {
                icon: L.divIcon({
                    className: 'robbery-marker-wrapper',
                    html: `
                        <div class="robbery-marker" style="
                            width: 18px;
                            height: 18px;
                            background: #dc2626;
                            border: 1.5px solid #fca5a5;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #fff;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                            cursor: pointer;
                        ">
                            <i class="fa-solid fa-mask" style="font-size: 8px;"></i>
                        </div>
                    `,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            });

            const popupContent = `
                <div style="color: #f8fafc; font-family: var(--font-body); font-size: 0.78rem; padding: 0.25rem; min-width: 180px;">
                    <h4 style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: #ef4444; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fa-solid fa-mask"></i> ${report.name}
                    </h4>
                    <p style="margin: 0 0 0.4rem 0; font-weight: 600; color: #f1f5f9;">Reporte de Hurto (Últimas 24h)</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.7rem; color: #94a3b8;"><b>Localidad:</b> ${report.localidad.toUpperCase()} • <b>Hora:</b> ${report.time}</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.72rem; color: #cbd5e1; line-height: 1.35;"><b>Detalle:</b> ${report.description}</p>
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.4rem; margin-top: 0.4rem; font-size: 0.65rem; color: #ef4444; font-weight: 700;">
                        <span>Caso Reportado a Policía Cuadrante</span>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            marker.bindTooltip(`<strong>Hurto:</strong> ${report.name} (${report.time})`, { sticky: true, className: 'custom-tooltip' });

            marker.addTo(map);
            robberyLayersRef.current.push(marker);
        });
    }, [mapLayers.robberies, activeRoute, currentZoom]);

    // 5e. Update active Accident overlays on the map
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing accident layers
        accidentLayersRef.current.forEach(layer => {
            map.removeLayer(layer);
        });
        accidentLayersRef.current = [];

        if (!mapLayers.accidents) return;

        accidentPoints.forEach(acc => {
            if (!shouldShowMarker(acc.lat, acc.lng, activeRouteCoordsRef.current, currentZoom, 14, 150)) return;

            const marker = L.marker([acc.lat, acc.lng], {
                icon: L.divIcon({
                    className: 'accident-marker-wrapper',
                    html: `
                        <div class="accident-marker" style="
                            width: 18px;
                            height: 18px;
                            background: #d97706;
                            border: 1.5px solid #fef3c7;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #fff;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                            cursor: pointer;
                        ">
                            <i class="fa-solid fa-car-burst" style="font-size: 8px;"></i>
                        </div>
                    `,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            });

            const popupContent = `
                <div style="color: #f8fafc; font-family: var(--font-body); font-size: 0.78rem; padding: 0.25rem; min-width: 180px;">
                    <h4 style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: #eab308; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fa-solid fa-car-burst"></i> ${acc.name}
                    </h4>
                    <p style="margin: 0 0 0.4rem 0; font-weight: 600; color: #f1f5f9;">Accidente de Tránsito Reciente</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.7rem; color: #94a3b8;"><b>Localidad:</b> ${acc.localidad.toUpperCase()} • <b>Hora:</b> ${acc.time} • <b>Severidad:</b> ${acc.severity}</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.72rem; color: #cbd5e1; line-height: 1.35;"><b>Detalle:</b> ${acc.description}</p>
                    <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.4rem; margin-top: 0.4rem; font-size: 0.65rem; color: #eab308; font-weight: 700;">
                        <span>Tránsito Bogotá Regulando</span>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            marker.bindTooltip(`<strong>Tránsito:</strong> ${acc.name} (${acc.time})`, { sticky: true, className: 'custom-tooltip' });

            marker.addTo(map);
            accidentLayersRef.current.push(marker);
        });
    }, [mapLayers.accidents, activeRoute, currentZoom]);

    // 6. Draw route polylines dynamically segmented by CPTED risk
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing route layers
        routeLayersRef.current.forEach(layerGroup => {
            map.removeLayer(layerGroup);
        });
        routeLayersRef.current = [];

        // Render generated routes
        generatedRoutes.forEach(route => {
            const isActive = route.id === activeRouteId;
            const group = L.layerGroup();
            
            const routeCoords = route.coordinates;

            // Build a set of indices affected by traffic jams for this route
            const jamAffectedIndices = new Set();
            const jamSeverityMap = {};
            const jamInfoMap = {};
            if (route.trafficJamsOnRoute && route.trafficJamsOnRoute.length > 0) {
                route.trafficJamsOnRoute.forEach(detected => {
                    detected.affectedSegments.forEach(idx => {
                        jamAffectedIndices.add(idx);
                        jamSeverityMap[idx] = detected.severity;
                        jamInfoMap[idx] = detected;
                    });
                });
            }

            for (let i = 0; i < routeCoords.length - 1; i++) {
                const pt1 = routeCoords[i];
                const pt2 = routeCoords[i+1];
                
                const midLat = (pt1[0] + pt2[0]) / 2;
                const midLng = (pt1[1] + pt2[1]) / 2;
                
                const isJamSegment = jamAffectedIndices.has(i) || jamAffectedIndices.has(i + 1);
                
                if (isActive && isJamSegment && mapLayers.trafficJams) {
                    // Draw traffic jam highlighted segment
                    const severity = jamSeverityMap[i] || jamSeverityMap[i + 1] || 'moderado';
                    const jamColor = severity === 'severo' ? '#dc2626' : (severity === 'leve' ? '#eab308' : '#f97316');
                    const info = jamInfoMap[i] || jamInfoMap[i + 1];

                    // Background glow
                    const glowLine = L.polyline([pt1, pt2], {
                        color: jamColor,
                        weight: 16,
                        opacity: 0.25,
                        lineJoin: 'round',
                        interactive: false
                    });
                    group.addLayer(glowLine);

                    // Main dashed line
                    const jamLine = L.polyline([pt1, pt2], {
                        color: jamColor,
                        weight: 10,
                        opacity: 0.95,
                        lineJoin: 'round',
                        dashArray: '12, 8',
                        className: 'traffic-jam-line-animated'
                    });

                    jamLine.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        callbacksRef.current.onSelectRoute(route.id);
                    });

                    const jamTooltip = info
                        ? `<strong>🚗 ${info.jam.name}</strong><br>De: ${info.fromName}<br>A: ${info.toName}<br>Demora: <span style="color:${jamColor};font-weight:700;">+${info.delayMinutes} min</span><br>Severidad: ${severity.charAt(0).toUpperCase() + severity.slice(1)}`
                        : `<strong>Trancón</strong>`;

                    jamLine.bindTooltip(jamTooltip, {
                        sticky: true,
                        className: 'custom-tooltip'
                    });

                    group.addLayer(jamLine);
                } else {
                    // Normal risk-colored segment
                    const risk = evaluateCoordinateRisk(midLat, midLng, bikeSegments, simulationState, constructionZones, showConstruction, citizenReports);
                    const color = getRiskColor(risk.level);
                    
                    const polyline = L.polyline([pt1, pt2], {
                        color: color,
                        weight: isActive ? 8 : 4,
                        opacity: isActive ? 0.95 : 0.25,
                        lineJoin: 'round'
                    });
                    
                    polyline.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        callbacksRef.current.onSelectRoute(route.id);
                    });
                    
                    polyline.bindTooltip(`<strong>${route.name}</strong><br>Distancia: ${route.distanceKm} km<br>Riesgo Promedio: ${route.avgRiskScore}`, {
                        sticky: true,
                        className: 'custom-tooltip'
                    });

                    group.addLayer(polyline);
                }
            }
            
            group.addTo(map);
            routeLayersRef.current.push(group);
        });
    }, [generatedRoutes, activeRouteId, simulationState, bikeSegments, mapLayers.trafficJams, citizenReports]);

    // 6a. Intelligent Auto-fit active route inside the visible viewport (accounting for sidebars)
    useEffect(() => {
        const map = mapRef.current;
        if (!map || isNavigating) return;

        if (activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0) {
            const bounds = L.latLngBounds(activeRoute.coordinates);
            if (bounds.isValid()) {
                // Dynamically offset bounds so no part of the route is hidden behind left/right panels
                const leftPadding = isMobile ? 25 : (leftDrawerOpen ? 460 : 60);
                const rightPadding = isMobile ? 25 : (rightDrawerOpen ? 370 : 60);
                const topPadding = isMobile ? 90 : 60;
                const bottomPadding = isMobile ? 220 : 60;

                map.fitBounds(bounds, {
                    paddingTopLeft: [leftPadding, topPadding],
                    paddingBottomRight: [rightPadding, bottomPadding],
                    maxZoom: 15,
                    animate: true,
                    duration: 0.8
                });
            }
        }
    }, [activeRouteId, leftDrawerOpen, rightDrawerOpen, isMobile, isNavigating]);

    // 6b. Draw global traffic jam overlay polylines and markers
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing traffic jam layers
        trafficJamLayersRef.current.forEach(layer => {
            map.removeLayer(layer);
        });
        trafficJamLayersRef.current = [];

        if (!mapLayers.trafficJams) return;

        trafficJams.forEach(jam => {
            const midIdx = Math.floor(jam.coordinates.length / 2);
            const midPt = jam.coordinates[midIdx];
            
            if (!shouldShowMarker(midPt[0], midPt[1], activeRouteCoordsRef.current, currentZoom, 13, 300)) return;

            const jamColor = jam.severity === 'severo' ? '#dc2626' : (jam.severity === 'leve' ? '#eab308' : '#f97316');
            const jamBorder = jam.severity === 'severo' ? '#fca5a5' : (jam.severity === 'leve' ? '#fde047' : '#fdba74');

            // Polyline for the jam corridor
            const polyline = L.polyline(jam.coordinates, {
                color: jamColor,
                weight: 4,
                opacity: 0.65,
                dashArray: '6, 6',
                lineJoin: 'round'
            });

            // Marker at the midpoint
            const marker = L.marker(midPt, {
                icon: L.divIcon({
                    className: 'traffic-jam-marker-wrapper',
                    html: `
                        <div style="
                            width: 18px;
                            height: 18px;
                            background: ${jamColor};
                            border: 1.5px solid ${jamBorder};
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #fff;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                            cursor: pointer;
                        ">
                            <i class="fa-solid fa-car" style="font-size: 8px;"></i>
                        </div>
                    `,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            });

            const severityLabel = jam.severity.charAt(0).toUpperCase() + jam.severity.slice(1);
            const popupContent = `
                <div style="color: #f8fafc; font-family: var(--font-body); font-size: 0.78rem; padding: 0.25rem; min-width: 200px;">
                    <h4 style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: ${jamColor}; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fa-solid fa-car"></i> ${jam.name}
                    </h4>
                    <p style="margin: 0 0 0.3rem 0; font-weight: 600; color: #f1f5f9;">Congestión Vehicular</p>
                    <p style="margin: 0 0 0.3rem 0; font-size: 0.72rem; color: #94a3b8;"><b>De:</b> ${jam.fromName}</p>
                    <p style="margin: 0 0 0.3rem 0; font-size: 0.72rem; color: #94a3b8;"><b>A:</b> ${jam.toName}</p>
                    <p style="margin: 0 0 0.3rem 0; font-size: 0.72rem; color: #94a3b8;"><b>Severidad:</b> ${severityLabel} • <b>Fuente:</b> ${jam.source}</p>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 0.4rem; margin-top: 0.4rem; font-size: 0.72rem;">
                        <span style="color: #94a3b8;"><b>Reportado:</b> ${jam.reportedTime}</span>
                        <span style="color: ${jamColor}; font-weight: 700;">+${jam.delayMinutes} min</span>
                    </div>
                </div>
            `;

            polyline.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            polyline.bindTooltip(`<strong>Trancón:</strong> ${jam.name} (+${jam.delayMinutes} min)`, { sticky: true, className: 'custom-tooltip' });

            polyline.addTo(map);
            marker.addTo(map);

            trafficJamLayersRef.current.push(polyline);
            trafficJamLayersRef.current.push(marker);
        });
    }, [trafficJams, mapLayers.trafficJams, activeRoute, currentZoom]);

    // 6c. Draw citizen science reports on the map
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing citizen report layers
        citizenReportLayersRef.current.forEach(layer => {
            map.removeLayer(layer);
        });
        citizenReportLayersRef.current = [];

        const isShown = mapLayers.citizenReports !== false;
        if (!isShown) return;

        citizenReports.forEach(report => {
            const coords = report.properties.coordenadas; // [lat, lng]
            if (!coords) return;

            if (!shouldShowMarker(coords[0], coords[1], activeRouteCoordsRef.current, currentZoom, 14, 150)) return;

            const tipo = report.properties.tipo_novedad;
            const votos = report.properties.numero_votos;
            const fecha = report.properties.fecha_creacion;
            const estado = report.properties.estado;

            // Determine color and icon
            let color = '#f59e0b'; // Amber
            let icon = 'fa-triangle-exclamation';

            if (tipo.includes('Luminaria') || tipo.includes('lobo')) {
                color = '#f59e0b';
                icon = 'fa-lightbulb';
            } else if (tipo.includes('Hueco') || tipo.includes('destructiva')) {
                color = '#f59e0b';
                icon = 'fa-triangle-exclamation';
            } else if (tipo.includes('Inseguridad') || tipo.includes('Atraco')) {
                color = '#dc2626';
                icon = 'fa-hand';
            }

            const marker = L.marker([coords[0], coords[1]], {
                icon: L.divIcon({
                    className: 'citizen-report-marker-wrapper',
                    html: `
                        <div class="citizen-report-marker" style="
                            width: 18px;
                            height: 18px;
                            background: ${color};
                            border: 1.5px solid rgba(255,255,255,0.9);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #fff;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                            cursor: pointer;
                        ">
                            <i class="fa-solid ${icon}" style="font-size: 8px;"></i>
                        </div>
                    `,
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            });

            // Create flat popup element
            const div = document.createElement('div');
            div.style.minWidth = '180px';
            div.innerHTML = `
                <div style="font-family: var(--font-body); font-size: 0.78rem;">
                    <h4 style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: ${color}; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fa-solid ${icon}"></i> ${tipo.split('/')[0].trim()}
                    </h4>
                    <p style="margin: 0 0 0.3rem 0; color: var(--text-secondary);"><b>Votos:</b> <span class="vote-count" style="font-weight: 700; color: #f59e0b;">${votos}</span></p>
                    <p style="margin: 0 0 0.3rem 0; color: var(--text-secondary); font-size: 0.72rem;"><b>Reportado:</b> ${fecha}</p>
                    <p style="margin: 0 0 0.4rem 0; color: var(--text-secondary); font-size: 0.72rem;"><b>Estado:</b> <span style="text-transform: capitalize; color: #10b981; font-weight: 600;">${estado}</span></p>
                    <button class="btn-flat btn-flat-primary respaldar-btn" style="width: 100%; font-size: 0.72rem; padding: 0.35rem; border-radius: 6px;">
                        <i class="fa-solid fa-circle-arrow-up"></i> Respaldar Reporte
                    </button>
                </div>
            `;

            const btn = div.querySelector('.respaldar-btn');
            btn.addEventListener('click', () => {
                const countSpan = div.querySelector('.vote-count');
                if (countSpan) {
                    countSpan.textContent = parseInt(countSpan.textContent) + 1;
                }
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Respaldado';
                callbacksRef.current.onUpvoteReport(report.properties.id);
            });

            marker.bindPopup(div, { className: 'custom-leaflet-popup-citizen' });
            marker.bindTooltip(`<strong>Reporte:</strong> ${tipo.split('/')[0]} (Votos: ${votos})`, { sticky: true, className: 'custom-tooltip' });

            marker.addTo(map);
            citizenReportLayersRef.current.push(marker);
        });
    }, [citizenReports, mapLayers.citizenReports, activeRoute, currentZoom]);

    // 7. Update segment polyline colors and interaction (For audit mode)
    useEffect(() => {
        // Clear all segment visibilities first
        Object.keys(segmentLayersRef.current).forEach(id => {
            const layer = segmentLayersRef.current[id];
            if (layer) {
                layer.setStyle({ weight: 0, opacity: 0 });
                layer.options.interactive = false;
            }
        });

        // If a segment is selected and it is not a custom audit point
        if (selectedSegmentId && selectedSegmentId !== 'custom_audit' && segmentLayersRef.current[selectedSegmentId]) {
            const segment = bikeSegments[selectedSegmentId];
            if (!segment) return;

            // Recalculate segment risk using our helper
            const segmentWithState = { ...segment, ...simulationState };
            const prediction = calculateRisk(segmentWithState, constructionZones, showConstruction, citizenReports, bikeSegments);

            const color = getRiskColor(prediction.level);
            const layer = segmentLayersRef.current[selectedSegmentId];
            
            layer.setStyle({
                weight: 9,
                opacity: 0.9,
                color: color
            });
            layer.options.interactive = true;
            layer.bringToFront();
        }
    }, [selectedSegmentId, simulationState, bikeSegments, citizenReports]);

    // 8. Auto-resize map when container width/height changes (collapsing drawers)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });

        if (mapContainerRef.current) {
            resizeObserver.observe(mapContainerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // 6d. Draw traffic lights on the map with micro-dot design
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Clear existing traffic light layers
        trafficLightLayersRef.current.forEach(layer => {
            map.removeLayer(layer);
        });
        trafficLightLayersRef.current = [];

        if (mapLayers.trafficLights === false) return;

        trafficLights.forEach(light => {
            if (!shouldShowMarker(light.coordinates[0], light.coordinates[1], activeRouteCoordsRef.current, currentZoom, 15, 120)) return;

            const lightColor = light.state === 'verde' ? '#10b981' : (light.state === 'amarillo' ? '#eab308' : '#ef4444');

            const marker = L.marker([light.coordinates[0], light.coordinates[1]], {
                icon: L.divIcon({
                    className: 'traffic-light-marker-wrapper',
                    html: `
                        <div style="
                            width: 16px;
                            height: 16px;
                            background: #0f172a;
                            border: 1.5px solid #475569;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.35);
                            cursor: pointer;
                        ">
                            <span style="
                                width: 6px; 
                                height: 6px; 
                                border-radius: 50%; 
                                background: ${lightColor}; 
                                box-shadow: 0 0 5px ${lightColor};
                            "></span>
                        </div>
                    `,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            });

            const popupContent = `
                <div style="color: #f8fafc; font-family: var(--font-body); font-size: 0.78rem; padding: 0.25rem; min-width: 180px;">
                    <h4 style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; margin-bottom: 0.35rem; color: #cbd5e1; display: flex; align-items: center; gap: 0.35rem;">
                        <i class="fa-solid fa-traffic-light"></i> ${light.name}
                    </h4>
                    <p style="margin: 0 0 0.4rem 0; font-weight: 600; color: #f1f5f9;">Semáforo de Intersección</p>
                    <p style="margin: 0 0 0.4rem 0; font-size: 0.7rem; color: #94a3b8;"><b>Intersección:</b> ${light.intersection}</p>
                    <p style="margin: 0; font-size: 0.72rem; color: ${lightColor}; font-weight: 700;">
                        Estado actual: ${light.state.toUpperCase()}
                    </p>
                </div>
            `;

            marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            marker.bindTooltip(`<strong>Semáforo:</strong> ${light.intersection} (${light.state})`, { sticky: true, className: 'custom-tooltip' });

            marker.addTo(map);
            trafficLightLayersRef.current.push(marker);
        });
    }, [trafficLights, mapLayers.trafficLights, activeRoute, currentZoom]);

    // 3D Navigation Cyclist Tracker and Map Rotation
    useEffect(() => {
        const map = mapRef.current;
        if (!isNavigating || !cyclistCoords) {
            // Remove cyclist marker, reset 3D transform, and restore user map interactions
            if (cyclistMarkerRef.current) {
                map.removeLayer(cyclistMarkerRef.current);
                cyclistMarkerRef.current = null;
            }
            if (wazeViewportRef.current) {
                wazeViewportRef.current.style.transform = 'none';
                wazeViewportRef.current.style.transition = 'transform 0.5s ease-out';
            }
            map.dragging.enable();
            map.touchZoom.enable();
            map.doubleClickZoom.enable();
            map.scrollWheelZoom.enable();
            map.boxZoom.enable();
            map.keyboard.enable();
            return;
        }

        // Disable manual pan/zoom during active 3D navigation to keep camera locked behind vehicle
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();

        // Calculate travel bearing along immediate route tangent
        let bearing = 0;
        if (activeRoute && activeRoute.coordinates && cyclistIndex !== undefined) {
            const coords = activeRoute.coordinates;
            const currentIdx = Math.min(cyclistIndex, coords.length - 2);
            const targetAheadIdx = Math.min(cyclistIndex + 2, coords.length - 1);

            const pt1 = coords[currentIdx];
            const pt2 = coords[targetAheadIdx];

            if (pt1 && pt2 && (pt1[0] !== pt2[0] || pt1[1] !== pt2[1])) {
                const lat1 = pt1[0] * Math.PI / 180;
                const lon1 = pt1[1] * Math.PI / 180;
                const lat2 = pt2[0] * Math.PI / 180;
                const lon2 = pt2[1] * Math.PI / 180;
                const dLon = lon2 - lon1;
                const y = Math.sin(dLon) * Math.cos(lat2);
                const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
                const rawBrng = Math.atan2(y, x) * 180 / Math.PI;
                bearing = Math.round((rawBrng + 360) % 360);
            }
        }

        // If marker already exists, smoothly update position and rotate arrow to point along tangent
        if (cyclistMarkerRef.current) {
            cyclistMarkerRef.current.setLatLng(cyclistCoords);
            const el = cyclistMarkerRef.current.getElement();
            if (el) {
                const arrowEl = el.querySelector('.waze-arrow-icon');
                if (arrowEl) {
                    arrowEl.style.transform = `rotate(${bearing}deg)`;
                }
            }
        } else {
            // Waze-style 3D Cyan Navigation Cursor / Puck
            const cyclistIcon = L.divIcon({
                className: 'waze-vehicle-puck-wrapper',
                html: `
                    <div style="
                        width: 50px;
                        height: 50px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                    ">
                        <!-- Pulse glow halo under vehicle -->
                        <div style="
                            position: absolute;
                            width: 44px;
                            height: 44px;
                            background: rgba(6, 182, 212, 0.35);
                            border-radius: 50%;
                            filter: blur(4px);
                        "></div>
                        <!-- Waze-style Cyan 3D Arrow / Puck with dynamic rotation -->
                        <div style="
                            position: relative;
                            width: 38px;
                            height: 38px;
                            background: linear-gradient(135deg, #06b6d4, #0891b2);
                            border: 3.5px solid #ffffff;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 8px 18px rgba(6, 182, 212, 0.8), 0 2px 6px rgba(0,0,0,0.4);
                        ">
                            <div class="waze-arrow-icon" style="
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                transform: rotate(${bearing}deg);
                                transition: transform 0.15s ease-out;
                            ">
                                <svg viewBox="0 0 24 24" width="22" height="22" style="fill: #ffffff; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5)); transform: translateY(-1px);">
                                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                `,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
            });

            const cyclistMarker = L.marker(cyclistCoords, { 
                icon: cyclistIcon, 
                zIndexOffset: 3000 
            }).addTo(map);

            cyclistMarkerRef.current = cyclistMarker;
            map.setView(cyclistCoords, 17);
        }

        // Apply Waze 3D Heading-Up Navigation Camera Transformation on viewport container
        if (wazeViewportRef.current) {
            wazeViewportRef.current.style.transformOrigin = '50% 65%';
            wazeViewportRef.current.style.transform = `perspective(900px) rotateX(42deg) rotateZ(${-bearing}deg) scale(1.35)`;
            wazeViewportRef.current.style.transition = 'transform 0.25s linear';
        }

        // Pan camera smoothly forward 25m along tangent
        const forwardMeters = 25;
        const bearingRad = bearing * Math.PI / 180;
        const targetLat = cyclistCoords[0] + (forwardMeters / 111000) * Math.cos(bearingRad);
        const targetLng = cyclistCoords[1] + (forwardMeters / (111000 * Math.cos(cyclistCoords[0] * Math.PI / 180))) * Math.sin(bearingRad);

        map.panTo([targetLat, targetLng], { 
            animate: false 
        });
    }, [isNavigating, cyclistCoords, cyclistIndex, activeRouteId]);

    // 9. Zoom to specific coordinates when requested (e.g. from citizen reports panel)
    useEffect(() => {
        const map = mapRef.current;
        if (map && zoomToCoords) {
            map.flyTo(zoomToCoords, 16, { duration: 1.5 });
        }
    }, [zoomToCoords]);

    return (
        <div className="map-container-wrapper" style={{ width: '100%', height: '100%', overflow: 'hidden', perspective: '1000px' }}>
            <div ref={wazeViewportRef} style={{ width: '100%', height: '100%' }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }}></div>
            </div>
            
            {/* Route Focus Mode Banner */}
            {activeRoute && (
                <div className="route-focus-banner">
                    <i className="fa-solid fa-route"></i>
                    <span>Vista enfocada en la ruta • Solo elementos en el corredor</span>
                </div>
            )}

            {/* Map Legend Overlay – hidden when a route is active to maximize map space */}
            {!activeRoute && (
                <div className={`map-legend ${((generatedRoutes && generatedRoutes.length > 0) || selectedSegmentId) ? 'mobile-shifted' : ''}`}>
                    <h4>Leyenda de Riesgo</h4>
                    <div className="legend-items">
                        <span className="legend-item"><span className="color-dot dot-low"></span> Bajo</span>
                        <span className="legend-item"><span className="color-dot dot-mid"></span> Medio</span>
                        <span className="legend-item"><span className="color-dot dot-high"></span> Alto</span>
                        <span className="legend-item"><span className="color-dot" style={{ background: '#f97316' }}></span> Trancón</span>
                    </div>
                </div>
            )}
        </div>
    );
}
