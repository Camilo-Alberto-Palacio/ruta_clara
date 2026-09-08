/**
 * GeoCache Service for Ruta Clara
 * Provides high-performance persistent caching for large GeoJSON datasets (e.g. Bogotá Localities ~2.5MB)
 * using native browser IndexedDB with TTL validation and offline resilience.
 */

const DB_NAME = 'RutaClaraGeoDB';
const DB_VERSION = 1;
const STORE_NAME = 'geo_layers';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            return reject(new Error('IndexedDB not supported in this environment'));
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Retrieve cached GeoJSON entry
 */
export async function getGeoCache(key) {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                resolve(result || null);
            };

            request.onerror = () => {
                console.warn(`Error reading ${key} from IndexedDB:`, request.error);
                resolve(null);
            };
        });
    } catch (err) {
        console.warn('IndexedDB unavailable, falling back:', err);
        return null;
    }
}

/**
 * Store GeoJSON data with timestamp
 */
export async function setGeoCache(key, data) {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const record = {
                key,
                data,
                timestamp: Date.now()
            };
            store.put(record);

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => {
                console.warn(`Error saving ${key} to IndexedDB:`, transaction.error);
                resolve(false);
            };
        });
    } catch (err) {
        console.warn('IndexedDB write failed:', err);
        return false;
    }
}

/**
 * Loads GeoJSON with a 7-day cache strategy and offline fallback.
 * 1. Checks IndexedDB cache.
 * 2. If fresh (< 7 days), returns immediately without network request.
 * 3. If stale or missing, fetches from URL and caches the new data.
 * 4. If fetch fails (offline), returns stale cache if available, or throws.
 */
export async function fetchGeoJSONWithCache(key, url, ttlMs = SEVEN_DAYS_MS) {
    const cached = await getGeoCache(key);
    const now = Date.now();

    // 1. Fresh cache hit (< 7 days)
    if (cached && cached.data && (now - cached.timestamp < ttlMs)) {
        return cached.data;
    }

    // 2. Fetch from network (or local bundled asset)
    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`HTTP error ${res.status} while fetching ${url}`);
        }
        const freshData = await res.json();
        // Asynchronously persist to cache
        setGeoCache(key, freshData).catch((e) => console.warn('Background caching error:', e));
        return freshData;
    } catch (networkErr) {
        console.warn(`Red no disponible para ${key}. Intentando respaldo offline:`, networkErr.message);

        // 3. Fallback: use expired cached version if offline
        if (cached && cached.data) {
            console.info(`Usando versión en caché previamente almacenada para ${key} (offline fallback).`);
            return cached.data;
        }

        // Re-throw if nothing is available
        throw networkErr;
    }
}
