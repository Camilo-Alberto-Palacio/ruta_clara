// Servicio de obtención y sincronización de datos reales de semáforos de Bogotá
import { trafficLights as fallbackTrafficLights } from '../data/trafficLights';

const CACHE_KEY = 'safecycle_real_traffic_lights_cache';
const CACHE_TIME_KEY = 'safecycle_real_traffic_lights_time';
const CACHE_DURATION_MS = 1000 * 60 * 60 * 2; // 2 horas de caché

/**
 * Determina la localidad aproximada de Bogotá basada en coordenadas
 */
function getApproximateLocality(lat, lng) {
    if (lat < 4.50) return 'usme';
    if (lat < 4.57 && lng < -74.11) return 'ciudad_bolivar';
    if (lat < 4.58 && lng >= -74.11 && lng < -74.09) return 'tunjuelito';
    if (lat < 4.58 && lng >= -74.09) return 'rafael_uribe_uribe';
    if (lat < 4.60 && lng >= -74.08) return 'san_cristobal';
    if (lat < 4.61 && lng < -74.14) return 'bosa';
    if (lat < 4.63 && lng >= -74.17) return 'kennedy';
    if (lat < 4.62 && lng >= -74.08) return 'santa_fe';
    if (lat < 4.62 && lng >= -74.11 && lng < -74.08) return 'antonio_narino';
    if (lat < 4.64 && lng >= -74.12 && lng < -74.08) return 'los_martires';
    if (lat < 4.65 && lng >= -74.12 && lng < -74.09) return 'puente_aranda';
    if (lat < 4.67 && lng >= -74.16) return 'fontibon';
    if (lat < 4.67 && lng >= -74.09 && lng < -74.06) return 'teusaquillo';
    if (lat < 4.70 && lng >= -74.07 && lng < -74.02) return 'chapinero';
    if (lat < 4.72 && lng >= -74.12 && lng < -74.07) return 'barrios_unidos';
    if (lat < 4.73 && lng >= -74.13) return 'engativa';
    if (lat >= 4.73 && lng >= -74.10) return 'suba';
    if (lat >= 4.70 && lng < -74.01) return 'usaquen';
    return 'santa_fe';
}

/**
 * Consulta la API de Overpass para obtener semáforos reales de Bogotá
 */
export async function fetchBogotaTrafficLights(forceRefresh = false) {
    // 1. Revisar caché local en el navegador
    if (!forceRefresh) {
        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
            if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime, 10)) < CACHE_DURATION_MS) {
                const parsed = JSON.parse(cachedData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return { data: parsed, source: 'cache', count: parsed.length };
                }
            }
        } catch {
            // Continuar con la petición si falla el acceso a localStorage
        }
    }

    // 2. Consulta Overpass QL para Bogotá (Caja delimitadora de Bogotá urbano)
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `[out:json][timeout:15];
(
  node["highway"="traffic_signals"](4.45,-74.25,4.80,-74.00);
  node["traffic_signals"="crossing"](4.45,-74.25,4.80,-74.00);
);
out body 1200;`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(overpassUrl, {
            method: 'POST',
            body: query,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.elements || data.elements.length === 0) {
            throw new Error('No se encontraron semáforos en la respuesta');
        }

        // 3. Normalizar datos reales al formato de SafeCycle Bogotá
        const normalizedLights = data.elements.map((node, index) => {
            const tags = node.tags || {};
            const street = tags['addr:street'] || tags.street || tags.name;
            const crossing = tags.crossing;
            const bicycle = tags.bicycle;

            let type = 'vehicular';
            if (bicycle === 'yes' || tags['traffic_signals:bicycle'] === 'yes') {
                type = 'vehicular_ciclista';
            } else if (crossing === 'traffic_signals' || tags['traffic_signals:pedestrians'] === 'yes') {
                type = 'peatonal';
            }

            const statePool = ['verde', 'verde', 'rojo', 'rojo', 'amarillo'];
            const randomState = statePool[(node.id + index) % statePool.length];
            const cycleTime = 25 + ((node.id % 6) * 5); // 25s a 50s según nodo

            return {
                id: `real_tf_${node.id}`,
                name: street ? `Semáforo ${street}` : `Intersección Semafórica #${node.id.toString().slice(-4)}`,
                intersection: street || `Cruce vial ID ${node.id.toString().slice(-4)}`,
                coordinates: [node.lat, node.lon],
                localidad: getApproximateLocality(node.lat, node.lon),
                state: randomState,
                cycleTime: cycleTime,
                type: type,
                isRealData: true
            };
        });

        // Guardar en caché
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(normalizedLights));
            localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
        } catch {
            // Ignorar errores de cuota de localStorage
        }

        return {
            data: normalizedLights,
            source: 'live_api',
            count: normalizedLights.length
        };
    } catch (err) {
        console.warn('Fallo al consultar la API en vivo de semáforos, utilizando datos locales de respaldo:', err.message);
        return {
            data: fallbackTrafficLights,
            source: 'fallback',
            count: fallbackTrafficLights.length,
            error: err.message
        };
    }
}
