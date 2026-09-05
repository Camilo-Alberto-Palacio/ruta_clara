/**
 * Audio Guidance & Voice Copilot Service (Waze-style Voice Copilot) for Ruta Clara
 * Provides 100% natural, fluent, professional Spanish spoken voice guidance
 * with ZERO synthetic beeps or pitidos.
 * 
 * Uses @capacitor-community/text-to-speech on native Android devices with category 'playback',
 * dynamic Spanish locale detection, strict watchdog timeout protection to prevent queue locks,
 * and seamless fallback to Web Speech API.
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
        this.minGlobalIntervalMs = 3000; // 3.0s minimum gap between non-urgent voice prompts
        this.selectedVoice = null;
        this.availableVoices = [];
        this.activeUtterance = null;
        this.isAudioUnlocked = false;
        this.detectedNativeLang = null;

        // Queue & execution lock
        this.queue = [];
        this.isProcessingQueue = false;
        this.queueWatchdog = null;

        if (this.synth) {
            this.refreshVoices();
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.refreshVoices();
            }
        }

        // Auto-unlock audio on any user touch/gesture
        if (typeof window !== 'undefined') {
            const autoUnlock = () => this.unlockAudio();
            ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach(evt => {
                window.addEventListener(evt, autoUnlock, { passive: true });
            });
        }
    }

    /**
     * Unlocks speech synthesis on mobile / Android upon user interaction
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

    /**
     * Detects best available Spanish language code supported by the native Android device
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
        if (!val) {
            this.stop();
        }
    }

    /**
     * Direct speak method (Waze style, immediate and natural Spanish speech)
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

        // Clean emojis, markdown symbols, and technical syntax for pure, fluent human speech
        const cleanText = text
            .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
            .replace(/[•*#_~`[\]()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        // Silent physical vibration on mobile (NO audible pitidos)
        if (isPriority) {
            soundService.vibrate([100, 50, 100]);
        } else if (cleanText.toLowerCase().includes('gira') || cleanText.toLowerCase().includes('metros')) {
            soundService.vibrate([70]);
        }

        const item = { text: cleanText, isPriority };

        if (isPriority) {
            this.queue = this.queue.filter(q => q.isPriority);
            this.queue.unshift(item);
            this.stopCurrentSpeech();
        } else {
            // Avoid duplicate consecutive phrases in queue
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

        // Calculate expected duration based on word count (approx 200 words/min = 3.3 words/sec)
        const wordCount = current.text.split(/\s+/).length;
        const estimatedDurationMs = Math.max(2500, Math.min(12000, (wordCount * 450) + 1500));

        // Global safety watchdog to guarantee queue lock is ALWAYS released
        if (this.queueWatchdog) clearTimeout(this.queueWatchdog);
        this.queueWatchdog = setTimeout(() => {
            if (this.isProcessingQueue) {
                console.warn('Voice Copilot watchdog: force releasing queue lock');
                this.isProcessingQueue = false;
                this.processQueue();
            }
        }, estimatedDurationMs + 1000);

        try {
            // 1. If running on native Android APK, use native Android TTS with playback category
            if (this.isNative) {
                let nativeSuccess = false;
                try {
                    const langToUse = await this.getBestNativeLanguage();
                    
                    // Race TextToSpeech against duration timeout so broken onDone callbacks in Android NEVER hang
                    await Promise.race([
                        TextToSpeech.speak({
                            text: current.text,
                            lang: langToUse,
                            rate: 1.05,
                            pitch: 1.0,
                            volume: 1.0,
                            category: 'playback'
                        }),
                        new Promise(resolve => setTimeout(resolve, estimatedDurationMs))
                    ]);
                    nativeSuccess = true;
                } catch (nativeErr) {
                    console.warn('Native Android TTS error, attempting Web Speech fallback:', nativeErr);
                }

                if (nativeSuccess) {
                    if (this.queueWatchdog) clearTimeout(this.queueWatchdog);
                    this.isProcessingQueue = false;
                    setTimeout(() => this.processQueue(), 250);
                    return;
                }
            }

            // 2. Web Browser or Fallback using Web Speech API
            if (!this.synth) {
                if (this.queueWatchdog) clearTimeout(this.queueWatchdog);
                this.isProcessingQueue = false;
                return;
            }

            if (this.synth.paused) {
                this.synth.resume();
            }

            this.refreshVoices();

            const utterance = new SpeechSynthesisUtterance(current.text);
            this.activeUtterance = utterance;

            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
                utterance.lang = this.selectedVoice.lang;
            } else if (this.availableVoices.length > 0) {
                utterance.voice = this.availableVoices[0];
                utterance.lang = this.availableVoices[0].lang;
            } else {
                utterance.lang = 'es-ES';
            }

            utterance.rate = 1.02;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            utterance.onend = () => {
                if (this.queueWatchdog) clearTimeout(this.queueWatchdog);
                this.activeUtterance = null;
                this.isProcessingQueue = false;
                setTimeout(() => this.processQueue(), 200);
            };

            utterance.onerror = (e) => {
                if (this.queueWatchdog) clearTimeout(this.queueWatchdog);
                console.warn('SpeechSynthesis note:', e.error || e);
                this.activeUtterance = null;
                this.isProcessingQueue = false;
                setTimeout(() => this.processQueue(), 200);
            };

            this.synth.speak(utterance);

        } catch (err) {
            console.warn('AudioGuidance speak error:', err);
            if (this.queueWatchdog) clearTimeout(this.queueWatchdog);
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
        if (this.queueWatchdog) {
            clearTimeout(this.queueWatchdog);
            this.queueWatchdog = null;
        }
        this.queue = [];
        this.isProcessingQueue = false;
        this.stopCurrentSpeech();
        this.cooldowns.clear();
    }
}

export const audioGuidance = new AudioGuidanceService();
