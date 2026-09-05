/**
 * Audio Guidance & Voice Copilot Service (Waze-style Copilot) for Ruta Clara
 * Provides natural, fluent, professional Spanish voice guidance for turns,
 * maneuvers, safety alerts, and traffic signals.
 * 
 * Uses @capacitor-community/text-to-speech on native Android devices with category 'playback'
 * and dynamic language negotiation (es-CO -> es-419 -> es-MX -> es-US -> es-ES -> es),
 * with immediate fallback to Web Speech API and Web Audio API harmonic chimes.
 */

import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';
import { soundService } from './soundService';

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
        this.detectedNativeLang = null;

        // Queue
        this.queue = [];
        this.isProcessingQueue = false;

        if (this.synth) {
            this.refreshVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.refreshVoices();
            }
        }

        // Auto-unlock audio on any mobile touch/click gesture
        if (typeof window !== 'undefined') {
            const autoUnlock = () => this.unlockAudio();
            ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach(evt => {
                window.addEventListener(evt, autoUnlock, { passive: true });
            });
        }
    }

    /**
     * Unlocks audio contexts on mobile / Android upon user interaction
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
        soundService.ensureContext();
    }

    /**
     * Detects best available Spanish language code supported by the native device
     */
    async getBestNativeLanguage() {
        if (this.detectedNativeLang) return this.detectedNativeLang;
        if (!this.isNative) return 'es';

        const candidates = ['es-CO', 'es-419', 'es-MX', 'es-US', 'es-ES', 'es'];
        for (const cand of candidates) {
            try {
                const res = await TextToSpeech.isLanguageSupported({ lang: cand });
                if (res && res.supported) {
                    this.detectedNativeLang = cand;
                    return cand;
                }
            } catch (e) {
                // Ignore test failure
            }
        }

        try {
            const { languages } = await TextToSpeech.getSupportedLanguages();
            if (Array.isArray(languages)) {
                const match = languages.find(l => typeof l === 'string' && (l.startsWith('es') || l.startsWith('spa')));
                if (match) {
                    this.detectedNativeLang = match;
                    return match;
                }
            }
        } catch (e) {
            // Ignore
        }

        this.detectedNativeLang = 'es';
        return 'es';
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

    get selectedVoiceURI() {
        return this.selectedVoice ? this.selectedVoice.voiceURI : '';
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
        soundService.setEnabled(val);
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

        // Play navigation earcon cue & mobile vibration
        if (isPriority) {
            soundService.playNotification('alert');
        } else if (cleanText.toLowerCase().includes('gira') || cleanText.toLowerCase().includes('metros') || cleanText.toLowerCase().includes('continúa')) {
            soundService.playNotification('turn');
        }

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
            // 1. If running on native Android APK, use native Android TTS with playback category
            if (this.isNative) {
                let nativeSuccess = false;
                try {
                    const langToUse = await this.getBestNativeLanguage();
                    await TextToSpeech.speak({
                        text: current.text,
                        lang: langToUse,
                        rate: 1.02,
                        pitch: 1.0,
                        volume: 1.0,
                        category: 'playback'
                    });
                    nativeSuccess = true;
                } catch (nativeErr) {
                    console.warn('Native Android TTS speak failed, trying Web Speech fallback:', nativeErr);
                }

                if (nativeSuccess) {
                    this.isProcessingQueue = false;
                    setTimeout(() => this.processQueue(), 250);
                    return;
                }
                // Fallthrough to Web Speech API fallback if native rejected or failed
            }

            // 2. Web Browser or Fallback with Web Speech API
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
                setTimeout(() => this.processQueue(), 200);
            };

            utterance.onerror = (e) => {
                clearTimeout(safetyTimer);
                console.warn('SpeechSynthesis note:', e.error || e);
                this.activeUtterance = null;
                this.isProcessingQueue = false;
                setTimeout(() => this.processQueue(), 200);
            };

            this.synth.speak(utterance);

        } catch (err) {
            console.warn('AudioGuidance speak error:', err);
            this.activeUtterance = null;
            this.isProcessingQueue = false;
            setTimeout(() => this.processQueue(), 250);
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
