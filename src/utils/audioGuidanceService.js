/**
 * Audio Guidance & Voice Copilot Service for Ruta Clara
 * Provides natural, non-intrusive voice safety alerts, Web Audio API chimes,
 * audio unlocking for mobile devices (Android WebView & iOS Safari),
 * and selectable voice models.
 */

class AudioGuidanceService {
    constructor() {
        this.enabled = true;
        this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
        this.audioCtx = null;
        this.cooldowns = new Map(); // eventKey -> timestamp
        this.lastSpokenTime = 0;
        this.minGlobalIntervalMs = 6000; // 6s between non-urgent voice cues
        this.selectedVoiceURI = null;
        this.selectedVoice = null;
        this.availableVoices = [];
        this.isAudioUnlocked = false;
        this.resumeWatchdog = null;

        if (this.synth) {
            this.refreshVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.refreshVoices();
            }
        }
    }

    /**
     * Unlocks audio on mobile / Android WebView upon any user gesture (touch / click).
     * Necessary because mobile operating systems block autoplay audio until user interaction.
     */
    unlockAudio() {
        if (this.isAudioUnlocked) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass && !this.audioCtx) {
                this.audioCtx = new AudioContextClass();
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        } catch (e) {
            console.warn('AudioContext unlock note:', e.message);
        }

        if (this.synth) {
            try {
                this.synth.resume();
                // Silent micro-utterance to prime Android TTS engine
                const primeUtterance = new SpeechSynthesisUtterance(' ');
                primeUtterance.volume = 0.01;
                this.synth.speak(primeUtterance);
            } catch (e) {
                console.warn('SpeechSynthesis prime note:', e.message);
            }
        }

        this.isAudioUnlocked = true;
    }

    /**
     * Plays a pleasant, immediate synthesized chime using the Web Audio API.
     * Guaranteed to work on mobile devices even if TTS voices are loading or unavailable.
     */
    playChime(type = 'alert') {
        if (!this.enabled) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!this.audioCtx && AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
            if (!this.audioCtx) return;

            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            const ctx = this.audioCtx;
            const now = ctx.currentTime;

            const playNote = (freq, startTime, duration, gainValue = 0.2, oscType = 'sine') => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = oscType;
                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0.001, startTime);
                gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            if (type === 'start') {
                // Uplifting two-tone chime (C5 -> E5)
                playNote(523.25, now, 0.25, 0.25);
                playNote(659.25, now + 0.15, 0.45, 0.3);
            } else if (type === 'red_light' || type === 'alert' || type === 'danger') {
                // Dual alert chime
                playNote(440, now, 0.18, 0.25, 'triangle');
                playNote(370, now + 0.15, 0.35, 0.28, 'triangle');
            } else if (type === 'green_light') {
                // Crisp gentle chime (E5 -> G5)
                playNote(659.25, now, 0.18, 0.2);
                playNote(783.99, now + 0.12, 0.3, 0.22);
            } else if (type === 'success') {
                // Ascending major triad
                playNote(523.25, now, 0.2, 0.2);
                playNote(659.25, now + 0.15, 0.2, 0.25);
                playNote(783.99, now + 0.3, 0.5, 0.3);
            } else {
                // Single short prompt
                playNote(587.33, now, 0.2, 0.2);
            }
        } catch (e) {
            // Audio context failed gracefully
        }
    }

    refreshVoices() {
        if (!this.synth) return;
        const all = this.synth.getVoices() || [];
        // Filter Spanish voices
        this.availableVoices = all.filter(v => 
            v.lang.startsWith('es') || 
            v.lang.includes('ES') || 
            v.lang.includes('spanish') || 
            v.name.toLowerCase().includes('spanish')
        );

        // Pick best natural voice by default
        if (!this.selectedVoice && this.availableVoices.length > 0) {
            const natural = this.availableVoices.find(v => 
                v.name.includes('Natural') || 
                v.name.includes('Online') || 
                v.name.includes('Google')
            );
            const latin = this.availableVoices.find(v => 
                v.lang === 'es-CO' || v.lang === 'es-419' || v.lang === 'es-US' || v.lang === 'es-MX'
            );
            this.selectedVoice = natural || latin || this.availableVoices[0];
            this.selectedVoiceURI = this.selectedVoice.voiceURI;
        } else if (this.selectedVoiceURI) {
            this.selectedVoice = this.availableVoices.find(v => v.voiceURI === this.selectedVoiceURI) || this.selectedVoice;
        }
    }

    getVoices() {
        this.refreshVoices();
        return this.availableVoices.map(v => ({
            uri: v.voiceURI,
            name: v.name.replace(/Microsoft |Google |Android /g, ''),
            lang: v.lang,
            isNatural: v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online')
        }));
    }

    setVoice(voiceURI) {
        this.selectedVoiceURI = voiceURI;
        this.refreshVoices();
        const match = this.availableVoices.find(v => v.voiceURI === voiceURI);
        if (match) {
            this.selectedVoice = match;
        }
    }

    setEnabled(val) {
        this.enabled = val;
        if (!val && this.synth) {
            this.synth.cancel();
        }
    }

    /**
     * Direct alias for speakRaw so both audioGuidance.speak(...) and audioGuidance.speakRaw(...) work seamlessly
     */
    speak(text, isPriority = false) {
        this.speakRaw(text, isPriority);
    }

    /**
     * Speaks an event with strict cooldown protection and plays an appropriate chime
     */
    speakEvent(eventKey, text, cooldownSeconds = 30, isPriority = false) {
        if (!this.enabled || !text) return false;

        const now = Date.now();

        // 1. Check event-specific cooldown
        if (eventKey && this.cooldowns.has(eventKey)) {
            const lastTime = this.cooldowns.get(eventKey);
            if ((now - lastTime) < (cooldownSeconds * 1000)) {
                return false;
            }
        }

        // 2. Check global minimum interval
        if (!isPriority && (now - this.lastSpokenTime) < this.minGlobalIntervalMs) {
            return false;
        }

        // Register cooldown
        if (eventKey) {
            this.cooldowns.set(eventKey, now);
        }
        this.lastSpokenTime = now;

        // Play chime according to context
        if (eventKey && (eventKey.includes('light_red') || eventKey.includes('rob') || eventKey.includes('acc') || eventKey.includes('danger'))) {
            this.playChime('red_light');
        } else if (eventKey && eventKey.includes('light_green')) {
            this.playChime('green_light');
        } else {
            this.playChime('alert');
        }

        // Delay voice 180ms so the chime doesn't mask the voice
        setTimeout(() => {
            this.speakRaw(text, isPriority);
        }, 180);

        return true;
    }

    speakRaw(text, isPriority = false) {
        if (!this.enabled || !text) return;

        // Ensure audio context is primed
        this.unlockAudio();

        const cleanText = text
            .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        if (!this.synth) {
            // Fallback: at least play chime if no synth available
            this.playChime(isPriority ? 'alert' : 'start');
            return;
        }

        if (isPriority) {
            this.synth.cancel();
        }

        // Android SpeechSynthesis Watchdog: Keep awake while speaking
        if (this.synth.paused) {
            this.synth.resume();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'es-CO';
        utterance.rate = 0.98; // Clear natural cadence
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        // Chrome/Android bug workaround: resume if utterance stalls
        clearInterval(this.resumeWatchdog);
        this.resumeWatchdog = setInterval(() => {
            if (this.synth && this.synth.speaking && this.synth.paused) {
                this.synth.resume();
            } else if (this.synth && !this.synth.speaking) {
                clearInterval(this.resumeWatchdog);
            }
        }, 3000);

        utterance.onend = () => {
            clearInterval(this.resumeWatchdog);
        };
        utterance.onerror = (err) => {
            clearInterval(this.resumeWatchdog);
            console.warn('SpeechSynthesis error:', err);
        };

        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
        clearInterval(this.resumeWatchdog);
        this.cooldowns.clear();
    }
}

export const audioGuidance = new AudioGuidanceService();
