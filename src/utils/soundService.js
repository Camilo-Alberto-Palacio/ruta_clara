/**
 * Haptic & Vibration Service for Ruta Clara
 * Provides tactile mobile vibration feedback on Android / iOS devices
 * with ZERO synthetic oscillator beeps or pitidos.
 */

class SoundService {
    constructor() {
        this.enabled = true;
    }

    setEnabled(val) {
        this.enabled = val;
    }

    ensureContext() {
        // No audio context required - purely haptic
        return null;
    }

    /**
     * Triggers mobile haptic vibration if supported (silent tactile feedback)
     */
    vibrate(pattern = [60]) {
        if (!this.enabled) return;
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(pattern);
            }
        } catch (e) {
            // Ignore unsupported or permission error
        }
    }

    /**
     * Silent notification haptic pulse (No audio beeps / pitidos)
     * @param {'info' | 'warning' | 'error' | 'success' | 'alert' | 'turn'} type
     */
    playNotification(type = 'info') {
        if (!this.enabled) return;

        if (type === 'error' || type === 'alert') {
            this.vibrate([120, 60, 120]);
        } else if (type === 'warning') {
            this.vibrate([80, 40, 80]);
        } else if (type === 'turn') {
            this.vibrate([70]);
        } else if (type === 'success') {
            this.vibrate([60, 40, 80]);
        } else {
            this.vibrate([40]);
        }
    }
}

export const soundService = new SoundService();
