/**
 * Servicio de Autenticación para Ruta Clara
 * Integración directa con Firebase Authentication y GoogleAuthProvider.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithRedirect,
    getRedirectResult,
    signOut as fbSignOut, 
    onAuthStateChanged 
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const STORAGE_KEY = 'ruta_clara_auth_user';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigured = Boolean(
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey.startsWith('AIza') &&
    firebaseConfig.projectId
);

let firebaseApp = null;
let auth = null;
let googleProvider = null;

if (isConfigured) {
    try {
        firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        auth = getAuth(firebaseApp);
        googleProvider = new GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
    } catch (err) {
        console.warn("[AuthService] Error inicializando Firebase:", err);
    }
}

class AuthService {
    constructor() {
        this.listeners = new Set();
        this.currentUser = this.loadStoredUser();

        if (Capacitor.isNativePlatform()) {
            // 1. En Android / iOS nativo: verificar y sincronizar el usuario desde el SDK nativo
            FirebaseAuthentication.getCurrentUser().then((result) => {
                if (result && result.user) {
                    const u = result.user;
                    const mappedUser = {
                        uid: u.uid,
                        displayName: u.displayName || u.email?.split('@')[0] || 'Ciclista Ruta Clara',
                        email: u.email || '',
                        photoURL: u.photoUrl || u.photoURL || null,
                        role: 'Ciclista Ciudadano',
                        provider: 'google'
                    };
                    this.setUser(mappedUser);
                }
            }).catch((err) => {
                console.warn("[AuthService] Error sincronizando usuario nativo al inicio:", err);
            });

            // 2. Escuchar cambios de estado en el SDK nativo
            FirebaseAuthentication.addListener('authStateChange', (change) => {
                if (change && change.user) {
                    const u = change.user;
                    const mappedUser = {
                        uid: u.uid,
                        displayName: u.displayName || u.email?.split('@')[0] || 'Ciclista Ruta Clara',
                        email: u.email || '',
                        photoURL: u.photoUrl || u.photoURL || null,
                        role: 'Ciclista Ciudadano',
                        provider: 'google'
                    };
                    this.setUser(mappedUser);
                }
            }).catch((err) => {
                console.warn("[AuthService] Error registrando listener nativo:", err);
            });
        } else if (auth) {
            // Manejar retorno de redirección móvil si aplica en navegador web
            getRedirectResult(auth).then((result) => {
                if (result && result.user) {
                    const fbUser = result.user;
                    const mappedUser = {
                        uid: fbUser.uid,
                        displayName: fbUser.displayName || 'Ciclista Ruta Clara',
                        email: fbUser.email,
                        photoURL: fbUser.photoURL || null,
                        role: 'Ciclista Ciudadano',
                        provider: 'google'
                    };
                    this.setUser(mappedUser);
                }
            }).catch((err) => {
                console.warn("[AuthService] Error en getRedirectResult:", err);
            });

            // Escuchar cambios de estado en tiempo real solo en navegador web
            onAuthStateChanged(auth, (fbUser) => {
                if (fbUser) {
                    const mappedUser = {
                        uid: fbUser.uid,
                        displayName: fbUser.displayName || 'Ciclista Ruta Clara',
                        email: fbUser.email,
                        photoURL: fbUser.photoURL || null,
                        role: 'Ciclista Ciudadano',
                        provider: 'google'
                    };
                    this.setUser(mappedUser);
                }
            });
        }
    }

    loadStoredUser() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error("[AuthService] Error cargando usuario guardado:", e);
            return null;
        }
    }

    setUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
        this.notify();
    }

    isFirebaseReady() {
        return isConfigured && auth !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    onAuthChange(callback) {
        this.listeners.add(callback);
        callback(this.currentUser);
        return () => this.listeners.delete(callback);
    }

    notify() {
        for (const listener of this.listeners) {
            try {
                listener(this.currentUser);
            } catch (err) {
                console.error("[AuthService] Error en listener:", err);
            }
        }
    }

    /**
     * Iniciar sesión real con Google
     */
    async loginWithGoogle() {
        // 1. En entorno Nativo de Android/iOS (Capacitor):
        // Usa la ventana nativa de Google Play Services de Android (como las demás apps)
        // NUNCA abre Brave ni ningún navegador externo.
        if (Capacitor.isNativePlatform()) {
            try {
                const result = await FirebaseAuthentication.signInWithGoogle();
                const u = result.user;
                if (!u) {
                    throw new Error("NO_USER_RETURNED");
                }
                const mappedUser = {
                    uid: u.uid,
                    displayName: u.displayName || u.email?.split('@')[0] || 'Ciclista Registrado',
                    email: u.email || '',
                    photoURL: u.photoUrl || u.photoURL || null,
                    role: 'Ciclista Ciudadano',
                    provider: 'google'
                };
                this.setUser(mappedUser);
                return mappedUser;
            } catch (nativeError) {
                console.error("[AuthService] Error en Google Sign-In nativo:", nativeError);
                throw nativeError;
            }
        }

        // 2. En Navegador Web convencional (PC o Chrome desktop):
        if (!this.isFirebaseReady()) {
            throw new Error("FIREBASE_NOT_CONFIGURED");
        }

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const fbUser = result.user;
            const mappedUser = {
                uid: fbUser.uid,
                displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Ciclista Registrado',
                email: fbUser.email || '',
                photoURL: fbUser.photoURL || null,
                role: 'Ciclista Ciudadano',
                provider: 'google'
            };
            this.setUser(mappedUser);
            return mappedUser;
        } catch (error) {
            console.error("[AuthService] Error en Google Sign-In Web:", error);
            throw error;
        }
    }

    /**
     * Ingresar temporalmente como Invitado / Modo Explorador
     */
    loginAsGuest() {
        const guestUser = {
            uid: 'guest_' + Date.now(),
            displayName: 'Ciclista Explorador',
            email: 'invitado@rutaclara.co',
            photoURL: null,
            role: 'Ciclista Ciudadano',
            provider: 'guest',
            isGuest: true
        };
        this.setUser(guestUser);
        return guestUser;
    }

    /**
     * Cerrar sesión
     */
    async logout() {
        if (Capacitor.isNativePlatform()) {
            try {
                await FirebaseAuthentication.signOut();
            } catch (e) {
                console.warn("[AuthService] Error cerrando sesión nativa:", e);
            }
        }
        if (auth && this.currentUser) {
            try {
                await fbSignOut(auth);
            } catch (e) {
                console.warn("[AuthService] Error cerrando sesión en Firebase:", e);
            }
        }
        this.setUser(null);
    }
}

export const authService = new AuthService();
export { firebaseApp, auth, firebaseConfig };
export default authService;
