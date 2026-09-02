import React, { useState, useEffect, useRef } from 'react';
import FloatingHeader from './components/organisms/FloatingHeader';
import RoutePlanner from './components/organisms/RoutePlanner';
import SimulatorPanel from './components/organisms/SimulatorPanel';
import ResultsPanel from './components/organisms/ResultsPanel';
import StatsPanel from './components/organisms/StatsPanel';
import MapComponent from './components/organisms/MapComponent';
import CitizenSciencePanel from './components/organisms/CitizenSciencePanel';
import TrafficLightsPanel from './components/organisms/TrafficLightsPanel';
import FormField from './components/molecules/FormField';

import { bikeSegments as initialSegments, localitiesMap } from './data/bikeSegments';
import { constructionZones } from './data/constructionZones';
import { trafficJams } from './data/trafficJams';
import { trafficLights as initialTrafficLights } from './data/trafficLights';
import { fetchBogotaTrafficLights } from './utils/trafficLightsService';
import { audioGuidance } from './utils/audioGuidanceService';
import { 
    calculateRisk, 
    getRecommendations, 
    getRouteRecommendations, 
    findNearestSegment,
    calculateRouteAverageRisk,
    detectTrafficJamsOnRoute,
    calculateRouteCost,
    calcularRiesgoCiudadano,
    evaluateCoordinateRisk
} from './utils/riskCalculator';

