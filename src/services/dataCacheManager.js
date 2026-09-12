/**
 * DataCacheManager - Administrador de Caché de Alto Rendimiento para Ruta Clara
 * 
 * Implementa una arquitectura en 2 niveles:
 * - L1: Memoria RAM (JavaScript Map) -> Acceso instantáneo a 0 ms.
 * - L2: LocalStorage -> Persistencia entre aperturas de la aplicación.
 * 
 * Previene llamadas innecesarias a APIs públicas, ahorra batería del móvil
 * y garantiza una navegación fluida a 60 FPS sin saturar el hilo principal.
 */

export const CACHE_TTL = {
    HAZARDS: 60 * 60 * 1000,          // 60 minutos (Reportes ciudadanos de baches / huecos)
    WEATHER: 20 * 60 * 1000,          // 20 minutos (Open-Meteo clima)
    CRIME_STATS: 24 * 60 * 60 * 1000,  // 24 horas (Hurtos / Siniestralidad vial)
    INFRASTRUCTURE: 7 * 24 * 60 * 60 * 1000 // 7 días (CAIs, Semáforos, Ciclorrutas fijas)
};

const STORAGE_PREFIX = 'rc_cache_';

class DataCacheManager {
    constructor() {
        // L1: Memoria RAM
        this.memoryStore = new Map();
        
        // Limpieza periódica de elementos expirados cada 10 minutos
        if (typeof window !== 'undefined') {
            setInterval(() => this.pruneExpired(), 10 * 60 * 1000);
        }
    }

    /**
     * Clave formateada para almacenamiento persistente
     */
    _getStorageKey(key) {
        return `${STORAGE_PREFIX}${key}`;
    }

    /**
     * Guarda datos en L1 (Memoria) y L2 (Persistente) con tiempo de vida (TTL)
     */
    set(key, data, ttlMs = CACHE_TTL.HAZARDS) {
        if (!key) return;

        const expiresAt = Date.now() + ttlMs;
        const payload = {
            data,
            expiresAt,
            savedAt: Date.now()
        };

        // 1. Guardar en L1 (RAM)
        this.memoryStore.set(key, payload);

        // 2. Guardar en L2 (LocalStorage)
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(this._getStorageKey(key), JSON.stringify(payload));
            }
        } catch (err) {
            console.warn(`[DataCacheManager] Fallo al persistir ${key} en L2:`, err.message);
        }
    }

    /**
     * Obtiene datos si están en caché y aún no han expirado.
     * Retorna `null` si no existe o ya caducó.
     */
    get(key) {
        if (!key) return null;

        const now = Date.now();

        // 1. Revisar L1 (Memoria RAM)
        if (this.memoryStore.has(key)) {
            const item = this.memoryStore.get(key);
            if (item.expiresAt > now) {
                return item.data;
            }
            // Ya expiró en L1
            this.memoryStore.delete(key);
        }

        // 2. Revisar L2 (LocalStorage)
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const raw = localStorage.getItem(this._getStorageKey(key));
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.expiresAt > now) {
                        // Promover a L1 para accesos futuros instantáneos
                        this.memoryStore.set(key, parsed);
                        return parsed.data;
                    }
                    // Expiró en L2
                    localStorage.removeItem(this._getStorageKey(key));
                }
            }
        } catch (err) {
            console.warn(`[DataCacheManager] Error leyendo ${key} de L2:`, err.message);
        }

        return null;
    }

    /**
     * Comprueba si una clave existe y es válida sin deserializar los datos completos
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Invalida y elimina una clave específica de L1 y L2
     */
    invalidate(key) {
        if (!key) return;
        this.memoryStore.delete(key);
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.removeItem(this._getStorageKey(key));
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Limpia automáticamente todos los registros expirados para liberar memoria y espacio
     */
    pruneExpired() {
        const now = Date.now();

        // Limpiar L1
        for (const [key, val] of this.memoryStore.entries()) {
            if (val.expiresAt <= now) {
                this.memoryStore.delete(key);
            }
        }

        // Limpiar L2
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(STORAGE_PREFIX)) {
                        try {
                            const val = JSON.parse(localStorage.getItem(k));
                            if (val && val.expiresAt <= now) {
                                keysToRemove.push(k);
                            }
                        } catch {
                            keysToRemove.push(k);
                        }
                    }
                }
                keysToRemove.forEach(k => localStorage.removeItem(k));
            }
        } catch (err) {
            console.warn('[DataCacheManager] Error durante la depuración de caché:', err);
        }
    }
}

export const dataCacheManager = new DataCacheManager();
export default dataCacheManager;
