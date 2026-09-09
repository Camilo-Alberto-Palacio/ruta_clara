import React, { useState, useEffect, useRef } from 'react';
import { VoiceDictationEngine, isSpeechRecognitionSupported } from '../../utils/speechRecognitionService';
import { soundService } from '../../utils/soundService';

const VOICE_PRESETS = [
    { name: 'Alkosto Venecia', icon: 'fa-cart-shopping', color: 'text-amber-600 bg-amber-50' },
    { name: 'Portal Usme', icon: 'fa-bus', color: 'text-rose-600 bg-rose-50' },
    { name: 'Centro Mayor', icon: 'fa-store', color: 'text-indigo-600 bg-indigo-50' },
    { name: 'Parque El Tunal', icon: 'fa-tree', color: 'text-emerald-600 bg-emerald-50' },
    { name: 'Estación Molinos', icon: 'fa-bus', color: 'text-sky-600 bg-sky-50' }
];

export default function VoiceSearchModal({
    isOpen,
    onClose,
    onDestinationRecognized
}) {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isSupported, setIsSupported] = useState(true);
    const engineRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            if (engineRef.current) {
                engineRef.current.stop();
            }
            setTranscript('');
            setIsListening(false);
            setErrorMessage(null);
            return;
        }

        const supported = isSpeechRecognitionSupported();
        setIsSupported(supported);

        if (!supported) {
            setErrorMessage('El dictado por voz no está soportado en este navegador. Puedes seleccionar uno de los destinos frecuentes.');
            return;
        }

        const engine = new VoiceDictationEngine({
            onStart: () => {
                setIsListening(true);
                setErrorMessage(null);
                soundService.playNotification('info');
            },
            onInterim: (text) => {
                setTranscript(text);
            },
            onResult: (finalText) => {
                setTranscript(finalText);
                soundService.playNotification('success');
                // Auto-confirm after 800ms
                setTimeout(() => {
                    handleConfirmDestination(finalText);
                }, 800);
            },
            onError: (err) => {
                setIsListening(false);
                if (err === 'no-speech') {
                    setErrorMessage('No se detectó audio. Por favor intenta hablar más cerca del micrófono.');
                } else if (err === 'not-allowed' || err === 'permission-denied') {
                    setErrorMessage('Permiso de micrófono denegado. Habilita el acceso en los ajustes de tu navegador.');
                } else {
                    setErrorMessage('No pudimos entender el sitio. Intenta de nuevo o selecciona una sugerencia.');
                }
            },
            onEnd: () => {
                setIsListening(false);
            },
            lang: 'es-CO'
        });

        engineRef.current = engine;
        engine.start();

        return () => {
            engine.stop();
        };
    }, [isOpen]);

    const handleRestartListening = () => {
        setTranscript('');
        setErrorMessage(null);
        if (engineRef.current) {
            engineRef.current.start();
        }
    };

    const handleConfirmDestination = (destText) => {
        const cleaned = (destText || transcript).trim();
        if (!cleaned) return;
        if (engineRef.current) {
            engineRef.current.stop();
        }
        onDestinationRecognized(cleaned);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-sm sm:max-w-md p-6 flex flex-col items-center text-center animate-scale-up text-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Pull bar on mobile */}
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto sm:hidden mb-3"></div>

                {/* Header close */}
                <div className="w-full flex justify-between items-center mb-2">
                    <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                        <i className="fa-solid fa-microphone-lines"></i> Dictado por Voz
                    </span>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center border-none cursor-pointer transition-colors"
                        title="Cerrar"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>

                {/* Animated Pulsing Microphone Widget */}
                <div className="relative my-4 flex items-center justify-center">
                    {isListening && (
                        <>
                            <div className="absolute w-28 h-28 rounded-full bg-emerald-400/25 animate-ping"></div>
                            <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-pulse"></div>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={isListening ? () => engineRef.current?.stop() : handleRestartListening}
                        className={`w-20 h-20 rounded-full text-white flex items-center justify-center text-2xl shadow-xl cursor-pointer border-none transition-all active:scale-95 relative z-10 ${
                            isListening 
                                ? 'bg-emerald-600 hover:bg-emerald-700 ring-4 ring-emerald-200' 
                                : 'bg-slate-400 hover:bg-slate-500'
                        }`}
                        title={isListening ? "Toca para detener" : "Toca para hablar"}
                    >
                        <i className={`fa-solid ${isListening ? 'fa-microphone animate-bounce' : 'fa-microphone-slash'}`}></i>
                    </button>
                </div>

                {/* Status and Title */}
                <h3 className="text-base font-black text-slate-900 mb-1">
                    {isListening ? 'Te escuchamos...' : (transcript ? '¡Destino capturado!' : 'Dictar Lugar de Destino')}
                </h3>
                <p className="text-2xs font-semibold text-slate-500 max-w-xs mb-3">
                    {isListening 
                        ? 'Di claramente tu destino (ej: Alkosto Venecia, Portal Usme, Parque El Tunal...)' 
                        : 'Toca el micrófono para comenzar a hablar'}
                </p>

                {/* Real-time Transcription Box */}
                {transcript && (
                    <div className="w-full p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-slate-900 font-bold text-sm mb-3 flex items-center justify-between gap-2 animate-fade-in shadow-xs">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <i className="fa-solid fa-location-dot text-emerald-600 flex-shrink-0"></i>
                            <span className="truncate text-left text-xs font-black text-emerald-950">
                                {transcript}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleConfirmDestination(transcript)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-extrabold border-none cursor-pointer flex-shrink-0 active:scale-95 shadow-xs"
                        >
                            Ir ahora
                        </button>
                    </div>
                )}

                {/* Error message / Notice */}
                {errorMessage && (
                    <div className="w-full p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-2xs font-semibold mb-3 flex items-center gap-2 text-left">
                        <i className="fa-solid fa-circle-exclamation text-rose-600 flex-shrink-0"></i>
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Suggested Fast Voice Shortcuts */}
                <div className="w-full pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                        O toca un destino frecuente:
                    </span>
                    <div className="flex flex-wrap justify-center gap-1.5">
                        {VOICE_PRESETS.map((item) => (
                            <button
                                key={item.name}
                                type="button"
                                onClick={() => handleConfirmDestination(item.name)}
                                className="py-1.5 px-2.5 rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 text-2xs font-bold cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
                            >
                                <i className={`fa-solid ${item.icon} text-3xs text-slate-500`}></i>
                                <span>{item.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Cancel / Restart */}
                <div className="w-full flex gap-2 mt-4 pt-3 border-t border-slate-100">
                    {!isListening && isSupported && (
                        <button
                            type="button"
                            onClick={handleRestartListening}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold border-none cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            <i className="fa-solid fa-microphone"></i> Hablar de nuevo
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold border-none cursor-pointer transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
