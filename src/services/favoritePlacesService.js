/**
 * Servicio de Preferencias y Lugares Favoritos del Ciclista
 * Sincronización híbrida: Firebase Firestore + LocalStorage Offline-First.
 */

import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { firebaseApp } from './authService';
import { PLACE_CATEGORIES } from '../data/bogotaDestinations';

let db = null;
if (firebaseApp) {
    try {
        db = getFirestore(firebaseApp);
    } catch (err) {
        console.warn("[FavoritePlacesService] Error inicializando Firestore:", err);
    }
}

const LOCAL_STORAGE_PREFIX = 'ruta_clara_favs_';
const PREFS_STORAGE_PREFIX = 'ruta_clara_prefs_';

class FavoritePlacesService {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Obtiene la clave de almacenamiento local según el UID del usuario
     */
    getStorageKey(uid = 'guest') {
        return `${LOCAL_STORAGE_PREFIX}${uid || 'guest'}`;
    }

    getPrefsStorageKey(uid = 'guest') {
        return `${PREFS_STORAGE_PREFIX}${uid || 'guest'}`;
    }

    /**
     * Carga los favoritos locales de forma síncrona
     */
    getLocalFavorites(uid = 'guest') {
        try {
            const raw = localStorage.getItem(this.getStorageKey(uid));
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("[FavoritePlacesService] Error leyendo favoritos locales:", e);
            return [];
        }
    }

    /**
     * Guarda los favoritos locales
     */
    setLocalFavorites(uid = 'guest', places = []) {
        try {
            localStorage.setItem(this.getStorageKey(uid), JSON.stringify(places));
        } catch (e) {
            console.error("[FavoritePlacesService] Error guardando favoritos locales:", e);
        }
    }

