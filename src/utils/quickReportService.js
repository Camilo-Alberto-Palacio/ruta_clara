/**
 * Quick Hazard Crowdsourcing Service (Ruta Clara Bogotá)
 * 
 * Gestiona la red colaborativa de peligros en tiempo real (estilo Waze) para ciclistas:
 * - Sincronización en vivo vía Firebase Firestore (colección 'public_hazards')
 * - Caché inteligente L1/L2 mediante DataCacheManager
 * - Caducidad automática de 60 minutos (Regla 6 de AGENTS.md)
 * - Funcionamiento 100% resiliente Offline-First
 */

import { getFirestore, collection, doc, setDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { firebaseApp } from '../services/authService';
import { dataCacheManager, CACHE_TTL } from '../services/dataCacheManager';

let db = null;
if (firebaseApp) {
    try {
        db = getFirestore(firebaseApp);
    } catch (err) {
        console.warn("[QuickReportService] Error inicializando Firestore:", err);
    }
}

const STORAGE_KEY = 'user_reports';
export const REPORT_EXPIRY_MS = 60 * 60 * 1000; // 60 minutos de vida activa

export const HAZARD_TYPES = {
    POTHOLE: {
        id: 'pothole',
        label: 'Hueco / Bache en vía',
        sublabel: 'Trampa o rotura de calzada',
        icon: 'fa-solid fa-burst',
        color: '#ea580c',
        bg: '#fff7ed',
        border: '#fdba74'
    },
    LIGHTING: {
        id: 'lighting',
        label: 'Luminaria apagada',
        sublabel: 'Sector oscuro / Foco dañado',
        icon: 'fa-solid fa-lightbulb',
        color: '#f59e0b',
        bg: '#fffbeb',
        border: '#fde68a'
    },
    OBSTACLE: {
        id: 'obstacle',
        label: 'Obstáculo en vía',
        sublabel: 'Escombros o bloqueo',
        icon: 'fa-solid fa-road-barrier',
        color: '#f97316',
        bg: '#fff7ed',
        border: '#fed7aa'
    },
    TRAFFIC_LIGHT: {
        id: 'traffic_light',
        label: 'Semáforo averiado',
        sublabel: 'Apagado o intermitente',
        icon: 'fa-solid fa-traffic-light',
        color: '#10b981',
        bg: '#ecfdf5',
        border: '#a7f3d0'
    },
    DANGER: {
        id: 'danger',
        label: 'Zona peligrosa',
        sublabel: 'Alerta de hurto o inseguridad',
        icon: 'fa-solid fa-triangle-exclamation',
        color: '#ef4444',
        bg: '#fef2f2',
        border: '#fecaca'
    }
};

/**
 * Carga los reportes activos locales (< 60 minutos) con higiene de datos
 */
export function loadActiveUserReports() {
    // 1. Intentar L1 / L2 de DataCacheManager
    const cached = dataCacheManager.get('active_hazards');
    if (cached && Array.isArray(cached)) {
        return cached;
    }

    // 2. Fallback a LocalStorage directo
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        const now = Date.now();
        const active = parsed.filter(item => {
            const time = item.properties?.timestamp || item.timestamp || 0;
            return (now - time) < REPORT_EXPIRY_MS;
        });

        if (active.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
        }

        dataCacheManager.set('active_hazards', active, CACHE_TTL.HAZARDS);
        return active;
    } catch (e) {
        console.warn('Error leyendo user_reports de localStorage:', e);
        return [];
    }
}

/**
 * Guarda un reporte de manera local
 */
export function saveUserReport(reportFeature) {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
        const existing = loadActiveUserReports();
        const filtered = existing.filter(r => r.id !== reportFeature.id);
        const updated = [reportFeature, ...filtered];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        dataCacheManager.set('active_hazards', updated, CACHE_TTL.HAZARDS);
        return true;
    } catch (e) {
        console.warn('Error guardando reporte en localStorage:', e);
        return false;
    }
}

/**
 * Suscribe a los reportes ciudadanos activos en tiempo real (Firebase Firestore)
 * Cualquier reporte hecho por cualquier usuario en Bogotá se recibe al instante.
 */
