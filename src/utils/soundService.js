/**
 * Sound & Notification Chimes Service for Ruta Clara
 * Generates crystal-clear, harmonic Web Audio API earcons and notification sounds
 * with zero latency, zero external assets, and full mobile haptic feedback.
 */

class SoundService {
    constructor() {
        this.ctx = null;
        this.isUnlocked = false;
        this.soundEnabled = true;

        if (typeof window !== 'undefined') {
            this.setupAutoUnlock();
        }
    }

    setupAutoUnlock() {
        const unlock = () => {
            this.initAudioContext();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().then(() => {
                    this.isUnlocked = true;
                }).catch(() => {});
            } else if (this.ctx && this.ctx.state === 'running') {
                this.isUnlocked = true;
            }
        };

        ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach(evt => {
            window.addEventListener(evt, unlock, { passive: true, once: false });
        });
    }

    initAudioContext() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                try {
                    this.ctx = new AudioContextClass();
                } catch (e) {
                    console.warn('Could not initialize AudioContext:', e);
                }
            }
        }
    }

    ensureContext() {
        this.initAudioContext();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    setEnabled(val) {
        this.soundEnabled = val;
    }

    /**
     * Triggers mobile haptic vibration if supported
     */
    vibrate(pattern = [60]) {
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(pattern);
            }
        } catch (e) {
            // Ignore vibration permission or unsupported errors
        }
    }

    /**
     * Plays a pleasant harmonic chime based on notification type
     * @param {'info' | 'warning' | 'error' | 'success' | 'alert' | 'turn'} type
     */
    playNotification(type = 'info') {
        if (!this.soundEnabled) return;
        const ctx = this.ensureContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;

            if (type === 'error' || type === 'alert') {
                // Two-tone attention tone: D5 (587Hz) -> A4 (440Hz)
                this.playToneSequence([
                    { freq: 587.33, start: 0, duration: 0.12, gain: 0.25 },
                    { freq: 440.00, start: 0.10, duration: 0.22, gain: 0.28 }
                ]);
                this.vibrate([100, 50, 100]);
            } else if (type === 'warning') {
                // Warning chime: F5 (698Hz) -> D5 (587Hz)
                this.playToneSequence([
                    { freq: 698.46, start: 0, duration: 0.10, gain: 0.22 },
                    { freq: 587.33, start: 0.08, duration: 0.20, gain: 0.24 }
                ]);
                this.vibrate([80, 40, 80]);
            } else if (type === 'success') {
                // Cheerful ascending triad: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
                this.playToneSequence([
                    { freq: 523.25, start: 0, duration: 0.09, gain: 0.20 },
                    { freq: 659.25, start: 0.08, duration: 0.09, gain: 0.22 },
                    { freq: 783.99, start: 0.16, duration: 0.25, gain: 0.25 }
                ]);
                this.vibrate([60, 40, 100]);
            } else if (type === 'turn') {
                // Crisp navigation turn cue: G5 (784Hz) -> C6 (1046Hz)
                this.playToneSequence([
                    { freq: 783.99, start: 0, duration: 0.07, gain: 0.18 },
                    { freq: 1046.50, start: 0.06, duration: 0.18, gain: 0.22 }
                ]);
                this.vibrate([80]);
            } else {
                // Standard info chime: E5 (659Hz) -> A5 (880Hz)
                this.playToneSequence([
                    { freq: 659.25, start: 0, duration: 0.08, gain: 0.18 },
                    { freq: 880.00, start: 0.07, duration: 0.18, gain: 0.20 }
                ]);
                this.vibrate([50]);
            }
        } catch (e) {
            console.warn('Error playing notification sound:', e);
        }
    }

    /**
     * Plays a sequence of harmonic pure tones with smooth exponential decay
     */
    playToneSequence(tones) {
        const ctx = this.ensureContext();
        if (!ctx) return;

        const now = ctx.currentTime;

        tones.forEach(({ freq, start, duration, gain }) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);

            // Envelope: gentle attack, musical exponential decay
            const startTime = now + start;
            gainNode.gain.setValueAtTime(0.001, startTime);
            gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.015);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.05);
        });
    }
}

export const soundService = new SoundService();
