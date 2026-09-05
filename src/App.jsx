import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { robberyReports } from './data/robberyReports';
import { accidentPoints } from './data/accidentPoints';
import { caiPoints } from './data/caiPoints';
import { fetchBogotaTrafficLights } from './utils/trafficLightsService';
import { audioGuidance } from './utils/audioGuidanceService';
import { wakeLockService } from './utils/wakeLockService';
import { fetchBogotaWeather } from './utils/weatherService';
import { calculateRouteElevationProfile } from './utils/elevationService';
import SafeHavenEmergencyModal from './components/molecules/SafeHavenEmergencyModal';
import InterventionSimulatorModal from './components/organisms/InterventionSimulatorModal';
import ModelValidationModal from './components/organisms/ModelValidationModal';
import PriorityHeatmapPanel from './components/organisms/PriorityHeatmapPanel';
import CptedAuditModal from './components/organisms/CptedAuditModal';
import ToastContainer from './components/atoms/ToastContainer';
import MobileBottomDock from './components/molecules/MobileBottomDock';
import QuickDestinationChips from './components/molecules/QuickDestinationChips';
import OnboardingTourModal from './components/molecules/OnboardingTourModal';
import KeyboardShortcutsModal from './components/molecules/KeyboardShortcutsModal';
import { emitToast } from './utils/toastService';
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

    // Map Layers Visibility State (Optimized defaults for mobile fluidity)
    const [mapLayers, setMapLayers] = useState({
        localities: true,
        cais: true,
        construction: false,
        accidents: false,
        robberies: false,
        trafficJams: true,
        citizenReports: true,
        trafficLights: true,
        caravans: false
    });

    const [desktopLayersOpen, setDesktopLayersOpen] = useState(false);

    // Weather & Time of Day State
    const [weatherData, setWeatherData] = useState(null);
    const [departureHour, setDepartureHour] = useState(null); // null = "Ahora"

    // Scientific & Emergency Modals State
    const [isSafeHavenOpen, setIsSafeHavenOpen] = useState(false);
    const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
    const [isModelValidationOpen, setIsModelValidationOpen] = useState(false);
    const [isPriorityHeatmapOpen, setIsPriorityHeatmapOpen] = useState(false);
    const [isCptedAuditOpen, setIsCptedAuditOpen] = useState(false);

    // Usability, Toasts, Zen Mode & Onboarding State (Heurística 1, 3, 7, 8, 10)
    const [toasts, setToasts] = useState([]);
    const [isZenMode, setIsZenMode] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
        return typeof window !== 'undefined' && !localStorage.getItem('rutaclara_onboarding_dismissed');
    });
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

    const showToast = (message, type = 'info') => {
        const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3600);
    };

    const handleDismissToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Escucha de eventos desacoplados de toast
    useEffect(() => {
        const handleToastEvent = (e) => {
            if (e.detail && e.detail.message) {
                showToast(e.detail.message, e.detail.type || 'info');
            }
        };
        window.addEventListener('rutaclara-toast', handleToastEvent);
        return () => window.removeEventListener('rutaclara-toast', handleToastEvent);
    }, []);

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

        // Mantener la pantalla encendida (Android y navegadores web)
        wakeLockService.requestWakeLock();

        // Desbloquear audio en dispositivos móviles al primer toque/clic
        const handleUserGestureUnlock = () => {
            audioGuidance.unlockAudio();
            window.removeEventListener('click', handleUserGestureUnlock);
            window.removeEventListener('touchstart', handleUserGestureUnlock);
        };
        window.addEventListener('click', handleUserGestureUnlock);
        window.addEventListener('touchstart', handleUserGestureUnlock);

        // Cargar clima real de Bogotá
        fetchBogotaWeather().then(w => {
            if (w) {
                setWeatherData(w);
                if (w.condition === 'lluvia') {
                    setSimulationState(prev => ({ ...prev, weather: 'lluvia' }));
                }
            }
        });

        return () => {
            window.removeEventListener('click', handleUserGestureUnlock);
            window.removeEventListener('touchstart', handleUserGestureUnlock);
        };
    }, []);

    // Auto-detect user GPS location on start to set as default origin
    useEffect(() => {
        if (!navigator.geolocation) {
            const fallback = localidad === 'usme' ? { lat: 4.5317, lng: -74.1166 } : { lat: 4.5631, lng: -74.1128 };
            setRoutePoints(prev => ({ ...prev, origin: fallback }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(coords);
                setRoutePoints(prev => ({ ...prev, origin: coords }));
                setOriginInput('📍 Tu ubicación actual');
            },
            (err) => {
                console.warn("Geolocalización automática por defecto:", err.message);
                const fallback = localidad === 'usme' ? { lat: 4.5317, lng: -74.1166 } : { lat: 4.5631, lng: -74.1128 };
                setRoutePoints(prev => ({ ...prev, origin: fallback }));
                setOriginInput(localidad === 'usme' ? 'Portal Usme' : 'Molinos');
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    }, []);

    // 3D Navigation Simulator State
    const [isNavigating, setIsNavigating] = useState(false);
    const [navigationMode, setNavigationMode] = useState('simulated'); // 'simulated' | 'gps'
    const [cyclistCoords, setCyclistCoords] = useState(null);
    const [cyclistIndex, setCyclistIndex] = useState(0);
    const [cyclistBearing, setCyclistBearing] = useState(0);
    const [navSpeedMultiplier, setNavSpeedMultiplier] = useState(1);
    const [navStatus, setNavStatus] = useState('stopped');
    const [speedKmh, setSpeedKmh] = useState(0);
    const [hudRecommendation, setHudRecommendation] = useState('Haz clic en Iniciar para comenzar la navegación.');
    const [nextTrafficLight, setNextTrafficLight] = useState(null);
    const [isCameraLocked, setIsCameraLocked] = useState(true);
    const cyclistIndexRef = useRef(0);
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
    const [userLocation, setUserLocation] = useState(null);
    const [originInput, setOriginInput] = useState('📍 Tu ubicación actual');
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

    // Atajos de teclado globales (Heurística 3 y 7: Control del usuario y flexibilidad)
    useEffect(() => {
        const handleKeyDown = (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            const isTyping = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';

            if (e.key === 'Escape') {
                if (isShortcutsOpen) { setIsShortcutsOpen(false); return; }
                if (isOnboardingOpen) { setIsOnboardingOpen(false); return; }
                if (isSafeHavenOpen) { setIsSafeHavenOpen(false); return; }
                if (isInterventionModalOpen) { setIsInterventionModalOpen(false); return; }
                if (isModelValidationOpen) { setIsModelValidationOpen(false); return; }
                if (isPriorityHeatmapOpen) { setIsPriorityHeatmapOpen(false); return; }
                if (isCptedAuditOpen) { setIsCptedAuditOpen(false); return; }
                if (isZenMode) { setIsZenMode(false); return; }
                if (selectingLocationMode) { setSelectingLocationMode(null); return; }
                return;
            }

            if (isTyping) return;

            if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                setIsZenMode(prev => {
                    const next = !prev;
                    showToast(next ? '🧘 Modo Zen activado (Mapa a pantalla completa)' : 'Modo estándar restaurado', 'info');
                    return next;
                });
            } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                setIsShortcutsOpen(prev => !prev);
            } else if (e.key === ' ' && isNavigating && navigationMode === 'simulated') {
                e.preventDefault();
                setNavStatus(prev => {
                    const next = prev === 'running' ? 'paused' : 'running';
                    showToast(next === 'running' ? '▶️ Navegación reanudada' : '⏸️ Navegación pausada', 'info');
                    return next;
                });
            } else if (['1', '2', '3'].includes(e.key) && generatedRoutes.length > 0) {
                const targetIdx = parseInt(e.key, 10) - 1;
                if (generatedRoutes[targetIdx]) {
                    setActiveRouteId(generatedRoutes[targetIdx].id);
                    showToast(`Alternativa seleccionada: ${generatedRoutes[targetIdx].name}`, 'info');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isShortcutsOpen, isOnboardingOpen, isSafeHavenOpen, isInterventionModalOpen, isModelValidationOpen, isPriorityHeatmapOpen, isCptedAuditOpen, isZenMode, selectingLocationMode, isNavigating, navigationMode, generatedRoutes]);

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

    const activeRoute = generatedRoutes.find(r => r.id === activeRouteId);

    // Precalculate dense interpolated points (~6m apart) ONCE when active route changes
    const denseCoords = useMemo(() => {
        if (!activeRoute || !activeRoute.coordinates || activeRoute.coordinates.length < 2) return [];
        const rawCoords = activeRoute.coordinates;
        const dense = [];
        const stepDeg = 6 / 111000; // ~6 meters per step

        for (let i = 0; i < rawCoords.length - 1; i++) {
            const p1 = rawCoords[i];
            const p2 = rawCoords[i + 1];
            dense.push(p1);

            const dLat = p2[0] - p1[0];
            const dLng = p2[1] - p1[1];
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);

            if (dist > stepDeg) {
                const steps = Math.floor(dist / stepDeg);
                for (let s = 1; s <= steps; s++) {
                    const frac = s / (steps + 1);
                    dense.push([
                        p1[0] + dLat * frac,
                        p1[1] + dLng * frac
                    ]);
                }
            }
        }
        dense.push(rawCoords[rawCoords.length - 1]);
        return dense;
    }, [activeRouteId, generatedRoutes]);

    const trafficLightsRef = useRef(trafficLights);
    trafficLightsRef.current = trafficLights;

    const segmentsRef = useRef(segments);
    segmentsRef.current = segments;

    const simulationStateRef = useRef(simulationState);
    simulationStateRef.current = simulationState;

    const constructionZonesRef = useRef(constructionZones);
    constructionZonesRef.current = constructionZones;

    const citizenReportsRef = useRef(citizenReports);
    citizenReportsRef.current = citizenReports;

    const robberyReportsRef = useRef(robberyReports);
    robberyReportsRef.current = robberyReports;

    const accidentPointsRef = useRef(accidentPoints);
    accidentPointsRef.current = accidentPoints;

    const caiPointsRef = useRef(caiPoints);
    caiPointsRef.current = caiPoints;

    // D. Smooth Continuous Navigation Simulation loop (Ultra-optimized for mobile 60fps)
    useEffect(() => {
        if (navStatus !== 'running' || denseCoords.length < 2 || navigationMode === 'gps') return;

        let waitTicks = 0;

        const interval = setInterval(() => {
            const currIdx = cyclistIndexRef.current;
            if (currIdx >= denseCoords.length - 1) {
                // Simulation ended successfully
                setNavStatus('stopped');
                setIsNavigating(false);
                setIsCameraLocked(true);
                setCyclistCoords(null);
                setCyclistIndex(0);
                cyclistIndexRef.current = 0;
                setSpeedKmh(0);
                setNextTrafficLight(null);
                audioGuidance.speakRaw("¡Felicidades! Has llegado a tu destino.", true);
                showToast("🎉 ¡Has llegado a tu destino de forma segura!", "success");
                return;
            }

            const currentPt = denseCoords[currIdx];

            // Detect next traffic light within 65m corridor
            const nearbyLight = trafficLightsRef.current.find(light => {
                const distDeg = Math.sqrt(
                    Math.pow(currentPt[0] - light.coordinates[0], 2) + 
                    Math.pow(currentPt[1] - light.coordinates[1], 2)
                );
                return (distDeg * 111000) <= 65;
            });

            if (nearbyLight) {
                setNextTrafficLight(nearbyLight);
                if (nearbyLight.state === 'rojo') {
                    setSpeedKmh(0);
                    setHudRecommendation(`🚦 Semáforo en ROJO en ${nearbyLight.intersection || 'intersección'}. Detén la marcha.`);
                    audioGuidance.speakEvent(`light_red_${nearbyLight.id || nearbyLight.intersection}`, 'Atención, semáforo en rojo. Detén la marcha.', 20, true);
                    waitTicks++;
                    if (waitTicks < 6) {
                        return; // pause cyclist progression temporarily
                    }
                } else if (nearbyLight.state === 'verde') {
                    setHudRecommendation(`🟢 Semáforo en VERDE en ${nearbyLight.intersection || 'intersección'}. Cruce libre.`);
                    audioGuidance.speakEvent(`light_green_${nearbyLight.id || nearbyLight.intersection}`, 'Semáforo en verde. Cruce libre.', 25, false);
                } else if (nearbyLight.state === 'amarillo') {
                    setHudRecommendation(`🟡 Semáforo en AMARILLO en ${nearbyLight.intersection || 'intersección'}. Precaución.`);
                    audioGuidance.speakEvent(`light_yellow_${nearbyLight.id || nearbyLight.intersection}`, 'Semáforo en amarillo. Precaución.', 25, true);
                }
            } else {
                setNextTrafficLight(null);
            }

            waitTicks = 0;

            const nextIdx = currIdx + 1;
            cyclistIndexRef.current = nextIdx;
            setCyclistIndex(nextIdx);
            setCyclistCoords(denseCoords[nextIdx]);

            // Calculate precise travel heading along immediate road segment
            const p1 = denseCoords[nextIdx];
            const p2 = denseCoords[Math.min(nextIdx + 2, denseCoords.length - 1)];
            if (p1 && p2 && (p1[0] !== p2[0] || p1[1] !== p2[1])) {
                const lat1 = p1[0] * Math.PI / 180;
                const lon1 = p1[1] * Math.PI / 180;
                const lat2 = p2[0] * Math.PI / 180;
                const lon2 = p2[1] * Math.PI / 180;
                const dLon = lon2 - lon1;
                const y = Math.sin(dLon) * Math.cos(lat2);
                const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
                const brng = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
                setCyclistBearing(brng);
            }

            // Realistic smooth speed (16-22 km/h)
            const baseSpeed = 19;
            const variance = Math.sin(nextIdx * 0.2) * 2.5;
            setSpeedKmh(Math.round(baseSpeed + variance));

            // Dynamic recommendations & Voice Copilot periodically (every 8 steps = ~50m)
            if (nextIdx % 8 === 0) {
                const currentCoord = denseCoords[nextIdx];
                const riskInfo = evaluateCoordinateRisk(
                    currentCoord[0], 
                    currentCoord[1], 
                    segmentsRef.current, 
                    simulationStateRef.current, 
                    constructionZonesRef.current, 
                    simulationStateRef.current?.showConstruction,
                    citizenReportsRef.current
                );

                const nearbyRobbery = robberyReportsRef.current.find(r => {
                    const distDeg = Math.sqrt(Math.pow(currentCoord[0] - r.lat, 2) + Math.pow(currentCoord[1] - r.lng, 2));
                    return (distDeg * 111000) <= 100;
                });

                const nearbyAccident = accidentPointsRef.current.find(a => {
                    const distDeg = Math.sqrt(Math.pow(currentCoord[0] - a.lat, 2) + Math.pow(currentCoord[1] - a.lng, 2));
                    return (distDeg * 111000) <= 100;
                });

                const nearbyCai = caiPointsRef.current.find(c => {
                    const distDeg = Math.sqrt(Math.pow(currentCoord[0] - c.lat, 2) + Math.pow(currentCoord[1] - c.lng, 2));
                    return (distDeg * 111000) <= 90;
                });

                const nearbyConst = constructionZonesRef.current.find(zone => {
                    const distDeg = Math.sqrt(Math.pow(currentCoord[0] - zone.lat, 2) + Math.pow(currentCoord[1] - zone.lng, 2));
                    return (distDeg * 111000) <= zone.radius;
                });

                const nearbyReport = citizenReportsRef.current.find(report => {
                    const rCoords = report.properties?.coordenadas;
                    if (!rCoords) return false;
                    const distDeg = Math.sqrt(Math.pow(currentCoord[0] - rCoords[0], 2) + Math.pow(currentCoord[1] - rCoords[1], 2));
                    return (distDeg * 111000) <= 80;
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

                if (nearbyRobbery) {
                    setHudRecommendation(`🔴 Alerta de Hurto: ${nearbyRobbery.name}`);
                    audioGuidance.speakEvent(`rob_${nearbyRobbery.id}`, `Alerta, reporte de hurto cercano en ${nearbyRobbery.name}. Mantente atento.`, 40, true);
                } else if (nearbyAccident) {
                    setHudRecommendation(`🚗 Accidente de Tránsito: ${nearbyAccident.name}`);
                    audioGuidance.speakEvent(`acc_${nearbyAccident.id}`, `Precaución, reporte de siniestro vial en ${nearbyAccident.name}.`, 40, true);
                } else if (nearbyReport) {
                    const tipo = nearbyReport.properties.tipo_novedad;
                    if (tipo.toLowerCase().includes('luminaria') || tipo.toLowerCase().includes('lobo') || tipo.toLowerCase().includes('oscur')) {
                        setHudRecommendation('💡 Tramo con baja iluminación. Enciende luces.');
                        audioGuidance.speakEvent(`light_${nearbyReport.id}`, 'Zona con poca iluminación reportada. Enciende tus luces.', 45, true);
                    } else if (tipo.toLowerCase().includes('hueco') || tipo.toLowerCase().includes('daño') || tipo.toLowerCase().includes('destructiva')) {
                        setHudRecommendation('⚠️ Daño o bache en ciclorruta reportado.');
                        audioGuidance.speakEvent(`pothole_${nearbyReport.id}`, 'Bache o deterioro en la calzada adelante.', 45, true);
                    } else {
                        setHudRecommendation(`📢 Reporte ciudadano: ${tipo.split('/')[0]}`);
                        audioGuidance.speakEvent(`rep_${nearbyReport.id}`, `Reporte ciudadano en la vía: ${tipo.split('/')[0]}.`, 45, true);
                    }
                } else if (nearbyConst) {
                    setHudRecommendation('🚧 Obras viales del IDU adelante. Precaución.');
                    audioGuidance.speakEvent(`const_${nearbyConst.lat}`, 'Obras viales adelante. Reduce la velocidad.', 50);
                } else if (nearbyCai) {
                    setHudRecommendation(`👮 CAI de Policía: ${nearbyCai.name}`);
                    audioGuidance.speakEvent(`cai_${nearbyCai.id}`, `CAI de policía ${nearbyCai.name} cercano.`, 60);
                } else if (simulationStateRef.current?.weather === 'lluvia') {
                    setHudRecommendation('🌧️ Calzada mojada por lluvias. Conduce con cuidado.');
                    audioGuidance.speakEvent('rain_warning', 'Calzada resbaladiza por lluvia.', 90);
                } else if (nearbyLight && nearbyLight.state === 'verde') {
                    setHudRecommendation('🟢 Cruce con semáforo en VERDE. Paso libre.');
                    audioGuidance.speakEvent(`light_green_${nearbyLight.id || nearbyLight.coordinates.join('_')}`, 'Semáforo en verde. Cruce libre.', 25, false);
                } else if (nearbyLight && nearbyLight.state === 'rojo') {
                    setHudRecommendation('🔴 Semáforo en ROJO en la intersección.');
                    audioGuidance.speakEvent(`light_red_${nearbyLight.id || nearbyLight.coordinates.join('_')}`, 'Semáforo en rojo.', 20, true);
                } else {
                    setHudRecommendation('🚴 Ruta despejada. Disfruta tu recorrido.');
                }
            }
        }, 150 / navSpeedMultiplier);

        return () => clearInterval(interval);
    }, [navStatus, navigationMode, navSpeedMultiplier, denseCoords]);

    // D2. Real-time GPS Navigation watcher
    useEffect(() => {
        if (navStatus !== 'running' || navigationMode !== 'gps') return;

        if (!navigator.geolocation) {
            showToast("La geolocalización no está soportada. Cambiando a Simulación.", "warning");
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

            // POI safety alerts in real-time GPS mode
            const nearbyRobbery = robberyReportsRef.current.find(r => {
                const distDeg = Math.sqrt(Math.pow(latitude - r.lat, 2) + Math.pow(longitude - r.lng, 2));
                return (distDeg * 111000) <= 100;
            });

            const nearbyAccident = accidentPointsRef.current.find(a => {
                const distDeg = Math.sqrt(Math.pow(latitude - a.lat, 2) + Math.pow(longitude - a.lng, 2));
                return (distDeg * 111000) <= 100;
            });

            const nearbyCai = caiPointsRef.current.find(c => {
                const distDeg = Math.sqrt(Math.pow(latitude - c.lat, 2) + Math.pow(longitude - c.lng, 2));
                return (distDeg * 111000) <= 90;
            });

            const nearbyConst = constructionZonesRef.current.find(zone => {
                const distDeg = Math.sqrt(Math.pow(latitude - zone.lat, 2) + Math.pow(longitude - zone.lng, 2));
                return (distDeg * 111000) <= zone.radius;
            });

            const nearbyReport = citizenReportsRef.current.find(report => {
                const rCoords = report.properties?.coordenadas;
                if (!rCoords) return false;
                const distDeg = Math.sqrt(Math.pow(latitude - rCoords[0], 2) + Math.pow(longitude - rCoords[1], 2));
                return (distDeg * 111000) <= 80;
            });

            const nearbyLight = trafficLightsRef.current.find(light => {
                const distDeg = Math.sqrt(
                    Math.pow(latitude - light.coordinates[0], 2) +
                    Math.pow(longitude - light.coordinates[1], 2)
                );
                return (distDeg * 111000) <= 65;
            });

            if (nearbyRobbery) {
                setHudRecommendation(`🔴 Alerta de Hurto: ${nearbyRobbery.name}`);
                audioGuidance.speakEvent(`rob_gps_${nearbyRobbery.id}`, `Alerta, reporte de hurto cercano en ${nearbyRobbery.name}. Mantente atento.`, 40, true);
            } else if (nearbyAccident) {
                setHudRecommendation(`🚗 Accidente de Tránsito: ${nearbyAccident.name}`);
                audioGuidance.speakEvent(`acc_gps_${nearbyAccident.id}`, `Precaución, reporte de siniestro vial en ${nearbyAccident.name}.`, 40, true);
            } else if (nearbyReport) {
                const tipo = nearbyReport.properties.tipo_novedad;
                if (tipo.toLowerCase().includes('luminaria') || tipo.toLowerCase().includes('lobo') || tipo.toLowerCase().includes('oscur')) {
                    setHudRecommendation('💡 Tramo con baja iluminación. Enciende luces.');
                    audioGuidance.speakEvent(`light_gps_${nearbyReport.id}`, 'Zona con poca iluminación reportada. Enciende tus luces.', 45, true);
                } else if (tipo.toLowerCase().includes('hueco') || tipo.toLowerCase().includes('daño') || tipo.toLowerCase().includes('destructiva')) {
                    setHudRecommendation('⚠️ Daño o bache en ciclorruta reportado.');
                    audioGuidance.speakEvent(`pothole_gps_${nearbyReport.id}`, 'Bache o deterioro en la calzada adelante.', 45, true);
                } else {
                    setHudRecommendation(`📢 Reporte ciudadano: ${tipo.split('/')[0]}`);
                    audioGuidance.speakEvent(`rep_gps_${nearbyReport.id}`, `Reporte ciudadano en la vía: ${tipo.split('/')[0]}.`, 45, true);
                }
            } else if (nearbyConst) {
                setHudRecommendation('🚧 Obras viales del IDU adelante. Precaución.');
                audioGuidance.speakEvent(`const_gps_${nearbyConst.lat}`, 'Obras viales adelante. Reduce la velocidad.', 50);
            } else if (nearbyCai) {
                setHudRecommendation(`👮 CAI de Policía: ${nearbyCai.name}`);
                audioGuidance.speakEvent(`cai_gps_${nearbyCai.id}`, `CAI de policía ${nearbyCai.name} cercano.`, 60);
            } else if (nearbyLight && nearbyLight.state === 'rojo') {
                setHudRecommendation(`🚦 Semáforo en ROJO en ${nearbyLight.intersection || 'intersección'}. Detén la marcha.`);
                audioGuidance.speakEvent(`light_red_gps_${nearbyLight.id || nearbyLight.intersection}`, 'Atención, semáforo en rojo. Detén la marcha.', 20, true);
            }
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

    // 5. Update default origin when localidad changes (only if no GPS user location)
    useEffect(() => {
        if (!userLocation) {
            if (localidad === 'usme') {
                setOriginInput('Portal Usme');
                setRoutePoints(prev => ({ ...prev, origin: { lat: 4.5317, lng: -74.1166 } }));
            } else {
                setOriginInput('Molinos');
                setRoutePoints(prev => ({ ...prev, origin: { lat: 4.5631, lng: -74.1128 } }));
            }
        }
    }, [localidad, userLocation]);

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

    const handleSubmitReport = (customData = null) => {
        const coords = (customData && customData.coordenadas) ? customData.coordenadas : reportingCoords;
        if (!coords) return;

        const type = (customData && customData.tipo_novedad) ? customData.tipo_novedad : reportingType;
        const description = (customData && customData.descripcion) ? customData.descripcion : '';
        const foto = (customData && customData.foto) ? customData.foto : null;

        let updated = false;
        const updatedReports = citizenReports.map(report => {
            if (report.properties.estado === 'activo' && report.properties.tipo_novedad === type) {
                const reportCoords = report.properties.coordenadas;
                const distDeg = Math.sqrt(Math.pow(reportCoords[0] - coords[0], 2) + Math.pow(reportCoords[1] - coords[1], 2));
                const distMeters = distDeg * 111000;
                
                if (distMeters <= 50) {
                    updated = true;
                    return {
                        ...report,
                        properties: {
                            ...report.properties,
                            numero_votos: report.properties.numero_votos + 1,
                            foto: foto || report.properties.foto,
                            descripcion: description || report.properties.descripcion
                        }
                    };
                }
            }
            return report;
        });

        if (updated) {
            setCitizenReports(updatedReports);
            showToast("Se detectó un reporte idéntico a menos de 50m. Se sumó tu respaldo (voto) y evidencia.", "info");
        } else {
            const newReport = {
                type: "Feature",
                id: `report_${Date.now()}`,
                geometry: {
                    type: "Point",
                    coordinates: [coords[1], coords[0]]
                },
                properties: {
                    id: `report_${Date.now()}`,
                    coordenadas: [coords[0], coords[1]],
                    tipo_novedad: type,
                    descripcion: description,
                    foto: foto,
                    fecha_creacion: new Date().toISOString().split('T')[0],
                    numero_votos: 1,
                    resolvedVotes: 0,
                    estado: 'activo',
                    localidad: localitiesMap[localidad]?.name || (localidad === 'usme' ? 'Usme' : 'Rafael Uribe Uribe')
                }
            };
            setCitizenReports(prev => [...prev, newReport]);
            showToast("Reporte ciudadano publicado con éxito con evidencia comunitaria.", "success");
        }

        setIsReporting(false);
        setReportingCoords(null);
        setIsSelectingCoords(false);
    };

    const handleResolveReport = (reportId) => {
        setCitizenReports(prev => prev.map(report => {
            if (report.properties.id === reportId) {
                const newVotes = (report.properties.resolvedVotes || 0) + 1;
                const isNowResolved = newVotes >= 2;
                if (isNowResolved) {
                    showToast("¡Excelente! La comunidad confirmó que este obstáculo fue resuelto.", "success");
                } else {
                    showToast("Gracias por tu confirmación. Se sumó tu voto a este reporte.", "info");
                }
                return {
                    ...report,
                    properties: {
                        ...report.properties,
                        resolvedVotes: newVotes,
                        estado: isNowResolved ? 'resuelto' : 'activo'
                    }
                };
            }
            return report;
        }));
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

    // Recalculate routes risk & cost in-place when citizen reports or simulation conditions (e.g. departureHour, weather) change
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
    }, [citizenReports, simulationState]);

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

    // 13. Trigger route plotting calculations (supports optional overrides for instant 1-touch chips)
    const handleCalculateRoute = async (overrideOrigin = null, overrideDest = null, overrideDestName = null) => {
        const destText = overrideDestName || destInput;
        const origText = originInput;
        if (!destText.trim() && !overrideDest) {
            showToast("Por favor, ingresa o selecciona tu lugar de destino.", "warning");
            return;
        }

        setIsLoading(true);
        setSelectedSegmentId(null); // Deselect segment when plotting a route
        const coordRegex = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/;

        let originCoord = overrideOrigin || routePoints.origin;
        if (!originCoord) {
            if (userLocation && (origText.includes('ubicación') || origText === '📍 Tu ubicación actual')) {
                originCoord = userLocation;
            } else {
                const originMatch = origText.match(coordRegex);
                if (originMatch) {
                    originCoord = { lat: parseFloat(originMatch[1]), lng: parseFloat(originMatch[2]) };
                } else if (origText.includes('ubicación') || origText === '📍 Tu ubicación actual') {
                    const activeLoc = localitiesMap[localidad];
                    originCoord = activeLoc ? { lat: activeLoc.center[0], lng: activeLoc.center[1] } : { lat: 4.5317, lng: -74.1166 };
                } else {
                    const result = await geocodeAddress(origText);
                    if (result) {
                        originCoord = { lat: result.lat, lng: result.lng };
                        setOriginInput(result.name);
                    } else {
                        showToast(`No se pudo encontrar la ubicación de origen: "${origText}"`, "error");
                        setIsLoading(false);
                        return;
                    }
                }
            }
        }

        let destCoord = overrideDest || routePoints.destination;
        if (!destCoord) {
            const destMatch = destText.match(coordRegex);
            if (destMatch) {
                destCoord = { lat: parseFloat(destMatch[1]), lng: parseFloat(destMatch[2]) };
            } else {
                const result = await geocodeAddress(destText);
                if (result) {
                    destCoord = { lat: result.lat, lng: result.lng };
                    setDestInput(result.name);
                } else {
                    showToast(`No se pudo encontrar la ubicación de destino: "${destText}"`, "error");
                    setIsLoading(false);
                    return;
                }
            }
        }

        if (overrideDestName) {
            setDestInput(overrideDestName);
        }

        setRoutePoints({ origin: originCoord, destination: destCoord });

        // Fetch OSRM routes
        const routesData = await fetchOSRMAlternatives(originCoord, destCoord);
        if (routesData.length === 0) {
            showToast("No se pudieron encontrar rutas para los puntos ingresados.", "error");
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

            // Perfil de elevación y altimetría
            const elevationProfile = calculateRouteElevationProfile(leafletCoords);

            // Asignación de perfiles multicriterio (CU-02)
            let profileTag = '⏱️ Exprés';
            let routeName = `Ruta ${idx + 1}`;
            if (idx === 0) {
                profileTag = '🛡️ Blindada';
                routeName = 'Ruta 1 (Más Segura)';
            } else if (idx === 1) {
                profileTag = '⛰️ Menos Pendiente';
                routeName = 'Ruta 2 (Fácil Pedaleo)';
            } else {
                profileTag = '⏱️ Exprés';
                routeName = `Ruta ${idx + 1} (Directa)`;
            }
            
            // Calcular semáforos presentes a lo largo de esta ruta
            const lightsOnRoute = (trafficLights || []).filter(light => {
                return leafletCoords.some(pt => {
                    const distDeg = Math.sqrt(
                        Math.pow(pt[0] - light.coordinates[0], 2) + 
                        Math.pow(pt[1] - light.coordinates[1], 2)
                    );
                    return (distDeg * 111000) <= 80;
                });
            });
            const greenCount = lightsOnRoute.filter(l => l.state === 'verde').length;

            return {
                id: `route_${idx}`,
                name: routeName,
                profileTag,
                elevationProfile,
                distanceKm: (route.distance / 1000).toFixed(1),
                durationMin: String(baseDurationMin),
                durationWithTraffic: String(baseDurationMin + totalDelayMinutes),
                coordinates: leafletCoords,
                avgRiskScore: riskDetails.avgScore,
                maxRiskLevel: riskDetails.maxLevel,
                trafficJamsOnRoute: jamsOnRoute,
                totalDelayMinutes: totalDelayMinutes,
                cost: routeCost.toFixed(1),
                trafficLightsCount: lightsOnRoute.length,
                greenLightsCount: greenCount,
                trafficLightsOnRoute: lightsOnRoute
            };
        });

        setGeneratedRoutes(calculated);
        setActiveRouteId('route_0');
        setIsLoading(false);

        // Mobile Bottom Sheet UX: Expand when routes are plotted
        setIsBottomSheetExpanded(true);
    };

    // Handler para escape y navegación inmediata a CAI (CU-03)
    const handleNavigateToHaven = async (targetCai) => {
        if (!targetCai) return;

        const originCoord = cyclistCoords 
            ? { lat: cyclistCoords[0], lng: cyclistCoords[1] }
            : (routePoints.origin || { lat: 4.5317, lng: -74.1166 });

        const destCoord = { lat: targetCai.lat, lng: targetCai.lng };

        setOriginInput(`${originCoord.lat.toFixed(4)}, ${originCoord.lng.toFixed(4)}`);
        setDestInput(`Refugio: ${targetCai.name}`);
        setRoutePoints({ origin: originCoord, destination: destCoord });

        const routesData = await fetchOSRMAlternatives(originCoord, destCoord);
        if (routesData && routesData.length > 0) {
            const leafletCoords = routesData[0].geometry.coordinates.map(pt => [pt[1], pt[0]]);
            const elevationProfile = calculateRouteElevationProfile(leafletCoords);
            const escapeRoute = {
                id: 'escape_route_cai',
                name: `🚨 Escape hacia ${targetCai.name}`,
                profileTag: '🛡️ Refugio CAI',
                elevationProfile,
                distanceKm: (routesData[0].distance / 1000).toFixed(1),
                durationMin: String(Math.round(routesData[0].duration / 60)),
                durationWithTraffic: String(Math.round(routesData[0].duration / 60)),
                coordinates: leafletCoords,
                avgRiskScore: '1.8',
                maxRiskLevel: 'Bajo',
                trafficJamsOnRoute: [],
                totalDelayMinutes: 0,
                cost: '10.0'
            };
            setGeneratedRoutes([escapeRoute]);
            setActiveRouteId('escape_route_cai');
            setIsNavigating(true);
            setNavStatus('running');
            setIsCameraLocked(true);
            cyclistIndexRef.current = 0;
            setCyclistIndex(0);
            setCyclistCoords(leafletCoords[0]);
            setIsBottomSheetExpanded(true);
        }
    };

    // Handler para guardar auditoría CPTED de campo (CU-09)
    const handleSaveCptedAudit = (auditData) => {
        const auditId = `cpted_${Date.now()}`;
        const coords = cyclistCoords ? [cyclistCoords] : [[4.5317, -74.1166]];
        const newSeg = {
            id: auditId,
            name: `${auditData.segmentName} (Auditado CPTED ${auditData.cptedIndex}%)`,
            localidad: localitiesMap[localidad]?.name || 'Bogotá',
            upz: 'UPZ Auditada',
            baselineCrime: auditData.cptedIndex > 65 ? 'Bajo' : (auditData.cptedIndex > 40 ? 'Medio' : 'Alto'),
            coordinates: coords,
            lightingType: auditData.ratings.lightingScore >= 4 ? 'LED' : 'Sodio',
            watts: auditData.ratings.lightingScore * 40,
            weather: 'seco',
            visibility: auditData.ratings.surveillanceScore >= 3 ? 3 : 1,
            guardianCai: auditData.ratings.surveillanceScore >= 4,
            guardianRuta: false
        };

        setSegments(prev => ({
            ...prev,
            [auditId]: newSeg
        }));
        setSelectedSegmentId(auditId);
        showToast("¡Auditoría CPTED guardada y registrada con éxito en el mapa!", "success");
    };

    // 14. Clear route overlays
    const handleClearRoute = () => {
        setGeneratedRoutes([]);
        setActiveRouteId(null);
        const resetOrigin = userLocation || (localidad === 'usme' ? { lat: 4.5317, lng: -74.1166 } : { lat: 4.5631, lng: -74.1128 });
        setRoutePoints({ origin: resetOrigin, destination: null });
        setDestInput('');
        setOriginInput(userLocation ? '📍 Tu ubicación actual' : (localidad === 'usme' ? 'Portal Usme' : 'Molinos'));
        setSelectedSegmentId(null);
        setIsBottomSheetExpanded(false);
    };

    // 14b. Start 3D navigation
    const handleStartNavigation = (mode = 'simulated') => {
        const activeRoute = generatedRoutes.find(r => r.id === activeRouteId);
        if (!activeRoute) return;

        audioGuidance.unlockAudio();
        wakeLockService.requestWakeLock();

        setNavigationMode(mode);
        setIsNavigating(true);
        setNavStatus('running');
        setIsCameraLocked(true);
        cyclistIndexRef.current = 0;
        setCyclistIndex(0);
        setCyclistCoords(activeRoute.coordinates[0]);

        audioGuidance.playChime('start');
        setTimeout(() => {
            audioGuidance.speak("Iniciando recorrido hacia tu destino. Te acompañaré durante el viaje con alertas de seguridad en tiempo real.", true);
        }, 250);
    };

    // 15. Calculate active predictions and CPTED recommendations
    let currentPrediction = { score: '2.4', level: 'Bajo', shaps: {} };
    let recommendations = [];

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
            isCameraLocked={isCameraLocked}
            onCameraLockChange={setIsCameraLocked}
            cyclistCoords={cyclistCoords}
            cyclistIndex={cyclistIndex}
            cyclistBearing={cyclistBearing}
            activeRoute={activeRoute}
            leftDrawerOpen={leftDrawerOpen}
            rightDrawerOpen={rightDrawerOpen}
            isMobile={isMobile}
        />
    );

    const handleDepartureHourChange = (newHour) => {
        setDepartureHour(newHour);
        setSimulationState(prev => ({
            ...prev,
            departureHour: newHour
        }));
    };

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
            departureHour={departureHour}
            onDepartureHourChange={handleDepartureHourChange}
            weatherData={weatherData}
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
            onUpvoteReport={handleUpvoteReport}
            onResolveReport={handleResolveReport}
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
            {/* 1. Top Navigation Maneuver Banner - Crisp Pure White & Emerald Green */}
            <div 
                className="pointer-events-auto max-w-md w-full mx-auto rounded-3xl shadow-2xl p-4 border flex items-center gap-3.5 animate-slide-down"
                style={{ background: '#ffffff', color: '#0f172a', borderColor: 'rgba(16, 185, 129, 0.4)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' }}
            >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 border border-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <i className="fa-solid fa-arrow-turn-up text-xl text-white"></i>
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                            {Math.max(15, Math.round((1 - (cyclistIndex / Math.max(1, activeRoute.coordinates.length))) * (parseFloat(activeRoute.distanceKm) * 1000)))} m
                        </span>
                        <span className="text-2xs text-slate-500 uppercase font-bold">hacia</span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-600 truncate">
                        {destInput ? destInput.split(',')[0] : 'Destino'}
                    </span>
                    <span className="text-[11px] text-slate-600 font-semibold mt-0.5 truncate flex items-center gap-1">
                        {hudRecommendation}
                    </span>
                </div>
                {nextTrafficLight && (
                    <div className="flex flex-col items-center justify-center px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 flex-shrink-0 shadow-inner">
                        <i className="fa-solid fa-traffic-light text-base" style={{
                            color: nextTrafficLight.state === 'verde' ? '#10b981' : (nextTrafficLight.state === 'amarillo' ? '#eab308' : '#ef4444')
                        }}></i>
                        <span className="text-[9px] font-bold uppercase mt-0.5" style={{
                            color: nextTrafficLight.state === 'verde' ? '#10b981' : (nextTrafficLight.state === 'amarillo' ? '#eab308' : '#ef4444')
                        }}>{nextTrafficLight.state}</span>
                    </div>
                )}
            </div>

            {/* 2. Floating Circular Speedometer Widget (Lower Left - Pure White & Emerald Green) */}
            <div className="flex justify-between items-end w-full max-w-lg mx-auto mb-2">
                <div 
                    className="pointer-events-auto w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center"
                    style={{ background: '#ffffff', color: '#0f172a', border: '3px solid #10b981', boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)' }}
                >
                    <span className="text-lg font-black tracking-tight leading-none text-slate-900">{speedKmh}</span>
                    <span className="text-[9px] font-extrabold text-emerald-600 uppercase leading-none mt-0.5">km/h</span>
                </div>

                {/* Quick Simulation Pause/Speed controls floating on right */}
                {navigationMode === 'simulated' && (
                    <div 
                        className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl shadow-2xl border"
                        style={{ background: '#ffffff', color: '#0f172a', borderColor: '#e2e8f0', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}
                    >
                        <button
                            onClick={() => setNavStatus(navStatus === 'running' ? 'paused' : 'running')}
                            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer border-none text-xs hover:bg-slate-200 transition-colors"
                            title={navStatus === 'running' ? "Pausar" : "Reanudar"}
                        >
                            <i className={`fa-solid ${navStatus === 'running' ? 'fa-pause text-amber-500' : 'fa-play text-emerald-600'}`}></i>
                        </button>
                        {[1, 2, 5].map(mult => (
                            <button
                                key={mult}
                                onClick={() => setNavSpeedMultiplier(mult)}
                                className={`px-2 py-1 rounded-lg text-2xs font-extrabold cursor-pointer border-none transition-all ${
                                    navSpeedMultiplier === mult ? 'bg-emerald-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                {mult}x
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 2b. Floating Recenter Camera Button (Shown when user pans/explores map during navigation) */}
            {!isCameraLocked && (
                <div className="pointer-events-auto flex justify-center mb-3 animate-fade-in">
                    <button
                        onClick={() => setIsCameraLocked(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-2xl border-2 border-white cursor-pointer active:scale-95 transition-all"
                        style={{ boxShadow: '0 8px 25px rgba(16, 185, 129, 0.45)' }}
                    >
                        <i className="fa-solid fa-location-crosshairs text-sm animate-pulse"></i>
                        <span>📍 Recentrar al Ciclista</span>
                    </button>
                </div>
            )}

            {/* 3. Bottom Card (Arrival Time, Remaining Km, Audio & Exit - Pure White & Emerald Green) */}
            <div 
                className="pointer-events-auto max-w-md w-full mx-auto rounded-3xl shadow-2xl p-4 border flex items-center justify-between animate-slide-up"
                style={{ background: '#ffffff', color: '#0f172a', borderColor: '#e2e8f0', boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15)' }}
            >
                <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tight text-slate-900">
                        {getEstimatedArrivalTime(activeRoute.durationMin)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
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
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                : 'bg-rose-100 text-rose-600'
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
                        className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer border-none transition-all"
                        title="Cambiar tipo de voz"
                    >
                        <i className="fa-solid fa-microphone-lines text-xs"></i>
                    </button>

                    {/* Circular Emerald Green Exit/Finish Button */}
                    <button
                        onClick={() => {
                            setNavStatus('stopped');
                            setIsNavigating(false);
                            setIsCameraLocked(true);
                            cyclistIndexRef.current = 0;
                            setCyclistCoords(null);
                            setCyclistIndex(0);
                            setSpeedKmh(0);
                            setNextTrafficLight(null);
                            audioGuidance.stop();
                            wakeLockService.releaseWakeLock();
                        }}
                        className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md cursor-pointer border-none transition-all ml-1"
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
                <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-2 max-w-[calc(100vw-2rem)] mx-auto">
                    <div 
                        onClick={() => setIsMobileSearchOpen(true)}
                        className="flex-1 backdrop-blur-md p-3.5 rounded-2xl shadow-lg flex items-center gap-3 cursor-pointer transition-all"
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-surface)',
                            color: 'var(--text-on-surface)'
                        }}
                    >
                        <i className="fa-solid fa-magnifying-glass text-emerald-600 text-base"></i>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>¿A dónde quieres ir hoy? (Planificar ruta)</span>
                    </div>
                    <button
                        onClick={() => setIsSafeHavenOpen(true)}
                        className="w-12 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg cursor-pointer border-none flex-shrink-0 animate-pulse"
                        title="Botón SOS de Emergencia - Refugio CAI"
                    >
                        <i className="fa-solid fa-triangle-exclamation text-base"></i>
                    </button>
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                            onClick={() => setIsSafeHavenOpen(true)}
                            className="w-8 h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow cursor-pointer border-none"
                            title="SOS de Emergencia"
                        >
                            <i className="fa-solid fa-triangle-exclamation text-xs"></i>
                        </button>
                        <button
                            onClick={() => setIsMobileSearchOpen(true)}
                            className="py-1.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-2xs cursor-pointer border-none"
                        >
                            Editar
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Search Overlay a Pantalla Completa - Paleta Blanco y Verde */}
            {isMobile && isMobileSearchOpen && (
                <div className="fixed inset-0 bg-white/98 backdrop-blur-xl z-50 p-5 flex flex-col text-slate-800 animate-fade-in overflow-y-auto">
                    <div className="flex items-center gap-3.5 mb-5">
                        <button 
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 hover:bg-emerald-100 cursor-pointer border-none shadow-xs"
                            title="Cerrar búsqueda"
                        >
                            <i className="fa-solid fa-xmark text-sm"></i>
                        </button>
                        <h2 className="text-base font-extrabold text-emerald-900 flex items-center gap-2">
                            <i className="fa-solid fa-route text-emerald-600"></i> Planificar Ciclorruta
                        </h2>
                    </div>

                    <div className="flex flex-col gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 shadow-xs mb-5">
                        <FormField
                            value={originInput}
                            onChange={setOriginInput}
                            placeholder="Escribe origen o toca el mapa..."
                            iconClass="fa-solid fa-circle-play text-emerald-600"
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

                        {/* Mobile Departure Hour & Weather */}
                        <div className="flex items-center justify-between pt-2 border-t border-emerald-100 text-xs">
                            <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
                                <i className="fa-regular fa-clock text-emerald-600"></i> Hora de Salida:
                            </span>
                            <select
                                value={departureHour === null ? '' : String(departureHour)}
                                onChange={(e) => handleDepartureHourChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                className="bg-white text-emerald-950 text-xs rounded-lg px-2.5 py-1 border border-emerald-200 cursor-pointer font-semibold shadow-xs"
                            >
                                <option value="">Ahora (En vivo)</option>
                                <option value="6">06:00 AM (Mañana)</option>
                                <option value="12">12:00 PM (Mediodía)</option>
                                <option value="18">18:00 PM (Hora Pico)</option>
                                <option value="21">21:00 PM (Nocturno)</option>
                            </select>
                        </div>
                        {weatherData && (
                            <div className="flex items-center justify-between text-[11px] text-emerald-900 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-100 shadow-xs">
                                <span>{weatherData.icon} {weatherData.temperature}°C {weatherData.description}</span>
                                {weatherData.isRainy && <span className="text-rose-600 font-bold">🌧️ Lluvia (+1.4 Riesgo)</span>}
                            </div>
                        )}
                    </div>

                    <div className="my-3">
                        <QuickDestinationChips
                            onSelectDestination={(item) => {
                                handleSelectDestLocation(item.coords, item.name);
                                handleCalculateRoute(null, item.coords, item.name);
                                setIsMobileSearchOpen(false);
                            }}
                            activeDestName={destInput}
                        />
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
                                            { key: 'light', label: 'Calles (Claro)', icon: 'fa-sun' },
                                            { key: 'terrain', label: 'Relieve (Topográfico)', icon: 'fa-mountain' }
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

            {/* 4. Mobile Bottom Sheet / Route Card - hidden during active navigation */}
            {isMobile && !isNavigating && !isMobileSearchOpen && (generatedRoutes.length > 0 || selectedSegmentId || isReporting || mobileActiveTab === 'citizen') && (
                <div 
                    className={`fixed bottom-0 left-3 right-3 z-40 md:hidden backdrop-blur-xl rounded-t-3xl shadow-2xl transition-all duration-300 ease-in-out flex flex-col max-w-lg mx-auto bg-white/98 border border-slate-200/90 text-slate-800 ${
                        isBottomSheetExpanded ? 'h-[65vh]' : (generatedRoutes.length > 0 ? 'h-40' : 'h-16')
                    }`}
                    style={{
                        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.12)'
                    }}
                >
                    {/* Handle Bar & Quick Route Info */}
                    <div 
                        onClick={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
                        className="flex flex-col items-center justify-center pt-2 pb-1.5 px-4 cursor-pointer select-none active:bg-slate-50 rounded-t-3xl border-b border-slate-100/80"
                    >
                        <div className="w-10 h-1 bg-slate-300 rounded-full mb-2"></div>
                        <div className="w-full flex items-center justify-between text-xs font-bold text-slate-700">
                            <span className="flex items-center gap-1.5 truncate">
                                {generatedRoutes.length > 0 
                                    ? <span className="font-extrabold text-slate-900 truncate">{activeRoute?.name || 'Ruta Seleccionada'}</span>
                                    : selectedSegmentId === 'custom_audit'
                                        ? 'Calle Auditada Seleccionada'
                                        : isReporting
                                            ? 'Nuevo Reporte Ciudadano'
                                            : 'Tramo Seleccionado'}
                            </span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {generatedRoutes.length > 0 && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                        {activeRoute?.profileTag || '🛡️ Blindada'}
                                    </span>
                                )}
                                <i className={`fa-solid ${isBottomSheetExpanded ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs text-slate-400`}></i>
                            </div>
                        </div>

                        {/* If collapsed and routes exist: Minimalist Quick Action Bar */}
                        {!isBottomSheetExpanded && activeRoute && (
                            <div className="w-full mt-2 flex items-center justify-between gap-3">
                                <div className="flex flex-col">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-xl font-black tracking-tight text-slate-900">{activeRoute.durationMin} min</span>
                                        <span className="text-xs font-semibold text-slate-500">({activeRoute.distanceKm} km)</span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-emerald-700">
                                        Riesgo {activeRoute.maxRiskLevel} • {activeRoute.avgRiskScore}/10
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartNavigation('simulated');
                                        }}
                                        className="py-2.5 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-2xl font-bold text-xs flex items-center gap-1.5 cursor-pointer border-none transition-all active:scale-95"
                                        title="Simulación virtual paso a paso"
                                    >
                                        <i className="fa-solid fa-play text-xs text-emerald-700"></i>
                                        <span>Simular</span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartNavigation('gps');
                                        }}
                                        className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-md flex items-center gap-2 cursor-pointer border-none transition-all active:scale-95"
                                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                                        title="Iniciar navegación con GPS y guía de voz"
                                    >
                                        <i className="fa-solid fa-diamond-turn-right text-xs"></i>
                                        <span>Iniciar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {!isBottomSheetExpanded && selectedSegmentId && segments[selectedSegmentId] && (
                            <span className="text-[11px] text-emerald-700 font-semibold mt-1 truncate w-full text-left">
                                {segments[selectedSegmentId].name.slice(0, 45)}... - Riesgo: {currentPrediction.level}
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

            {/* Ergonomía Móvil: Barra Inferior en la Zona del Pulgar (Heurística 4 y 7) */}
            {isMobile && !isNavigating && !isMobileSearchOpen && generatedRoutes.length === 0 && !selectedSegmentId && (
                <MobileBottomDock
                    onOpenSearch={() => setIsMobileSearchOpen(true)}
                    onToggleResults={() => {
                        setIsMobileSearchOpen(true);
                    }}
                    hasRoutes={false}
                    activeRouteCount={0}
                    onEmergencySOS={() => setIsSafeHavenOpen(true)}
                    onOpenLayers={() => setMobileLayersOpen(prev => !prev)}
                />
            )}

            {/* ==================== DESKTOP LAYOUT (md: relative flex-row) ==================== */}

            {/* 5. Desktop Floating Header – hidden during active navigation and Zen mode */}
            {!isMobile && !isNavigating && !leftDrawerOpen && !isZenMode && (
                <div className="hidden md:block">
                    {headerComponent}
                </div>
            )}

            {/* 6. Desktop Left Drawer – hidden during active 3D navigation and Zen mode */}
            {!isMobile && !isNavigating && !isZenMode && (
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

                        {/* Botón de Emergencia Refugio Seguro / CAI (CU-03) */}
                        <button
                            onClick={() => setIsSafeHavenOpen(true)}
                            className="tab-vertical-btn text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            title="🚨 Refugio Seguro / CAI Más Cercano"
                        >
                            <i className="fa-solid fa-shield-halved text-rose-500 animate-pulse"></i>
                        </button>

                        {/* Herramientas de Investigación / Modo Científico (CU-06, CU-07, CU-08, CU-09) */}
                        {viewMode === 'tech' && (
                            <>
                                <div className="w-6 h-[1px] bg-slate-200 my-1 mx-auto"></div>
                                <button
                                    onClick={() => setIsInterventionModalOpen(true)}
                                    className="tab-vertical-btn text-emerald-600 hover:bg-emerald-50"
                                    title="🔬 Simulador Distrital What-If (CU-06)"
                                >
                                    <i className="fa-solid fa-flask-vial"></i>
                                </button>
                                <button
                                    onClick={() => setIsModelValidationOpen(true)}
                                    className="tab-vertical-btn text-indigo-500 hover:bg-indigo-50"
                                    title="📊 Calibración & Backtesting Empírico (CU-07)"
                                >
                                    <i className="fa-solid fa-chart-line"></i>
                                </button>
                                <button
                                    onClick={() => setIsPriorityHeatmapOpen(true)}
                                    className="tab-vertical-btn text-amber-500 hover:bg-amber-50"
                                    title="🏛️ Priorización Inversión UAESP / IDU (CU-08)"
                                >
                                    <i className="fa-solid fa-landmark"></i>
                                </button>
                                <button
                                    onClick={() => setIsCptedAuditOpen(true)}
                                    className="tab-vertical-btn text-teal-600 hover:bg-teal-50"
                                    title="📋 Auditoría CPTED de Campo (CU-09)"
                                >
                                    <i className="fa-solid fa-clipboard-check"></i>
                                </button>
                            </>
                        )}

                        {/* Spacer to push utility buttons to the bottom */}
                        <div className="flex-grow"></div>

                        {/* Botón Modo Zen (Z) (Heurística 8) */}
                        <button 
                            onClick={() => {
                                setIsZenMode(true);
                                showToast('🧘 Modo Zen activado (Presiona Z o Esc para salir)', 'info');
                            }}
                            className="tab-vertical-btn text-emerald-600 hover:bg-emerald-50"
                            title="Modo Zen: Mapa despejado (Tecla Z)"
                        >
                            <i className="fa-solid fa-expand"></i>
                        </button>

                        {/* Botón Atajos de Teclado (?) (Heurística 7) */}
                        <button 
                            onClick={() => setIsShortcutsOpen(true)}
                            className="tab-vertical-btn text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Atajos de teclado (?)"
                        >
                            <i className="fa-solid fa-keyboard"></i>
                        </button>

                        {/* Botón Micro-Tour Onboarding (Heurística 10) */}
                        <button 
                            onClick={() => setIsOnboardingOpen(true)}
                            className="tab-vertical-btn text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Guía de bienvenida y ayuda"
                        >
                            <i className="fa-solid fa-circle-question"></i>
                        </button>
                        
                        <button 
                            onClick={() => {
                                setMapStyle(mapStyle === 'light' ? 'terrain' : 'light');
                            }}
                            className="tab-vertical-btn text-emerald-700 hover:bg-emerald-50"
                            title={
                                mapStyle === 'light' ? "Ver Relieve y Altimetría (Topográfico)" : "Ver Mapa de Calles (Claro)"
                            }
                        >
                            <i className={`fa-solid ${
                                mapStyle === 'light' ? 'fa-mountain' : 'fa-map'
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
            {!isMobile && !isNavigating && !isZenMode && (
                <div className="hidden md:flex absolute top-6 right-6 z-20 flex-col gap-2.5 items-end">
                    {/* Weather Live Widget (CU-01) */}
                    {weatherData && (
                        <div 
                            className="px-3 py-2 rounded-2xl bg-white/95 border border-emerald-100 shadow-md flex items-center gap-2.5 text-xs font-bold text-slate-800 backdrop-blur-md animate-fade-in"
                            title={`Clima en vivo Bogotá • Actualizado: ${weatherData.updatedAt}`}
                        >
                            <i className={`fa-solid ${weatherData.condition === 'lluvia' ? 'fa-cloud-showers-heavy text-blue-500' : 'fa-cloud-sun text-amber-500'} text-base`}></i>
                            <div className="flex flex-col text-left">
                                <span className="leading-tight text-xs font-black text-emerald-950">{weatherData.temperature}°C</span>
                                <span className="text-[9px] text-slate-500 font-semibold leading-tight">{weatherData.description}</span>
                            </div>
                        </div>
                    )}

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
                                        <span className="text-slate-700">Bici-Caravanas</span>
                                        <input type="checkbox" checked={mapLayers.caravans} onChange={e => setMapLayers(p=>({...p, caravans: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
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
                                        <span className="text-slate-700">Reportes de la Comunidad</span>
                                        <input type="checkbox" checked={mapLayers.citizenReports} onChange={e => setMapLayers(p=>({...p, citizenReports: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                    <label className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-700">Semáforos Inteligentes</span>
                                        <input type="checkbox" checked={mapLayers.trafficLights} onChange={e => setMapLayers(p=>({...p, trafficLights: e.target.checked}))} className="accent-emerald-600 w-3.5 h-3.5"/>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 8. Desktop Floating Footer (Bottom centered) – hidden during navigation and Zen mode */}
            {!isMobile && !isNavigating && !isZenMode && (
                <footer className="hidden md:block absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-[10px] text-slate-500 text-center bg-white/80 py-1.5 px-4 rounded-full border border-slate-200/50 backdrop-blur shadow-sm">
                    <p><strong>Ruta Clara v1.2.0</strong> • Semillero Construcción de software para la transformación del territorio</p>
                </footer>
            )}

            {/* 9. Minimalist Floating Zen HUD Card (Heurística 8: Diseño estético y minimalista) */}
            {isZenMode && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/95 backdrop-blur-2xl border border-emerald-200 shadow-xl animate-slide-down text-xs font-bold text-slate-800 select-none">
                    <span className="flex items-center gap-1.5 text-emerald-600 font-black">
                        <i className="fa-solid fa-eye text-xs"></i> Modo Zen
                    </span>
                    {activeRoute ? (
                        <>
                            <span className="text-slate-300">|</span>
                            <span className="truncate max-w-[150px]">{activeRoute.name}</span>
                            <span className="text-slate-500 font-semibold">{activeRoute.distanceKm} km • {activeRoute.durationMin} min</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                activeRoute.maxRiskLevel === 'Bajo' ? 'bg-emerald-100 text-emerald-800' :
                                activeRoute.maxRiskLevel === 'Medio' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                                Riesgo {activeRoute.avgRiskScore}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-500">Exploración libre del mapa</span>
                        </>
                    )}
                    <button
                        onClick={() => setIsZenMode(false)}
                        className="ml-2 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-2xs font-extrabold flex items-center gap-1 border border-emerald-200 cursor-pointer transition-colors"
                        title="Restaurar paneles (Tecla Z o Esc)"
                    >
                        <span>Salir</span>
                        <kbd className="font-mono text-[9px] bg-white border border-emerald-200 text-emerald-800 px-1 rounded">Esc</kbd>
                    </button>
                </div>
            )}

            {/* 10. Cockpit HUD Overlay during 3D Navigation */}
            {cockpitHUD}

            {/* ==================== MODALES DE CASOS DE USO INTEGRALES ==================== */}

            {/* CU-03: Botón de Pánico y Refugio Seguro CAI */}
            <SafeHavenEmergencyModal
                isOpen={isSafeHavenOpen}
                onClose={() => setIsSafeHavenOpen(false)}
                currentCoords={cyclistCoords || (routePoints.origin ? [routePoints.origin.lat, routePoints.origin.lng] : null)}
                onNavigateToHaven={handleNavigateToHaven}
                onTriggerVoiceAlert={(msg) => audioGuidance.speakRaw(msg, true)}
            />

            {/* CU-06: Simulador Distrital What-If */}
            <InterventionSimulatorModal
                isOpen={isInterventionModalOpen}
                onClose={() => setIsInterventionModalOpen(false)}
                segments={segments}
                localidad={localidad}
                constructionZones={constructionZones}
            />

            {/* CU-07: Calibración & Backtesting Empírico */}
            <ModelValidationModal
                isOpen={isModelValidationOpen}
                onClose={() => setIsModelValidationOpen(false)}
                segments={segments}
            />

            {/* CU-08: Priorización de Inversión Pública UAESP / IDU (IPI) */}
            <PriorityHeatmapPanel
                isOpen={isPriorityHeatmapOpen}
                onClose={() => setIsPriorityHeatmapOpen(false)}
                segments={segments}
                citizenReports={citizenReports}
                localidad={localidad}
                onZoomToSegment={(coords) => setZoomToCoords(coords)}
            />

            {/* CU-09: Formulario y Ficha de Auditoría CPTED de Campo */}
            <CptedAuditModal
                isOpen={isCptedAuditOpen}
                onClose={() => setIsCptedAuditOpen(false)}
                selectedSegment={selectedSegmentId ? segments[selectedSegmentId] : null}
                onSaveAudit={handleSaveCptedAudit}
            />

            {/* ==================== SUITE DE NOTIFICACIONES & USABILIDAD ==================== */}
            <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
            <OnboardingTourModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
            <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
        </div>
    );
}

