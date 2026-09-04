/**
 * Audio Guidance & Voice Copilot Service for Ruta Clara
 * Provides natural, non-intrusive voice safety alerts with strict event cooldowns
 * and selectable voice models.
 */

class AudioGuidanceService {
    constructor() {
        this.enabled = true;
        this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
        this.cooldowns = new Map(); // eventKey -> timestamp
        this.lastSpokenTime = 0;
        this.minGlobalIntervalMs = 12000; // Minimum 12 seconds between any non-urgent voice cues
        this.selectedVoiceURI = null;
        this.selectedVoice = null;
        this.availableVoices = [];

        if (this.synth) {
            this.refreshVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.refreshVoices();
            }
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
            // Prioritize natural / neural / latin voices
            const natural = this.availableVoices.find(v => 
                v.name.includes('Natural') || 
                v.name.includes('Online') || 
                v.name.includes('Google')
            );
            const latin = this.availableVoices.find(v => v.lang === 'es-CO' || v.lang === 'es-419' || v.lang === 'es-US' || v.lang === 'es-MX');
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
     * Speaks an event with strict cooldown protection (prevents annoying repetitions)
     */
    speakEvent(eventKey, text, cooldownSeconds = 45, isPriority = false) {
        if (!this.enabled || !this.synth || !text) return false;

        const now = Date.now();

        // 1. Check event-specific cooldown
        if (eventKey && this.cooldowns.has(eventKey)) {
            const lastTime = this.cooldowns.get(eventKey);
            if ((now - lastTime) < (cooldownSeconds * 1000)) {
                return false; // Still on cooldown, do not speak
            }
        }

        // 2. Check global minimum interval between voice alerts (unless priority)
        if (!isPriority && (now - this.lastSpokenTime) < this.minGlobalIntervalMs) {
            return false;
        }

        // Register cooldown
        if (eventKey) {
            this.cooldowns.set(eventKey, now);
        }
        this.lastSpokenTime = now;

        this.speakRaw(text, isPriority);
        return true;
    }

    speakRaw(text, isPriority = false) {
        if (!this.enabled || !this.synth || !text) return;

        const cleanText = text
            .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        if (isPriority) {
            this.synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'es-CO';
        utterance.rate = 0.95; // Calm, clear, natural pace (not rushed)
        utterance.pitch = 1.0; // Natural balanced pitch
        utterance.volume = 1.0;

        if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
        }

        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
        this.cooldowns.clear();
    }
}

export const audioGuidance = new AudioGuidanceService();
