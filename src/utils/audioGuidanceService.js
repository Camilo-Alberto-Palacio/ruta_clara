/**
 * Audio Guidance & Voice Copilot Service for Ruta Clara
 * Provides natural, non-intrusive voice safety alerts, Web Audio API chimes,
 * FIFO speech queueing for multi-layer alerts, audio unlocking for mobile (Android WebView & iOS Safari),
 * and selectable voice models.
 */

class AudioGuidanceService {
    constructor() {
        this.enabled = true;
        this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
        this.audioCtx = null;
        this.cooldowns = new Map(); // eventKey -> timestamp
        this.lastSpokenTime = 0;
        this.selectedVoiceURI = null;
        this.selectedVoice = null;
        this.availableVoices = [];
        this.isAudioUnlocked = false;

        // FIFO Speech Queue System
        this.queue = [];
        this.isProcessingQueue = false;
        this.watchdogTimer = null;

        if (this.synth) {
            this.refreshVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.refreshVoices();
            }
        }
    }

    /**
     * Unlocks audio on mobile / Android WebView upon any user gesture.
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
     * Plays a pleasant synthesized chime using the Web Audio API.
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
                playNote(523.25, now, 0.25, 0.25);
                playNote(659.25, now + 0.15, 0.45, 0.3);
            } else if (type === 'red_light' || type === 'alert' || type === 'danger') {
                playNote(440, now, 0.18, 0.25, 'triangle');
                playNote(370, now + 0.15, 0.35, 0.28, 'triangle');
            } else if (type === 'green_light') {
                playNote(659.25, now, 0.18, 0.2);
                playNote(783.99, now + 0.12, 0.3, 0.22);
            } else if (type === 'success') {
                playNote(523.25, now, 0.2, 0.2);
                playNote(659.25, now + 0.15, 0.2, 0.25);
                playNote(783.99, now + 0.3, 0.5, 0.3);
            } else {
                playNote(587.33, now, 0.2, 0.2);
            }
        } catch (e) {
            // Context gracefully handled
        }
    }

    refreshVoices() {
        if (!this.synth) return;
        const all = this.synth.getVoices() || [];
        this.availableVoices = all.filter(v =>
            v.lang.startsWith('es') || 
            v.lang.includes('ES') || 
            v.lang.includes('spanish') || 
            v.name.toLowerCase().includes('spanish')
        );

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
        if (!val) {
            this.stop();
        }
    }

    speak(text, isPriority = false) {
        this.speakRaw(text, isPriority);
    }

    /**
     * Queue & speak an event with cooldown per eventKey.
     */
    speakEvent(eventKey, text, cooldownSeconds = 20, isPriority = false) {
        if (!this.enabled || !text) return false;

        const now = Date.now();

        // Check event-specific cooldown
        if (eventKey && this.cooldowns.has(eventKey)) {
            const lastTime = this.cooldowns.get(eventKey);
            if ((now - lastTime) < (cooldownSeconds * 1000)) {
                return false;
            }
        }

        if (eventKey) {
            this.cooldowns.set(eventKey, now);
        }

        this.enqueueMessage(text, isPriority, eventKey);
        return true;
    }

    speakRaw(text, isPriority = false) {
        if (!this.enabled || !text) return;
        this.enqueueMessage(text, isPriority, null);
    }

    enqueueMessage(text, isPriority, eventKey) {
        this.unlockAudio();

        const cleanText = text
            .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        const item = { text: cleanText, isPriority, eventKey };

        if (isPriority) {
            // Urgent alert: clear normal queue items and place priority at front
            this.queue = this.queue.filter(q => q.isPriority);
            this.queue.unshift(item);
            if (this.synth && this.synth.speaking) {
                this.synth.cancel();
            }
        } else {
            // Avoid duplicate text in queue
            if (!this.queue.some(q => q.text === cleanText)) {
                this.queue.push(item);
            }
        }

        this.processQueue();
    }

    processQueue() {
        if (!this.enabled || this.isProcessingQueue || this.queue.length === 0) return;

        this.isProcessingQueue = true;
        const current = this.queue.shift();

        // Chime for event feedback
        if (current.eventKey && (current.eventKey.includes('red') || current.eventKey.includes('rob') || current.eventKey.includes('acc') || current.eventKey.includes('danger'))) {
            this.playChime('red_light');
        } else if (current.eventKey && current.eventKey.includes('green')) {
            this.playChime('green_light');
        } else {
            this.playChime('alert');
        }

        if (!this.synth) {
            this.isProcessingQueue = false;
            setTimeout(() => this.processQueue(), 400);
            return;
        }

        if (this.synth.paused) {
            this.synth.resume();
        }

        const utterance = new SpeechSynthesisUtterance(current.text);
        utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'es-CO';
        utterance.rate = 0.98;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        // Safety Watchdog in case TTS stalls in Android WebView
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = setTimeout(() => {
            if (this.synth && this.synth.speaking) {
                this.synth.cancel();
            }
            this.isProcessingQueue = false;
            this.processQueue();
        }, 7000);

        utterance.onend = () => {
            clearTimeout(this.watchdogTimer);
            this.isProcessingQueue = false;
            setTimeout(() => this.processQueue(), 300);
        };

        utterance.onerror = (err) => {
            clearTimeout(this.watchdogTimer);
            console.warn('Speech error:', err);
            this.isProcessingQueue = false;
            setTimeout(() => this.processQueue(), 200);
        };

        setTimeout(() => {
            this.synth.speak(utterance);
        }, 150);
    }

    stop() {
        this.queue = [];
        this.isProcessingQueue = false;
        clearTimeout(this.watchdogTimer);
        if (this.synth) {
            this.synth.cancel();
        }
        this.cooldowns.clear();
    }
}

export const audioGuidance = new AudioGuidanceService();
