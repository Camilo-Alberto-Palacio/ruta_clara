/**
 * Audio Guidance & Voice Copilot Service for Ruta Clara
 * Uses Web Speech API (SpeechSynthesis) to provide spoken real-time warnings and safety suggestions.
 */

class AudioGuidanceService {
    constructor() {
        this.enabled = true;
        this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
        this.lastSpokenText = '';
        this.lastSpokenTime = 0;
        this.debounceMs = 7000; // Do not repeat identical warning within 7 seconds
        this.preferredVoice = null;

        if (this.synth) {
            this.initVoice();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.initVoice();
            }
        }
    }

    initVoice() {
        if (!this.synth) return;
        const voices = this.synth.getVoices();
        // Look for Spanish voices (Latin American / Colombia preferred, fallback to Spanish)
        this.preferredVoice = voices.find(v => v.lang === 'es-CO') ||
                              voices.find(v => v.lang.startsWith('es-')) ||
                              voices.find(v => v.lang.includes('es')) ||
                              null;
    }

    setEnabled(val) {
        this.enabled = val;
        if (!val && this.synth) {
            this.synth.cancel();
        }
    }

    speak(text, priority = false) {
        if (!this.enabled || !this.synth || !text) return;

        const now = Date.now();
        // Clean markdown/emojis for natural speech
        const cleanText = text
            .replace(/[🚦🚧⚠️🌧️🚴🟢🛑🔊🔇✨🎯]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        // Debounce exact repetitions
        if (!priority && cleanText === this.lastSpokenText && (now - this.lastSpokenTime) < this.debounceMs) {
            return;
        }

        if (priority) {
            this.synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-CO';
        utterance.rate = 1.05; // Slightly lively pace
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (this.preferredVoice) {
            utterance.voice = this.preferredVoice;
        }

        this.lastSpokenText = cleanText;
        this.lastSpokenTime = now;

        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }
}

export const audioGuidance = new AudioGuidanceService();
