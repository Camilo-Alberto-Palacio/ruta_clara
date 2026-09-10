import React, { useState } from 'react';

const TOUR_STEPS = [
    {
        badge: 'BOTÓN 1 DE 6',
        tagline: 'Planificación y Búsqueda',
        title: 'Buscador de Destino 🔍',
        icon: 'fa-solid fa-magnifying-glass',
        color: '#10b981',
        subtitle: 'La barra superior "¿A dónde quieres ir hoy?" te conecta con toda Bogotá:',
        items: [
            {
                emoji: '🗺️',
                name: 'Escribe cualquier lugar',
                desc: 'Busca colegios, estaciones de Transmilenio, centros comerciales o parques.'
            },
            {
                emoji: '⚡',
                name: '3 Rutas Inteligentes',
                desc: 'Compara al instante la Ruta Segura (más iluminada), Rápida y Plana.'
            },
            {
                emoji: '🎯',
                name: 'Chips de 1 Toque',
                desc: 'Accesos rápidos a destinos frecuentes como Portal Usme, Venecia o El Tunal.'
            }
        ],
        tip: '💡 También puedes tocar directamente cualquier punto del mapa para fijar tu meta.'
    },
    {
        badge: 'BOTÓN 2 DE 6',
        tagline: 'Pedaleo Seguro Sin Manos',
        title: 'Búsqueda por Voz 🎙️',
        icon: 'fa-solid fa-microphone',
        color: '#059669',
        subtitle: 'No sueltes el manubrio ni te distraigas mientras vas en tu bicicleta:',
        items: [
            {
                emoji: '🗣️',
                name: 'Dicta con naturalidad',
                desc: 'Toca el micrófono y di tu destino, por ejemplo: "Ir al Portal Usme".'
            },
            {
                emoji: '🇨🇴',
                name: 'Reconocimiento Local',
                desc: 'Configurado con acento bogotano y filtros para el viento y ruido de tráfico.'
            },
            {
                emoji: '🔊',
                name: 'Confirmación Sonora',
                desc: 'Tu asistente de voz te confirmará por audio la ciclorruta seleccionada.'
            }
        ],
        tip: '💡 El micrófono está disponible en la barra superior y en el dock inferior.'
    },
    {
        badge: 'BOTÓN 3 DE 6',
        tagline: 'Seguridad Inmediata',
        title: 'Botón Central SOS CAI 🚨',
        icon: 'fa-solid fa-triangle-exclamation',
        color: '#e11d48',
        subtitle: 'Tu salvavidas ante cualquier situación de riesgo o incidente:',
        items: [
            {
                emoji: '🛡️',
                name: 'Refugio Policial Rápido',
                desc: 'Con 1 toque localiza de inmediato el CAI o estación más cercana.'
            },
            {
                emoji: '⚡',
                name: 'Ruta Blindada',
                desc: 'Te guía por los tramos más concurridos y vigilados hacia la policía.'
            },
            {
                emoji: '📞',
                name: 'Marcado de Emergencia',
                desc: 'Acceso directo de auxilio para enlazar con la línea distrital 123.'
            }
        ],
        tip: '💡 El botón rojo SOS está en el centro de tu barra inferior, siempre visible.'
    },
    {
        badge: 'BOTÓN 4 DE 6',
        tagline: 'Ciencia Ciudadana (Estilo Waze)',
        title: 'Reporte Rápido de Obstáculos 🕳️',
        icon: 'fa-solid fa-burst',
        color: '#f97316',
        subtitle: 'Protege a otros ciclistas alertando anomalías viales con 1 toque:',
        items: [
            {
                emoji: '💥',
                name: 'Baches y Alcantarillas',
                desc: 'Indica si el hueco está a la izquierda, centro o derecha del carril.'
            },
            {
                emoji: '💡',
                name: 'Zonas Oscuras',
                desc: 'Alerta sobre luminarias dañadas o "bocas de lobo" para evitar atracos.'
            },
            {
                emoji: '📸',
                name: 'Foto y Caducidad',
                desc: 'Sube foto testimonial. Los reportes expiran a los 60 min para mantener el mapa veraz.'
            }
        ],
        tip: '💡 Es el botón flotante naranja en la esquina inferior derecha.'
    },
    {
        badge: 'BOTÓN 5 DE 6',
        tagline: 'Control y Visualización',
        title: 'Capas y Ajustes del Mapa ⚙️',
        icon: 'fa-solid fa-sliders',
        color: '#6366f1',
        subtitle: 'Personaliza tu experiencia de rodada en Bogotá:',
        items: [
            {
                emoji: '🚦',
                name: 'Semáforos en Tiempo Real',
                desc: 'Mira ciclos semafóricos y aprovéchate de la ola verde distrital.'
            },
            {
                emoji: '🛑',
                name: 'Obras y Trancones',
                desc: 'Visualiza frentes de obra IDU y congestiones vehiculares en vivo.'
            },
            {
                emoji: '🗺️',
                name: 'Estilo Vial o Relieve',
                desc: 'Alterna entre vista limpia de calles o curvas topográficas de montaña.'
            }
        ],
        tip: '💡 Presiona "Ajustes" en la barra inferior para activar o desactivar capas.'
    },
    {
        badge: 'BOTÓN 6 DE 6',
        tagline: 'Geolocalización en Tiempo Real',
        title: 'Bicicleta 3D y Recentrado GPS 🚴',
        icon: 'fa-solid fa-bicycle',
        color: '#10b981',
        subtitle: 'Tu posición exacta con brújula y seguimiento en vivo:',
        items: [
            {
                emoji: '🚴',
                name: 'Bicicleta 3D Dinámica',
                desc: 'Sigue tu rumbo y se inclina en las curvas marcando exactamente dónde estás.'
            },
            {
                emoji: '📡',
                name: 'GPS Siempre Activo',
                desc: 'Seguimiento satelital continuo para que nunca te salgas de la ciclorruta.'
            },
            {
                emoji: '📍',
                name: 'Botón Recentrar',
                desc: 'Si arrastras el mapa para ver otra zona, tócalo para volver al ciclista de inmediato.'
            }
        ],
        tip: '💡 El botón flotante de recentrado aparece encima de las herramientas viales.'
    }
];

