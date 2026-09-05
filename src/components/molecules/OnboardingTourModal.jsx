import React, { useState } from 'react';

const SLIDES = [
    {
        badge: 'PASO 1 DE 3',
        tagline: '¡Bienvenido a Ruta Clara! 🚲',
        title: 'El semáforo de tu camino',
        icon: 'fa-solid fa-bicycle',
        color: '#10b981',
        subtitle: 'Te mostramos las calles de Bogotá con colores muy fáciles para que viajes tranquilo:',
        items: [
            {
                emoji: '🟢',
                name: 'Camino Verde (Seguro)',
                desc: 'Ciclorrutas buenas, con mucha luz y gente alrededor.'
            },
            {
                emoji: '🟡',
                name: 'Camino Amarillo (Cuidado)',
                desc: 'Ve atento y baja un poco la velocidad en estos cruces.'
            },
            {
                emoji: '🔴',
                name: 'Camino Rojo (Peligro)',
                desc: 'Calles oscuras o solitarias. ¡Te enseñamos a esquivarlas!'
            }
        ],
        tip: '💡 Busca siempre las líneas verdes en el mapa para ir feliz y protegido.'
    },
    {
        badge: 'PASO 2 DE 3',
        tagline: 'Tú decides cómo viajar 🗺️',
        title: '3 opciones fáciles para llegar',
        icon: 'fa-solid fa-route',
        color: '#059669',
        subtitle: 'Solo escribe a dónde vas y te damos 3 caminos para que escojas tu favorito:',
        items: [
            {
                emoji: '🛡️',
                name: 'Ruta Segura',
                desc: 'La más vigilada e iluminada para no pasar sustos.'
            },
            {
                emoji: '⚡',
                name: 'Ruta Rápida',
                desc: 'La más corta si tienes afán y quieres llegar volando.'
            },
            {
                emoji: '🍃',
                name: 'Ruta Plana',
                desc: 'Sin subidas difíciles para no cansarte las piernas.'
            }
        ],
        tip: '💡 Toca cualquier ruta y el mapa te la mostrará completa de principio a fin.'
    },
    {
        badge: 'PASO 3 DE 3',
        tagline: 'Tu copiloto de confianza 🗣️',
        title: 'Te hablamos mientras pedaleas',
        icon: 'fa-solid fa-headset',
        color: '#047857',
        subtitle: 'No mires la pantalla con una sola mano en el manubrio. ¡La app te habla!',
        items: [
            {
                emoji: '🗣️',
                name: 'Voz en cada giro',
                desc: 'Te dice cuándo voltear y te avisa de semáforos, lluvia o huecos.'
            },
            {
                emoji: '🚨',
                name: 'Botón de Ayuda SOS',
                desc: 'Si te sientes en peligro, tócalo y te guía volando a la policía más cercana.'
            }
        ],
        tip: '💡 Sube el volumen de tu teléfono para escuchar a tu asistente con claridad.'
    }
];

export default function OnboardingTourModal({ isOpen, onClose }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const handleFinish = () => {
        if (dontShowAgain) {
            localStorage.setItem('rutaclara_onboarding_dismissed', 'true');
        }
        onClose();
    };

    const slide = SLIDES[currentSlide];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-md overflow-hidden animate-scale-up text-slate-800 flex flex-col">
                
                {/* Visual Header */}
                <div 
                    className="p-5 text-white flex flex-col items-center text-center relative overflow-hidden transition-all duration-300"
                    style={{ background: `linear-gradient(135deg, ${slide.color}, #064e3b)` }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center border-none cursor-pointer hover:bg-white/30 transition-colors"
                        title="Cerrar guía"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                    
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md mb-2">
                        <i className={`${slide.icon} text-2xl`}></i>
                    </div>

                    <span className="text-[11px] font-black tracking-wider uppercase text-emerald-200 bg-emerald-950/30 px-2.5 py-0.5 rounded-full mb-1">
                        {slide.badge} • {slide.tagline}
                    </span>

                    <h2 className="text-xl font-black tracking-tight text-white">
                        {slide.title}
                    </h2>
                </div>

                {/* Content Body */}
                <div className="p-5 flex flex-col gap-3.5">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed text-center px-1">
                        {slide.subtitle}
                    </p>

                    {/* Feature Cards / Mini pills */}
                    <div className="flex flex-col gap-2">
                        {slide.items.map((item, idx) => (
                            <div 
                                key={idx}
                                className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 transition-colors"
                            >
                                <span className="text-xl shrink-0 mt-0.5 select-none">{item.emoji}</span>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-slate-800">
                                        {item.name}
                                    </span>
                                    <span className="text-[11px] text-slate-500 leading-snug">
                                        {item.desc}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Friendly Tip Box */}
                    <div className="p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] font-semibold text-emerald-900 flex items-center gap-2">
                        <span>{slide.tip}</span>
                    </div>

                    {/* Dots Indicator */}
                    <div className="flex items-center justify-center gap-2 my-0.5">
                        {SLIDES.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-2 rounded-full transition-all border-none cursor-pointer ${
                                    currentSlide === idx ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                                }`}
                                title={`Paso ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Don't show again checkbox */}
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none justify-center">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="rounded accent-emerald-600 cursor-pointer"
                        />
                        <span>No volver a mostrar esta bienvenida</span>
                    </label>

                    {/* Navigation Action Buttons */}
                    <div className="flex items-center justify-between gap-2.5 pt-1">
                        {currentSlide > 0 ? (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 border-none cursor-pointer transition-colors"
                            >
                                Anterior
                            </button>
                        ) : (
                            <div className="w-1" />
                        )}

                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 border-none cursor-pointer transition-all flex items-center justify-center gap-2"
                        >
                            {currentSlide === SLIDES.length - 1 ? (
                                <>
                                    <span>¡Listo, a pedalear!</span>
                                    <i className="fa-solid fa-bicycle text-sm"></i>
                                </>
                            ) : (
                                <>
                                    <span>Siguiente</span>
                                    <i className="fa-solid fa-chevron-right text-xs"></i>
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
