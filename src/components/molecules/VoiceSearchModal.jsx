import React, { useState, useEffect, useRef } from 'react';
import { VoiceDictationEngine, isSpeechRecognitionSupported } from '../../utils/speechRecognitionService';
import { soundService } from '../../utils/soundService';
import { PLACE_CATEGORIES } from '../../data/bogotaDestinations';

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
    onDestinationRecognized,
    userFavorites = []
}) {
    const [transcript, setTranscript] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [isSupported, setIsSupported] = useState(true);
    const engineRef = useRef(null);

    const findMatchingFavorite = (text) => {
        if (!text || !userFavorites || userFavorites.length === 0) return null;
        const lower = text.toLowerCase();
        
        // 1. Coincidencia por nombre exacto o parcial
        const direct = userFavorites.find(f => 
            lower.includes(f.label.toLowerCase()) || 
            f.label.toLowerCase().includes(lower)
        );
        if (direct) return direct;

        // 2. Coincidencia por intenciones y palabras clave comunes
        if (lower.includes('casa') || lower.includes('hogar') || lower.includes('mi casa')) {
            return userFavorites.find(f => f.category === 'home');
        }
        if (lower.includes('trabajo') || lower.includes('oficina') || lower.includes('mi trabajo') || lower.includes('chamba')) {
            return userFavorites.find(f => f.category === 'work');
        }
        if (lower.includes('universidad') || lower.includes('estudio') || lower.includes('colegio') || lower.includes('la u')) {
            return userFavorites.find(f => f.category === 'study');
        }
        if (lower.includes('gym') || lower.includes('gimnasio') || lower.includes('entrenamiento')) {
            return userFavorites.find(f => f.category === 'gym');
        }
        if (lower.includes('taller') || lower.includes('despinche') || lower.includes('bici')) {
            return userFavorites.find(f => f.category === 'bike_shop');
        }
        return null;
    };

    const handleConfirmDestination = (destText, placeObject = null) => {
        const cleaned = (destText || transcript).trim();
        if (!cleaned && !placeObject) return;
        if (engineRef.current) {
            engineRef.current.stop();
        }
        const matched = placeObject || findMatchingFavorite(cleaned);
        if (onDestinationRecognized) {
            onDestinationRecognized(cleaned || matched?.label, matched);
        }
        if (onClose) onClose();
    };

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

    if (!isOpen) return null;

    const matchedFav = findMatchingFavorite(transcript);

    return (
        <div 
            className="fixed inset-0 z-[2200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-sm w-full p-6 relative overflow-hidden flex flex-col items-center text-center animate-scale-up"
                style={{ boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center border-none cursor-pointer transition-colors"
                    title="Cerrar modal"
                >
                    <i className="fa-solid fa-xmark text-sm"></i>
                </button>

                {/* Animated Mic Visualizer */}
                <div className="relative my-4">
                    {isListening && (
                        <>
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping scale-150 pointer-events-none"></div>
                            <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse scale-125 pointer-events-none"></div>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={isListening ? () => engineRef.current?.stop() : handleRestartListening}
                        className={`w-20 h-20 rounded-3xl flex items-center justify-center text-2xl shadow-xl transition-all duration-300 cursor-pointer border-none ${
                            isListening
                                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white scale-105 shadow-emerald-500/30 ring-4 ring-emerald-100'
                                : 'bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200'
                        }`}
                        title={isListening ? "Toca para detener escucha" : "Toca para activar micrófono"}
                    >
                        <i className={`fa-solid ${isListening ? 'fa-microphone text-3xl' : 'fa-microphone-slash'}`}></i>
                    </button>
                </div>

                {/* Status and Title */}
                <h3 className="text-base font-black text-slate-900 mb-1">
                    {isListening ? 'Te escuchamos...' : (transcript ? '¡Destino capturado!' : 'Dictar Lugar de Destino')}
                </h3>
                <p className="text-2xs font-semibold text-slate-500 max-w-xs mb-3">
                    {isListening 
                        ? 'Di tu destino (ej: "Mi Trabajo", "Casa", "Alkosto Venecia", "Portal Usme"...)' 
                        : 'Toca el micrófono para comenzar a hablar'}
                </p>

                {/* Real-time Transcription Box */}
                {transcript && (
                    <div className="w-full p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-slate-900 font-bold text-sm mb-3 flex items-center justify-between gap-2 animate-fade-in shadow-xs">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            <i className="fa-solid fa-location-dot text-emerald-600 flex-shrink-0"></i>
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="truncate text-xs font-black text-emerald-950">
                                    {transcript}
                                </span>
                                {matchedFav && (
                                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                        <span>⭐ Sitio guardado: {matchedFav.label}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleConfirmDestination(transcript, matchedFav)}
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

                {/* Suggested Fast Voice Shortcuts: User Favorites first, then presets */}
                <div className="w-full pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                        O toca un destino frecuente:
                    </span>
                    <div className="flex flex-wrap justify-center gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {/* 1. Lugares Favoritos del Usuario */}
                        {userFavorites.map((fav) => {
                            const catMeta = PLACE_CATEGORIES[fav.category] || PLACE_CATEGORIES.custom;
                            return (
                                <button
                                    key={fav.id}
                                    type="button"
                                    onClick={() => handleConfirmDestination(fav.label, fav)}
                                    className="py-1.5 px-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-2xs font-bold cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
                                >
                                    <span>{catMeta.emoji}</span>
                                    <span>{fav.label}</span>
                                    <i className="fa-solid fa-star text-[8px] text-amber-500"></i>
                                </button>
                            );
                        })}

                        {/* 2. Presets Populares */}
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
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border-none cursor-pointer transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