export default function OnboardingTourModal({ isOpen, onClose }) {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinish = () => {
        localStorage.setItem('rutaclara_tour_completed', 'true');
        localStorage.setItem('rutaclara_onboarding_dismissed', 'true');
        if (onClose) onClose();
    };

    const step = TOUR_STEPS[currentStep];
    const isLast = currentStep === TOUR_STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-md overflow-hidden animate-scale-up text-slate-800 flex flex-col"
                style={{ boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)' }}
            >
                {/* Visual Header with Step Badge */}
                <div 
                    className="p-5 text-white flex flex-col items-center text-center relative overflow-hidden transition-all duration-300"
                    style={{ background: `linear-gradient(135deg, ${step.color}, #064e3b)` }}
                >
                    <button
                        onClick={handleFinish}
                        className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center border-none cursor-pointer transition-colors"
                        title="Saltar recorrido"
                        aria-label="Cerrar recorrido"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                    
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-md mb-2 animate-bounce-subtle">
                        <i className={`${step.icon} text-2xl`}></i>
                    </div>

                    <span className="text-[11px] font-black tracking-wider uppercase text-emerald-200 bg-emerald-950/40 px-3 py-0.5 rounded-full mb-1">
                        {step.badge} • {step.tagline}
                    </span>

                    <h2 className="text-xl font-black tracking-tight text-white m-0">
                        {step.title}
                    </h2>
                </div>

                {/* Content Body */}
                <div className="p-5 flex flex-col gap-3.5 overflow-y-auto max-h-[55vh]">
                    <p className="text-xs font-semibold text-slate-600 text-center px-1 m-0">
                        {step.subtitle}
                    </p>

                    {/* Explanatory Feature Cards */}
                    <div className="flex flex-col gap-2.5">
                        {step.items.map((item, idx) => (
                            <div 
                                key={idx} 
                                className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors"
                            >
                                <span className="text-xl shrink-0 select-none">{item.emoji}</span>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black text-slate-800 leading-tight">
                                        {item.name}
                                    </span>
                                    <span className="text-2xs text-slate-500 font-medium leading-relaxed mt-0.5">
                                        {item.desc}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pro Tip Callout */}
                    <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-2.5 text-center">
                        <p className="text-2xs font-bold text-emerald-800 m-0">
                            {step.tip}
                        </p>
                    </div>
                </div>

                {/* Footer Navigation Controls */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                    {/* Progress Dots */}
                    <div className="flex items-center gap-1.5">
                        {TOUR_STEPS.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentStep(idx)}
                                className={`h-2 rounded-full transition-all border-none p-0 cursor-pointer ${
                                    idx === currentStep ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                                }`}
                                title={`Paso ${idx + 1}`}
                                aria-label={`Ir al paso ${idx + 1}`}
                            />
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 border-none bg-transparent cursor-pointer transition-colors"
                            >
                                Anterior
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 border-none text-white ${
                                isLast ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
                            }`}
                        >
                            <span>{isLast ? '¡Comenzar a Rodar! 🚲' : 'Siguiente'}</span>
                            <i className={`fa-solid ${isLast ? 'fa-check' : 'fa-arrow-right'} text-xs`}></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
