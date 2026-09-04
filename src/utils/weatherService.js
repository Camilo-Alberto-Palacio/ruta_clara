// weatherService.js - Servicio meteorológico y matriz horaria delictiva para Bogotá

let weatherCache = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos

// Fallback meteorológico promedio para Bogotá
const DEFAULT_WEATHER = {
    temperature: 16.5,
    condition: 'seco', // 'seco' | 'lluvia'
    precipitation: 0.0,
    weatherCode: 1,
    isDay: 1,
    humidity: 72,
    windSpeed: 8.5,
    description: 'Parcialmente nublado',
    source: 'estimado'
};

/**
 * Consulta las condiciones meteorológicas reales para Bogotá vía Open-Meteo API
 */
export async function fetchBogotaWeather(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && weatherCache && (now - lastFetchTime < CACHE_DURATION_MS)) {
        return weatherCache;
    }

    try {
        const url = 'https://api.open-meteo.com/v1/forecast?latitude=4.6097&longitude=-74.0817&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,is_day&timezone=America%2FBogota';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Open-Meteo HTTP ${response.status}`);
        }

        const data = await response.json();
        const current = data.current || {};
        
        const precip = current.precipitation || current.rain || 0;
        const code = current.weather_code || 0;
        
        // Códigos WMO: 51-67 (llovizna y lluvia), 80-82 (chubascos), 95-99 (tormenta)
        const isRaining = precip > 0.1 || (code >= 51 && code <= 67) || (code >= 80 && code <= 99);
        
        let desc = 'Despejado';
        if (code >= 1 && code <= 3) desc = 'Parcialmente nublado';
        else if (code >= 45 && code <= 48) desc = 'Niebla / Neblina';
        else if (code >= 51 && code <= 65) desc = 'Lluvia leve';
        else if (code >= 66 || (code >= 80 && code <= 99)) desc = 'Lluvia fuerte / Tormenta';

        weatherCache = {
            temperature: Math.round(current.temperature_2m || 16),
            condition: isRaining ? 'lluvia' : 'seco',
            precipitation: precip,
            weatherCode: code,
            isDay: current.is_day !== undefined ? current.is_day : 1,
            humidity: current.relative_humidity_2m || 70,
            windSpeed: Math.round(current.wind_speed_10m || 8),
            description: desc,
            source: 'open-meteo',
            updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        lastFetchTime = now;
        return weatherCache;
    } catch (err) {
        console.warn('Fallo consulta a Open-Meteo, utilizando condiciones de referencia:', err.message);
        
        // Determinar si es de noche localmente
        const currentHour = new Date().getHours();
        const isDayLocal = (currentHour >= 6 && currentHour < 18) ? 1 : 0;
        
        weatherCache = {
            ...DEFAULT_WEATHER,
            isDay: isDayLocal,
            updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        lastFetchTime = now;
        return weatherCache;
    }
}

/**
 * Matriz Horaria de Riesgo Delictivo para Bogotá
 * Basada en análisis estadístico delictivo distrital (SIEDCO / Policía Nacional)
 * Ponderación horaria para ciclo-infraestructura
 */
export function getTimeOfDayRiskFactor(hourOfDay = null) {
    const hour = hourOfDay !== null ? hourOfDay : new Date().getHours();
    
    // Madrugada crítica (00:00 - 04:59): Poca visibilidad, nulo flujo de ciclistas, aislamiento
    if (hour >= 0 && hour < 5) {
        return {
            factor: 2.3,
            label: 'Madrugada (Alto Riesgo)',
            icon: 'fa-moon',
            level: 'alto',
            tip: 'Horario crítico. Circulación no recomendada salvo en caravana.'
        };
    }
    // Salida laboral / amanecer (05:00 - 06:59): Comienza afluencia, penumbra
    if (hour >= 5 && hour < 7) {
        return {
            factor: 1.1,
            label: 'Amanecer / Salida laboral',
            icon: 'fa-cloud-sun',
            level: 'medio',
            tip: 'Afluencia moderada en ciclorrutas principales. Alerta en pasos peatonales.'
        };
    }
    // Mañana despejada (07:00 - 11:59): Alta vigilancia natural, comercio activo
    if (hour >= 7 && hour < 12) {
        return {
            factor: -0.8,
            label: 'Mañana (Segura)',
            icon: 'fa-sun',
            level: 'bajo',
            tip: 'Buena vigilancia natural y comercio activo en vía.'
        };
    }
    // Mediodía / Tarde temprana (12:00 - 16:59): Buena iluminación natural
    if (hour >= 12 && hour < 17) {
        return {
            factor: -0.4,
            label: 'Tarde (Favorable)',
            icon: 'fa-sun',
            level: 'bajo',
            tip: 'Visibilidad óptima. Mantén la atención en cruces semafóricos.'
        };
    }
    // Hora pico retorno / Anochecer (17:00 - 19:59): Alto flujo ciclista pero cae la luz solar
    if (hour >= 17 && hour < 20) {
        return {
            factor: 0.9,
            label: 'Atardecer / Hora Pico',
            icon: 'fa-cloud-sun',
            level: 'medio',
            tip: 'Enciende tus luces delantera y trasera. Congestión en ciclorrutas.'
        };
    }
    // Noche cerrada (20:00 - 23:59): Disminuye afluencia, mayor incidencia de asaltos
    return {
        factor: 2.1,
        label: 'Noche (Riesgo Elevado)',
        icon: 'fa-moon',
        level: 'alto',
        tip: 'Transita únicamente por corredores con alumbrado LED y presencia policial.'
    };
}
