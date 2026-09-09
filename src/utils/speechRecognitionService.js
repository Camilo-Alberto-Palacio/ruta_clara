/**
 * Speech Recognition Service (Voice Dictation for Ruta Clara)
 * Provides speech-to-text functionality for dictating destinations
 * in Colombian Spanish ('es-CO') with webkitSpeechRecognition / SpeechRecognition.
 */

export function isSpeechRecognitionSupported() {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export async function requestMicrophonePermission() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            console.warn('[Microphone] Permiso denegado o no disponible:', err);
            return false;
        }
    }
    return false;
}

export class VoiceDictationEngine {
    constructor({ onResult, onInterim, onError, onStart, onEnd, lang = 'es-CO' }) {
        this.onResult = onResult || (() => {});
        this.onInterim = onInterim || (() => {});
        this.onError = onError || (() => {});
        this.onStart = onStart || (() => {});
        this.onEnd = onEnd || (() => {});
        this.lang = lang;
        this.recognition = null;
        this.isListening = false;
        this.init();
    }

    init() {
        const SpeechRecognition = typeof window !== 'undefined' 
            ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
            : null;

        if (!SpeechRecognition) {
            return;
        }

        try {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = this.lang;
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.onStart();
            };

            this.recognition.onresult = (event) => {
                let interim = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const res = event.results[i];
                    if (res.isFinal) {
                        finalTranscript += res[0].transcript;
                    } else {
                        interim += res[0].transcript;
                    }
                }

                if (interim) {
                    this.onInterim(interim.trim());
                }

                if (finalTranscript) {
                    this.onResult(finalTranscript.trim());
                }
            };

            this.recognition.onerror = (event) => {
                this.isListening = false;
                console.warn('[VoiceDictationEngine] error:', event.error);
                this.onError(event.error);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.onEnd();
            };
        } catch (e) {
            console.warn('[VoiceDictationEngine] initialization error:', e);
        }
    }

    async start() {
        if (!this.recognition) {
            this.onError('not-supported');
            return false;
        }

        try {
            // Solicitar permiso nativo de micrófono explícitamente para Android WebView y navegadores
            await requestMicrophonePermission();

            if (this.isListening) {
                this.recognition.stop();
            }
            this.recognition.start();
            return true;
        } catch (e) {
            console.warn('[VoiceDictationEngine] start error:', e);
            this.onError(e.message || 'start-failed');
            return false;
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            try {
                this.recognition.stop();
            } catch (e) {
                // ignore
            }
        }
        this.isListening = false;
    }
}