export function subscribeToActiveHazards(callback) {
    if (!callback) return () => {};

    // Emitir inmediatamente lo que tengamos en caché local para arranque instantáneo (0 ms)
    const initialReports = loadActiveUserReports();
    callback(initialReports);

    if (!db) {
        return () => {};
    }

    try {
        const hazardsCol = collection(db, 'public_hazards');
        const unsubscribe = onSnapshot(hazardsCol, (snapshot) => {
            const now = Date.now();
            const cloudHazards = [];

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const ts = data.properties?.timestamp || data.timestamp || 0;
                // Filtrar solo reportes activos menores a 60 minutos
                if ((now - ts) < REPORT_EXPIRY_MS) {
                    cloudHazards.push(data);
                }
            });

            // Combinar con reportes locales que aún no hayan sincronizado
            const localOnly = initialReports.filter(lr => 
                !cloudHazards.some(cr => cr.id === lr.id)
            );
            const combined = [...cloudHazards, ...localOnly];

            // Actualizar caché
            dataCacheManager.set('active_hazards', combined, CACHE_TTL.HAZARDS);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
            } catch (e) {
                console.error(e);
            }

            callback(combined);
        }, (err) => {
            console.warn("[QuickReportService] onSnapshot Firestore advertencia:", err.message);
        });

        return unsubscribe;
    } catch (err) {
        console.warn("[QuickReportService] Error conectando listener de Firestore:", err);
        return () => {};
    }
}

/**
 * Prepara un objeto GeoJSON Feature estandarizado para un reporte rápido
 */
export function createQuickHazardFeature(hazardKey, coords, localityName = 'Bogotá', options = {}) {
    const hazard = HAZARD_TYPES[hazardKey.toUpperCase()] || HAZARD_TYPES.POTHOLE;
    const now = Date.now();
    const id = `quick_hazard_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const lane = options.lane || null; // 'izquierda' | 'centro' | 'derecha'
    const foto = options.foto || null;
    const severity = options.severity || 'moderado'; // 'leve' | 'moderado' | 'critico'
    const customDesc = options.descripcion || `Alerta de ${hazard.label.toLowerCase()} (${timeStr})`;

    return {
        type: 'Feature',
        id,
        geometry: {
            type: 'Point',
            coordinates: [coords[1], coords[0]] // GeoJSON [lng, lat]
        },
        properties: {
            id,
            coordenadas: [coords[0], coords[1]], // Leaflet [lat, lng]
            tipo_novedad: hazard.label,
            hazardKey: hazard.id,
            descripcion: customDesc,
            lane: lane,
            foto: foto,
            severity: severity,
            fecha_creacion: new Date(now).toISOString().split('T')[0],
            timestamp: now,
            numero_votos: 1,
            estado: 'activo',
            isQuickReport: true,
            localidad: localityName
        }
    };
}

/**
 * Publica y sincroniza un reporte ciudadano en Firebase Firestore y caché local
 */
export async function syncReport(report) {
    // 1. Guardar localmente
    saveUserReport(report);

    // 2. Sincronizar en la nube con Firestore si está disponible
    if (db && report && report.id) {
        try {
            const docRef = doc(db, 'public_hazards', report.id);
            await setDoc(docRef, report, { merge: true });
            return { success: true, synced: true, id: report.id, note: 'Sincronizado con la nube' };
        } catch (err) {
            console.warn("[QuickReportService] Error subiendo reporte a Firestore:", err.message);
            return { success: true, synced: false, id: report.id, note: 'Guardado localmente (sin red)' };
        }
    }

    return { success: true, synced: false, id: report.id, note: 'Guardado localmente' };
}

/**
 * Permite a la comunidad confirmar que un peligro sigue ahí (Upvote)
 */
export async function upvoteHazardReport(reportId) {
    if (!reportId) return;

    // 1. Actualizar localmente
    const active = loadActiveUserReports();
    const updated = active.map(r => {
        if (r.id === reportId) {
            const currentVotes = (r.properties?.numero_votos || 1) + 1;
            return {
                ...r,
                properties: {
                    ...r.properties,
                    numero_votos: currentVotes
                }
            };
        }
        return r;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    dataCacheManager.set('active_hazards', updated, CACHE_TTL.HAZARDS);

    // 2. Actualizar en Firestore
    if (db) {
        try {
            const docRef = doc(db, 'public_hazards', reportId);
            await updateDoc(docRef, {
                'properties.numero_votos': increment(1)
            });
        } catch (e) {
            console.warn("[QuickReportService] Error en upvote Firestore:", e.message);
        }
    }
}
