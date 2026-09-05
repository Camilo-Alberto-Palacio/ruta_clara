/**
 * Screen Wake Lock Service for Ruta Clara
 * Keeps the mobile / desktop screen awake while the cyclist is using the app or navigating.
 */

class WakeLockService {
    constructor() {
        this.wakeLock = null;
        this.isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
        this.requested = false;

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && this.requested) {
                    this.requestWakeLock();
                }
            });
        }
    }

    async requestWakeLock() {
        this.requested = true;
        if (!this.isSupported) return false;

        try {
            if (this.wakeLock !== null && !this.wakeLock.released) {
                return true;
            }

            this.wakeLock = await navigator.wakeLock.request('screen');
            this.wakeLock.addEventListener('release', () => {
                // Wake lock was released (e.g. phone minimized)
                if (this.requested && document.visibilityState === 'visible') {
                    // Try to reacquire gently
                    setTimeout(() => {
                        if (this.requested) this.requestWakeLock();
                    }, 1000);
                }
            });
            return true;
        } catch (err) {
            console.warn('Wake Lock request was blocked or not allowed:', err.message);
            return false;
        }
    }

    releaseWakeLock() {
        this.requested = false;
        if (this.wakeLock !== null) {
            try {
                this.wakeLock.release();
            } catch {
                // Ignore release errors
            }
            this.wakeLock = null;
        }
    }
}

export const wakeLockService = new WakeLockService();