export default function App() {
    // 1. Localities and View Modes
    const [localidad, setLocalidad] = useState('usme');
    const [viewMode, setViewMode] = useState('citizen');
    const [voiceEnabled, setVoiceEnabled] = useState(true);

    // 2. Segment Data State (allows adding custom_audit dynamically)
    const [segments, setSegments] = useState(initialSegments);
    const [selectedSegmentId, setSelectedSegmentId] = useState(null);

    // 3. Simulation Controls State (binds to active selection)
    const [simulationState, setSimulationState] = useState({
        weather: 'seco',
        lightingType: 'Sodio',
        watts: 100,
        visibility: 2,
        guardianCai: false,
        guardianRuta: false,
        showConstruction: true,
        trafficJams: false,
        accidents: false
    });

    // Map Layers Visibility State (Clean minimalist defaults)
    const [mapLayers, setMapLayers] = useState({
        localities: true,
        cais: false,
        construction: true,
        accidents: false,
        robberies: false,
        trafficJams: false,
        citizenReports: true,
        trafficLights: true
    });

    const [desktopLayersOpen, setDesktopLayersOpen] = useState(false);

    // Sidebar active tab (desktop left panel content)
    const [activeTab, setActiveTab] = useState('routes');

    // Traffic Lights State
    const [trafficLights, setTrafficLights] = useState(initialTrafficLights);
    const [trafficLightsSource, setTrafficLightsSource] = useState('fallback');
    const [isLoadingTrafficLights, setIsLoadingTrafficLights] = useState(false);
    const [autoCycleActive, setAutoCycleActive] = useState(true);
    const [greenWaveActive, setGreenWaveActive] = useState(false);

    // Cargar semáforos reales de Bogotá al montar la aplicación
    const loadTrafficLightsData = async (forceRefresh = false) => {
        setIsLoadingTrafficLights(true);
        try {
            const result = await fetchBogotaTrafficLights(forceRefresh);
            if (result && result.data && result.data.length > 0) {
                setTrafficLights(result.data);
                setTrafficLightsSource(result.source);
            }
        } catch (err) {
            console.error('Error al cargar semáforos:', err);
        } finally {
            setIsLoadingTrafficLights(false);
        }
    };

    useEffect(() => {
        loadTrafficLightsData(false);
    }, []);

    // 3D Navigation Simulator State
    const [isNavigating, setIsNavigating] = useState(false);
    const [navigationMode, setNavigationMode] = useState('simulated'); // 'simulated' | 'gps'
    const [cyclistCoords, setCyclistCoords] = useState(null);
    const [cyclistIndex, setCyclistIndex] = useState(0);
    const [navSpeedMultiplier, setNavSpeedMultiplier] = useState(1);
    const [navStatus, setNavStatus] = useState('stopped');
    const [speedKmh, setSpeedKmh] = useState(0);
    const [hudRecommendation, setHudRecommendation] = useState('Haz clic en Iniciar para comenzar la navegación.');
    const [nextTrafficLight, setNextTrafficLight] = useState(null);
    const lastRiskLevelRef = useRef('Bajo');

    // Mobile popover states and bottom sheet active tab
    const [mobileLayersOpen, setMobileLayersOpen] = useState(false);
    const [mobileLocalityOpen, setMobileLocalityOpen] = useState(false);
    const [mobileActiveTab, setMobileActiveTab] = useState('results');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [mapStyle, setMapStyle] = useState('light'); // 'light' | 'dark' | 'terrain'

    // 3b. Citizen Science and Reports State
    const [citizenReports, setCitizenReports] = useState([]);
    const [isReporting, setIsReporting] = useState(false);
    const [reportingType, setReportingType] = useState('Luminaria Dañada / Boca de lobo');
    const [reportingCoords, setReportingCoords] = useState(null);
    const [isSelectingCoords, setIsSelectingCoords] = useState(false);
    const [zoomToCoords, setZoomToCoords] = useState(null);

    // 4. Route Planning State
    const [originInput, setOriginInput] = useState('Portal Usme');
    const [destInput, setDestInput] = useState('');
    const [selectingLocationMode, setSelectingLocationMode] = useState(null);
    const [routePoints, setRoutePoints] = useState({ origin: null, destination: null });
    const [generatedRoutes, setGeneratedRoutes] = useState([]);
    const [activeRouteId, setActiveRouteId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Desktop drawer open/close states
    const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
    const [rightDrawerOpen, setRightDrawerOpen] = useState(true);

    // Mobile specific UI state
    const [showScientificMenu, setShowScientificMenu] = useState(false);
    const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('settings');
    const [isMobile, setIsMobile] = useState(false);

    // Monitor screen width to enable conditional rendering of desktop drawers
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 900);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync body class list for dark mode
    useEffect(() => {
        if (darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [darkMode]);

    // Sync darkMode with mapStyle
    useEffect(() => {
        if (mapStyle === 'dark') {
            setDarkMode(true);
        } else {
            setDarkMode(false);
        }
    }, [mapStyle]);

    // A. Auto-cycle Traffic Lights
    useEffect(() => {
        if (!autoCycleActive) return;
        
        const interval = setInterval(() => {
            setTrafficLights(prev => prev.map(light => {
                // If green wave is active for this light, keep it green!
                if (greenWaveActive && activeRouteId) {
                    const activeRoute = generatedRoutes.find(r => r.id === activeRouteId);
                    if (activeRoute) {
                        const onRoute = activeRoute.coordinates.some(pt => {
                            const distDeg = Math.sqrt(
                                Math.pow(pt[0] - light.coordinates[0], 2) + 
                                Math.pow(pt[1] - light.coordinates[1], 2)
                            );
                            return (distDeg * 111000) <= 40;
                        });
                        if (onRoute) {
                            return { ...light, state: 'verde' };
                        }
                    }
                }

                // Cycle: verde (5s) -> amarillo (5s) -> rojo (5s) -> verde
                let nextState = light.state;
                if (light.state === 'verde') nextState = 'amarillo';
                else if (light.state === 'amarillo') nextState = 'rojo';
                else nextState = 'verde';
                
                return { ...light, state: nextState };
            }));
        }, 5000);

        return () => clearInterval(interval);
    }, [autoCycleActive, greenWaveActive, activeRouteId, generatedRoutes]);

    // B. Force Green Wave handler
    const handleForceGreenWave = () => {
        const activeRoute = generatedRoutes.find(r => r.id === activeRouteId);
        if (!activeRoute) return;
        
        setGreenWaveActive(true);
        setTrafficLights(prev => prev.map(light => {
            const onRoute = activeRoute.coordinates.some(pt => {
                const distDeg = Math.sqrt(
                    Math.pow(pt[0] - light.coordinates[0], 2) + 
                    Math.pow(pt[1] - light.coordinates[1], 2)
                );
                return (distDeg * 111000) <= 40;
            });
            if (onRoute) {
                return { ...light, state: 'verde' };
            }
            return light;
        }));

        setTimeout(() => {
            setGreenWaveActive(false);
        }, 15000);
    };

    // C. Manual traffic light state override
    const handleToggleLightState = (id, newState) => {
        setTrafficLights(prev => prev.map(light => {
            if (light.id === id) {
                return { ...light, state: newState };
            }
            return light;
        }));
    };

    // Sync audio guidance state with voiceEnabled
    useEffect(() => {
        audioGuidance.setEnabled(voiceEnabled);
    }, [voiceEnabled]);

    // D. Smooth Continuous Navigation Simulation loop
    useEffect(() => {
        const activeRoute = generatedRoutes.find(r => r.id === activeRouteId);
        if (navStatus !== 'running' || !activeRoute || navigationMode === 'gps') return;

        // Generate dense interpolated points (spaced ~6m apart) for silky smooth movement
        const rawCoords = activeRoute.coordinates;
        const denseCoords = [];
        const stepDeg = 6 / 111000; // ~6 meters per step

        for (let i = 0; i < rawCoords.length - 1; i++) {
            const p1 = rawCoords[i];
            const p2 = rawCoords[i + 1];
            denseCoords.push(p1);

            const dLat = p2[0] - p1[0];
            const dLng = p2[1] - p1[1];
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);

            if (dist > stepDeg) {
                const steps = Math.floor(dist / stepDeg);
                for (let s = 1; s <= steps; s++) {
                    const frac = s / (steps + 1);
                    denseCoords.push([
                        p1[0] + dLat * frac,
                        p1[1] + dLng * frac
                    ]);
                }
            }
        }
        denseCoords.push(rawCoords[rawCoords.length - 1]);

        let waitTicks = 0;

        const interval = setInterval(() => {
            if (cyclistIndex >= denseCoords.length - 1) {
                // Simulation ended successfully
                setNavStatus('stopped');
                setIsNavigating(false);
                setCyclistCoords(null);
                setCyclistIndex(0);
                setSpeedKmh(0);
                setNextTrafficLight(null);
                audioGuidance.speakRaw("¡Felicidades! Has llegado a tu destino.", true);
                alert("¡Has llegado a tu destino de forma segura!");
                return;
            }

            const currentPt = denseCoords[cyclistIndex];

            // Detect next traffic light
            const nearbyLight = trafficLights.find(light => {
                const distDeg = Math.sqrt(
                    Math.pow(currentPt[0] - light.coordinates[0], 2) + 
                    Math.pow(currentPt[1] - light.coordinates[1], 2)
                );
                return (distDeg * 111000) <= 30;
            });

            if (nearbyLight) {
                setNextTrafficLight(nearbyLight);
                if (nearbyLight.state === 'rojo') {
                    setSpeedKmh(0);
                    setHudRecommendation('🚦 Semáforo en ROJO. Esperando cambio a verde...');
                    audioGuidance.speakEvent(`light_${nearbyLight.coordinates.join('_')}`, 'Semáforo en rojo.', 35, true);
                    waitTicks++;
                    if (waitTicks < 6) {
                        return; // pause cyclist progression temporarily
                    }
                }
            } else {
                setNextTrafficLight(null);
            }

            waitTicks = 0;

            const nextIdx = cyclistIndex + 1;
            setCyclistIndex(nextIdx);
            setCyclistCoords(denseCoords[nextIdx]);

            // Realistic smooth speed (16-22 km/h)
            const baseSpeed = 19;
            const variance = Math.sin(nextIdx * 0.2) * 2.5;
            setSpeedKmh(Math.round(baseSpeed + variance));

            // Dynamic recommendations & Voice Copilot periodically (every 5 steps = ~30m)
            if (nextIdx % 5 === 0) {
                const currentCoord = denseCoords[nextIdx];
                const riskInfo = evaluateCoordinateRisk(
                    currentCoord[0], 
                    currentCoord[1], 
                    segments, 
                    simulationState, 
                    constructionZones, 
                    simulationState.showConstruction,
                    citizenReports
                );

                const nearbyConst = constructionZones.find(zone => {
                    const distDeg = Math.sqrt(Math.pow(currentCoord[0] - zone.lat, 2) + Math.pow(currentCoord[1] - zone.lng, 2));
                    return (distDeg * 111000) <= zone.radius;
                });

                // Detect nearby citizen reports within 45 meters
                const nearbyReport = citizenReports.find(report => {
                    const rCoords = report.properties?.coordenadas;
                    if (!rCoords) return false;
                    const distDeg = Math.sqrt(Math.pow(currentCoord[0] - rCoords[0], 2) + Math.pow(currentCoord[1] - rCoords[1], 2));
                    return (distDeg * 111000) <= 45;
                });

                const currentRisk = riskInfo.level;
                if (lastRiskLevelRef.current === 'Alto' && currentRisk !== 'Alto') {
                    setHudRecommendation('🟢 Zona segura alcanzada. Has salido del sector de riesgo.');
                    audioGuidance.speakEvent('danger_zone_exit', 'Has salido de la zona de riesgo. Vía segura.', 20, true);
                } else if (currentRisk === 'Alto' && lastRiskLevelRef.current !== 'Alto') {
                    setHudRecommendation('⚠️ Sector con alerta de seguridad. Mantente en movimiento.');
                    audioGuidance.speakEvent('high_risk_zone', 'Zona de precaución. Mantén el pedaleo.', 40, true);
                }
                lastRiskLevelRef.current = currentRisk;

                if (nearbyConst) {
                    setHudRecommendation('🚧 Obras viales del IDU adelante. Precaución.');
                    audioGuidance.speakEvent(`const_${nearbyConst.lat}`, 'Obras viales adelante.', 50);
                } else if (nearbyReport) {
                    const tipo = nearbyReport.properties.tipo_novedad;
                    setHudRecommendation(`📢 Reporte ciudadano: ${tipo}`);
                    audioGuidance.speakEvent(`rep_${nearbyReport.id}`, `Reporte en la vía: ${tipo}.`, 45);
                } else if (simulationState.weather === 'lluvia') {
                    setHudRecommendation('🌧️ Calzada mojada por lluvias. Conduce con cuidado.');
                    audioGuidance.speakEvent('rain_warning', 'Calzada resbaladiza.', 90);
                } else if (nearbyLight && nearbyLight.state === 'verde') {
                    setHudRecommendation('🟢 Cruce con semáforo en VERDE. Paso libre.');
                } else {
                    setHudRecommendation('🚴 Ruta despejada. Disfruta tu recorrido.');
                }
            }

        }, 120 / navSpeedMultiplier);

        return () => clearInterval(interval);
    }, [navStatus, cyclistIndex, activeRouteId, navSpeedMultiplier, trafficLights, segments, simulationState, constructionZones, citizenReports, navigationMode, voiceEnabled]);

    // D2. Real-time GPS Navigation watcher
    useEffect(() => {
        if (navStatus !== 'running' || navigationMode !== 'gps') return;

        if (!navigator.geolocation) {
            alert("La geolocalización no está soportada por tu navegador. Cambiando a Simulación.");
            setNavigationMode('simulated');
            return;
        }

        const activeRoute = generatedRoutes.find(r => r.id === activeRouteId);
        if (!activeRoute) return;

        const handleSuccess = (position) => {
            const { latitude, longitude, heading, speed } = position.coords;
            setCyclistCoords([latitude, longitude]);

            if (speed !== null && speed !== undefined) {
                setSpeedKmh(Math.round(speed * 3.6));
            } else {
                setSpeedKmh(15); // realistic cycling speed fallback
            }

            // Find closest coordinate index on the active route
            let closestIdx = 0;
            let minDist = Infinity;
            activeRoute.coordinates.forEach((coord, idx) => {
                const dist = Math.sqrt(Math.pow(coord[0] - latitude, 2) + Math.pow(coord[1] - longitude, 2));
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = idx;
                }
            });
            setCyclistIndex(closestIdx);

            // Dynamic recommendations based on current coordinate
            const riskInfo = evaluateCoordinateRisk(
                latitude, 
                longitude, 
                segments, 
                simulationState, 
                constructionZones, 
                simulationState.showConstruction,
                citizenReports
            );

            const currentRisk = riskInfo.level;
            if (lastRiskLevelRef.current === 'Alto' && currentRisk !== 'Alto') {
                setHudRecommendation('🟢 Zona segura alcanzada. Has salido del sector de riesgo.');
                audioGuidance.speakEvent('danger_zone_exit_gps', 'Has salido de la zona de riesgo. Vía segura.', 20, true);
            } else if (currentRisk === 'Alto' && lastRiskLevelRef.current !== 'Alto') {
                setHudRecommendation('⚠️ Sector con alerta de seguridad. Mantente en movimiento.');
                audioGuidance.speakEvent('high_risk_zone_gps', 'Zona de precaución. Mantén el pedaleo.', 40, true);
            }
            lastRiskLevelRef.current = currentRisk;
        };

        const handleError = (err) => {
            console.warn("GPS error:", err.message);
        };

        const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 5000
        });

        return () => navigator.geolocation.clearWatch(watchId);
    }, [navStatus, navigationMode, activeRouteId, generatedRoutes, segments, simulationState, constructionZones, citizenReports]);

    // 5. Update default origin when localidad changes
    useEffect(() => {
        if (localidad === 'usme') {
            setOriginInput('Portal Usme');
        } else {
            setOriginInput('Molinos');
        }
    }, [localidad]);

    // 6. Handle localidad switch
    const handleLocalidadChange = (loc) => {
        if (loc === localidad) return;
        setLocalidad(loc);
        handleClearRoute();
    };

    // 7. Select a segment (auditing)
    const handleSelectSegment = (id) => {
        setSelectedSegmentId(id);
        const segment = segments[id];
        if (segment) {
            setSimulationState({
                weather: segment.weather || 'seco',
                lightingType: segment.lightingType || 'Sodio',
                watts: segment.watts || 100,
                visibility: segment.visibility || 2,
                guardianCai: segment.guardianCai || false,
                guardianRuta: segment.guardianRuta || false,
                showConstruction: segment.showConstruction !== false,
                trafficJams: segment.trafficJams || false,
                accidents: segment.accidents || false
            });
            // Auto expand bottom sheet on mobile when a segment is audited
            setIsBottomSheetExpanded(true);
        }
    };

    // 8. Update simulation state values dynamically
    const handleSimulationStateChange = (key, value) => {
        setSimulationState(prev => {
            const updated = { ...prev, [key]: value };
            
            // Sync back to our segments database copy so map reflects changes
            if (selectedSegmentId) {
                setSegments(oldSegs => ({
                    ...oldSegs,
                    [selectedSegmentId]: {
                        ...oldSegs[selectedSegmentId],
                        [key]: value
                    }
                }));
            }
            return updated;
        });
    };

    // 9. Handle map clicks to create custom audit points
    const handleMapAuditClick = (latlng) => {
        const nearest = findNearestSegment(latlng, segments);
        
        const auditId = 'custom_audit';
        const activeLocalityConfig = localitiesMap[localidad];
        const customSeg = {
            id: auditId,
            name: `Calle Auditada (Lat: ${latlng.lat.toFixed(4)}, Lng: ${latlng.lng.toFixed(4)})`,
            localidad: activeLocalityConfig ? activeLocalityConfig.fullName : 'Usme (05)',
            upz: nearest ? nearest.upz : (localidad === 'usme' ? 'UPZ 57 - Gran Yomasa' : (localidad === 'ruu' ? 'UPZ 39 - Quiroga' : 'UPZ General')),
            baselineCrime: nearest ? nearest.baselineCrime : 'Medio',
            coordinates: [[latlng.lat, latlng.lng]],
            lightingType: 'Sodio',
            watts: 100,
            weather: 'seco',
            visibility: 2,
            guardianCai: false,
            guardianRuta: false
        };

        // Add to segment state
        setSegments(prev => ({
            ...prev,
            [auditId]: customSeg
        }));

        // Clear active route selection (if any) to focus on audited point details
        setGeneratedRoutes([]);
        setActiveRouteId(null);

        // Select the custom segment
        setSelectedSegmentId(auditId);
        setSimulationState({
            weather: 'seco',
            lightingType: 'Sodio',
            watts: 100,
            visibility: 2,
            guardianCai: false,
            guardianRuta: false,
            showConstruction: true,
            trafficJams: false,
            accidents: false
        });
        // Auto expand bottom sheet on mobile for custom audit points
        setIsBottomSheetExpanded(true);
    };

    // 10. Handle origin/destination selection from map crosshairs
    const handleLocationSelect = (latlng, mode) => {
        const activeMode = mode || selectingLocationMode;
        if (!activeMode) return;
        
        setSelectingLocationMode(null);

        if (activeMode === 'report') {
            setReportingCoords([latlng.lat, latlng.lng]);
            setIsSelectingCoords(false);
            return;
        }

        setRoutePoints(prev => ({
            ...prev,
            [activeMode]: { lat: latlng.lat, lng: latlng.lng }
        }));

        const formattedCoord = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
        if (activeMode === 'origin') {
            setOriginInput(formattedCoord);
        } else {
            setDestInput(formattedCoord);
        }

        if (isMobile) {
            setIsMobileSearchOpen(true);
        }
    };

    // 10b. Handle origin/destination selection from geocoding autocomplete or GPS
    const handleSelectOriginLocation = (coords, name) => {
        setRoutePoints(prev => ({
            ...prev,
            origin: coords
        }));
        if (name !== undefined) {
            setOriginInput(name);
        }
    };

    const handleSelectDestLocation = (coords, name) => {
        setRoutePoints(prev => ({
            ...prev,
            destination: coords
        }));
        if (name !== undefined) {
            setDestInput(name);
        }
    };

    // 10c. Citizen Science Report Handlers
    const handleSetSelectingCoords = (val) => {
        setIsSelectingCoords(val);
        if (val) {
            setSelectingLocationMode('report');
            // Close mobile scientific menu modal so user can see the map to select coordinates
            setShowScientificMenu(false);
        } else {
            if (selectingLocationMode === 'report') {
                setSelectingLocationMode(null);
            }
        }
    };

    const handleSubmitReport = () => {
        if (!reportingCoords) return;

        let updated = false;
        const updatedReports = citizenReports.map(report => {
            if (report.properties.estado === 'activo' && report.properties.tipo_novedad === reportingType) {
                const reportCoords = report.properties.coordenadas;
                const distDeg = Math.sqrt(Math.pow(reportCoords[0] - reportingCoords[0], 2) + Math.pow(reportCoords[1] - reportingCoords[1], 2));
                const distMeters = distDeg * 111000;
                
                if (distMeters <= 50) {
                    updated = true;
                    return {
                        ...report,
                        properties: {
                            ...report.properties,
                            numero_votos: report.properties.numero_votos + 1
                        }
                    };
                }
            }
            return report;
        });

        if (updated) {
            setCitizenReports(updatedReports);
            alert("Se detectó un reporte idéntico a menos de 50 metros. Se ha sumado tu respaldo (voto) al reporte existente en lugar de duplicarlo.");
        } else {
            const newReport = {
                type: "Feature",
                id: `report_${Date.now()}`,
                geometry: {
                    type: "Point",
                    coordinates: [reportingCoords[1], reportingCoords[0]]
                },
                properties: {
                    id: `report_${Date.now()}`,
                    coordenadas: [reportingCoords[0], reportingCoords[1]],
                    tipo_novedad: reportingType,
                    fecha_creacion: new Date().toISOString().split('T')[0],
                    numero_votos: 1,
                    estado: 'activo',
                    localidad: localidad === 'usme' ? 'Usme' : 'Rafael Uribe Uribe'
                }
            };
            setCitizenReports(prev => [...prev, newReport]);
            alert("Reporte creado con éxito.");
        }

        setIsReporting(false);
        setReportingCoords(null);
        setIsSelectingCoords(false);
    };

    const handleCancelReport = () => {
        setIsReporting(false);
        setReportingCoords(null);
        setIsSelectingCoords(false);
        if (selectingLocationMode === 'report') {
            setSelectingLocationMode(null);
        }
    };

    const handleZoomToReport = (coords) => {
        setZoomToCoords(coords);
        setTimeout(() => {
            setZoomToCoords(null);
        }, 1000);
    };

    const handleUpvoteReport = (reportId) => {
        setCitizenReports(prev => {
            return prev.map(report => {
                if (report.properties.id === reportId) {
                    return {
                        ...report,
                        properties: {
                            ...report.properties,
                            numero_votos: report.properties.numero_votos + 1
                        }
                    };
                }
                return report;
            });
        });
    };

    // Recalculate routes risk & cost in-place when citizen reports are updated
    useEffect(() => {
        if (generatedRoutes.length > 0) {
            setGeneratedRoutes(prevRoutes => {
                return prevRoutes.map(route => {
                    const riskDetails = calculateRouteAverageRisk(
                        route.coordinates,
                        segments,
                        simulationState,
                        constructionZones,
                        simulationState.showConstruction,
                        citizenReports
                    );
                    const routeCost = calculateRouteCost(
                        route.coordinates,
                        segments,
                        simulationState,
                        constructionZones,
                        simulationState.showConstruction,
                        citizenReports
                    );
                    return {
                        ...route,
                        avgRiskScore: riskDetails.avgScore,
                        maxRiskLevel: riskDetails.maxLevel,
                        cost: routeCost.toFixed(1)
                    };
                });
            });
        }
    }, [citizenReports]);

    // 11. Nominatim Geocoding Fetcher
    const geocodeAddress = async (addressText) => {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressText)},+Bogota,+Colombia&format=json&limit=1`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    name: data[0].display_name.split(',')[0]
                };
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
        }
        return null;
    };

    // 12. OSRM Routing Fetcher
    const fetchOSRMAlternatives = async (origin, dest) => {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data && data.code === 'Ok') {
                return data.routes;
            }
        } catch (error) {
            console.error("OSRM routing service failed:", error);
        }
        return [];
    };

    // 13. Trigger route plotting calculations
    const handleCalculateRoute = async () => {
        if (!originInput.trim() || !destInput.trim()) {
            alert("Por favor, ingresa origen y destino (escribiendo o haciendo clic en el mapa).");
            return;
        }

        setIsLoading(true);
        setSelectedSegmentId(null); // Deselect segment when plotting a route
        const coordRegex = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/;

        let originCoord = routePoints.origin;
        if (!originCoord) {
            const originMatch = originInput.match(coordRegex);
            if (originMatch) {
                originCoord = { lat: parseFloat(originMatch[1]), lng: parseFloat(originMatch[2]) };
            } else {
                const result = await geocodeAddress(originInput);
                if (result) {
                    originCoord = { lat: result.lat, lng: result.lng };
                    setOriginInput(result.name);
                } else {
                    alert(`No se pudo encontrar la ubicación de origen: "${originInput}"`);
                    setIsLoading(false);
                    return;
                }
            }
        }

        let destCoord = routePoints.destination;
        if (!destCoord) {
            const destMatch = destInput.match(coordRegex);
            if (destMatch) {
                destCoord = { lat: parseFloat(destMatch[1]), lng: parseFloat(destMatch[2]) };
            } else {
                const result = await geocodeAddress(destInput);
                if (result) {
                    destCoord = { lat: result.lat, lng: result.lng };
                    setDestInput(result.name);
                } else {
                    alert(`No se pudo encontrar la ubicación de destino: "${destInput}"`);
                    setIsLoading(false);
                    return;
                }
            }
        }

        setRoutePoints({ origin: originCoord, destination: destCoord });

        // Fetch OSRM routes
        const routesData = await fetchOSRMAlternatives(originCoord, destCoord);
        if (routesData.length === 0) {
            alert("No se pudieron encontrar rutas para los puntos ingresados.");
            setIsLoading(false);
            return;
        }

        const calculated = routesData.map((route, idx) => {
            const leafletCoords = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);
            const riskDetails = calculateRouteAverageRisk(
                leafletCoords, 
                segments, 
                simulationState, 
                constructionZones, 
                simulationState.showConstruction,
                citizenReports
            );
            const routeCost = calculateRouteCost(
                leafletCoords,
                segments,
                simulationState,
                constructionZones,
                simulationState.showConstruction,
                citizenReports
            );

            // Detect traffic jams on this route
            const jamsOnRoute = detectTrafficJamsOnRoute(leafletCoords, trafficJams);
            const totalDelayMinutes = jamsOnRoute.reduce((sum, j) => sum + j.delayMinutes, 0);
            const baseDurationMin = Math.round(route.duration / 60);
            
            return {
                id: `route_${idx}`,
                name: `Ruta ${idx + 1}`,
                distanceKm: (route.distance / 1000).toFixed(1),
                durationMin: String(baseDurationMin),
                durationWithTraffic: String(baseDurationMin + totalDelayMinutes),
                coordinates: leafletCoords,
                avgRiskScore: riskDetails.avgScore,
                maxRiskLevel: riskDetails.maxLevel,
                trafficJamsOnRoute: jamsOnRoute,
                totalDelayMinutes: totalDelayMinutes,
                cost: routeCost.toFixed(1)
            };
        });

        setGeneratedRoutes(calculated);
        setActiveRouteId('route_0');
        setIsLoading(false);

        // Mobile Bottom Sheet UX: Expand when routes are plotted
        setIsBottomSheetExpanded(true);
    };

    // 14. Clear route overlays
    const handleClearRoute = () => {
        setGeneratedRoutes([]);
        setActiveRouteId(null);
        setRoutePoints({ origin: null, destination: null });
        setDestInput('');
        setOriginInput(localidad === 'usme' ? 'Portal Usme' : 'Molinos');
        setSelectedSegmentId(null);
        setIsBottomSheetExpanded(false);
    };

    // 14b. Start 3D navigation
    const handleStartNavigation = (mode = 'simulated') => {
        const activeRoute = generatedRoutes.find(r => r.id === activeRouteId);
        if (!activeRoute) return;
        setNavigationMode(mode);
        setIsNavigating(true);
        setNavStatus('running');
        setCyclistIndex(0);
        setCyclistCoords(activeRoute.coordinates[0]);
        audioGuidance.speak("Iniciando recorrido hacia tu destino. Te acompañaré durante el viaje con alertas de seguridad en tiempo real.", true);
    };

    // 15. Calculate active predictions and CPTED recommendations
    let currentPrediction = { score: '2.4', level: 'Bajo', shaps: {} };
    let recommendations = [];

    const activeRoute = generatedRoutes.find(r => r.id === activeRouteId);

    if (activeRoute) {
        // Evaluate active route risk
        const riskLevel = activeRoute.avgRiskScore >= 7.0 ? 'Alto' : (activeRoute.avgRiskScore >= 3.8 ? 'Medio' : 'Bajo');
        
        let routeConstructionImpact = 0;
        if (simulationState.showConstruction) {
            const hasConstructionOnRoute = constructionZones.some(zone => {
                return activeRoute.coordinates.some(pt => {
                    const distDeg = Math.sqrt(Math.pow(pt[0] - zone.lat, 2) + Math.pow(pt[1] - zone.lng, 2));
                    return (distDeg * 111000) <= zone.radius;
                });
            });
            if (hasConstructionOnRoute) {
                routeConstructionImpact = 1.8;
            }
        }

        let routeCitizenImpact = 0;
        const step = Math.max(1, Math.floor(activeRoute.coordinates.length / 20));
        let count = 0;
        for (let i = 0; i < activeRoute.coordinates.length; i += step) {
            const pt = activeRoute.coordinates[i];
            const nearest = findNearestSegment({ lat: pt[0], lng: pt[1] }, segments);
            if (nearest) {
                routeCitizenImpact += calcularRiesgoCiudadano(nearest.id, citizenReports, segments);
            }
            count++;
        }
        routeCitizenImpact = parseFloat((routeCitizenImpact / count).toFixed(2));

        currentPrediction = {
            score: activeRoute.avgRiskScore,
            level: riskLevel,
            shaps: {
                'Iluminación': simulationState.lightingType === 'Sodio' ? 0.7 : -0.8,
                'Potencia Luz': 0.4 - ((simulationState.watts - 50) / 200) * 1.1,
                'Clima IDIGER': simulationState.weather === 'lluvia' ? 1.4 : -0.3,
                'Visibilidad CPTED': simulationState.visibility === 1 ? 0.9 : (simulationState.visibility === 3 ? -1.0 : 0.0),
                'Guardianes CAI/Ruta': (simulationState.guardianCai ? -1.3 : 0.0) + (simulationState.guardianRuta ? -0.9 : 0.0),
                'Frente Obra (IDU)': routeConstructionImpact,
                'Trancones (Waze)': simulationState.trafficJams ? 0.7 : -0.2,
                'Accidentes (CRUE)': simulationState.accidents ? 1.5 : 0.0,
                'Riesgo Ciudadano': routeCitizenImpact
            }
        };
        recommendations = getRouteRecommendations(activeRoute, simulationState, generatedRoutes, constructionZones, simulationState.showConstruction);
    } else if (selectedSegmentId && segments[selectedSegmentId]) {
        // Evaluate segment risk
        const segment = segments[selectedSegmentId];
        currentPrediction = calculateRisk(segment, constructionZones, simulationState.showConstruction, citizenReports, segments);
        recommendations = getRecommendations(segment, currentPrediction, simulationState);
    }

    // Prepare subcomponents as JSX to render inside layouts
    const headerComponent = (
        <FloatingHeader
            localidad={localidad}
            onLocalidadChange={handleLocalidadChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hideLogo={leftDrawerOpen}
        />
    );

    const mapComponent = (
        <MapComponent
            mapStyle={mapStyle}
            localidad={localidad}
            onLocalidadChange={handleLocalidadChange}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={handleSelectSegment}
            onMapAuditClick={handleMapAuditClick}
            routePoints={routePoints}
            selectingLocationMode={selectingLocationMode}
            onLocationSelect={handleLocationSelect}
            generatedRoutes={generatedRoutes}
            activeRouteId={activeRouteId}
            onSelectRoute={setActiveRouteId}
            simulationState={simulationState}
            bikeSegments={segments}
            constructionZones={constructionZones}
            showConstruction={simulationState.showConstruction}
            mapLayers={mapLayers}
            trafficJams={trafficJams}
            citizenReports={citizenReports}
            onUpvoteReport={handleUpvoteReport}
            zoomToCoords={zoomToCoords}
            trafficLights={trafficLights}
            isNavigating={isNavigating}
            navigationMode={navigationMode}
            cyclistCoords={cyclistCoords}
            cyclistIndex={cyclistIndex}
            activeRoute={activeRoute}
            leftDrawerOpen={leftDrawerOpen}
            rightDrawerOpen={rightDrawerOpen}
            isMobile={isMobile}
        />
    );

    const routePlannerComponent = (
        <RoutePlanner
            originInput={originInput}
            onOriginInputChange={setOriginInput}
            destInput={destInput}
            onDestInputChange={setDestInput}
            selectingLocationMode={selectingLocationMode}
            onSelectLocationModeChange={setSelectingLocationMode}
            onCalculateRoute={handleCalculateRoute}
            onClearRoute={handleClearRoute}
            hasRoute={generatedRoutes.length > 0}
            isLoading={isLoading}
            onSelectOriginLocation={handleSelectOriginLocation}
            onSelectDestLocation={handleSelectDestLocation}
            mapLayers={mapLayers}
            onMapLayersChange={setMapLayers}
            showBrandLogo={leftDrawerOpen}
            localidad={localidad}
            onLocalidadChange={handleLocalidadChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
        />
    );

    const simulatorPanelComponent = (
        <SimulatorPanel
            selectedSegment={selectedSegmentId ? segments[selectedSegmentId] : null}
            simulationState={simulationState}
            onSimulationStateChange={handleSimulationStateChange}
            viewMode={viewMode}
        />
    );

    const resultsPanelComponent = (
        <ResultsPanel
            prediction={currentPrediction}
            hasRoute={generatedRoutes.length > 0}
            generatedRoutes={generatedRoutes}
            activeRouteId={activeRouteId}
            onSelectRoute={setActiveRouteId}
            recommendations={recommendations}
            viewMode={viewMode}
            trafficJamsOnRoute={activeRoute ? activeRoute.trafficJamsOnRoute : []}
            totalDelayMinutes={activeRoute ? activeRoute.totalDelayMinutes : 0}
            onStartNavigation={handleStartNavigation}
        />
    );

    const statsPanelComponent = (
        <StatsPanel
            shaps={currentPrediction.shaps}
        />
    );

    const citizenSciencePanelComponent = (
        <CitizenSciencePanel
            citizenReports={citizenReports}
            localidad={localidad}
            isReporting={isReporting}
            setIsReporting={setIsReporting}
            reportingType={reportingType}
            setReportingType={setReportingType}
            reportingCoords={reportingCoords}
            isSelectingCoords={isSelectingCoords}
            setIsSelectingCoords={handleSetSelectingCoords}
            onSubmitReport={handleSubmitReport}
            onCancelReport={handleCancelReport}
            onZoomToReport={handleZoomToReport}
        />
    );

    const trafficLightsPanelComponent = (
        <TrafficLightsPanel 
            trafficLights={trafficLights}
            localidad={localidad}
            activeRoute={activeRoute}
            onToggleAutoCycle={() => setAutoCycleActive(!autoCycleActive)}
            autoCycleActive={autoCycleActive}
            onForceGreenWave={handleForceGreenWave}
            greenWaveActive={greenWaveActive}
            onToggleLightState={handleToggleLightState}
            dataSource={trafficLightsSource}
            isLoading={isLoadingTrafficLights}
            onRefreshData={() => loadTrafficLightsData(true)}
        />
    );



    // ETA Calculation helper for Waze bottom bar
    const getEstimatedArrivalTime = (durationMinutes) => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + parseInt(durationMinutes || '15', 10));
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const cockpitHUD = isNavigating && activeRoute && (
        <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-4 animate-fade-in select-none">
            {/* 1. Waze-style Top Navigation Maneuver Banner */}
            <div className="pointer-events-auto max-w-md w-full mx-auto bg-slate-950/92 backdrop-blur-md text-white rounded-2xl shadow-2xl p-3.5 border border-slate-800 flex items-center gap-3.5 animate-slide-down">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <i className="fa-solid fa-arrow-turn-up text-2xl text-cyan-400"></i>
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold text-white tracking-tight">
                            {Math.max(15, Math.round((1 - (cyclistIndex / Math.max(1, activeRoute.coordinates.length))) * (parseFloat(activeRoute.distanceKm) * 1000)))} m
                        </span>
                        <span className="text-2xs text-slate-400 uppercase font-bold">hacia</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 truncate">
                        {destInput ? destInput.split(',')[0] : 'Destino'}
                    </span>
                    <span className="text-[10px] text-slate-300 font-semibold mt-0.5 truncate flex items-center gap-1">
                        {hudRecommendation}
                    </span>
                </div>
                {nextTrafficLight && (
                    <div className="flex flex-col items-center justify-center px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0">
                        <i className="fa-solid fa-traffic-light text-base" style={{
                            color: nextTrafficLight.state === 'verde' ? '#10b981' : (nextTrafficLight.state === 'amarillo' ? '#eab308' : '#ef4444')
                        }}></i>
                        <span className="text-[9px] font-bold uppercase mt-0.5" style={{
                            color: nextTrafficLight.state === 'verde' ? '#10b981' : (nextTrafficLight.state === 'amarillo' ? '#eab308' : '#ef4444')
                        }}>{nextTrafficLight.state}</span>
                    </div>
                )}
            </div>

            {/* 2. Floating Circular Speedometer Widget (Lower Left - Waze style) */}
            <div className="flex justify-between items-end w-full max-w-lg mx-auto mb-2">
                <div className="pointer-events-auto w-16 h-16 rounded-full bg-slate-950/85 backdrop-blur-md border-2 border-cyan-500/80 shadow-xl flex flex-col items-center justify-center text-white">
                    <span className="text-lg font-black tracking-tight leading-none text-white">{speedKmh}</span>
                    <span className="text-[9px] font-bold text-cyan-400 uppercase leading-none mt-0.5">km/h</span>
                </div>

                {/* Quick Simulation Pause/Speed controls floating on right */}
                {navigationMode === 'simulated' && (
                    <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
                        <button
                            onClick={() => setNavStatus(navStatus === 'running' ? 'paused' : 'running')}
                            className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center cursor-pointer border-none text-xs"
                            title={navStatus === 'running' ? "Pausar" : "Reanudar"}
                        >
                            <i className={`fa-solid ${navStatus === 'running' ? 'fa-pause text-amber-400' : 'fa-play text-emerald-400'}`}></i>
                        </button>
                        {[1, 2, 5].map(mult => (
                            <button
                                key={mult}
                                onClick={() => setNavSpeedMultiplier(mult)}
                                className={`px-2 py-1 rounded-lg text-2xs font-extrabold cursor-pointer border-none ${
                                    navSpeedMultiplier === mult ? 'bg-cyan-500 text-white shadow-xs' : 'bg-transparent text-slate-400 hover:text-white'
                                }`}
                            >
                                {mult}x
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. Waze-style Bottom Card (Arrival Time, Remaining Km, Audio & Exit) */}
            <div className="pointer-events-auto max-w-md w-full mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl p-4 border border-slate-200 dark:border-slate-800 flex items-center justify-between animate-slide-up text-slate-900 dark:text-white">
                <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        {getEstimatedArrivalTime(activeRoute.durationMin)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{activeRoute.durationMin} min</span>
                        <span>•</span>
                        <span>{activeRoute.distanceKm} km</span>
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Voice Mute/Unmute toggle button */}
                    <button
                        onClick={() => {
                            const nextVal = !voiceEnabled;
                            setVoiceEnabled(nextVal);
                            if (nextVal) {
                                audioGuidance.speakRaw("Voz activada.");
                            } else {
                                audioGuidance.stop();
                            }
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border-none transition-all ${
                            voiceEnabled 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200' 
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                        }`}
                        title={voiceEnabled ? "Silenciar voz" : "Activar voz"}
                    >
                        <i className={`fa-solid ${voiceEnabled ? 'fa-volume-high text-sm' : 'fa-volume-xmark text-sm'}`}></i>
                    </button>

                    {/* Change Voice button */}
                    <button
                        onClick={() => {
                            const voices = audioGuidance.getVoices();
                            if (voices.length > 1) {
                                const currentUri = audioGuidance.selectedVoiceURI;
                                const currIdx = voices.findIndex(v => v.uri === currentUri);
                                const nextIdx = (currIdx + 1) % voices.length;
                                const nextVoice = voices[nextIdx];
                                audioGuidance.setVoice(nextVoice.uri);
                                audioGuidance.speakRaw(`Voz ${nextVoice.name}.`);
                            } else {
                                audioGuidance.speakRaw("Voz en español seleccionada.");
                            }
                        }}
                        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer border-none"
                        title="Cambiar tipo de voz"
                    >
                        <i className="fa-solid fa-microphone-lines text-xs"></i>
                    </button>

                    {/* Circular Blue Exit/Finish Button (like Waze cyan chevron/down circle) */}
                    <button
                        onClick={() => {
                            setNavStatus('stopped');
                            setIsNavigating(false);
                            setCyclistCoords(null);
                            setCyclistIndex(0);
                            setSpeedKmh(0);
                            setNextTrafficLight(null);
                            audioGuidance.stop();
                        }}
                        className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white flex items-center justify-center shadow-md cursor-pointer border-none transition-all ml-1"
                        title="Finalizar viaje"
                    >
                        <i className="fa-solid fa-chevron-down text-sm"></i>
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`relative w-screen h-screen overflow-hidden ${viewMode === 'tech' ? 'scientific-view' : 'citizen-view'}`}>
            
            {/* 1. Geospatial Map in Background */}
            <div className="absolute inset-0 z-0">
                {mapComponent}
            </div>

            {/* ==================== MOBILE LAYOUT (h < md) ==================== */}

            {/* 2. Floating Top Planner Card - hidden during navigation */}
            {isMobile && !isNavigating && !generatedRoutes.length && (
                <div 
                    onClick={() => setIsMobileSearchOpen(true)}
                    className="absolute top-4 left-4 right-4 z-10 backdrop-blur-md p-3.5 rounded-2xl shadow-lg flex items-center gap-3 max-w-[calc(100vw-2rem)] mx-auto cursor-pointer transition-all"
                    style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-surface)',
                        color: 'var(--text-on-surface)'
                    }}
                >
                    <i className="fa-solid fa-magnifying-glass text-emerald-600 text-base"></i>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>¿A dónde quieres ir hoy? (Planificar ruta)</span>
                </div>
            )}

            {isMobile && !isNavigating && generatedRoutes.length > 0 && (
                <div className="absolute top-4 left-4 right-4 z-10 bg-white/95 backdrop-blur-md border border-slate-200/80 p-3 rounded-2xl shadow-lg flex items-center justify-between text-slate-800 max-w-[calc(100vw-2rem)] mx-auto">
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <button 
                            onClick={handleClearRoute}
                            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer border-none"
                        >
                            <i className="fa-solid fa-arrow-left text-xs"></i>
                        </button>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Ruta Activa</span>
                            <span className="text-xs font-bold text-slate-800 truncate">
                                {originInput.split(',')[0]} ➔ {destInput.split(',')[0]}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsMobileSearchOpen(true)}
                        className="py-1.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-2xs cursor-pointer border-none flex-shrink-0"
                    >
                        Editar
                    </button>
                </div>
            )}

            {/* Mobile Search Overlay a Pantalla Completa */}
            {isMobile && isMobileSearchOpen && (
                <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-xl z-50 p-5 flex flex-col text-slate-100 animate-fade-in">
                    <div className="flex items-center gap-3.5 mb-5">
                        <button 
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-300 cursor-pointer border-none"
                        >
                            <i className="fa-solid fa-xmark text-sm"></i>
                        </button>
                        <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                            <i className="fa-solid fa-route text-emerald-500"></i> Planificar Ciclorruta
                        </h2>
                    </div>

                    <div className="flex flex-col gap-3 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/30 mb-5">
                        <FormField
                            value={originInput}
                            onChange={setOriginInput}
                            placeholder="Escribe origen o toca el mapa..."
                            iconClass="fa-solid fa-circle-play text-emerald-500"
                            onSelectOnMap={() => {
                                setSelectingLocationMode('origin');
                                setIsMobileSearchOpen(false);
                            }}
                            isSelecting={selectingLocationMode === 'origin'}
                            title="Fijar origen en el mapa"
                            onSelectLocation={handleSelectOriginLocation}
                            showGpsButton={true}
                        />
                        <FormField
                            value={destInput}
                            onChange={setDestInput}
                            placeholder="Escribe destino o toca el mapa..."
                            iconClass="fa-solid fa-location-dot text-rose-500"
                            onSelectOnMap={() => {
                                setSelectingLocationMode('destination');
                                setIsMobileSearchOpen(false);
                            }}
                            isSelecting={selectingLocationMode === 'destination'}
                            title="Fijar destino en el mapa"
                            onSelectLocation={handleSelectDestLocation}
                            showGpsButton={false}
                        />
                    </div>

                    <div className="flex-grow overflow-y-auto flex flex-col gap-2 mb-5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Destinos Recomendados</span>
                        {[
                            { name: 'Portal Usme', coords: { lat: 4.5317, lng: -74.1166 } },
                            { name: 'Estación Molinos', coords: { lat: 4.5631, lng: -74.1128 } },
                            { name: 'Parque Metropolitano El Tunal', coords: { lat: 4.5761, lng: -74.1332 } },
                            { name: 'UPZ Quiroga', coords: { lat: 4.5815, lng: -74.1118 } },
                            { name: 'Parque Entre Nubes', coords: { lat: 4.5539, lng: -74.0934 } }
                        ].map((loc, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    handleSelectDestLocation({ lat: loc.coords.lat, lng: loc.coords.lng }, loc.name);
                                }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/20 hover:bg-slate-800/60 transition-all text-left text-xs font-semibold text-slate-200 cursor-pointer border-none"
                            >
                                <i className="fa-solid fa-location-arrow text-slate-500 text-2xs"></i>
                                <span>{loc.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2.5">
                        <button
                            onClick={() => {
                                handleCalculateRoute();
                                setIsMobileSearchOpen(false);
                            }}
                            disabled={isLoading}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer border-none"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
                        >
                            {isLoading ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i> Trazando...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-compass"></i> Trazar Ruta
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* 3. Mobile Floating Action Buttons (FABs) - Consolidated and Clean */}
            {isMobile && !isMobileSearchOpen && (
                <div className="absolute top-20 right-4 z-10 flex flex-col gap-3 md:hidden">
                    {/* GPS Locate Button */}
                    <button 
                        onClick={() => {
                            const activeLocConfig = localitiesMap[localidad];
                            if (activeLocConfig) {
                                setZoomToCoords(activeLocConfig.center);
                                setTimeout(() => setZoomToCoords(null), 1000);
                            }
                        }}
                        className="fab-btn animate-fade-in"
                        title="Centrar Localidad"
                    >
                        <i className="fa-solid fa-crosshairs"></i>
                    </button>

                    {/* Consolidated Options Button */}
                    <div className="relative">
                        <button 
                            onClick={() => {
                                setMobileLayersOpen(!mobileLayersOpen);
                            }}
                            className={`fab-btn animate-fade-in ${mobileLayersOpen ? 'active' : ''}`}
                            title="Opciones de Mapa"
                        >
                            <i className="fa-solid fa-sliders"></i>
                        </button>
                        {mobileLayersOpen && (
                            <div className="absolute right-12 top-0 bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl z-20 w-64 text-slate-800 animate-fade-in flex flex-col gap-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                    <i className="fa-solid fa-sliders text-emerald-600"></i> Ajustes de Mapa
                                </h4>
                                
                                {/* Localidad switcher inline */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Localidad Activa:</span>
                                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                                        {Object.keys(localitiesMap).map(key => (
                                            <button
                                                key={key}
                                                onClick={() => handleLocalidadChange(key)}
                                                className={`flex-1 py-1 rounded text-2xs font-bold border-none cursor-pointer ${
                                                    localidad === key ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                                                }`}
                                                style={localidad === key ? { background: '#059669', color: '#fff' } : {}}
                                            >
                                                {localitiesMap[key].name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* View Mode Toggle Inline */}
                                <div className="flex justify-between items-center py-1.5 border-t border-slate-100 mt-1">
                                    <span className="text-2xs font-bold text-slate-700">Modo Científico</span>
                                    <input 
                                        type="checkbox" 
                                        checked={viewMode === 'tech'} 
                                        onChange={() => setViewMode(prev => prev === 'citizen' ? 'tech' : 'citizen')}
                                        className="accent-emerald-600 w-4 h-4 cursor-pointer"
                                    />
                                </div>

                                {/* Map Style Selector Inline */}
                                <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 pb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Estilo de Mapa:</span>
                                    <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                                        {[
                                            { key: 'light', label: 'Claro', icon: 'fa-sun' },
                                            { key: 'dark', label: 'Oscuro', icon: 'fa-moon' },
                                            { key: 'terrain', label: 'Relieve', icon: 'fa-mountain' }
                                        ].map(opt => (
                                            <button
                                                key={opt.key}
                                                onClick={() => setMapStyle(opt.key)}
                                                className={`flex-1 py-1 rounded text-[10px] font-bold border-none cursor-pointer flex items-center justify-center gap-1 ${
                                                    mapStyle === opt.key ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-650 hover:bg-slate-200'
                                                }`}
                                                style={mapStyle === opt.key ? { background: '#059669', color: '#fff' } : {}}
                                            >
                                                <i className={`fa-solid ${opt.icon}`}></i>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Map Layers List */}
                                <div className="border-t border-slate-100 pt-2 flex flex-col gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-450 uppercase">Capas del Mapa:</span>
                                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto text-2xs">
                                        <label className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-slate-750">Límites Localidades</span>
                                            <input type="checkbox" checked={mapLayers.localities} onChange={e => setMapLayers(p=>({...p, localities: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                        </label>
                                        <label className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-slate-750">CAIs Policía</span>
                                            <input type="checkbox" checked={mapLayers.cais} onChange={e => setMapLayers(p=>({...p, cais: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                        </label>
                                        <label className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-slate-755">Obras IDU</span>
                                            <input type="checkbox" checked={mapLayers.construction} onChange={e => setMapLayers(p=>({...p, construction: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                        </label>
                                        <label className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-slate-755">Accidentes</span>
                                            <input type="checkbox" checked={mapLayers.accidents} onChange={e => setMapLayers(p=>({...p, accidents: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                        </label>
                                        <label className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-slate-755">Robos 24h</span>
                                            <input type="checkbox" checked={mapLayers.robberies} onChange={e => setMapLayers(p=>({...p, robberies: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                        </label>
                                        <label className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-slate-755">Trancones</span>
                                            <input type="checkbox" checked={mapLayers.trafficJams} onChange={e => setMapLayers(p=>({...p, trafficJams: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                        </label>
                                        <label className="flex justify-between items-center py-1 border-b border-slate-50">
                                            <span className="text-slate-755">Semáforos</span>
                                            <input type="checkbox" checked={mapLayers.trafficLights} onChange={e => setMapLayers(p=>({...p, trafficLights: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                        </label>
                                        <label className="flex justify-between items-center py-1">
                                            <span className="text-slate-755">Reportes Ciudadanos</span>
                                            <input type="checkbox" checked={mapLayers.citizenReports} onChange={e => setMapLayers(p=>({...p, citizenReports: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 4. Mobile Bottom Sheet - hidden during active navigation */}
            {isMobile && !isNavigating && !isMobileSearchOpen && (generatedRoutes.length > 0 || selectedSegmentId || isReporting || mobileActiveTab === 'citizen') && (
                <div 
                    className={`fixed bottom-0 left-4 right-4 z-40 md:hidden backdrop-blur-md rounded-t-3xl shadow-2xl transition-all duration-300 ease-in-out flex flex-col max-w-[calc(100vw-2rem)] mx-auto ${
                        isBottomSheetExpanded ? 'h-[55vh]' : 'h-16'
                    }`}
                    style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-surface)',
                        color: 'var(--text-on-surface)'
                    }}
                >
                    {/* Handle Bar (Drag Trigger) */}
                    <div 
                        onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
                        className="flex flex-col items-center justify-center py-2 h-16 cursor-pointer select-none active:bg-slate-100 rounded-t-3xl border-b border-slate-100"
                    >
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mb-1"></div>
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <span>
                                {generatedRoutes.length > 0 
                                    ? `${generatedRoutes.length} Ruta(s) calculada(s)`
                                    : selectedSegmentId === 'custom_audit'
                                        ? 'Calle Auditada Seleccionada'
                                        : isReporting
                                            ? 'Nuevo Reporte Ciudadano'
                                            : 'Tramo Seleccionado'}
                            </span>
                            <i className={`fa-solid ${isBottomSheetExpanded ? 'fa-chevron-down' : 'fa-chevron-up'} text-[10px] text-slate-500`}></i>
                        </div>
                        {/* Quick summary line when collapsed */}
                        {!isBottomSheetExpanded && activeRoute && (
                            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                {activeRoute.name} - {activeRoute.distanceKm} km - {activeRoute.durationMin} min - Riesgo: {activeRoute.maxRiskLevel}
                            </span>
                        )}
                        {!isBottomSheetExpanded && selectedSegmentId && segments[selectedSegmentId] && (
                            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                {segments[selectedSegmentId].name.slice(0, 35)}... - Riesgo: {currentPrediction.level}
                            </span>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 pb-6 text-slate-850">
                        {isBottomSheetExpanded && (
                            <div className="flex bg-slate-100 p-1 border border-slate-200 rounded-xl mb-4">
                                <button
                                    onClick={() => setMobileActiveTab('results')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                                        mobileActiveTab === 'results' 
                                            ? 'bg-emerald-600 text-white shadow-sm' 
                                            : 'text-slate-650 hover:bg-slate-200/60'
                                    }`}
                                    style={mobileActiveTab === 'results' ? { background: '#059669', color: '#fff' } : {}}
                                >
                                    <i className="fa-solid fa-route"></i> Ruta
                                </button>
                                <button
                                    onClick={() => setMobileActiveTab('cpted')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                                        mobileActiveTab === 'cpted' 
                                            ? 'bg-emerald-600 text-white shadow-sm' 
                                            : 'text-slate-650 hover:bg-slate-200/60'
                                    }`}
                                    style={mobileActiveTab === 'cpted' ? { background: '#059669', color: '#fff' } : {}}
                                >
                                    <i className="fa-solid fa-sliders"></i> CPTED
                                </button>
                                <button
                                    onClick={() => setMobileActiveTab('services')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border-none ${
                                        mobileActiveTab === 'services' 
                                            ? 'bg-emerald-600 text-white shadow-sm' 
                                            : 'text-slate-650 hover:bg-slate-200/60'
                                    }`}
                                    style={mobileActiveTab === 'services' ? { background: '#059669', color: '#fff' } : {}}
                                >
                                    <i className="fa-solid fa-traffic-light"></i> Servicios
                                </button>
                            </div>
                        )}

                        {/* Switch Panel Contents */}
                        {(!isBottomSheetExpanded || mobileActiveTab === 'results') && (
                            <div className="flex flex-col gap-4">
                                {resultsPanelComponent}
                                {viewMode === 'tech' && (
                                    <div className="mt-2 border-t border-slate-200 pt-4">
                                        {statsPanelComponent}
                                    </div>
                                )}
                            </div>
                        )}
                        {isBottomSheetExpanded && mobileActiveTab === 'cpted' && simulatorPanelComponent}
                        {isBottomSheetExpanded && mobileActiveTab === 'services' && (
                            <div className="flex flex-col gap-4">
                                {trafficLightsPanelComponent}
                                <div className="border-t border-slate-200 pt-4 my-2">
                                    {citizenSciencePanelComponent}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* ==================== DESKTOP LAYOUT (md: relative flex-row) ==================== */}

            {/* 5. Desktop Floating Header – hidden during active navigation */}
            {!isMobile && !isNavigating && !leftDrawerOpen && (
                <div className="hidden md:block">
                    {headerComponent}
                </div>
            )}

            {/* 6. Desktop Left Drawer – hidden during active 3D navigation */}
            {!isMobile && !isNavigating && (
                <div className={`floating-drawer left-drawer ${leftDrawerOpen ? 'open' : 'closed'} hidden md:flex`}>
                    <div className="sidebar-tabs-vertical">
                        <button 
                            onClick={() => setActiveTab('routes')} 
                            className={`tab-vertical-btn ${activeTab === 'routes' ? 'active' : ''}`}
                            title="Planificador de Rutas"
                        >
                            <i className="fa-solid fa-map-location-dot"></i>
                        </button>
                        <button 
                            onClick={() => setActiveTab('cpted')} 
                            className={`tab-vertical-btn ${activeTab === 'cpted' ? 'active' : ''}`}
                            title="CPTED y Simulación"
                        >
                            <i className="fa-solid fa-sliders"></i>
                        </button>
                        <button 
                            onClick={() => setActiveTab('citizen')} 
                            className={`tab-vertical-btn ${activeTab === 'citizen' ? 'active' : ''}`}
                            title="Ciencia Ciudadana"
                        >
                            <i className="fa-solid fa-people-group"></i>
                        </button>
                        <button 
                            onClick={() => setActiveTab('lights')} 
                            className={`tab-vertical-btn ${activeTab === 'lights' ? 'active' : ''}`}
                            title="Semáforos e Intersecciones"
                        >
                            <i className="fa-solid fa-traffic-light"></i>
                        </button>

                        
                        {/* Spacer to push dark mode button to the bottom */}
                        <div className="flex-grow"></div>
                        
                        <button 
                            onClick={() => {
                                if (mapStyle === 'light') setMapStyle('dark');
                                else if (mapStyle === 'dark') setMapStyle('terrain');
                                else setMapStyle('light');
                            }}
                            className="tab-vertical-btn"
                            title={
                                mapStyle === 'light' ? "Modo Oscuro" : 
                                mapStyle === 'dark' ? "Modo Elevaciones (3D/Relieve)" : 
                                "Modo Claro"
                            }
                            style={{ 
                                color: mapStyle === 'light' ? 'var(--text-secondary)' : 
                                       mapStyle === 'dark' ? '#eab308' : '#38bdf8' 
                            }}
                        >
                            <i className={`fa-solid ${
                                mapStyle === 'light' ? 'fa-moon' : 
                                mapStyle === 'dark' ? 'fa-mountain' : 
                                'fa-sun'
                            }`}></i>
                        </button>
                    </div>

                    <div className="drawer-content scrollable">
                        {activeTab === 'routes' && (
                            <>
                                {routePlannerComponent}
                                {generatedRoutes.length > 0 && (
                                    <>
                                        <div className="drawer-divider"></div>
                                        {resultsPanelComponent}
                                        {viewMode === 'tech' && (
                                            <>
                                                <div className="drawer-divider"></div>
                                                {statsPanelComponent}
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                        {activeTab === 'cpted' && (
                            <>
                                {simulatorPanelComponent}
                                {selectedSegmentId && (
                                    <>
                                        <div className="drawer-divider"></div>
                                        {resultsPanelComponent}
                                        {viewMode === 'tech' && (
                                            <>
                                                <div className="drawer-divider"></div>
                                                {statsPanelComponent}
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                         {activeTab === 'citizen' && citizenSciencePanelComponent}
                        {activeTab === 'lights' && trafficLightsPanelComponent}
                    </div>
                    
                    <button 
                        onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
                        className="drawer-toggle-btn left-toggle"
                        title={leftDrawerOpen ? "Contraer Panel" : "Expandir Panel"}
                        aria-label="Contraer Panel Izquierdo"
                    >
                        <i className={`fa-solid ${leftDrawerOpen ? 'fa-chevron-left' : 'fa-sliders'}`}></i>
                    </button>
                </div>
            )}

            {/* 7. Desktop Floating Map Controls (Top Right) */}
            {!isMobile && !isNavigating && (
                <div className="hidden md:flex absolute top-6 right-6 z-20 flex-col gap-2.5">
                    <div className="relative">
                        <button 
                            onClick={() => setDesktopLayersOpen(!desktopLayersOpen)}
                            className={`w-10 h-10 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 shadow-md flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-all ${desktopLayersOpen ? 'ring-2 ring-emerald-600' : ''}`}
                            title="Capas del Mapa"
                        >
                            <i className="fa-solid fa-layer-group text-sm text-emerald-600"></i>
                        </button>
                        {desktopLayersOpen && (
                            <div className="absolute right-12 top-0 bg-white/95 backdrop-blur-md border border-slate-200 p-3.5 rounded-2xl shadow-xl z-30 w-64 text-slate-800 animate-fade-in flex flex-col gap-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                    <i className="fa-solid fa-layer-group text-emerald-600"></i> Capas del Mapa
                                </h4>
                                <div className="flex flex-col gap-1 text-xs">
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">Límites Localidades</span>
                                        <input type="checkbox" checked={mapLayers.localities} onChange={e => setMapLayers(p=>({...p, localities: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">CAIs Policía</span>
                                        <input type="checkbox" checked={mapLayers.cais} onChange={e => setMapLayers(p=>({...p, cais: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">Obras IDU</span>
                                        <input type="checkbox" checked={mapLayers.construction} onChange={e => setMapLayers(p=>({...p, construction: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">Accidentes</span>
                                        <input type="checkbox" checked={mapLayers.accidents} onChange={e => setMapLayers(p=>({...p, accidents: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">Robos 24h</span>
                                        <input type="checkbox" checked={mapLayers.robberies} onChange={e => setMapLayers(p=>({...p, robberies: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">Trancones</span>
                                        <input type="checkbox" checked={mapLayers.trafficJams} onChange={e => setMapLayers(p=>({...p, trafficJams: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">Semáforos</span>
                                        <input type="checkbox" checked={mapLayers.trafficLights} onChange={e => setMapLayers(p=>({...p, trafficLights: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">Reportes Ciudadanos</span>
                                        <input type="checkbox" checked={mapLayers.citizenReports} onChange={e => setMapLayers(p=>({...p, citizenReports: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 8. Desktop Floating Footer (Bottom centered) – hidden during navigation */}
            {!isMobile && !isNavigating && (
                <footer className="hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-[10px] text-slate-500 text-center bg-white/80 py-1.5 px-4 rounded-full border border-slate-200/50 backdrop-blur shadow-sm">
                    <p><strong>Ruta Clara v1.0.0 (MVP)</strong> • Semillero Construcción de software para la transformación del territorio</p>
                </footer>
            )}

            {/* 9. Cockpit HUD Overlay during 3D Navigation */}
            {cockpitHUD}
        </div>
    );
}