    /**
     * Carga los favoritos del usuario (Firestore si está disponible, con fallback local)
     */
    async getFavorites(uid) {
        const local = this.getLocalFavorites(uid);
        if (!uid || !db) return local;

        try {
            const colRef = collection(db, 'users', uid, 'favorite_places');
            const snapshot = await getDocs(colRef);
            if (!snapshot.empty) {
                const cloudPlaces = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));
                // Actualizar cache local
                this.setLocalFavorites(uid, cloudPlaces);
                return cloudPlaces;
            }
        } catch (err) {
            console.warn("[FavoritePlacesService] Fallo lectura Firestore, usando local:", err.message);
        }
        return local;
    }

    /**
     * Suscribe un listener a los cambios de favoritos en tiempo real
     */
    subscribeFavorites(uid, callback) {
        if (!callback) return () => {};

        // Inmediatamente emitir datos locales
        const initial = this.getLocalFavorites(uid);
        callback(initial);

        if (!uid || !db) {
            return () => {};
        }

        try {
            const colRef = collection(db, 'users', uid, 'favorite_places');
            const unsubscribe = onSnapshot(colRef, (snapshot) => {
                const cloudPlaces = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));
                this.setLocalFavorites(uid, cloudPlaces);
                callback(cloudPlaces);
            }, (error) => {
                console.warn("[FavoritePlacesService] onSnapshot error:", error.message);
            });
            return unsubscribe;
        } catch (err) {
            console.warn("[FavoritePlacesService] Error suscribiendo a Firestore:", err);
            return () => {};
        }
    }

    /**
     * Agrega o actualiza un lugar favorito
     */
    async saveFavorite(uid, placeData) {
        const userUid = uid || 'guest';
        const id = placeData.id || `fav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        
        const categoryMeta = PLACE_CATEGORIES[placeData.category] || PLACE_CATEGORIES.custom;

        const newPlace = {
            id,
            category: placeData.category || 'custom',
            label: placeData.label?.trim() || categoryMeta.label,
            address: placeData.address?.trim() || 'Ubicación seleccionada',
            coords: {
                lat: parseFloat(placeData.coords?.lat),
                lng: parseFloat(placeData.coords?.lng)
            },
            isDefaultMorning: Boolean(placeData.isDefaultMorning),
            isDefaultEvening: Boolean(placeData.isDefaultEvening),
            visitCount: Number(placeData.visitCount || 0),
            updatedAt: new Date().toISOString(),
            createdAt: placeData.createdAt || new Date().toISOString()
        };

        // 1. Guardar en localStorage
        const currentList = this.getLocalFavorites(userUid);
        const existingIdx = currentList.findIndex(p => p.id === id);
        let updatedList;
        if (existingIdx >= 0) {
            updatedList = [...currentList];
            updatedList[existingIdx] = newPlace;
        } else {
            updatedList = [newPlace, ...currentList];
        }
        this.setLocalFavorites(userUid, updatedList);

        // 2. Sincronizar en Firestore si el usuario está autenticado
        if (uid && db) {
            try {
                const docRef = doc(db, 'users', uid, 'favorite_places', id);
                await setDoc(docRef, newPlace, { merge: true });
            } catch (err) {
                console.warn("[FavoritePlacesService] Error sincronizando con Firestore:", err.message);
            }
        }

        return newPlace;
    }

    /**
     * Elimina un lugar favorito
     */
    async deleteFavorite(uid, placeId) {
        const userUid = uid || 'guest';
        
        // 1. Local
        const currentList = this.getLocalFavorites(userUid);
        const updatedList = currentList.filter(p => p.id !== placeId);
        this.setLocalFavorites(userUid, updatedList);

        // 2. Firestore
        if (uid && db) {
            try {
                const docRef = doc(db, 'users', uid, 'favorite_places', placeId);
                await deleteDoc(docRef);
            } catch (err) {
                console.warn("[FavoritePlacesService] Error eliminando en Firestore:", err.message);
            }
        }
        return updatedList;
    }

    /**
     * Registra una visita / viaje realizado hacia este lugar
     */
    async recordPlaceVisit(uid, placeId) {
        const userUid = uid || 'guest';
        const currentList = this.getLocalFavorites(userUid);
        const place = currentList.find(p => p.id === placeId);
        if (!place) return;

        const updatedPlace = {
            ...place,
            visitCount: (place.visitCount || 0) + 1,
            lastVisitedAt: new Date().toISOString()
        };

        await this.saveFavorite(uid, updatedPlace);
    }

    /**
     * Obtiene la preferencia de perfil de ruta o preferencias generales
     */
    getUserPreferences(uid = 'guest') {
        try {
            const raw = localStorage.getItem(this.getPrefsStorageKey(uid));
            return raw ? JSON.parse(raw) : {
                preferredRouteProfile: 'safest', // 'safest' | 'fastest' | 'flat'
                autoVoiceGuidance: true,
                autoReroute: true
            };
        } catch {
            return { preferredRouteProfile: 'safest', autoVoiceGuidance: true, autoReroute: true };
        }
    }

    /**
     * Guarda las preferencias generales del usuario
     */
    async saveUserPreferences(uid, prefs) {
        const userUid = uid || 'guest';
        const current = this.getUserPreferences(userUid);
        const updated = { ...current, ...prefs, updatedAt: new Date().toISOString() };
        
        try {
            localStorage.setItem(this.getPrefsStorageKey(userUid), JSON.stringify(updated));
        } catch (e) {
            console.error(e);
        }

        if (uid && db) {
            try {
                const docRef = doc(db, 'users', uid, 'preferences', 'general');
                await setDoc(docRef, updated, { merge: true });
            } catch (err) {
                console.warn("[FavoritePlacesService] Error guardando preferencias en Firestore:", err);
            }
        }
        return updated;
    }

    /**
     * Generador de Sugerencias Inteligentes de Ruta (Smart Commute)
     * Determina automáticamente a dónde quiere ir la persona según la hora y día.
     */
    getSmartCommuteSuggestion(favorites = [], date = new Date()) {
        if (!favorites || favorites.length === 0) return null;

        const hour = date.getHours();
        const day = date.getDay(); // 0: domingo, 6: sábado
        const isWeekend = day === 0 || day === 6;

        // 1. Mañana laboral (6:00 AM a 10:30 AM, Lunes a Viernes)
        if (!isWeekend && hour >= 6 && hour < 11) {
            // Prioridad: Trabajo o Estudio o lugar marcado como isDefaultMorning
            const commuteTarget = favorites.find(f => f.isDefaultMorning) ||
                                  favorites.find(f => f.category === 'work') ||
                                  favorites.find(f => f.category === 'study');
            if (commuteTarget) {
                return {
                    place: commuteTarget,
                    badge: '🌅 Viaje de la Mañana',
                    title: `¿Vamos a ${commuteTarget.label}?`,
                    subtitle: 'Toca para trazar la ruta más segura ahora',
                    icon: commuteTarget.category === 'work' ? 'fa-solid fa-briefcase' : 'fa-solid fa-graduation-cap',
                    color: 'emerald'
                };
            }
        }

        // 2. Tarde / Noche (5:00 PM a 9:30 PM, Lunes a Viernes)
        if (!isWeekend && hour >= 17 && hour < 22) {
            const homeTarget = favorites.find(f => f.isDefaultEvening) ||
                               favorites.find(f => f.category === 'home');
            if (homeTarget) {
                return {
                    place: homeTarget,
                    badge: '🌆 Regreso a Casa',
                    title: `¿Volvemos a ${homeTarget.label}?`,
                    subtitle: 'Ruta segura con iluminación activa y ciclorrutas',
                    icon: 'fa-solid fa-house',
                    color: 'emerald'
                };
            }
        }

        // 3. Fin de semana (Sábado y Domingo, mañana / tarde)
        if (isWeekend && hour >= 7 && hour < 16) {
            const leisureTarget = favorites.find(f => f.category === 'park') ||
                                  favorites.find(f => f.category === 'gym') ||
                                  favorites.find(f => f.category === 'food');
            if (leisureTarget) {
                return {
                    place: leisureTarget,
                    badge: '🚴 Ciclovía & Recreación',
                    title: `¿Pedaleamos a ${leisureTarget.label}?`,
                    subtitle: 'Disfruta la ruta de fin de semana',
                    icon: 'fa-solid fa-bicycle',
                    color: 'green'
                };
            }
        }

        // 4. Si el usuario tiene Casa o Trabajo, sugerir el más visitado o Casa
        const fallback = favorites.find(f => f.category === 'home') || favorites[0];
        if (fallback && hour >= 18) {
            return {
                place: fallback,
                badge: '🌙 Destino Frecuente',
                title: `¿Ruta a ${fallback.label}?`,
                subtitle: 'Toca para iniciar cálculo seguro',
                icon: 'fa-solid fa-location-dot',
                color: 'emerald'
            };
        }

        return null;
    }
}

export const favoritePlacesService = new FavoritePlacesService();
export default favoritePlacesService;
