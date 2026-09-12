import React, { useMemo } from 'react';

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

    const numDist = parseFloat(distanceKm) || 0;
    const co2Kg = (numDist * 0.16).toFixed(1);
    const calories = Math.round(numDist * 32);

    const riskScore = parseFloat(avgRiskScore) || 2.4;
    const riskLevel = riskScore >= 7.0 ? 'Alto' : (riskScore >= 3.8 ? 'Medio' : 'Bajo');
    const riskBadgeClass = riskLevel === 'Bajo' 
        ? 'bg-emerald-100/90 text-emerald-800 border-emerald-200' 
        : (riskLevel === 'Medio' ? 'bg-amber-100/90 text-amber-800 border-amber-200' : 'bg-rose-100/90 text-rose-800 border-rose-200');

    const cleanDestName = destinationName ? destinationName.replace('📍', '').replace('Refugio:', '').trim() : 'Destino alcanzado';

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in select-none"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm sm:max-w-md overflow-hidden animate-scale-up text-slate-800 relative"
                style={{ 
                    boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25), 0 10px 25px rgba(0, 0, 0, 0.08)' 
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Botón flotante cerrar en esquina */}
                <button
                    onClick={onClose}
                    className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center border-none cursor-pointer transition-all active:scale-90"
                    title="Cerrar"
                    aria-label="Cerrar modal"
                >
                    <i className="fa-solid fa-xmark text-xs"></i>
                </button>

                {/* 1. Animación Hero Minimalista (Bicicleta verde llegando a la meta con confeti) */}
                <div className="relative w-full bg-white flex items-center justify-center pt-5 pb-1 px-4 overflow-hidden">
                    <img
                        src="/arrival.webp"
                        alt="¡Llegada triunfal a tu destino!"
                        className="w-full max-h-48 sm:max-h-52 object-contain pointer-events-none drop-shadow-xs"
                    />
                </div>

                {/* 2. Título y Destino */}
                <div className="text-center px-6 pt-1 pb-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-2xs font-black tracking-wider uppercase border border-emerald-200/70 mb-2">
                        <i className="fa-solid fa-flag-checkered text-emerald-600"></i>
                        <span>Meta Alcanzada</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug m-0 capitalize truncate max-w-[280px] sm:max-w-xs mx-auto">
                        {cleanDestName}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-1 mb-0">
                        ¡Completaste tu ruta de forma segura y sostenible!
                    </p>
                </div>

                {/* 3. Métricas Principales en Cápsula Minimalista */}
                <div className="px-6 mb-3">
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50/90 border border-slate-200/70 text-center">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                                Distancia
                            </span>
                            <span className="text-base sm:text-lg font-black text-slate-900">
                                {distanceKm} <span className="text-2xs font-semibold text-slate-500">km</span>
                            </span>
                        </div>

                        <div className="border-x border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                                Tiempo
                            </span>
                            <span className="text-base sm:text-lg font-black text-slate-900">
                                {durationMin} <span className="text-2xs font-semibold text-slate-500">min</span>
                            </span>
                        </div>

                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                                Seguridad
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-2xs font-black border ${riskBadgeClass}`}>
                                {riskLevel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Micro-cápsula de Impacto Ecológico y CPTED */}
                <div className="px-6 mb-5">
                    <div className="px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/60 flex items-center justify-between text-[11px] font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-leaf text-emerald-600 text-xs"></i>
                            <span>-{co2Kg} kg CO₂</span>
                        </span>
                        <span className="text-emerald-300">•</span>
                        <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-fire text-amber-500 text-xs"></i>
                            <span>~{calories} kcal</span>
                        </span>
                        <span className="text-emerald-300">•</span>
                        <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-shield-heart text-emerald-600 text-xs"></i>
                            <span>CPTED Seguro</span>
                        </span>
                    </div>
                </div>

                {/* 5. Botones de Acción */}
                <div className="px-6 pb-6 flex flex-col gap-2.5">
                    <button
                        onClick={() => {
                            onClose();
                            if (onStartNewRoute) onStartNewRoute();
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                        style={{ boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)' }}
                    >
                        <i className="fa-solid fa-route text-sm"></i>
                        <span>Planear Nuevo Trayecto</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold text-xs transition-all border-none cursor-pointer"
                    >
                        Cerrar y Ver Mapa
                    </button>
                </div>
            </div>
        </div>
    );
}
