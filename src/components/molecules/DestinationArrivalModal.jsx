import React from 'react';

export default function DestinationArrivalModal({
    isOpen,
    onClose,
    destinationName = 'Destino',
    distanceKm = '0.0',
    durationMin = '0',
    avgRiskScore = '2.4',
    onStartNewRoute
}) {
    if (!isOpen) return null;

    const riskLevel = parseFloat(avgRiskScore) >= 7.0 ? 'Alto' : (parseFloat(avgRiskScore) >= 3.8 ? 'Medio' : 'Bajo');
    const riskBadgeClass = riskLevel === 'Bajo' 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
        : (riskLevel === 'Medio' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-fade-in select-none">
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-emerald-500/20 w-full max-w-md overflow-hidden animate-scale-up text-slate-900"
                style={{ boxShadow: '0 20px 45px rgba(16, 185, 129, 0.2), 0 8px 25px rgba(0,0,0,0.1)' }}
            >
                {/* Header decorativo con gradiente verde esmeralda */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="absolute -left-6 -top-6 w-24 h-24 bg-emerald-400/20 rounded-full blur-lg pointer-events-none"></div>

                    <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <i className="fa-solid fa-flag-checkered text-3xl text-white"></i>
                    </div>
                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black tracking-wider uppercase mb-1 backdrop-blur-xs">
                        🎉 ¡Recorrido Completado!
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-white m-0">
                        ¡Has llegado a tu destino!
                    </h2>
                    <p className="text-emerald-100 text-xs font-medium mt-1 truncate max-w-xs mx-auto">
                        {destinationName ? destinationName.replace('📍', '').trim() : 'Destino alcanzado'}
                    </p>
                </div>

                {/* Métricas del viaje */}
                <div className="p-6">
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
                            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Distancia
                            </span>
                            <span className="text-lg font-black text-slate-900">
                                {distanceKm} <span className="text-xs font-semibold text-slate-500">km</span>
                            </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
                            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Tiempo
                            </span>
                            <span className="text-lg font-black text-slate-900">
                                {durationMin} <span className="text-xs font-semibold text-slate-500">min</span>
                            </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center">
                            <span className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Seguridad
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-black border ${riskBadgeClass}`}>
                                {riskLevel}
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/70 mb-5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                            <i className="fa-solid fa-shield-heart text-base"></i>
                        </div>
                        <p className="text-xs text-emerald-950 font-semibold m-0 leading-snug">
                            Tu trayecto fue supervisado continuamente por los filtros CPTED y de seguridad de Ruta Clara.
                        </p>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex flex-col gap-2.5">
                        <button
                            onClick={() => {
                                onClose();
                                if (onStartNewRoute) onStartNewRoute();
                            }}
                            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-route"></i>
                            <span>Planear Nuevo Trayecto</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs transition-all border-none cursor-pointer"
                        >
                            Cerrar y Ver Mapa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
