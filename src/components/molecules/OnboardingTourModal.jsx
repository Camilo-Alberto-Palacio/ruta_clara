import React, { useState } from 'react';

const SLIDES = [
    {
        title: 'Planificación Inteligente con CPTED',
        tagline: 'Seguridad vial y prevención del delito',
        icon: 'fa-solid fa-shield-halved',
        color: '#10b981',
        description: 'Ruta Clara analiza en tiempo real el alumbrado público (UAESP), antecedentes policiales (SIEDCO), frentes de obra (IDU) y reportes de ciclistas para calcular el nivel de riesgo de cada tramo.',
        tip: '💡 Las vías verdes tienen óptima iluminación y vigilancia natural.'
    },
    {
        title: 'Perfiles Multicriterio & Altimetría',
        tagline: 'Adapta el viaje a tu condición y horario',
        icon: 'fa-solid fa-chart-area',
        color: '#3b82f6',
        description: 'Compara 3 alternativas simultáneas: la ruta Blindada (más segura), Menos Pendiente (con desniveles suaves para no agotarte en subida) y Exprés (la más rápida).',
        tip: '📈 Consulta el gráfico de elevación interactivo para planificar tu esfuerzo.'
    },
    {
        title: 'Seguridad Activa & Comunidad',
        tagline: 'Refugios policiales y pelotones colectivos',
        icon: 'fa-solid fa-triangle-exclamation',
        color: '#f43f5e',
        description: 'En caso de amenaza, activa el botón SOS para escape guiado por voz hacia el CAI más cercano. Además, pedalea en Bici-Caravanas grupales con bonificación de seguridad.',
        tip: '🚨 El botón SOS está disponible a un solo toque en la barra inferior móvil.'
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-md overflow-hidden animate-scale-up text-slate-800 flex flex-col">
                
                {/* Visual Header */}
                <div 
                    className="p-6 text-white flex flex-col items-center text-center relative overflow-hidden transition-all duration-300"
                    style={{ background: `linear-gradient(135deg, ${slide.color}, #064e3b)` }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center border-none cursor-pointer hover:bg-white/30 transition-colors"
                        title="Saltar tour"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg mb-3">
                        <i className={`${slide.icon} text-2xl`}></i>
                    </div>
                    <span className="text-[11px] font-extrabold tracking-wider uppercase text-emerald-200">
                        {slide.tagline}
                    </span>
                    <h2 className="text-lg font-black mt-1">
                        {slide.title}
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {slide.description}
                    </p>

                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-xs font-semibold text-emerald-900">
                        {slide.tip}
                    </div>

                    {/* Dots Indicator */}
                    <div className="flex items-center justify-center gap-2 my-1">
                        {SLIDES.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-2 rounded-full transition-all border-none cursor-pointer ${
                                    currentSlide === idx ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-300'
                                }`}
                                title={`Paso ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Don't show again checkbox */}
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="rounded accent-emerald-600 cursor-pointer"
                        />
                        <span>No volver a mostrar esta guía de inicio</span>
                    </label>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                        {currentSlide > 0 ? (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 border-none cursor-pointer transition-colors"
                            >
                                Anterior
                            </button>
                        ) : (
                            <div />
                        )}

                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md border-none cursor-pointer transition-all flex items-center justify-center gap-2"
                        >
                            {currentSlide === SLIDES.length - 1 ? (
                                <>
                                    <span>¡Comenzar a pedalear!</span>
                                    <i className="fa-solid fa-arrow-right text-xs"></i>
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
