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
import { soundService } from './utils/soundService';
import { wakeLockService } from './utils/wakeLockService';
import { 
    generateRouteManeuvers, 
    getUpcomingManeuver, 
    calculateBearing, 
    calculateDistanceMeters, 
    calculateDistanceToRoute, 
    calculateRemainingRouteDistance,
    snapToSegment,
    smoothGpsCoordinate
} from './utils/navigationManeuverService';
import DestinationArrivalModal from './components/molecules/DestinationArrivalModal';
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
import QuickHazardReportButton from './components/molecules/QuickHazardReportButton';
import PotholeReportModal from './components/molecules/PotholeReportModal';
import HazardProximityPill from './components/molecules/HazardProximityPill';
import MapSettingsModal from './components/molecules/MapSettingsModal';
import VoiceSearchModal from './components/molecules/VoiceSearchModal';
import AuthModal from './components/molecules/AuthModal';
import FavoritePlacesModal from './components/molecules/FavoritePlacesModal';
import { favoritePlacesService } from './services/favoritePlacesService';
import { authService } from './services/authService';
import { 
    HAZARD_TYPES, 
    loadActiveUserReports, 
    saveUserReport, 
    createQuickHazardFeature, 
    syncReport,
    subscribeToActiveHazards,
    upvoteHazardReport
} from './utils/quickReportService';
import { SpatialGrid } from './utils/spatialIndex';
import { dataCacheManager } from './services/dataCacheManager';
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
        caravans: false,
        favorites: true
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
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

    const showToast = (message, type = 'info') => {
        const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        soundService.playNotification(type);
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

    // 4. Ubicación GPS en tiempo real y Brújula de Orientación
    const [userLocation, setUserLocation] = useState(null);
    const [userHeading, setUserHeading] = useState(0);

    // Seguimiento satelital GPS continuo y orientación por brújula en tiempo real
    useEffect(() => {
        const fallback = localidad === 'usme' ? { lat: 4.5317, lng: -74.1166 } : { lat: 4.5631, lng: -74.1128 };

        if (!navigator.geolocation) {
            setUserLocation(fallback);
            setRoutePoints(prev => ({ ...prev, origin: fallback }));
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(coords);

                // Auto-asignar como origen por defecto si el usuario no ha digitado una dirección manual
                setRoutePoints(prev => {
                    if (!prev.origin || (prev.origin.lat === fallback.lat && prev.origin.lng === fallback.lng)) {
                        return { ...prev, origin: coords };
                    }
                    return prev;
                });

                // Si el GPS reporta rumbo de movimiento, actualizar orientación de la bicicleta
                if (pos.coords.heading !== null && pos.coords.heading !== undefined && !isNaN(pos.coords.heading)) {
                    setUserHeading(pos.coords.heading);
                }
            },
            (err) => {
                console.warn("Seguimiento satelital GPS continuo:", err.message);
                setUserLocation(prev => prev || fallback);
                setRoutePoints(prev => ({ ...prev, origin: prev.origin || fallback }));
            },
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
        );

        // Brújula digital del dispositivo (DeviceOrientation) para rotar la bicicleta 3D en reposo
        const handleOrientation = (e) => {
            if (e.webkitCompassHeading !== undefined) {
                // Brújula en iOS Safari
                setUserHeading(e.webkitCompassHeading);
            } else if (e.alpha !== null && e.alpha !== undefined && !isNaN(e.alpha)) {
                // Brújula en Android Chrome
                const compass = (360 - e.alpha) % 360;
                setUserHeading(compass);
            }
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation, true);
        }

        return () => {
            navigator.geolocation.clearWatch(watchId);
            if (window.DeviceOrientationEvent) {
                window.removeEventListener('deviceorientation', handleOrientation, true);
            }
        };
    }, [localidad]);

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
    const stoppedTicksRef = useRef(0);
    const redCreepTicksRef = useRef(0);
    const lastRiskLevelRef = useRef('Bajo');
    const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
    const offRouteTicksRef = useRef(0);
    const offRouteStartTimeRef = useRef(null);
    const lastRerouteTimeRef = useRef(0);
    const isReroutingRef = useRef(false);
    const minDistToDestRef = useRef(Infinity);
    const lastGpsCoordRef = useRef(null);
    const lastRawGpsCoordRef = useRef(null);
    const lastGpsTimeRef = useRef(null);

    // Mobile popover states and bottom sheet active tab
    const [mobileLayersOpen, setMobileLayersOpen] = useState(false);
    const [mobileLocalityOpen, setMobileLocalityOpen] = useState(false);
    const [mobileActiveTab, setMobileActiveTab] = useState('results');
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [mapStyle, setMapStyle] = useState('light'); // 'light' | 'dark' | 'terrain'

    // 3b. Citizen Science and Reports State (with persistent localStorage hydration)
    const [citizenReports, setCitizenReports] = useState(() => {
        return loadActiveUserReports();
    });

    // Suscripción colaborativa en tiempo real a peligros (Firebase Firestore + DataCacheManager)
    useEffect(() => {
        const unsub = subscribeToActiveHazards((reports) => {
            if (reports && Array.isArray(reports)) {
                setCitizenReports(reports);
            }
        });
        return () => unsub();
    }, []);

    // Índice espacial 2D de alta velocidad (< 0.2ms) para proximidad de peligros y baches
    const hazardsSpatialGrid = useMemo(() => {
        return SpatialGrid.fromList(citizenReports, (rep) => {
            return rep.properties?.coordenadas || (rep.geometry?.coordinates ? [rep.geometry.coordinates[1], rep.geometry.coordinates[0]] : null);
        });
    }, [citizenReports]);

    const [isReporting, setIsReporting] = useState(false);
    const [isPotholeModalOpen, setIsPotholeModalOpen] = useState(false);
    const [potholeModalInitialType, setPotholeModalInitialType] = useState('POTHOLE');
    const [proximityHazardPhoto, setProximityHazardPhoto] = useState(null);
    const [isVoiceSearchOpen, setIsVoiceSearchOpen] = useState(false);
    const [reportingType, setReportingType] = useState('Luminaria Dañada / Boca de lobo');
    const [reportingCoords, setReportingCoords] = useState(null);
    const [isSelectingCoords, setIsSelectingCoords] = useState(false);
    const [zoomToCoords, setZoomToCoords] = useState(null);

    // 4. Route Planning State (userLocation & userHeading definidos arriba)
    const [originInput, setOriginInput] = useState('📍 Tu ubicación actual');
    const [destInput, setDestInput] = useState('');
    const [selectingLocationMode, setSelectingLocationMode] = useState(null);
    const [routePoints, setRoutePoints] = useState({ origin: null, destination: null });
    const [generatedRoutes, setGeneratedRoutes] = useState([]);
    const [activeRouteId, setActiveRouteId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Autenticación con Google y Perfil Ciudadano
    const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // Lugares Favoritos y Preferencias del Ciclista
    const [userFavorites, setUserFavorites] = useState(() => 
        favoritePlacesService.getLocalFavorites(authService.getCurrentUser()?.uid)
    );
    const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
    const pendingFavoriteCallbackRef = useRef(null);

    useEffect(() => {
        const unsubscribe = authService.onAuthChange((user) => {
            setCurrentUser(user);
            if (user) {
                // Al autenticarse, si aún no ha completado el recorrido de los botones, iniciarlo automáticamente
                const hasSeenTour = localStorage.getItem('rutaclara_tour_completed');
                if (!hasSeenTour) {
                    setIsOnboardingOpen(true);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // Suscripción a favoritos en tiempo real (Firestore / Local)
    useEffect(() => {
        const unsub = favoritePlacesService.subscribeFavorites(currentUser?.uid, (list) => {
            setUserFavorites(list || []);
        });
        return () => unsub();
    }, [currentUser?.uid]);

    // Sugerencia Inteligente de Viaje según la hora (Smart Commute)
    const smartSuggestion = useMemo(() => {
        return favoritePlacesService.getSmartCommuteSuggestion(userFavorites);
    }, [userFavorites]);

    // Referencias sincronizadas para estabilización continua del GPS Watcher sin reinicios destructivos
    const generatedRoutesRef = useRef(generatedRoutes);
    generatedRoutesRef.current = generatedRoutes;

    const activeRouteIdRef = useRef(activeRouteId);
    activeRouteIdRef.current = activeRouteId;

    const routeManeuversRef = useRef([]);

    // Desktop drawer open/close states (inician cerrados para evitar ventanas flotantes invasivas al abrir la app)
    const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
    const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

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

    // Turn-by-turn Waze-style maneuvers calculated for active route
    const routeManeuvers = useMemo(() => {
        if (!activeRoute || !activeRoute.coordinates || activeRoute.coordinates.length < 2) return [];
        return generateRouteManeuvers(activeRoute.coordinates);
    }, [activeRouteId, generatedRoutes]);
    routeManeuversRef.current = routeManeuvers;

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

    // Current upcoming maneuver info for Cockpit HUD
    const currentManeuverInfo = useMemo(() => {
        if (!activeRoute || !cyclistCoords || !routeManeuvers || routeManeuvers.length === 0) return null;
        return getUpcomingManeuver(cyclistCoords, routeManeuvers, cyclistIndex);
    }, [activeRoute, cyclistCoords, routeManeuvers, cyclistIndex]);

    // Precise remaining route distance in meters (replaces index approximation)
    const remainingMetersToDest = useMemo(() => {
        if (!activeRoute || !activeRoute.coordinates || !cyclistCoords) return 0;
        return calculateRemainingRouteDistance(cyclistCoords, activeRoute.coordinates, cyclistIndex);
    }, [activeRoute, cyclistCoords, cyclistIndex]);

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

    const hazardsSpatialGridRef = useRef(hazardsSpatialGrid);
    hazardsSpatialGridRef.current = hazardsSpatialGrid;

    const robberyReportsRef = useRef(robberyReports);
    robberyReportsRef.current = robberyReports;

    const accidentPointsRef = useRef(accidentPoints);
    accidentPointsRef.current = accidentPoints;

    const caiPointsRef = useRef(caiPoints);
    caiPointsRef.current = caiPoints;

    // 11b. OSRM Routing Fetcher (Prioriza ciclorrutas y vías permitidas para bicicletas)
    const fetchOSRMAlternatives = async (origin, dest) => {
        const bikeUrl = `https://router.project-osrm.org/route/v1/bicycle/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true`;
        const drivingUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson&alternatives=true`;
        
        try {
            const bikeRes = await fetch(bikeUrl);
            const bikeData = await bikeRes.json();
            if (bikeData && bikeData.code === 'Ok' && bikeData.routes && bikeData.routes.length > 0) {
                return bikeData.routes;
            }
        } catch (err) {
            console.warn("[OSRM] Fallo en perfil bicycle, usando driving como fallback:", err.message);
        }

        try {
            const driveRes = await fetch(drivingUrl);
            const driveData = await driveRes.json();
            if (driveData && driveData.code === 'Ok' && driveData.routes) {
                return driveData.routes;
            }
        } catch (error) {
            console.error("[OSRM] Fallo completo en servicio de enrutamiento:", error);
        }
        return [];
    };

    // 11c. Route Object Builder (Reusable for initial plot and dynamic re-routing)
    const buildRouteObjects = useCallback((routesData, segs, simState, constZones, citReports, tfJams, tfLights) => {
        return routesData.map((route, idx) => {
            const leafletCoords = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);
            const riskDetails = calculateRouteAverageRisk(
                leafletCoords, 
                segs, 
                simState, 
                constZones, 
                simState?.showConstruction,
                citReports
            );
            const routeCost = calculateRouteCost(
                leafletCoords,
                segs,
                simState,
                constZones,
                simState?.showConstruction,
                citReports
            );

            // Detect traffic jams on this route
            const jamsOnRoute = detectTrafficJamsOnRoute(leafletCoords, tfJams);
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
            const lightsOnRoute = (tfLights || []).filter(light => {
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
    }, []);

    // 11d. Real-time Dynamic Rerouting Engine (Off-route recovery)
    const handleDynamicReroute = useCallback(async (currentCoord, destCoord) => {
        if (isReroutingRef.current || !destCoord) return;
        isReroutingRef.current = true;

        setHudRecommendation("🔄 Recalculando ruta hacia el destino...");
        audioGuidance.speakRaw("Has salido de la ruta. Recalculando trayecto.", true);
        soundService.playNotification('warning');
        showToast("🔄 Fuera de ruta: Recalculando hacia tu destino...", "info");

        try {
            const originObj = Array.isArray(currentCoord) 
                ? { lat: currentCoord[0], lng: currentCoord[1] } 
                : currentCoord;
            const destObj = Array.isArray(destCoord) 
                ? { lat: destCoord[0], lng: destCoord[1] } 
                : destCoord;
            const routesData = await fetchOSRMAlternatives(originObj, destObj);

            if (routesData && routesData.length > 0) {
                const calculated = buildRouteObjects(
                    routesData, 
                    segmentsRef.current, 
                    simulationStateRef.current, 
                    constructionZonesRef.current, 
                    citizenReportsRef.current, 
                    trafficJams, 
                    trafficLightsRef.current
                );
                setGeneratedRoutes(calculated);
                const nextRouteId = calculated[0]?.id || 'route_0';
                setActiveRouteId(nextRouteId);
                cyclistIndexRef.current = 0;
                setCyclistIndex(0);
                minDistToDestRef.current = Infinity;

                audioGuidance.speak("Ruta recalculada. Continúa hacia tu destino.", false);
                showToast("✅ Ruta recalculada con éxito", "success");
            } else {
                console.warn("No se pudieron obtener alternativas de recálculo dinámico");
                showToast("⚠️ No se pudo recalcular automáticamente. Mantén la marcha.", "warning");
            }
        } catch (err) {
            console.error("Error en recálculo dinámico de ruta:", err);
            showToast("Error de conexión al recalcular. Manteniendo ruta actual.", "error");
        } finally {
            setTimeout(() => {
                isReroutingRef.current = false;
            }, 4000);
        }
    }, [buildRouteObjects, trafficJams]);

    // D. Smooth Continuous Navigation Simulation loop (Ultra-optimized for mobile 60fps)
    useEffect(() => {
        if (navStatus !== 'running' || denseCoords.length < 2 || navigationMode === 'gps') return;

        let waitTicks = 0;
        const step = navSpeedMultiplier >= 5 ? 2 : 1;
        const tickInterval = navSpeedMultiplier >= 5 ? 60 : (150 / navSpeedMultiplier);

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
                soundService.playNotification('success');
                showToast("🎉 ¡Has llegado a tu destino de forma segura!", "success");
                setIsArrivalModalOpen(true);
                return;
            }

            const currentPt = denseCoords[currIdx];

            // Detect next traffic light within 50m corridor ahead on route
            let nearbyLight = null;
            let distToUpcomingLight = Infinity;

            for (const light of trafficLightsRef.current) {
                const distDeg = Math.hypot(currentPt[0] - light.coordinates[0], currentPt[1] - light.coordinates[1]);
                const distM = distDeg * 111000;
                if (distM <= 50) {
                    const lookAheadWindow = denseCoords.slice(currIdx, Math.min(currIdx + 35, denseCoords.length));
                    let minLightDist = Infinity;
                    let closestRelIdx = 0;
                    lookAheadWindow.forEach((pt, relIdx) => {
                        const d = Math.hypot(pt[0] - light.coordinates[0], pt[1] - light.coordinates[1]);
                        if (d < minLightDist) {
                            minLightDist = d;
                            closestRelIdx = relIdx;
                        }
                    });

                    if (closestRelIdx >= 0 && (minLightDist * 111000) <= 30) {
                        nearbyLight = light;
                        distToUpcomingLight = distM;
                        break;
                    }
                }
            }

            if (nearbyLight) {
                setNextTrafficLight(nearbyLight);
                if (nearbyLight.state === 'rojo') {
                    // Semáforo en rojo: respeto estricto a las normas de tránsito
                    if (distToUpcomingLight > 8) {
                        // 1. Si está aproximándose a la intersección (distancia > 8m): desacelera y avanza de a poco
                        setSpeedKmh(Math.max(3, Math.min(7, Math.round(distToUpcomingLight * 0.15))));
                        setHudRecommendation(`🚦 Semáforo en ROJO (${nearbyLight.intersection || 'intersección'}). Reduciendo y avanzando de a poco...`);
                        audioGuidance.speakEvent(`light_red_app_${nearbyLight.id || nearbyLight.intersection}`, 'Semáforo en rojo más adelante. Reduce la velocidad.', 20, false);
                        
                        // Avanza de a poco: avanza solo 1 paso cada 2 ticks
                        redCreepTicksRef.current = (redCreepTicksRef.current || 0) + 1;
                        if (redCreepTicksRef.current % 2 !== 0) {
                            return; // creeping lentamente
                        }
                    } else {
                        // 2. Línea de parada alcanzada (distancia <= 8m): detención total obligatoria (0 km/h)
                        setSpeedKmh(0);
                        setHudRecommendation(`🛑 Detenido en luz ROJA (${nearbyLight.intersection || 'intersección'}). Esperando verde...`);
                        audioGuidance.speakEvent(`light_red_stop_${nearbyLight.id || nearbyLight.intersection}`, 'Semáforo en rojo. Detén la marcha en la línea de parada.', 15, false);
                        
                        // Fail-safe para simulación: Si permanece detenido más de 4 segundos, ciclar automáticamente a verde
                        stoppedTicksRef.current = (stoppedTicksRef.current || 0) + 1;
                        if (stoppedTicksRef.current > 25) {
                            nearbyLight.state = 'verde';
                            stoppedTicksRef.current = 0;
                            setTrafficLights([...trafficLightsRef.current]);
                            audioGuidance.speakEvent(`light_green_${nearbyLight.id || nearbyLight.intersection}`, 'Semáforo cambió a verde. Cruce libre.', 10, false);
                        }
                        return; // se detiene completamente hasta cambio de luz
                    }
                } else if (nearbyLight.state === 'amarillo') {
                    // 3. Semáforo en amarillo: Pasa con precaución a velocidad moderada (12 km/h) sin frenar a 0
                    stoppedTicksRef.current = 0;
                    setSpeedKmh(12);
                    setHudRecommendation(`🟡 Semáforo en AMARILLO (${nearbyLight.intersection || 'intersección'}). Pasando con precaución.`);
                    audioGuidance.speakEvent(`light_yellow_${nearbyLight.id || nearbyLight.intersection}`, 'Semáforo en amarillo. Pasando con precaución.', 25, false);
                } else if (nearbyLight.state === 'verde') {
                    // 4. Semáforo en verde: Cruce libre
                    stoppedTicksRef.current = 0;
                    setHudRecommendation(`🟢 Semáforo en VERDE (${nearbyLight.intersection || 'intersección'}). Cruce libre.`);
                    audioGuidance.speakEvent(`light_green_${nearbyLight.id || nearbyLight.intersection}`, 'Semáforo en verde. Cruce libre.', 25, false);
                }
            } else {
                stoppedTicksRef.current = 0;
                setNextTrafficLight(null);
            }

            const nextIdx = Math.min(currIdx + step, denseCoords.length - 1);
            cyclistIndexRef.current = nextIdx;
            setCyclistIndex(nextIdx);
            setCyclistCoords(denseCoords[nextIdx]);

            // Calculate precise travel heading along immediate road segment with adaptive lookahead
            const lookAhead = Math.min(Math.max(4, navSpeedMultiplier * 2), 8);
            const p1 = denseCoords[nextIdx];
            const p2 = denseCoords[Math.min(nextIdx + lookAhead, denseCoords.length - 1)];
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

            // Realistic smooth speed (16-22 km/h) for normal riding
            if (!nearbyLight || nearbyLight.state === 'verde') {
                const baseSpeed = 19;
                const variance = Math.sin(nextIdx * 0.2) * 2.5;
                setSpeedKmh(Math.round(baseSpeed + variance));
            }

            // Waze Turn-by-turn Maneuvers Engine
            if (routeManeuvers && routeManeuvers.length > 0) {
                const upcoming = getUpcomingManeuver(currentPt, routeManeuvers, currIdx);
                if (upcoming && upcoming.maneuver.type !== 'destination') {
                    const { maneuver, distanceMeters } = upcoming;
                    if (distanceMeters <= 160 && distanceMeters >= 110 && !maneuver.announced150) {
                        maneuver.announced150 = true;
                        setHudRecommendation(`↗️ En 150m: ${maneuver.shortText}`);
                        audioGuidance.speak(`En ciento cincuenta metros, ${maneuver.instruction.toLowerCase()}.`);
                    } else if (distanceMeters <= 60 && distanceMeters >= 30 && !maneuver.announced50) {
                        maneuver.announced50 = true;
                        setHudRecommendation(`↩️ En 50m: ${maneuver.shortText}`);
                        audioGuidance.speak(`En cincuenta metros, prepárate para ${maneuver.instruction.toLowerCase()}.`);
                    } else if (distanceMeters < 20 && !maneuver.announcedNow) {
                        maneuver.announcedNow = true;
                        setHudRecommendation(`🔄 ${maneuver.shortText} ahora`);
                        audioGuidance.speak(`${maneuver.instruction} ahora.`);
                    }
                }
            }

            // Dynamic recommendations & Voice Copilot periodically (every ~50m)
            if (Math.floor(nextIdx / 8) > Math.floor(currIdx / 8)) {
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

                // Búsqueda espacial sub-milisegundo (< 0.1ms) usando SpatialGrid
                const nearbyReportEntry = hazardsSpatialGridRef.current?.findNearest(currentCoord[0], currentCoord[1], 80);
                const nearbyReport = nearbyReportEntry ? nearbyReportEntry.item : null;

                // Comprobación ultrarrápida de proximidad a novedades con foto para el HUD
                let closestSimPhotoHazard = null;
                const photoCandidates = hazardsSpatialGridRef.current?.findInRadius(currentCoord[0], currentCoord[1], 80)
                    .filter(res => Boolean(res.item.properties?.foto)) || [];
                
                if (photoCandidates.length > 0) {
                    const best = photoCandidates[0];
                    closestSimPhotoHazard = {
                        id: best.item.properties.id,
                        tipo: best.item.properties.tipo_novedad,
                        foto: best.item.properties.foto,
                        lane: best.item.properties.lane,
                        severity: best.item.properties.severity,
                        descripcion: best.item.properties.descripcion,
                        distMeters: best.distanceM
                    };
                }

                if (closestSimPhotoHazard) {
                    setProximityHazardPhoto(closestSimPhotoHazard);
                    const laneSpoken = closestSimPhotoHazard.lane ? ` en el carril ${closestSimPhotoHazard.lane}` : '';
                    audioGuidance.speakEvent(
                        `photo_sim_${closestSimPhotoHazard.id}`,
                        `Atención, reporte con foto de ${closestSimPhotoHazard.tipo.split('/')[0]}${laneSpoken} a ${closestSimPhotoHazard.distMeters} metros.`,
                        30,
                        true
                    );
                } else {
                    setProximityHazardPhoto(null);
                }

                const currentRisk = riskInfo.level;
                if (lastRiskLevelRef.current === 'Alto' && currentRisk !== 'Alto') {
                    setHudRecommendation('🟢 Zona segura alcanzada. Has salido del sector de riesgo.');
                    audioGuidance.speakEvent('danger_zone_exit', 'Has salido de la zona de riesgo alto. Ingresando a vía segura.', 20, true);
                } else if (currentRisk === 'Alto' && lastRiskLevelRef.current !== 'Alto') {
                    setHudRecommendation('⚠️ Sector con alerta de seguridad. Mantente en movimiento.');
                    audioGuidance.speakEvent('high_risk_zone', 'Atención: Ingresando a tramo con nivel de riesgo Alto. Mantén una velocidad constante, enciende tus luces y no te detengas.', 30, true);
                }
                lastRiskLevelRef.current = currentRisk;

                // Route completion progress announcements
                const pct = Math.round((nextIdx / denseCoords.length) * 100);
                if (pct >= 25 && pct < 28) {
                    audioGuidance.speakEvent('progress_25', 'Avance de ruta: Has completado el 25 por ciento de tu recorrido.', 60, false);
                } else if (pct >= 50 && pct < 53) {
                    audioGuidance.speakEvent('progress_50', 'Avance de ruta: Has alcanzado la mitad del camino hacia tu destino.', 60, false);
                } else if (pct >= 75 && pct < 78) {
                    audioGuidance.speakEvent('progress_75', 'Avance de ruta: Estás al 75 por ciento. Próximo a tu destino.', 60, false);
                }

                // Independent multi-layer evaluations (does not block other layers)
                let newHudRec = null;

                if (nearbyRobbery) {
                    newHudRec = `🔴 Alerta de Hurto: ${nearbyRobbery.name}`;
                    audioGuidance.speakEvent(`rob_${nearbyRobbery.id}`, `Alerta, reporte de hurto cercano en ${nearbyRobbery.name}. Mantente atento.`, 25, true);
                }

                if (nearbyAccident) {
                    if (!newHudRec) newHudRec = `🚗 Accidente de Tránsito: ${nearbyAccident.name}`;
                    audioGuidance.speakEvent(`acc_${nearbyAccident.id}`, `Precaución, reporte de siniestro vial en ${nearbyAccident.name}.`, 25, true);
                }

                if (nearbyReport) {
                    const tipo = nearbyReport.properties?.tipo_novedad || 'novedad';
                    if (tipo.toLowerCase().includes('luminaria') || tipo.toLowerCase().includes('oscur') || tipo.toLowerCase().includes('luz')) {
                        if (!newHudRec) newHudRec = '💡 Tramo con baja iluminación. Enciende luces.';
                        audioGuidance.speakEvent(`light_${nearbyReport.id}`, 'Zona con poca iluminación reportada. Enciende tus luces.', 30, true);
                    } else if (tipo.toLowerCase().includes('hueco') || tipo.toLowerCase().includes('daño') || tipo.toLowerCase().includes('bache')) {
                        const lane = nearbyReport.properties?.lane;
                        const laneDesc = lane === 'izquierda' ? 'a la izquierda de la vía' : (lane === 'derecha' ? 'a la derecha de la vía' : (lane === 'centro' ? 'en el centro de la vía' : 'en la calzada'));
                        if (!newHudRec) newHudRec = `🕳️ Bache ${lane ? `(${lane.toUpperCase()})` : ''} adelante.`;
                        audioGuidance.speakEvent(`pothole_${nearbyReport.id}`, `Atención, bache reportado ${laneDesc} adelante.`, 30, true);
                    } else {
                        if (!newHudRec) newHudRec = `📢 Reporte ciudadano: ${tipo.split('/')[0]}`;
                        audioGuidance.speakEvent(`rep_${nearbyReport.id}`, `Reporte ciudadano en la vía: ${tipo.split('/')[0]}.`, 30, false);
                    }
                }

                if (nearbyConst) {
                    if (!newHudRec) newHudRec = '🚧 Obras viales del IDU adelante. Precaución.';
                    audioGuidance.speakEvent(`const_${nearbyConst.lat}`, 'Obras viales del IDU adelante. Reduce la velocidad.', 35, false);
                }

                if (nearbyCai) {
                    if (!newHudRec) newHudRec = `👮 CAI de Policía: ${nearbyCai.name}`;
                    audioGuidance.speakEvent(`cai_${nearbyCai.id}`, `CAI de policía ${nearbyCai.name} cercano.`, 40, false);
                }

                if (simulationStateRef.current?.weather === 'lluvia') {
                    if (!newHudRec) newHudRec = '🌧️ Calzada mojada por lluvia.';
                    audioGuidance.speakEvent('rain_warning', 'Alerta de clima: Lluvia en tu sector. Calzada resbaladiza, reduce la velocidad.', 45, true);
                }

                if (nearbyLight && nearbyLight.state === 'verde') {
                    if (!newHudRec) newHudRec = '🟢 Cruce con semáforo en VERDE. Paso libre.';
                    audioGuidance.speakEvent(`light_green_${nearbyLight.id || nearbyLight.coordinates.join('_')}`, 'Semáforo en verde. Cruce libre.', 20, false);
                } else if (nearbyLight && nearbyLight.state === 'rojo') {
                    if (!newHudRec) newHudRec = '🔴 Semáforo en ROJO en la intersección.';
                    audioGuidance.speakEvent(`light_red_${nearbyLight.id || nearbyLight.coordinates.join('_')}`, 'Semáforo en rojo. Detén la marcha.', 15, true);
                }

                if (newHudRec) {
                    setHudRecommendation(newHudRec);
                } else {
                    setHudRecommendation('🚴 Ruta despejada. Disfruta tu recorrido.');
                }
            }
        }, tickInterval);

        return () => clearInterval(interval);
    }, [navStatus, navigationMode, navSpeedMultiplier, denseCoords]);

    // D2. Real-time GPS Navigation watcher (Estabilizado con persistencia continua y forward-progress)
    useEffect(() => {
        if (navStatus !== 'running' || navigationMode !== 'gps') return;

        if (!navigator.geolocation) {
            showToast("La geolocalización no está soportada. Cambiando a Simulación.", "warning");
            setNavigationMode('simulated');
            return;
        }

        const handleSuccess = (position) => {
            const activeRoute = generatedRoutesRef.current.find(r => r.id === activeRouteIdRef.current);
            if (!activeRoute || !activeRoute.coordinates || activeRoute.coordinates.length < 2) return;

            const { latitude, longitude, accuracy, heading, speed } = position.coords;

            // 1. Accuracy Filter (Noise Gate): Descartar solo lecturas con error grosero > 48m
            if (accuracy && accuracy > 48) {
                console.warn(`[GPS] Lectura descartada por baja precisión: ±${Math.round(accuracy)}m`);
                return;
            }

            const rawPt = [latitude, longitude];
            const now = Date.now();
            const dtSeconds = lastGpsTimeRef.current ? (now - lastGpsTimeRef.current) / 1000 : 1;

            // 2. Filtro de saltos físicos con suavizado exponencial adaptativo
            const smoothedPt = smoothGpsCoordinate(lastRawGpsCoordRef.current, rawPt, dtSeconds, 45, accuracy);
            lastRawGpsCoordRef.current = smoothedPt;
            lastGpsTimeRef.current = now;

            // 3. Suavizado visual GPS con ventana progresiva sobre la ciclorruta
            const snappedPt = snapToSegment(smoothedPt, activeRoute.coordinates, 32, cyclistIndexRef.current);
            setCyclistCoords(snappedPt);

            // 4. Update heading/bearing for vehicle puck (evitar giros erráticos detenido)
            if (heading !== null && heading !== undefined && !isNaN(heading) && heading >= 0 && (speed !== null && speed > 0.8)) {
                setCyclistBearing(Math.round(heading));
            } else if (lastGpsCoordRef.current) {
                const movedDist = calculateDistanceMeters(lastGpsCoordRef.current, snappedPt);
                if (movedDist >= 3.0) {
                    const calculatedBrng = calculateBearing(lastGpsCoordRef.current, snappedPt);
                    setCyclistBearing(calculatedBrng);
                }
            }
            lastGpsCoordRef.current = snappedPt;

            if (speed !== null && speed !== undefined && !isNaN(speed)) {
                setSpeedKmh(Math.round(speed * 3.6));
            } else {
                setSpeedKmh(16);
            }

            const destPt = activeRoute.coordinates[activeRoute.coordinates.length - 1];
            const distToDest = calculateDistanceMeters(smoothedPt, destPt);

            // Update minimum recorded distance to destination
            if (distToDest < minDistToDestRef.current) {
                minDistToDestRef.current = distToDest;
            }

            // --- 5. ARRIVAL DETECTION ---
            const hasReachedDest = distToDest <= 40;
            const hasPassedDest = minDistToDestRef.current <= 45 && (distToDest >= minDistToDestRef.current + 8) && distToDest <= 70;

            if (hasReachedDest || hasPassedDest) {
                setNavStatus('stopped');
                setIsNavigating(false);
                setIsCameraLocked(true);
                setSpeedKmh(0);
                setNextTrafficLight(null);
                audioGuidance.speakRaw("¡Felicidades! Has llegado a tu destino.", true);
                soundService.playNotification('success');
                showToast("🎉 ¡Has llegado a tu destino de forma segura!", "success");
                setIsArrivalModalOpen(true);
                return;
            }

            // --- 6. OFF-ROUTE & PROGRESS EVALUATION CON VENTANA DE AVANCE ---
            const routeDistInfo = calculateDistanceToRoute(smoothedPt, activeRoute.coordinates, cyclistIndexRef.current, 25);
            const distToRoute = routeDistInfo.minDistanceMeters;
            const closestIdx = routeDistInfo.closestCoordIndex;

            setCyclistIndex(closestIdx);
            cyclistIndexRef.current = closestIdx;

            // Filtro robusto anti-jitter para recálculo dinámico:
            // - Distancia a la ruta > 48m para tolerar ciclorrutas paralelas y andenes
            // - Precisión de GPS aceptable (accuracy <= 32m)
            // - Sostenido de forma continua durante al menos 6 segundos
            // - Cooldown de 15 segundos tras un recálculo para permitir estabilización
            const isFarFromRoute = distToDest > 45 && distToRoute > 48;
            const hasGoodAccuracy = !accuracy || accuracy <= 32;
            const timeSinceLastReroute = now - lastRerouteTimeRef.current;

            if (isFarFromRoute && hasGoodAccuracy) {
                if (!offRouteStartTimeRef.current) {
                    offRouteStartTimeRef.current = now;
                }
                const offRouteDuration = now - offRouteStartTimeRef.current;
                if (offRouteDuration >= 6000 && timeSinceLastReroute >= 15000) {
                    offRouteStartTimeRef.current = null;
                    lastRerouteTimeRef.current = now;
                    handleDynamicReroute(smoothedPt, destPt);
                    return;
                }
            } else {
                offRouteStartTimeRef.current = null;
            }

            // --- 7. TURN-BY-TURN VOICE GUIDANCE EN MODO GPS (Usa snappedPt) ---
            const currentManeuvers = routeManeuversRef.current;
            if (currentManeuvers && currentManeuvers.length > 0) {
                const upcoming = getUpcomingManeuver(snappedPt, currentManeuvers, closestIdx);
                if (upcoming && upcoming.maneuver && upcoming.maneuver.type !== 'destination') {
                    const { maneuver, distanceMeters } = upcoming;
                    if (distanceMeters <= 160 && distanceMeters >= 110 && !maneuver.announced150) {
                        maneuver.announced150 = true;
                        setHudRecommendation(`↗️ En 150m: ${maneuver.shortText}`);
                        audioGuidance.speak(`En ciento cincuenta metros, ${maneuver.instruction.toLowerCase()}.`);
                    } else if (distanceMeters <= 60 && distanceMeters >= 30 && !maneuver.announced50) {
                        maneuver.announced50 = true;
                        setHudRecommendation(`↩️ En 50m: ${maneuver.shortText}`);
                        audioGuidance.speak(`En cincuenta metros, prepárate para ${maneuver.instruction.toLowerCase()}.`);
                    } else if (distanceMeters < 20 && !maneuver.announcedNow) {
                        maneuver.announcedNow = true;
                        setHudRecommendation(`🔄 ${maneuver.shortText} ahora`);
                        audioGuidance.speak(`${maneuver.instruction} ahora.`);
                    }
                }
            }

            // Recomendaciones y evaluación de riesgo con datos en tiempo real
            const currentSegments = segmentsRef.current || segments;
            const currentSimState = simulationStateRef.current || simulationState;
            const currentConstZones = constructionZonesRef.current || constructionZones;
            const currentReports = citizenReportsRef.current || citizenReports;

            const riskInfo = evaluateCoordinateRisk(
                latitude, 
                longitude, 
                currentSegments, 
                currentSimState, 
                currentConstZones, 
                currentSimState?.showConstruction,
                currentReports
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
            const nearbyRobbery = robberyReportsRef.current?.find(r => {
                const distDeg = Math.sqrt(Math.pow(latitude - r.lat, 2) + Math.pow(longitude - r.lng, 2));
                return (distDeg * 111000) <= 100;
            });

            const nearbyAccident = accidentPointsRef.current?.find(a => {
                const distDeg = Math.sqrt(Math.pow(latitude - a.lat, 2) + Math.pow(longitude - a.lng, 2));
                return (distDeg * 111000) <= 100;
            });

            const nearbyCai = caiPointsRef.current?.find(c => {
                const distDeg = Math.sqrt(Math.pow(latitude - c.lat, 2) + Math.pow(longitude - c.lng, 2));
                return (distDeg * 111000) <= 90;
            });

            const nearbyConst = currentConstZones?.find(zone => {
                const distDeg = Math.sqrt(Math.pow(latitude - zone.lat, 2) + Math.pow(longitude - zone.lng, 2));
                return (distDeg * 111000) <= zone.radius;
            });

            const nearbyReport = currentReports?.find(report => {
                const rCoords = report.properties?.coordenadas;
                if (!rCoords) return false;
                const distDeg = Math.sqrt(Math.pow(latitude - rCoords[0], 2) + Math.pow(longitude - rCoords[1], 2));
                return (distDeg * 111000) <= 80;
            });

            // Comprobación de proximidad a novedades con foto para el HUD GPS
            let closestGpsPhotoHazard = null;
            let minGpsPhotoDist = 999;
            currentReports?.forEach(rep => {
                if (!rep.properties?.foto) return;
                const rCoords = rep.properties?.coordenadas;
                if (!rCoords) return;
                const dM = Math.sqrt(Math.pow(latitude - rCoords[0], 2) + Math.pow(longitude - rCoords[1], 2)) * 111000;
                if (dM <= 80 && dM < minGpsPhotoDist) {
                    minGpsPhotoDist = dM;
                    closestGpsPhotoHazard = {
                        id: rep.properties.id,
                        tipo: rep.properties.tipo_novedad,
                        foto: rep.properties.foto,
                        lane: rep.properties.lane,
                        severity: rep.properties.severity,
                        descripcion: rep.properties.descripcion,
                        distMeters: Math.round(dM)
                    };
                }
            });

            if (closestGpsPhotoHazard) {
                setProximityHazardPhoto(closestGpsPhotoHazard);
                const laneSpoken = closestGpsPhotoHazard.lane ? ` en el carril ${closestGpsPhotoHazard.lane}` : '';
                audioGuidance.speakEvent(
                    `photo_gps_${closestGpsPhotoHazard.id}`,
                    `Atención, reporte con foto de ${closestGpsPhotoHazard.tipo.split('/')[0]}${laneSpoken} a ${closestGpsPhotoHazard.distMeters} metros.`,
                    30,
                    true
                );
            } else {
                setProximityHazardPhoto(null);
            }

            const nearbyLight = trafficLightsRef.current?.find(light => {
                const distDeg = Math.sqrt(
                    Math.pow(latitude - light.coordinates[0], 2) +
                    Math.pow(longitude - light.coordinates[1], 2)
                );
                return (distDeg * 111000) <= 65;
            });

            let newGpsHudRec = null;

            if (nearbyRobbery) {
                newGpsHudRec = `🔴 Alerta de Hurto: ${nearbyRobbery.name}`;
                audioGuidance.speakEvent(`rob_gps_${nearbyRobbery.id}`, `Alerta, reporte de hurto cercano en ${nearbyRobbery.name}. Mantente atento.`, 25, true);
            }

            if (nearbyAccident) {
                if (!newGpsHudRec) newGpsHudRec = `🚗 Accidente de Tránsito: ${nearbyAccident.name}`;
                audioGuidance.speakEvent(`acc_gps_${nearbyAccident.id}`, `Precaución, reporte de siniestro vial en ${nearbyAccident.name}.`, 25, true);
            }

            if (nearbyReport) {
                const tipo = nearbyReport.properties?.tipo_novedad || 'novedad';
                if (tipo.toLowerCase().includes('luminaria') || tipo.toLowerCase().includes('oscur') || tipo.toLowerCase().includes('luz')) {
                    if (!newGpsHudRec) newGpsHudRec = '💡 Tramo con baja iluminación. Enciende luces.';
                    audioGuidance.speakEvent(`light_gps_${nearbyReport.id}`, 'Zona con poca iluminación reportada. Enciende tus luces.', 30, true);
                } else if (tipo.toLowerCase().includes('hueco') || tipo.toLowerCase().includes('daño') || tipo.toLowerCase().includes('bache')) {
                    const lane = nearbyReport.properties?.lane;
                    const laneDesc = lane === 'izquierda' ? 'a la izquierda de la vía' : (lane === 'derecha' ? 'a la derecha de la vía' : (lane === 'centro' ? 'en el centro de la vía' : 'en la calzada'));
                    if (!newGpsHudRec) newGpsHudRec = `🕳️ Bache ${lane ? `(${lane.toUpperCase()})` : ''} adelante.`;
                    audioGuidance.speakEvent(`pothole_gps_${nearbyReport.id}`, `Atención, bache reportado ${laneDesc} adelante.`, 30, true);
                } else {
                    if (!newGpsHudRec) newGpsHudRec = `📢 Reporte ciudadano: ${tipo.split('/')[0]}`;
                    audioGuidance.speakEvent(`rep_gps_${nearbyReport.id}`, `Reporte ciudadano en la vía: ${tipo.split('/')[0]}.`, 30, false);
                }
            }

            if (nearbyConst) {
                if (!newGpsHudRec) newGpsHudRec = '🚧 Obras viales del IDU adelante. Precaución.';
                audioGuidance.speakEvent(`const_gps_${nearbyConst.lat}`, 'Obras viales del IDU adelante. Reduce la velocidad.', 35, false);
            }

            if (nearbyCai) {
                if (!newGpsHudRec) newGpsHudRec = `👮 CAI de Policía: ${nearbyCai.name}`;
                audioGuidance.speakEvent(`cai_gps_${nearbyCai.id}`, `CAI de policía ${nearbyCai.name} cercano.`, 40, false);
            }

            if (currentSimState?.weather === 'lluvia') {
                if (!newGpsHudRec) newGpsHudRec = '🌧️ Calzada mojada por lluvia.';
                audioGuidance.speakEvent('rain_warning_gps', 'Alerta de clima: Lluvia en tu sector. Calzada resbaladiza, reduce la velocidad.', 45, true);
            }

            if (nearbyLight && nearbyLight.state === 'rojo') {
                if (!newGpsHudRec) newGpsHudRec = `🚦 Semáforo en ROJO en ${nearbyLight.intersection || 'intersección'}. Detén la marcha.`;
                audioGuidance.speakEvent(`light_red_gps_${nearbyLight.id || nearbyLight.intersection}`, 'Atención, semáforo en rojo. Detén la marcha.', 15, true);
            }

            if (newGpsHudRec) {
                setHudRecommendation(newGpsHudRec);
            }
        };

        const handleError = (err) => {
            console.warn("[GPS] Error de sensor o permisos:", err.message);
        };

        const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 8000
        });

        return () => navigator.geolocation.clearWatch(watchId);
    }, [navStatus, navigationMode, handleDynamicReroute]);

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

        if (activeMode === 'favorite') {
            const formattedCoord = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
            if (pendingFavoriteCallbackRef.current) {
                pendingFavoriteCallbackRef.current({ lat: latlng.lat, lng: latlng.lng }, `Punto en mapa (${formattedCoord})`);
                pendingFavoriteCallbackRef.current = null;
            }
            setIsFavoritesModalOpen(true);
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
        const lane = (customData && customData.lane) ? customData.lane : null;
        const severity = (customData && customData.severity) ? customData.severity : 'moderado';

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
                            descripcion: description || report.properties.descripcion,
                            lane: lane || report.properties.lane,
                            severity: severity || report.properties.severity
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
                    lane: lane,
                    severity: severity,
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

    // Crowdsourcing 1-touch Quick Hazard Report handler (Prompt 3)
    const handleQuickHazardReport = async (hazardKey) => {
        const coords = cyclistCoords 
            || (userLocation ? [userLocation.lat, userLocation.lng] : null)
            || (routePoints.origin ? [routePoints.origin.lat, routePoints.origin.lng] : [4.5317, -74.1166]);

        const locName = localitiesMap[localidad]?.fullName || 'Bogotá';
        const feature = createQuickHazardFeature(hazardKey, coords, locName);

        if (currentUser) {
            feature.properties.userId = currentUser.uid;
            feature.properties.reportedBy = currentUser.displayName;
        }

        // 1. Reactive state update
        setCitizenReports(prev => [feature, ...prev]);
        // 2. Persist to localStorage (with 60-min automatic expiration)
        saveUserReport(feature);
        // 3. Forward to future cloud sync handler
        await syncReport(feature);

        showToast(`⚠️ Reporte rápido registrado: ${feature.properties.tipo_novedad}. ¡Gracias por alertar a la comunidad!`, 'success');
        soundService.playNotification('info');
    };

    // Dedicated Citizen Hazard Report handler with photo, category, lane and severity
    const handleSaveHazardReport = async ({ hazardType = 'POTHOLE', lane, foto, severity, descripcion, coords: customCoords }) => {
        const coords = customCoords 
            || cyclistCoords 
            || (userLocation ? [userLocation.lat, userLocation.lng] : null)
            || (routePoints.origin ? [routePoints.origin.lat, routePoints.origin.lng] : [4.5317, -74.1166]);

        const locName = localitiesMap[localidad]?.fullName || 'Bogotá';
        const feature = createQuickHazardFeature(hazardType, coords, locName, {
            lane,
            foto,
            severity,
            descripcion
        });

        if (currentUser) {
            feature.properties.userId = currentUser.uid;
            feature.properties.reportedBy = currentUser.displayName;
        }

        // 1. Reactive state update
        setCitizenReports(prev => [feature, ...prev]);
        // 2. Persist to localStorage
        saveUserReport(feature);
        // 3. Forward to cloud sync
        await syncReport(feature);

        const hazardInfo = HAZARD_TYPES[hazardType.toUpperCase()] || HAZARD_TYPES.POTHOLE;
        const laneText = lane ? (lane === 'izquierda' ? ' a la izquierda' : (lane === 'derecha' ? ' a la derecha' : ' en el centro')) : '';
        showToast(`⚠️ ${hazardInfo.label} reportado${laneText}${foto ? ' con evidencia fotográfica' : ''}. ¡Gracias!`, 'success');
        soundService.playNotification('info');
    };
    const handleSavePotholeReport = handleSaveHazardReport;

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

    // 11. Nominatim Geocoding Fetcher con desambiguación inteligente y proximidad
    const geocodeAddress = async (addressText, proximityCoord = null) => {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressText)},+Bogota,+Colombia&format=json&addressdetails=1&limit=8&countrycodes=co&viewbox=-74.28,4.42,-74.00,4.82`;
        try {
            const response = await fetch(url, { headers: { 'Accept-Language': 'es' } });
            const data = await response.json();
            if (data && data.length > 0) {
                const parsed = data.map(item => {
                    const addr = item.address || {};
                    const rawTitle = item.display_name.split(',')[0].trim();
                    const branchOrSub = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter;
                    const road = addr.road;
                    let enrichedName = rawTitle;

                    if (rawTitle.toLowerCase().includes('alkosto') || rawTitle.toLowerCase().includes('éxito') || rawTitle.toLowerCase().includes('exito') || rawTitle.toLowerCase().includes('d1')) {
                        if (branchOrSub && !rawTitle.toLowerCase().includes(branchOrSub.toLowerCase())) {
                            enrichedName = `${rawTitle} - ${branchOrSub}`;
                        } else if (road && !rawTitle.toLowerCase().includes(road.toLowerCase())) {
                            enrichedName = `${rawTitle} (${road})`;
                        }
                    }

                    const lat = parseFloat(item.lat);
                    const lng = parseFloat(item.lon);
                    let distanceMeters = Infinity;

                    if (proximityCoord) {
                        const pLat = proximityCoord.lat !== undefined ? proximityCoord.lat : proximityCoord[0];
                        const pLng = proximityCoord.lng !== undefined ? proximityCoord.lng : proximityCoord[1];
                        distanceMeters = calculateDistanceMeters([pLat, pLng], [lat, lng]);
                    }

                    return {
                        lat,
                        lng,
                        name: enrichedName,
                        fullName: item.display_name,
                        distanceMeters
                    };
                });

                if (proximityCoord) {
                    parsed.sort((a, b) => a.distanceMeters - b.distanceMeters);
                }

                return parsed[0];
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
        }
        return null;
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
                    const result = await geocodeAddress(origText, userLocation);
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
                const result = await geocodeAddress(destText, originCoord || userLocation);
                if (result) {
                    destCoord = { lat: result.lat, lng: result.lng };
                    setDestInput(result.name);
                    if (result.distanceMeters && result.distanceMeters < 50000) {
                        const distKm = (result.distanceMeters / 1000).toFixed(1);
                        showToast(`📍 Destino fijado: ${result.name} (a ${distKm} km)`, "info");
                    }
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

        const calculated = buildRouteObjects(
            routesData,
            segments,
            simulationState,
            constructionZones,
            citizenReports,
            trafficJams,
            trafficLights
        );

        setGeneratedRoutes(calculated);
        setActiveRouteId('route_0');
        setIsLoading(false);

        // Mobile Bottom Sheet UX: Auto-reduce so the user can immediately analyze the plotted route on the map
        setIsBottomSheetExpanded(false);
    };

    // 13b. Seleccionar y Trazar Ruta instantánea a un Sitio Favorito desde el Mapa (Casa, Trabajo, Gym, etc.)
    const handleSelectFavoriteDestination = (place) => {
        if (!place || !place.coords) return;
        handleSelectDestLocation(place.coords, place.label);
        handleCalculateRoute(null, place.coords, place.label);
        if (currentUser?.uid) {
            favoritePlacesService.recordPlaceVisit(currentUser.uid, place.id);
        }
        showToast(`🚴 Trazando ruta segura hacia ${place.label}...`, "info");
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
        offRouteTicksRef.current = 0;
        isReroutingRef.current = false;
        minDistToDestRef.current = Infinity;
        lastGpsCoordRef.current = null;
        setIsArrivalModalOpen(false);

        // Reset maneuvers announcement flags
        if (routeManeuvers && routeManeuvers.length > 0) {
            routeManeuvers.forEach(m => {
                m.announced150 = false;
                m.announced50 = false;
                m.announcedNow = false;
            });
        }

        const destName = destInput ? destInput.replace('📍', '').trim() : 'tu destino';
        audioGuidance.speak(`Iniciando recorrido hacia ${destName}. Continúa recto por la ciclorruta.`, true);
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

    // Handle selecting a route: switch active route and collapse bottom sheet to allow full map analysis
    const handleSelectRoute = (routeId) => {
        setActiveRouteId(routeId);
        setIsBottomSheetExpanded(false);
    };

    // Prepare subcomponents as JSX to render inside layouts
    const headerComponent = (
        <FloatingHeader
            localidad={localidad}
            onLocalidadChange={handleLocalidadChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            hideLogo={leftDrawerOpen}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
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
            onSelectRoute={handleSelectRoute}
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
            navSpeedMultiplier={navSpeedMultiplier}
            isCameraLocked={isCameraLocked}
            onCameraLockChange={setIsCameraLocked}
            cyclistCoords={cyclistCoords}
            cyclistIndex={cyclistIndex}
            cyclistBearing={cyclistBearing}
            userLocation={userLocation}
            userHeading={userHeading}
            activeRoute={activeRoute}
            leftDrawerOpen={leftDrawerOpen}
            rightDrawerOpen={rightDrawerOpen}
            isMobile={isMobile}
            isBottomSheetExpanded={isBottomSheetExpanded}
            userFavorites={userFavorites}
            onSelectFavoriteDestination={handleSelectFavoriteDestination}
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
            userLocation={userLocation}
            onStartVoice={() => setIsVoiceSearchOpen(true)}
            userFavorites={userFavorites}
            onOpenManageFavorites={() => setIsFavoritesModalOpen(true)}
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
            onSelectRoute={handleSelectRoute}
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

    const activeManeuver = currentManeuverInfo?.maneuver;
    const activeManeuverDist = currentManeuverInfo ? currentManeuverInfo.distanceMeters : remainingMetersToDest;
    const maneuverIcon = activeManeuver?.icon || (remainingMetersToDest <= 40 ? 'fa-flag-checkered' : 'fa-arrow-up');
    const displayDist = remainingMetersToDest <= 40 ? '0 m' : (activeManeuverDist >= 1000 ? `${(activeManeuverDist / 1000).toFixed(1)} km` : `${activeManeuverDist} m`);

    // Salida limpia e inmediata de la navegación activa para evitar cuelgues o reinicios de la app
    const handleExitNavigation = useCallback(() => {
        setNavStatus('stopped');
        setIsNavigating(false);
        setIsCameraLocked(true);
        cyclistIndexRef.current = 0;
        setCyclistCoords(null);
        setCyclistIndex(0);
        setSpeedKmh(0);
        setNextTrafficLight(null);
        setProximityHazardPhoto(null);
        audioGuidance.stop();
        wakeLockService.releaseWakeLock();
        if (isMobile) {
            setIsBottomSheetExpanded(true);
        }
        showToast("Navegación finalizada. Regresando al planificador.", "info");
    }, [isMobile]);

    const cockpitHUD = isNavigating && activeRoute && (
        <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-between p-4 animate-fade-in select-none">
            {/* 1. Top Navigation Maneuver Banner - Crisp Pure White & Emerald Green */}
            <div 
                className="pointer-events-auto max-w-md w-full mx-auto rounded-3xl shadow-2xl p-4 border flex items-center gap-3.5 animate-slide-down"
                style={{ background: '#ffffff', color: '#0f172a', borderColor: 'rgba(16, 185, 129, 0.4)', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' }}
            >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 border border-emerald-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <i className={`fa-solid ${maneuverIcon} text-xl text-white`}></i>
                </div>
                <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black text-slate-900 tracking-tight">
                            {displayDist}
                        </span>
                        <span className="text-2xs text-slate-500 uppercase font-bold">
                            {activeManeuver?.shortText || 'hacia'}
                        </span>
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

            {/* 1b. Miniatura No Invasiva de Peligro Fotográfico Cercano */}
            {proximityHazardPhoto && (
                <HazardProximityPill 
                    hazard={proximityHazardPhoto}
                    onDismiss={() => setProximityHazardPhoto(null)}
                />
            )}

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
                        className="pointer-events-auto flex items-center gap-1.5 p-1 rounded-2xl shadow-xl border bg-white/95 backdrop-blur-md border-slate-200"
                        style={{ boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}
                    >
                        <button
                            onClick={() => setNavStatus(navStatus === 'running' ? 'paused' : 'running')}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center cursor-pointer border-none text-sm transition-colors active:scale-95"
                            title={navStatus === 'running' ? "Pausar simulación" : "Reanudar simulación"}
                        >
                            <i className={`fa-solid ${navStatus === 'running' ? 'fa-pause text-amber-600' : 'fa-play text-emerald-600'}`}></i>
                        </button>
                        <button
                            onClick={() => {
                                const next = navSpeedMultiplier === 1 ? 2 : (navSpeedMultiplier === 2 ? 4 : 1);
                                setNavSpeedMultiplier(next);
                            }}
                            className="h-10 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-xs cursor-pointer border-none transition-all active:scale-95"
                            title="Toca para cambiar la velocidad de simulación"
                        >
                            {navSpeedMultiplier}x
                        </button>
                    </div>
                )}
            </div>

            {/* 2b. Floating Recenter Camera Button (Shown when user pans/explores map during navigation) */}
            {!isCameraLocked && (
                <div className="pointer-events-auto flex justify-center mb-3 animate-fade-in">
                    <button
                        onClick={() => {
                            setIsCameraLocked(true);
                            if (cyclistCoords) {
                                setZoomToCoords(cyclistCoords);
                            }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-2xl border-2 border-white cursor-pointer active:scale-95 transition-all"
                        style={{ boxShadow: '0 8px 25px rgba(16, 185, 129, 0.45)' }}
                    >
                        <i className="fa-solid fa-location-crosshairs text-sm animate-pulse"></i>
                        <span>📍 Recentrar al Ciclista</span>
                    </button>
                </div>
            )}

            {/* 3. Bottom Card Minimalista (Hora de llegada, distancia restante, silenciar voz y salir) */}
            <div 
                className="pointer-events-auto max-w-md w-full mx-auto rounded-3xl shadow-2xl p-4 border flex items-center justify-between animate-slide-up bg-white border-slate-200"
                style={{ boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15)' }}
            >
                <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tight text-slate-900">
                        {getEstimatedArrivalTime(activeRoute.durationMin)}
                    </span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{activeRoute.durationMin} min</span>
                        <span>•</span>
                        <span>
                            {remainingMetersToDest >= 1000 
                                ? `${(remainingMetersToDest / 1000).toFixed(1)} km` 
                                : `${remainingMetersToDest} m`}
                        </span>
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botón único de Silenciar / Activar Voz */}
                    <button
                        onClick={() => {
                            const nextVal = !voiceEnabled;
                            setVoiceEnabled(nextVal);
                            if (nextVal) {
                                audioGuidance.speakRaw("Voz activada.");
                                showToast("🔊 Asistente de voz activado", "success");
                            } else {
                                audioGuidance.stop();
                                showToast("🔇 Asistente de voz silenciado", "info");
                            }
                        }}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer border-none transition-all active:scale-95 ${
                            voiceEnabled 
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                                : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}
                        title={voiceEnabled ? "Silenciar voz" : "Activar voz"}
                    >
                        <i className={`fa-solid ${voiceEnabled ? 'fa-volume-high text-base text-emerald-600' : 'fa-volume-xmark text-base text-rose-500'}`}></i>
                    </button>

                    {/* Botón Principal de Salida / Cancelar Navegación */}
                    <button
                        onClick={handleExitNavigation}
                        className="h-11 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs flex items-center gap-2 cursor-pointer border border-rose-200 shadow-xs transition-all active:scale-95"
                        title="Finalizar viaje y regresar al mapa"
                    >
                        <i className="fa-solid fa-xmark text-base text-rose-600"></i>
                        <span>Salir</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const fallbackRecoveryHUD = isNavigating && !activeRoute && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md w-full mx-auto pointer-events-auto bg-white p-4 rounded-3xl shadow-2xl border border-slate-200 flex items-center justify-between animate-slide-down" style={{ boxShadow: '0 12px 35px rgba(0, 0, 0, 0.15)' }}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-arrows-rotate fa-spin text-emerald-700 text-lg"></i>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-800">Recalculando tu ruta...</span>
                    <span className="text-[11px] font-medium text-slate-500">Buscando el mejor trayecto seguro</span>
                </div>
            </div>
            <button
                onClick={handleExitNavigation}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md border-none cursor-pointer transition-all active:scale-95"
            >
                Salir
            </button>
        </div>
    );

    return (
        <div className={`relative w-screen h-screen overflow-hidden ${viewMode === 'tech' ? 'scientific-view' : 'citizen-view'}`}>
            
            {/* 1. Geospatial Map in Background */}
            <div className="absolute inset-0 z-0">
                {mapComponent}
            </div>

            {/* Coordinated Floating Action Controls Stack (GPS Recenter + Quick Hazard Crowdsourcing) */}
            <div className={`absolute right-4 z-30 pointer-events-auto flex flex-col items-center gap-3.5 transition-all duration-300 ${
                isNavigating 
                    ? 'bottom-32 sm:bottom-36' 
                    : (isMobile ? 'bottom-24' : 'bottom-8 right-6')
            }`}>
                {/* 1. Floating GPS / Recenter Button */}
                <button
                    type="button"
                    onClick={() => {
                        const target = (isNavigating && cyclistCoords) 
                            ? cyclistCoords 
                            : (userLocation ? [userLocation.lat, userLocation.lng] : null);
                        if (target) {
                            setZoomToCoords(target);
                            setIsCameraLocked(true);
                        }
                    }}
                    className="w-12 h-12 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all group"
                    style={{
                        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)'
                    }}
                    title={isNavigating ? "Recentrar cámara en la bicicleta" : "Centrar en mi ubicación GPS"}
                    aria-label="Centrar en ubicación"
                    id="btn-my-location"
                >
                    <i className="fa-solid fa-location-crosshairs text-lg group-hover:scale-110 transition-transform"></i>
                </button>

                {/* 2. Quick Hazard Report FAB */}
                <QuickHazardReportButton
                    onReportHazard={handleQuickHazardReport}
                    onOpenPotholeModal={(typeKey = 'POTHOLE') => {
                        setPotholeModalInitialType(typeKey);
                        setIsPotholeModalOpen(true);
                    }}
                    userLocation={userLocation}
                    isNavigating={isNavigating}
                />
            </div>

            {/* ==================== MOBILE LAYOUT (h < md) ==================== */}

            {/* 2. Floating Top Planner Card - hidden during navigation */}
            {isMobile && !isNavigating && !generatedRoutes.length && (
                <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 max-w-[calc(100vw-2rem)] mx-auto">
                    <div className="flex items-center gap-2">
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
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>¿A dónde quieres ir hoy?</span>
                        </div>
                        {/* Botón Mis Lugares Importantes */}
                        <button
                            onClick={() => setIsFavoritesModalOpen(true)}
                            className="w-12 h-12 rounded-2xl bg-white hover:bg-amber-50 text-amber-500 flex items-center justify-center shadow-lg cursor-pointer border border-amber-100 flex-shrink-0 active:scale-95 transition-all"
                            title="Mis Lugares Guardados (Casa, Trabajo...)"
                        >
                            <i className="fa-solid fa-star text-base"></i>
                        </button>
                        {/* Botón de Dictado por Voz */}
                        <button
                            onClick={() => setIsVoiceSearchOpen(true)}
                            className="w-12 h-12 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg cursor-pointer border border-emerald-100 flex-shrink-0 active:scale-95 transition-all"
                            title="Dictar destino por voz"
                        >
                            <i className="fa-solid fa-microphone text-base"></i>
                        </button>
                        {/* Botón SOS */}
                        <button
                            onClick={() => setIsSafeHavenOpen(true)}
                            className="w-12 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg cursor-pointer border-none flex-shrink-0 animate-pulse"
                            title="Botón SOS de Emergencia - Refugio CAI"
                        >
                            <i className="fa-solid fa-triangle-exclamation text-base"></i>
                        </button>
                    </div>

                    {/* Sugerencia Inteligente Contextual (Smart Commute en 1 toque) */}
                    {smartSuggestion && (
                        <div 
                            onClick={() => {
                                handleSelectDestLocation(smartSuggestion.place.coords, smartSuggestion.place.label);
                                handleCalculateRoute(null, smartSuggestion.place.coords, smartSuggestion.place.label);
                                favoritePlacesService.recordPlaceVisit(currentUser?.uid, smartSuggestion.place.id);
                                showToast(`🚀 Trazando ruta segura hacia ${smartSuggestion.place.label}...`, "success");
                            }}
                            className="w-full py-2.5 px-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-emerald-200/90 shadow-lg flex items-center justify-between gap-2.5 cursor-pointer active:scale-98 transition-all animate-fade-in"
                        >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-sm">
                                    <i className={smartSuggestion.icon}></i>
                                </div>
                                <div className="flex flex-col text-left overflow-hidden">
                                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                                        {smartSuggestion.badge}
                                    </span>
                                    <span className="text-xs font-black text-slate-800 truncate">
                                        {smartSuggestion.title}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-xs flex-shrink-0 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                <span>1 toque</span>
                                <i className="fa-solid fa-arrow-right text-[10px]"></i>
                            </div>
                        </div>
                    )}
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
                            userLocation={userLocation}
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
                            userLocation={userLocation}
                            onStartVoice={() => {
                                setIsMobileSearchOpen(false);
                                setIsVoiceSearchOpen(true);
                            }}
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
                            userFavorites={userFavorites}
                            onOpenManageFavorites={() => {
                                setIsMobileSearchOpen(false);
                                setIsFavoritesModalOpen(true);
                            }}
                            onSelectDestination={(item) => {
                                handleSelectDestLocation(item.coords, item.name);
                                handleCalculateRoute(null, item.coords, item.name);
                                setIsMobileSearchOpen(false);
                                if (item.isFavorite) {
                                    const fav = userFavorites.find(f => f.label === item.name);
                                    if (fav) favoritePlacesService.recordPlaceVisit(currentUser?.uid, fav.id);
                                }
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
                        {!isBottomSheetExpanded && !isNavigating && selectedSegmentId && segments[selectedSegmentId] && (
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
                                {currentPrediction.shaps && Object.keys(currentPrediction.shaps).length > 0 && (
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
                    onEmergencySOS={() => setIsSafeHavenOpen(true)}
                    onOpenLayers={() => setMobileLayersOpen(prev => !prev)}
                    onVoiceSearch={() => setIsVoiceSearchOpen(true)}
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
                            onClick={() => setIsFavoritesModalOpen(true)} 
                            className="tab-vertical-btn text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            title="⭐ Mis Lugares Importantes (Casa, Trabajo...)"
                        >
                            <i className="fa-solid fa-star"></i>
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
                                        {currentPrediction.shaps && Object.keys(currentPrediction.shaps).length > 0 && (
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
                                        {currentPrediction.shaps && Object.keys(currentPrediction.shaps).length > 0 && (
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
            {cockpitHUD || fallbackRecoveryHUD}

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
            {/* Modal de Reporte Ciudadano con Foto, Categoría y Carril */}
            <PotholeReportModal
                isOpen={isPotholeModalOpen}
                onClose={() => setIsPotholeModalOpen(false)}
                onSubmitReport={handleSaveHazardReport}
                userLocation={userLocation}
                cyclistCoords={cyclistCoords}
                initialHazardType={potholeModalInitialType}
            />

            {/* Modal de Ajustes y Capas de Mapa (Experiencia organizada y moderna) */}
            <MapSettingsModal
                isOpen={mobileLayersOpen}
                onClose={() => setMobileLayersOpen(false)}
                localidad={localidad}
                onLocalidadChange={handleLocalidadChange}
                localitiesMap={localitiesMap}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                mapStyle={mapStyle}
                onMapStyleChange={setMapStyle}
                mapLayers={mapLayers}
                onMapLayersChange={setMapLayers}
                currentUser={currentUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onOpenTour={() => setIsOnboardingOpen(true)}
            />

            {/* Modal de Llegada a Destino */}
            <DestinationArrivalModal
                isOpen={isArrivalModalOpen}
                onClose={() => setIsArrivalModalOpen(false)}
                destinationName={destInput || 'Destino'}
                distanceKm={activeRoute ? activeRoute.distanceKm : '0.0'}
                durationMin={activeRoute ? activeRoute.durationMin : '0'}
                avgRiskScore={activeRoute ? activeRoute.avgRiskScore : '2.4'}
                onStartNewRoute={() => {
                    setIsArrivalModalOpen(false);
                    handleClearRoute();
                }}
            />

            {/* Modal de Dictado por Voz en Pantalla Principal */}
            <VoiceSearchModal
                isOpen={isVoiceSearchOpen}
                onClose={() => setIsVoiceSearchOpen(false)}
                userFavorites={userFavorites}
                onDestinationRecognized={(recognizedText, matchedPlace) => {
                    setIsVoiceSearchOpen(false);
                    if (matchedPlace && matchedPlace.coords) {
                        handleSelectDestLocation(matchedPlace.coords, matchedPlace.label || recognizedText);
                        audioGuidance.speakRaw(`Buscando ruta hacia ${matchedPlace.label || recognizedText}.`);
                        handleCalculateRoute(null, matchedPlace.coords, matchedPlace.label || recognizedText);
                        favoritePlacesService.recordPlaceVisit(currentUser?.uid, matchedPlace.id);
                    } else {
                        setDestInput(recognizedText);
                        audioGuidance.speakRaw(`Buscando ruta hacia ${recognizedText}.`);
                        handleCalculateRoute(null, null, recognizedText);
                    }
                    if (!isMobile) {
                        setLeftDrawerOpen(true);
                        setActiveTab('routes');
                    }
                }}
            />

            {/* Modal de Autenticación con Google y Perfil de Usuario (Puerta de entrada inicial obligatoria si no está autenticado) */}
            <AuthModal
                isOpen={!currentUser || isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                currentUser={currentUser}
                userReportsCount={citizenReports.filter(r => r.properties?.userId === currentUser?.uid).length}
                showToast={showToast}
                onOpenFavorites={() => setIsFavoritesModalOpen(true)}
            />

            {/* Modal de Gestión de Lugares Frecuentes y Preferencias del Ciclista */}
            <FavoritePlacesModal
                isOpen={isFavoritesModalOpen}
                onClose={() => setIsFavoritesModalOpen(false)}
                currentUser={currentUser}
                userLocation={userLocation}
                onSelectPlaceAndNavigate={(place) => {
                    handleSelectDestLocation(place.coords, place.label);
                    handleCalculateRoute(null, place.coords, place.label);
                    showToast(`🚀 Pedaleando hacia ${place.label}...`, "success");
                    if (!isMobile) {
                        setLeftDrawerOpen(true);
                        setActiveTab('routes');
                    }
                }}
                onSelectLocationOnMap={(callback) => {
                    setIsFavoritesModalOpen(false);
                    setSelectingLocationMode('favorite');
                    pendingFavoriteCallbackRef.current = callback;
                    showToast("📍 Toca un punto en el mapa para fijar tu lugar favorito", "info");
                }}
                showToast={showToast}
            />

            {/* ==================== SUITE DE NOTIFICACIONES & USABILIDAD ==================== */}
            <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
            <OnboardingTourModal isOpen={isOnboardingOpen} onClose={() => setIsOnboardingOpen(false)} />
            <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
        </div>
    );
}

