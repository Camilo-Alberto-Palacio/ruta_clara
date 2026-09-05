/**
 * Audio Guidance & Voice Copilot Service (Waze-style Copilot) for Ruta Clara
 * Provides natural, fluent, professional Spanish voice guidance for turns,
 * maneuvers, safety alerts, and traffic signals.
 * 
 * Uses @capacitor-community/text-to-speech on native Android devices for high-definition
 * system voices, and a bulletproof SpeechSynthesis engine on Web browsers with zero arcade beeps.
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

class AudioGuidanceService {
    constructor() {
        this.enabled = true;
        this.isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
        this.synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
        this.cooldowns = new Map(); // eventKey -> timestamp
        this.lastSpokenTime = 0;
        this.minGlobalIntervalMs = 3500; // 3.5s minimum gap between non-urgent prompts
        this.selectedVoice = null;
        this.availableVoices = [];
        this.activeUtterance = null; // Prevent Chromium garbage collection bug
        this.isAudioUnlocked = false;

        // Queue
        this.queue = [];
        this.isProcessingQueue = false;

        if (this.synth) {
            this.refreshVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.refreshVoices();
            }
        }
    }

    /**
     * Unlocks audio on mobile / Android upon user interaction
     */
    unlockAudio() {
        if (this.isAudioUnlocked) return;
        this.isAudioUnlocked = true;

        if (this.synth) {
            try {
                this.synth.resume();
            } catch (e) {
                // Ignore resume errors
            }
        }
    }

    refreshVoices() {
        if (!this.synth) return;
        const all = this.synth.getVoices() || [];
        if (all.length === 0) return;

        // Find Spanish voices
        this.availableVoices = all.filter(v =>
            (v.lang && (v.lang.startsWith('es') || v.lang.includes('ES'))) ||
            (v.name && v.name.toLowerCase().includes('spanish')) ||
            (v.name && (v.name.includes('Sabina') || v.name.includes('Helena') || v.name.includes('Laura') || v.name.includes('Paulina')))
        );

        if (this.availableVoices.length > 0) {
            // Prioritize Latin American / Natural Spanish voices
            const preferred = this.availableVoices.find(v => 
                v.lang === 'es-CO' || v.lang === 'es-419' || v.lang === 'es-MX' || v.lang === 'es-US' ||
                v.name.includes('Sabina') || v.name.includes('Google') || v.name.includes('Natural')
            );
            this.selectedVoice = preferred || this.availableVoices[0];
        }
    }

    getVoices() {
        this.refreshVoices();
        return this.availableVoices.map(v => ({
            uri: v.voiceURI,
            name: v.name.replace(/Microsoft |Google |Android /g, ''),
            lang: v.lang,
            isNatural: true
        }));
    }

    setVoice(voiceURI) {
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

    /**
     * Direct speak method (Waze style, immediate and natural)
     */
    speak(text, isPriority = false) {
        this.speakRaw(text, isPriority);
    }

    /**
     * Speaks an event with cooldown protection per event key
     */
    speakEvent(eventKey, text, cooldownSeconds = 15, isPriority = false) {
        if (!this.enabled || !text) return false;

        const now = Date.now();

        // Check event cooldown
        if (eventKey && this.cooldowns.has(eventKey)) {
            const lastTime = this.cooldowns.get(eventKey);
            if ((now - lastTime) < (cooldownSeconds * 1000)) {
                return false;
            }
        }

        // Global interval check for non-priority messages
        if (!isPriority && (now - this.lastSpokenTime) < this.minGlobalIntervalMs) {
            return false;
        }

        if (eventKey) {
            this.cooldowns.set(eventKey, now);
        }
        this.lastSpokenTime = now;

        this.enqueueMessage(text, isPriority);
        return true;
    }

    speakRaw(text, isPriority = false) {
        if (!this.enabled || !text) return;
        this.enqueueMessage(text, isPriority);
    }

    enqueueMessage(text, isPriority) {
        this.unlockAudio();

        // Clean emojis, markdown symbols, and unnecessary symbols for crisp human speech
        const cleanText = text
            .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
            .replace(/[•*#_~`[\]()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        const item = { text: cleanText, isPriority };

        if (isPriority) {
            this.queue = this.queue.filter(q => q.isPriority);
            this.queue.unshift(item);
            this.stopCurrentSpeech();
        } else {
            // Avoid queuing identical consecutive phrases
            if (this.queue.length === 0 || this.queue[this.queue.length - 1].text !== cleanText) {
                this.queue.push(item);
            }
        }

        this.processQueue();
    }

    async processQueue() {
        if (!this.enabled || this.isProcessingQueue || this.queue.length === 0) return;

        this.isProcessingQueue = true;
        const current = this.queue.shift();

        try {
            // 1. If running on native Android APK, use native Android TTS
            if (this.isNative) {
                await TextToSpeech.speak({
                    text: current.text,
                    lang: 'es-CO',
                    rate: 1.05,
                    pitch: 1.0,
                    volume: 1.0,
                    category: 'ambient'
                });
                this.isProcessingQueue = false;
                setTimeout(() => this.processQueue(), 300);
                return;
            }

            // 2. Web Browser Fallback with Web Speech API
            if (!this.synth) {
                this.isProcessingQueue = false;
                return;
            }

            if (this.synth.paused) {
                this.synth.resume();
            }

            this.refreshVoices();

            const utterance = new SpeechSynthesisUtterance(current.text);
            this.activeUtterance = utterance; // Prevent garbage collection bug

            // Language & voice selection
            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
                utterance.lang = this.selectedVoice.lang;
            } else if (this.availableVoices.length > 0) {
                utterance.voice = this.availableVoices[0];
                utterance.lang = this.availableVoices[0].lang;
            } else {
                utterance.lang = 'es-ES'; // Safe default
            }

            utterance.rate = 1.02; // Natural, confident Waze-like cadence
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            let safetyTimer = setTimeout(() => {
                if (this.synth && this.synth.speaking) {
                    this.synth.cancel();
                }
                this.activeUtterance = null;
                this.isProcessingQueue = false;
                this.processQueue();
            }, 8000);

            utterance.onend = () => {
                clearTimeout(safetyTimer);
                this.activeUtterance = null;
                this.isProcessingQueue = false;
                setTimeout(() => this.processQueue(), 250);
            };

            utterance.onerror = (e) => {
                clearTimeout(safetyTimer);
                console.warn('SpeechSynthesis note:', e.error || e);
                this.activeUtterance = null;
                this.isProcessingQueue = false;
                setTimeout(() => this.processQueue(), 250);
            };

            this.synth.speak(utterance);

        } catch (err) {
            console.warn('TextToSpeech error:', err);
            this.activeUtterance = null;
            this.isProcessingQueue = false;
            setTimeout(() => this.processQueue(), 300);
        }
    }

    stopCurrentSpeech() {
        if (this.isNative) {
            try {
                TextToSpeech.stop();
            } catch (e) {
                // Ignore
            }
        }
        if (this.synth) {
            try {
                this.synth.cancel();
            } catch (e) {
                // Ignore
            }
        }
        this.activeUtterance = null;
    }

    stop() {
        this.queue = [];
        this.isProcessingQueue = false;
        this.stopCurrentSpeech();
        this.cooldowns.clear();
    }
}

export const audioGuidance = new AudioGuidanceService();
