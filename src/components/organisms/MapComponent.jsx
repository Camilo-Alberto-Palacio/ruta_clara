import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { localitiesMap } from '../../data/bikeSegments';
import { caiPoints } from '../../data/caiPoints';
import { robberyReports } from '../../data/robberyReports';
import { accidentPoints } from '../../data/accidentPoints';
import { bikeCaravans } from '../../data/bikeCaravans';
import { calculateRisk, evaluateCoordinateRisk } from '../../utils/riskCalculator';
import { fetchGeoJSONWithCache } from '../../utils/geoCache';

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
function isNearRoute(lat, lng, routeCoords, thresholdMeters = 800) {
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
function shouldShowMarker(lat, lng, routeCoords, currentZoom, minZoomWithoutRoute = 11, thresholdMeters = 800) {
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

function render3DBicycleHTML(angle, bankAngle = 0, transition = 'transform 0.12s ease-out') {
    return `
        <div class="bike-3d-marker-container" style="
            width: 60px;
            height: 60px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            perspective: 500px;
        ">
            <!-- 1. Radar Pulse Beacon Ring (Indica GPS activo en tiempo real) -->
            <div class="bike-radar-pulse" style="
                position: absolute;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0.08) 65%, transparent 100%);
                border: 1.5px solid rgba(16, 185, 129, 0.65);
                animation: bikeBeaconPulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
                pointer-events: none;
            "></div>

            <!-- 2. Rotating & Banking 3D Bicycle Body -->
            <div class="bike-3d-body" style="
                width: 50px;
                height: 50px;
                position: relative;
                transform-origin: center center;
                transform: rotate(${angle}deg) rotateY(${bankAngle}deg);
                transition: ${transition};
                will-change: transform;
                filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.45));
            ">
                <!-- Forward Headlight Beam (haz de luz proyectado hacia adelante) -->
                <div style="
                    position: absolute;
                    top: -24px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 32px;
                    height: 36px;
                    background: linear-gradient(to top, rgba(255, 255, 255, 0.7), rgba(52, 211, 153, 0.25), transparent);
                    clip-path: polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%);
                    border-radius: 50% 50% 0 0;
                    pointer-events: none;
                    opacity: 0.85;
                "></div>

                <!-- 3D Realistic Bicycle SVG -->
                <svg viewBox="0 0 64 64" width="50" height="50" style="overflow: visible; display: block;">
                    <defs>
                        <linearGradient id="rcBikeEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#34d399"/>
                            <stop offset="45%" stop-color="#10b981"/>
                            <stop offset="85%" stop-color="#059669"/>
                            <stop offset="100%" stop-color="#064e3b"/>
                        </linearGradient>
                        <linearGradient id="rcBikeChromeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#f8fafc"/>
                            <stop offset="50%" stop-color="#cbd5e1"/>
                            <stop offset="100%" stop-color="#94a3b8"/>
                        </linearGradient>
                        <linearGradient id="rcBikeTireGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stop-color="#334155"/>
                            <stop offset="50%" stop-color="#0f172a"/>
                            <stop offset="100%" stop-color="#1e293b"/>
                        </linearGradient>
                        <filter id="rcBikeTubeShadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="1" dy="2" stdDeviation="1" flood-color="#000000" flood-opacity="0.4"/>
                        </filter>
                    </defs>

                    <!-- Ground Shadow of the Bicycle (pavement projection) -->
                    <ellipse cx="33" cy="35" rx="7" ry="24" fill="rgba(15, 23, 42, 0.45)" filter="blur(2px)"/>

                    <!-- REAR WHEEL -->
                    <g id="rear-wheel">
                        <ellipse cx="32" cy="50" rx="3.5" ry="10" fill="url(#rcBikeTireGrad)"/>
                        <ellipse cx="32" cy="50" rx="2" ry="8.5" fill="none" stroke="url(#rcBikeChromeGrad)" stroke-width="1.2"/>
                        <ellipse cx="32" cy="50" rx="2.5" ry="3" fill="#10b981"/>
                        <circle cx="32" cy="50" r="1.5" fill="#f8fafc"/>
                    </g>

                    <!-- REAR TRIANGLE / CHAINSTAY & SEATSTAY -->
                    <path d="M32 50 L30 36 L32 32 L34 36 Z" fill="url(#rcBikeEmeraldGrad)" filter="url(#rcBikeTubeShadow)"/>

                    <!-- BOTTOM BRACKET & PEDAL CRANK -->
                    <g id="pedals">
                        <line x1="32" y1="36" x2="23" y2="38" stroke="url(#rcBikeChromeGrad)" stroke-width="2.2" stroke-linecap="round"/>
                        <rect x="20" y="36.5" width="4" height="3" rx="1" fill="#0f172a" stroke="#10b981" stroke-width="0.7"/>
                        <line x1="32" y1="36" x2="41" y2="34" stroke="url(#rcBikeChromeGrad)" stroke-width="2.2" stroke-linecap="round"/>
                        <rect x="40" y="32.5" width="4" height="3" rx="1" fill="#0f172a" stroke="#10b981" stroke-width="0.7"/>
                        <circle cx="32" cy="36" r="3.2" fill="#0f172a" stroke="#cbd5e1" stroke-width="1"/>
                    </g>

                    <!-- MAIN FRAME TUBES -->
                    <path d="M32 20 L30.5 35 L33.5 35 Z" fill="url(#rcBikeEmeraldGrad)" filter="url(#rcBikeTubeShadow)"/>
                    <path d="M32 20 L31 32 L33 32 Z" fill="#34d399"/>
                    <path d="M32 20 L32 32" stroke="url(#rcBikeEmeraldGrad)" stroke-width="3" stroke-linecap="round"/>
                    <line x1="31.2" y1="20" x2="31.2" y2="34" stroke="#ffffff" stroke-width="0.8" opacity="0.75"/>

                    <!-- SADDLE -->
                    <g id="saddle">
                        <path d="M32 30 C30 32, 28 35, 29 38 C30 39, 34 39, 35 38 C36 35, 34 32, 32 30 Z" fill="#0f172a" filter="url(#rcBikeTubeShadow)"/>
                        <ellipse cx="32" cy="35" rx="0.8" ry="3" fill="#334155"/>
                        <path d="M29.5 38 Q32 39.5 34.5 38" fill="none" stroke="#10b981" stroke-width="0.9"/>
                    </g>

                    <!-- FRONT FORK & HEAD TUBE -->
                    <path d="M30.5 20 L31 14 L33 14 L33.5 20 Z" fill="url(#rcBikeEmeraldGrad)"/>

                    <!-- FRONT WHEEL -->
                    <g id="front-wheel">
                        <ellipse cx="32" cy="14" rx="3.5" ry="10" fill="url(#rcBikeTireGrad)"/>
                        <ellipse cx="32" cy="14" rx="2" ry="8.5" fill="none" stroke="url(#rcBikeChromeGrad)" stroke-width="1.2"/>
                        <ellipse cx="32" cy="14" rx="2.5" ry="3" fill="#10b981"/>
                        <circle cx="32" cy="14" r="1.5" fill="#f8fafc"/>
                    </g>

                    <!-- HANDLEBARS & STEM -->
                    <g id="handlebars">
                        <rect x="31" y="18" width="2" height="4" rx="1" fill="url(#rcBikeChromeGrad)"/>
                        <path d="M21 21 C24 19, 28 19.5, 32 19.5 C36 19.5, 40 19, 43 21" fill="none" stroke="url(#rcBikeChromeGrad)" stroke-width="2.6" stroke-linecap="round"/>
                        <rect x="19.5" y="20" width="3.5" height="3" rx="1.5" fill="#10b981" stroke="#064e3b" stroke-width="0.6"/>
                        <rect x="41" y="20" width="3.5" height="3" rx="1.5" fill="#10b981" stroke="#064e3b" stroke-width="0.6"/>
                        <circle cx="32" cy="17.5" r="2.2" fill="#ffffff" stroke="#34d399" stroke-width="1"/>
                        <circle cx="32" cy="17.5" r="1" fill="#ecfdf5"/>
                    </g>

                    <!-- RUTA CLARA EMERALD COCKPIT PUCK -->
                    <circle cx="32" cy="27" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="1.5" filter="url(#rcBikeTubeShadow)"/>
                    <path d="M32 24.5 L34.5 28.5 L32 27.5 L29.5 28.5 Z" fill="#ffffff"/>
                </svg>
            </div>
        </div>
    `;
}

export default function MapComponent({
    mapStyle = 'light',
    navigationMode = 'simulated',
    navSpeedMultiplier = 1,
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
    cyclistBearing = 0,
    activeRoute = null,
    leftDrawerOpen = true,
    rightDrawerOpen = true,
    isMobile = false,
    isBottomSheetExpanded = false,
    isCameraLocked = true,
    onCameraLockChange,
    userLocation = null,
    userHeading = 0
}) {
    // Derive the active route's coordinates for proximity filtering
    const activeRouteCoords = activeRoute ? activeRoute.coordinates : null;
    const mapContainerRef = useRef(null);
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
    const caravanLayersRef = useRef([]);
    const trafficLightLayersRef = useRef([]);
    const cyclistMarkerRef = useRef(null);
    const continuousBearingRef = useRef(null);
    const tileLayerRef = useRef(null);

    // Keep refs of callbacks to avoid re-triggering effects
    const callbacksRef = useRef({});
    callbacksRef.current = {
        onSelectSegment,
        onMapAuditClick,
        onLocationSelect,
        onSelectRoute,
        onLocalidadChange,
        onUpvoteReport,
        onCameraLockChange
    };

    const isNavigatingRef = useRef(isNavigating);
    isNavigatingRef.current = isNavigating;

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
    const hasInitialCenteredRef = useRef(false);

    // Centrar automáticamente la cámara en la ubicación real del usuario al recibir la primera coordenada GPS
    useEffect(() => {
        if (userLocation && !hasInitialCenteredRef.current && mapRef.current) {
            mapRef.current.setView([userLocation.lat, userLocation.lng], 16);
            hasInitialCenteredRef.current = true;
        }
    }, [userLocation]);

    // 1. Initial Mount: Initialize Leaflet Map and Fetch GeoJSON Boundaries
    useEffect(() => {
        if (!mapContainerRef.current) return;

        let active = true;

        // Center on real user GPS if available, otherwise Usme fallback
        const initialCenter = userLocation ? [userLocation.lat, userLocation.lng] : [4.506, -74.115];
        const initialZoom = userLocation ? 16 : 13;
        if (userLocation) hasInitialCenteredRef.current = true;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: true
        }).setView(initialCenter, initialZoom);

        // Add custom zoom control in the bottom-right corner
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapRef.current = map;

        // Update zoom state on zoom changes
        map.on('zoomend', () => {
            setCurrentZoom(map.getZoom());
        });

        // Detect manual user drag to release camera lock during active navigation
        map.on('dragstart', () => {
            if (isNavigatingRef.current && callbacksRef.current.onCameraLockChange) {
                callbacksRef.current.onCameraLockChange(false);
            }
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

        // Load official Bogotá Localities GeoJSON via IndexedDB Cache (7-day TTL + offline fallback)
        fetchGeoJSONWithCache('bogota_localidades', `${import.meta.env.BASE_URL}localidades.json`)
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
                const isOrigin = mode === 'origin';
                const label = isOrigin ? 'Tu Ubicación (Origen)' : 'Destino';
                
                const marker = L.marker([pt.lat, pt.lng], {
                    icon: L.divIcon({
                        className: 'route-point-marker',
                        html: isOrigin ? `
                            <div class="user-pulse-marker" style="
                                width: 22px; 
                                height: 22px; 
                                background: #10b981; 
                                border: 3px solid #ffffff; 
                                border-radius: 50%; 
                                box-shadow: 0 0 12px rgba(16, 185, 129, 0.8), 0 2px 5px rgba(0,0,0,0.35);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            ">
                                <span style="width: 6px; height: 6px; background: #ffffff; border-radius: 50%;"></span>
                            </div>
                        ` : `<i class="fa-solid fa-location-dot" style="font-size: 24px; color: #ef4444; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>`,
                        iconSize: isOrigin ? [22, 22] : [24, 24],
                        iconAnchor: isOrigin ? [11, 11] : [12, 24]
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
            if (!shouldShowMarker(cai.lat, cai.lng, activeRouteCoords, currentZoom, 11, 800)) return;

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
            if (!shouldShowMarker(report.lat, report.lng, activeRouteCoords, currentZoom, 11, 800)) return;

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
            if (!shouldShowMarker(acc.lat, acc.lng, activeRouteCoords, currentZoom, 11, 800)) return;

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
                // Dynamically offset bounds so no part of the route is hidden behind bottom sheet or side panels
                const leftPadding = isMobile ? 25 : (leftDrawerOpen ? 460 : 60);
                const rightPadding = isMobile ? 25 : (rightDrawerOpen ? 370 : 60);
                const topPadding = isMobile ? 90 : 60;
                const bottomPadding = isMobile ? (isBottomSheetExpanded ? 380 : 160) : 60;

                map.fitBounds(bounds, {
                    paddingTopLeft: [leftPadding, topPadding],
                    paddingBottomRight: [rightPadding, bottomPadding],
                    maxZoom: 15,
                    animate: true,
                    duration: 0.8
                });
            }
        }
    }, [activeRouteId, leftDrawerOpen, rightDrawerOpen, isMobile, isNavigating, isBottomSheetExpanded]);

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

            if (!shouldShowMarker(coords[0], coords[1], activeRouteCoords, currentZoom, 11, 800)) return;

            // Expiración visual de 60 minutos para reportes rápidos en ruta
            if (report.properties.isQuickReport && report.properties.timestamp) {
                if (Date.now() - report.properties.timestamp > 60 * 60 * 1000) {
                    return; // expirado visualmente
                }
            }

            const tipo = report.properties.tipo_novedad || '';
            const votos = report.properties.numero_votos;
            const fecha = report.properties.fecha_creacion;
            const estado = report.properties.estado;
            const isQuick = Boolean(report.properties.isQuickReport);

            const isPothole = tipo.includes('Hueco') || tipo.includes('destructiva') || tipo.includes('Bache') || report.properties.hazardKey === 'pothole';
            const lane = report.properties.lane;
            const severity = report.properties.severity;

            // Determine color and icon
            let color = '#f59e0b'; // Amber
            let icon = 'fa-triangle-exclamation';

            if (isPothole) {
                color = '#ea580c'; // Vibrant Orange
                icon = 'fa-burst';
            } else if (tipo.includes('Luminaria') || tipo.includes('lobo') || tipo.includes('apagada') || report.properties.hazardKey === 'lighting') {
                color = '#f59e0b';
                icon = 'fa-lightbulb';
            } else if (tipo.includes('Obstáculo') || tipo.includes('vía') || report.properties.hazardKey === 'obstacle') {
                color = '#f97316';
                icon = 'fa-road-barrier';
            } else if (tipo.includes('Semáforo') || tipo.includes('Semaforo') || report.properties.hazardKey === 'traffic_light') {
                color = '#10b981';
                icon = 'fa-traffic-light';
            } else if (tipo.includes('Inseguridad') || tipo.includes('Atraco') || tipo.includes('peligrosa') || tipo.includes('Zona') || report.properties.hazardKey === 'danger') {
                color = '#ef4444';
                icon = 'fa-triangle-exclamation';
            }

            const hasPhoto = Boolean(report.properties.foto);
            const photoBadge = hasPhoto ? `
                <span style="
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 13px;
                    height: 13px;
                    background: #059669;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 7px;
                    color: white;
                    border: 1.5px solid white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                ">
                    <i class="fa-solid fa-camera"></i>
                </span>
            ` : '';

            let markerHtml = '';
            let iconSize = [18, 18];
            let iconAnchor = [9, 9];

            if (isPothole && lane) {
                const laneBadge = lane === 'izquierda' ? '⬅️ IZQ' : (lane === 'derecha' ? '➡️ DER' : '⬆️ CEN');
                iconSize = [58, 22];
                iconAnchor = [29, 11];
                markerHtml = `
                    <div class="citizen-pothole-marker" style="
                        position: relative;
                        background: ${severity === 'critico' ? '#dc2626' : '#ea580c'};
                        border: 2px solid #ffffff;
                        border-radius: 9999px;
                        padding: 1.5px 6px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 3px;
                        color: #ffffff;
                        font-weight: 800;
                        font-size: 8.5px;
                        font-family: var(--font-heading, sans-serif);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                        cursor: pointer;
                        white-space: nowrap;
                    ">
                        <i class="fa-solid fa-burst" style="font-size: 8px;"></i>
                        <span>${laneBadge}</span>
                        ${photoBadge}
                    </div>
                `;
            } else {
                markerHtml = `
                    <div class="citizen-report-marker" style="
                        position: relative;
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
                        ${photoBadge}
                    </div>
                `;
            }

            const marker = L.marker([coords[0], coords[1]], {
                icon: L.divIcon({
                    className: 'citizen-report-marker-wrapper',
                    html: markerHtml,
                    iconSize: iconSize,
                    iconAnchor: iconAnchor
                })
            });

            // Create flat popup element
            const div = document.createElement('div');
            div.style.minWidth = '210px';
            div.style.maxWidth = '260px';

            let laneHtml = '';
            if (lane) {
                const laneName = lane === 'izquierda' ? 'Carril Izquierdo ⬅️' : (lane === 'derecha' ? 'Carril Derecho ➡️' : 'Eje Central ⬆️');
                laneHtml = `
                    <div style="display: inline-flex; align-items: center; gap: 4px; background: #fff7ed; color: #c2410c; font-weight: 800; font-size: 0.72rem; padding: 2px 8px; border-radius: 9999px; margin-bottom: 0.35rem; border: 1px solid #fdba74;">
                        <i class="fa-solid fa-arrows-left-right-to-line"></i> ${laneName}
                    </div>
                `;
            }

            let severityHtml = '';
            if (severity === 'critico') {
                severityHtml = `
                    <div style="display: inline-flex; align-items: center; gap: 4px; background: #fef2f2; color: #dc2626; font-weight: 800; font-size: 0.68rem; padding: 1px 6px; border-radius: 6px; margin-bottom: 0.35rem; border: 1px solid #fecaca;">
                        <i class="fa-solid fa-radiation"></i> Trampa Crítica
                    </div>
                `;
            }

            div.innerHTML = `
                <div style="font-family: var(--font-body, sans-serif); font-size: 0.78rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem;">
                        <h4 style="font-family: var(--font-heading, sans-serif); font-size: 0.85rem; font-weight: 800; margin: 0; color: ${color}; display: flex; align-items: center; gap: 0.35rem;">
                            <i class="fa-solid ${icon}"></i> ${tipo.split('/')[0].trim()}
                        </h4>
                    </div>
                    ${laneHtml}
                    ${severityHtml}
                    ${report.properties.foto ? `<img src="${report.properties.foto}" style="width: 100%; max-height: 125px; object-fit: cover; border-radius: 8px; margin-bottom: 0.4rem; border: 1px solid #cbd5e1; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" alt="Evidencia" />` : ''}
                    ${report.properties.descripcion ? `<p style="margin: 0 0 0.35rem 0; font-style: italic; color: #334155; font-size: 0.72rem; line-height: 1.3;">"${report.properties.descripcion}"</p>` : ''}
                    <div style="font-size: 0.68rem; color: #64748b; font-weight: 600; margin-bottom: 0.35rem;">
                        🚲 Ciclistas • 🛵 Motos • 🚗 Vehículos
                    </div>
                    <p style="margin: 0 0 0.25rem 0; color: #64748b; font-size: 0.72rem;"><b>Votos de respaldo:</b> <span class="vote-count" style="font-weight: 800; color: #ea580c;">${votos}</span></p>
                    <p style="margin: 0 0 0.25rem 0; color: #64748b; font-size: 0.7rem;"><b>Reportado:</b> ${fecha}</p>
                    <p style="margin: 0 0 0.4rem 0; color: #64748b; font-size: 0.7rem;"><b>Estado:</b> <span style="text-transform: capitalize; color: #10b981; font-weight: 700;">${estado}</span></p>
                    <button class="btn-flat btn-flat-primary respaldar-btn" style="width: 100%; font-size: 0.72rem; padding: 0.4rem; border-radius: 8px; font-weight: 700; cursor: pointer;">
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
            const tooltipLane = lane ? ` (${lane.toUpperCase()})` : '';
            marker.bindTooltip(`<strong>Reporte:</strong> ${tipo.split('/')[0]}${tooltipLane}${hasPhoto ? ' 📷 [Foto]' : ''} (Votos: ${votos})`, { sticky: true, className: 'custom-tooltip' });

            marker.addTo(map);
            citizenReportLayersRef.current.push(marker);
        });
    }, [citizenReports, mapLayers.citizenReports, activeRoute, currentZoom]);

    // 6b. Bici-Caravanas Comunitarias Layer
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        caravanLayersRef.current.forEach(l => map.removeLayer(l));
        caravanLayersRef.current = [];

        if (mapLayers.caravans === false) return;

        bikeCaravans.forEach(caravan => {
            // Polilínea de la caravana
            const poly = L.polyline(caravan.coordinates, {
                color: caravan.color,
                weight: 4,
                dashArray: '8, 8',
                opacity: 0.85
            }).addTo(map);

            poly.bindTooltip(`<strong>🚲 ${caravan.name}</strong><br/>Salida: ${caravan.meetingPoint.departureTime}`, { sticky: true });
            caravanLayersRef.current.push(poly);

            // Marcador de punto de encuentro
            const marker = L.marker([caravan.meetingPoint.lat, caravan.meetingPoint.lng], {
                icon: L.divIcon({
                    className: 'caravan-meeting-icon',
                    html: `
                        <div style="
                            width: 26px; height: 26px;
                            background: ${caravan.color};
                            border: 2px solid #ffffff;
                            border-radius: 50%;
                            display: flex; align-items: center; justify-content: center;
                            color: #ffffff; font-size: 11px;
                            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                        ">
                            <i class="fa-solid fa-bicycle"></i>
                        </div>
                    `,
                    iconSize: [26, 26],
                    iconAnchor: [13, 13]
                })
            }).addTo(map);

            marker.bindPopup(`
                <div style="font-family: var(--font-body); font-size: 0.78rem; min-width: 190px;">
                    <h4 style="color: ${caravan.color}; margin: 0 0 0.35rem 0; font-weight: 800;">
                        <i class="fa-solid fa-users"></i> ${caravan.name}
                    </h4>
                    <p style="margin: 0 0 0.25rem 0;"><strong>Encuentro:</strong> ${caravan.meetingPoint.name}</p>
                    <p style="margin: 0 0 0.25rem 0;"><strong>Salida:</strong> ${caravan.meetingPoint.departureTime} (Reunión: ${caravan.meetingPoint.assemblyTime})</p>
                    <p style="margin: 0 0 0.25rem 0; color: #10b981; font-weight: bold;"><strong>Bono Protector:</strong> ${caravan.riskReductionFactor} Riesgo</p>
                    <p style="margin: 0; font-size: 0.72rem; color: var(--text-secondary);">${caravan.description}</p>
                </div>
            `);

            caravanLayersRef.current.push(marker);
        });
    }, [mapLayers.caravans]);

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

        // Always show traffic lights if mapLayers.trafficLights is true OR if there's an active route
        if (mapLayers.trafficLights === false && (!activeRouteCoords || activeRouteCoords.length === 0)) return;

        trafficLights.forEach(light => {
            const onRoute = activeRouteCoords && activeRouteCoords.length > 0 && isNearRoute(light.coordinates[0], light.coordinates[1], activeRouteCoords, 100);

            // If an active route is present, ONLY display traffic lights directly on the route corridor
            // to avoid blackening the entire map with dozens of off-route intersections!
            if (activeRouteCoords && activeRouteCoords.length > 0) {
                if (!onRoute) return;
            } else {
                if (mapLayers.trafficLights === false) return;
                if (!shouldShowMarker(light.coordinates[0], light.coordinates[1], null, currentZoom, 14, 100)) return;
            }

            const lightColor = light.state === 'verde' ? '#10b981' : (light.state === 'amarillo' ? '#eab308' : '#ef4444');

            const marker = L.marker([light.coordinates[0], light.coordinates[1]], {
                icon: L.divIcon({
                    className: 'traffic-light-marker-wrapper',
                    html: `
                        <div style="
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: space-evenly;
                            width: ${onRoute ? '20px' : '16px'};
                            height: ${onRoute ? '34px' : '28px'};
                            background: #0f172a;
                            border: ${onRoute ? '2px solid #10b981' : '1.5px solid #475569'};
                            border-radius: 8px;
                            box-shadow: ${onRoute ? '0 0 12px rgba(16, 185, 129, 0.6), 0 3px 8px rgba(0,0,0,0.4)' : '0 2px 5px rgba(0,0,0,0.3)'};
                            padding: 2px 0;
                            cursor: pointer;
                        ">
                            <span style="
                                width: ${onRoute ? '6px' : '5px'}; 
                                height: ${onRoute ? '6px' : '5px'}; 
                                border-radius: 50%; 
                                background: ${light.state === 'rojo' ? '#ef4444' : '#334155'}; 
                                box-shadow: ${light.state === 'rojo' ? '0 0 8px #ef4444' : 'none'};
                            "></span>
                            <span style="
                                width: ${onRoute ? '6px' : '5px'}; 
                                height: ${onRoute ? '6px' : '5px'}; 
                                border-radius: 50%; 
                                background: ${light.state === 'amarillo' ? '#eab308' : '#334155'}; 
                                box-shadow: ${light.state === 'amarillo' ? '0 0 8px #eab308' : 'none'};
                            "></span>
                            <span style="
                                width: ${onRoute ? '6px' : '5px'}; 
                                height: ${onRoute ? '6px' : '5px'}; 
                                border-radius: 50%; 
                                background: ${light.state === 'verde' ? '#10b981' : '#334155'}; 
                                box-shadow: ${light.state === 'verde' ? '0 0 8px #10b981' : 'none'};
                            "></span>
                        </div>
                    `,
                    iconSize: onRoute ? [20, 34] : [16, 28],
                    iconAnchor: onRoute ? [10, 17] : [8, 14]
                })
            });

            const popupContent = `
                <div style="color: #f8fafc; font-family: var(--font-body); font-size: 0.78rem; padding: 0.25rem; min-width: 190px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                        <h4 style="font-family: var(--font-heading); font-size: 0.85rem; font-weight: 700; margin: 0; color: #cbd5e1; display: flex; align-items: center; gap: 0.35rem;">
                            <i class="fa-solid fa-traffic-light" style="color: ${lightColor};"></i> ${light.name}
                        </h4>
                    </div>
                    ${onRoute ? '<span style="display: inline-block; background: rgba(16,185,129,0.2); color: #10b981; font-weight: 800; font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; margin-bottom: 0.4rem; border: 1px solid #10b981;">🚦 En tu ruta ciclista</span>' : ''}
                    <p style="margin: 0 0 0.3rem 0; font-size: 0.72rem; color: #94a3b8;"><b>Cruce:</b> ${light.intersection}</p>
                    <p style="margin: 0 0 0.3rem 0; font-size: 0.72rem; color: #94a3b8;"><b>Tipo:</b> ${light.type === 'vehicular_ciclista' ? '🚴 Ciclista y Vehicular' : 'Vehicular'}</p>
                    <p style="margin: 0; font-size: 0.74rem; color: ${lightColor}; font-weight: 700;">
                        Estado actual: ${light.state.toUpperCase()} (${light.cycleTime || 30}s ciclo)
                    </p>
                </div>
            `;

            marker.bindPopup(popupContent, { className: 'custom-leaflet-popup' });
            marker.bindTooltip(`<strong>🚦 Semáforo:</strong> ${light.intersection} <span style="color:${lightColor}">(${light.state.toUpperCase()})</span>`, { sticky: true, className: 'custom-tooltip' });

            marker.addTo(map);
            trafficLightLayersRef.current.push(marker);
        });
    }, [trafficLights, mapLayers.trafficLights, activeRoute, currentZoom]);

    // 3D Navigation Cyclist Tracker and Camera Follow (with free user map exploration)
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Ensure user gestures (panning, pinching, zooming) are ALWAYS enabled
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();

        // Target coordinates: Active navigation coordinates OR idle real-time user GPS location
        const currentPos = (isNavigating && cyclistCoords) ? cyclistCoords : userLocation;

        if (!currentPos) {
            continuousBearingRef.current = null;
            // Remove cyclist marker when no GPS location or route position
            if (cyclistMarkerRef.current) {
                map.removeLayer(cyclistMarkerRef.current);
                cyclistMarkerRef.current = null;
            }
            return;
        }

        // Calculate continuous bearing (shortest angular delta) to prevent 360° flip spins
        const rawBearing = isNavigating ? cyclistBearing : userHeading;
        const targetBearing = (rawBearing !== null && rawBearing !== undefined && !isNaN(rawBearing)) 
            ? rawBearing 
            : 0;

        if (continuousBearingRef.current === null || isNaN(continuousBearingRef.current)) {
            continuousBearingRef.current = targetBearing;
        }

        const currentAngle = continuousBearingRef.current;
        const diff = ((targetBearing - (currentAngle % 360) + 540) % 360) - 180;
        const newAngle = currentAngle + diff;
        continuousBearingRef.current = newAngle;

        // Dynamic turn banking angle (tilts the 3D bicycle into the curve, max 12 degrees)
        const bankAngle = Math.max(-12, Math.min(12, Math.round(diff * 0.35)));

        // Dynamic transition duration: rapid linear at 5x to avoid interrupted CSS transitions
        const arrowTransition = navSpeedMultiplier >= 5 
            ? 'transform 0.05s linear' 
            : (navSpeedMultiplier === 2 ? 'transform 0.08s ease-out' : 'transform 0.12s ease-out');

        // If marker already exists, smoothly update position and rotate 3D bicycle along shortest arc
        if (cyclistMarkerRef.current) {
            cyclistMarkerRef.current.setLatLng(currentPos);
            const el = cyclistMarkerRef.current.getElement();
            if (el) {
                const bodyEl = el.querySelector('.bike-3d-body');
                if (bodyEl) {
                    bodyEl.style.transition = arrowTransition;
                    bodyEl.style.transform = `rotate(${newAngle}deg) rotateY(${bankAngle}deg)`;
                }
            }
        } else {
            continuousBearingRef.current = targetBearing;
            // 3D Isometric Bicycle Marker (Ruta Clara Metallic Emerald)
            const cyclistIcon = L.divIcon({
                className: 'ruta-clara-3d-bike-marker',
                html: render3DBicycleHTML(newAngle, bankAngle, arrowTransition),
                iconSize: [60, 60],
                iconAnchor: [30, 30]
            });

            const cyclistMarker = L.marker(currentPos, { 
                icon: cyclistIcon, 
                zIndexOffset: 3000 
            }).addTo(map);

            cyclistMarker.bindTooltip('<strong>🚴 Tu Ubicación</strong> (GPS en vivo)', { 
                direction: 'top', 
                offset: [0, -22],
                className: 'custom-tooltip' 
            });

            cyclistMarkerRef.current = cyclistMarker;
            if (isNavigating && isCameraLocked) {
                map.setView(currentPos, 17);
            }
        }

        // Camera follow ONLY during active navigation if user has NOT panned away
        if (isNavigating && isCameraLocked && cyclistCoords) {
            const currentCenter = map.getCenter();
            const distMeters = currentCenter ? currentCenter.distanceTo(cyclistCoords) : 0;

            if (distMeters > 160) {
                // If recently recentered from far away, re-center preserving current user zoom
                map.setView(cyclistCoords, map.getZoom());
            } else if (navSpeedMultiplier >= 5) {
                // At 5x high speed, lock camera synchronously to marker frame
                map.panTo(cyclistCoords, { animate: false });
            } else {
                const panDuration = navSpeedMultiplier === 2 ? 0.06 : 0.12;
                map.panTo(cyclistCoords, { 
                    animate: true, 
                    duration: panDuration, 
                    easeLinearity: 0.5 
                });
            }
        }
    }, [isNavigating, cyclistCoords, cyclistBearing, userLocation, userHeading, isCameraLocked, navSpeedMultiplier]);

    // 9. Zoom to specific coordinates when requested (e.g. from citizen reports panel)
    useEffect(() => {
        const map = mapRef.current;
        if (map && zoomToCoords) {
            map.flyTo(zoomToCoords, 16, { duration: 1.5 });
        }
    }, [zoomToCoords]);

    return (
        <div className="map-container-wrapper">
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }}></div>
            
            {/* Route Focus Mode Banner */}
            {activeRoute && (
                <div className="route-focus-banner">
                    <i className="fa-solid fa-route"></i>
                    <span>Vista enfocada en la ruta • Solo elementos en el corredor</span>
                </div>
            )}

            {/* Floating "Mi Ubicación GPS" Button (Recentrado instantáneo 1-toque) */}
            {userLocation && (
                <button
                    type="button"
                    onClick={() => {
                        if (mapRef.current && userLocation) {
                            mapRef.current.flyTo([userLocation.lat, userLocation.lng], 17, { duration: 0.8 });
                            if (callbacksRef.current.onCameraLockChange) {
                                callbacksRef.current.onCameraLockChange(true);
                            }
                        }
                    }}
                    className="floating-my-location-btn"
                    title="Centrar en mi ubicación GPS"
                    aria-label="Centrar en mi ubicación GPS"
                    id="btn-my-location"
                >
                    <i className="fa-solid fa-location-crosshairs text-emerald-600 text-lg"></i>
                </button>
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
