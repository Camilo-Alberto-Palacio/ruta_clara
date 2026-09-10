/**
 * Servicio de Autenticación para Ruta Clara
 * Soporta Firebase Authentication con GoogleAuthProvider y persistencia en localStorage.
 * Incluye modo de demostración y detección automática de configuración en .env.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut as fbSignOut, 
    onAuthStateChanged 
} from 'firebase/auth';

const STORAGE_KEY = 'ruta_clara_auth_user';

// Lectura de variables de entorno Vite
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
    firebaseConfig.apiKey !== 'TU_FIREBASE_API_KEY' &&
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

        // Si Firebase está activo, sincronizar sesión oficial
        if (auth) {
            onAuthStateChanged(auth, (fbUser) => {
                if (fbUser) {
                    const mappedUser = {
                        uid: fbUser.uid,
                        displayName: fbUser.displayName || 'Ciclista Ruta Clara',
                        email: fbUser.email,
                        photoURL: fbUser.photoURL || null,
                        role: 'Ciclista Ciudadano',
                        provider: 'google',
                        isDemo: false
                    };
                    this.setUser(mappedUser);
                } else if (this.currentUser && !this.currentUser.isDemo) {
                    this.setUser(null);
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
     * Iniciar sesión con Google oficial
     */
    async loginWithGoogle() {
        if (!this.isFirebaseReady()) {
            throw new Error("FIREBASE_NOT_CONFIGURED");
        }

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const fbUser = result.user;
            const mappedUser = {
                uid: fbUser.uid,
                displayName: fbUser.displayName || 'Ciclista Registrado',
                email: fbUser.email,
                photoURL: fbUser.photoURL || null,
                role: 'Ciclista Ciudadano',
                provider: 'google',
                isDemo: false
            };
            this.setUser(mappedUser);
            return mappedUser;
        } catch (error) {
            console.error("[AuthService] Error en Google Sign-In:", error);
            throw error;
        }
    }

    /**
     * Iniciar sesión en modo Demo para desarrollo o pruebas inmediatas
     */
    loginDemoUser(customData = {}) {
        const demoUser = {
            uid: `demo_${Date.now()}`,
            displayName: customData.displayName || 'Camilo Palacios',
            email: customData.email || 'camilo.palacios@semillero.edu.co',
            photoURL: customData.photoURL || null,
            role: 'Ciclista Ciudadano',
            provider: 'demo',
            isDemo: true
        };
        this.setUser(demoUser);
        return demoUser;
    }

    /**
     * Cerrar sesión
     */
    async logout() {
        if (auth && this.currentUser && !this.currentUser.isDemo) {
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
export default authService;
