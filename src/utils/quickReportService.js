/**
 * Quick Hazard Crowdsourcing Service (SafeCycle Bogotá)
 * Manages 1-touch citizen reports with local storage persistence,
 * 60-minute visual expiration, and prepared cloud sync interface.
 */

const STORAGE_KEY = 'user_reports';
export const REPORT_EXPIRY_MS = 60 * 60 * 1000; // 60 minutes visual expiration

export const HAZARD_TYPES = {
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
        sublabel: 'Hueco, escombros o bloqueo',
        icon: 'fa-solid fa-road-barrier',
        color: '#f97316',
        bg: '#fff7ed',
        border: '#fed7aa'
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
 * Loads stored user reports from localStorage, automatically filtering out
 * reports older than 60 minutes.
 */
export function loadActiveUserReports() {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        const now = Date.now();
        // Keep only active reports (< 60 min old)
        const active = parsed.filter(item => {
            const time = item.properties?.timestamp || item.timestamp || 0;
            return (now - time) < REPORT_EXPIRY_MS;
        });

        // If stale items were purged, sync cleaned list back to storage
        if (active.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
        }

        return active;
    } catch (e) {
        console.warn('Error reading user_reports from localStorage:', e);
        return [];
    }
}

/**
 * Persists a user report to localStorage
 */
export function saveUserReport(reportFeature) {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
        const existing = loadActiveUserReports();
        const updated = [reportFeature, ...existing];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return true;
    } catch (e) {
        console.warn('Error saving user report to localStorage:', e);
        return false;
    }
}

/**
 * Prepares a standard GeoJSON Feature for a quick hazard report
 */
export function createQuickHazardFeature(hazardKey, coords, localityName = 'Bogotá') {
    const hazard = HAZARD_TYPES[hazardKey.toUpperCase()] || HAZARD_TYPES.OBSTACLE;
    const now = Date.now();
    const id = `quick_hazard_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
            descripcion: `Reporte rápido de ciclista (${timeStr})`,
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
 * Sincroniza un reporte ciudadano con la nube o base de datos externa.
 * Preparado para conectar con Supabase o Firebase en futuras fases.
 * 
 * @param {Object} report Objeto del reporte ciudadano con coordenadas, tipo y timestamp.
 * @returns {Promise<{ success: boolean, synced: boolean, id: string, note: string }>}
 */
export async function syncReport(report) {
    // TODO: Integración futura con backend (Supabase / Firebase Firestore / REST API)
    // Ejemplo:
    // const { data, error } = await supabase.from('community_hazard_reports').insert([report]);
    // if (error) throw error;

    // En esta fase de crowdsourcing local offline-first, resolvemos exitosamente:
    return Promise.resolve({
        success: true,
        synced: false,
        id: report?.id || `report_${Date.now()}`,
        note: 'Reporte registrado y guardado localmente en el dispositivo.'
    });
}
