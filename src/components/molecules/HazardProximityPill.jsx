import React, { useState } from 'react';

/**
 * HazardProximityPill
 * Non-invasive floating HUD notification shown during active navigation
 * when approaching a citizen hazard report with photographic evidence.
 */
export default function HazardProximityPill({
    hazard,
    onDismiss
}) {
    const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

    if (!hazard || !hazard.foto) return null;

    const laneLabels = {
        izquierda: { text: 'Carril Izquierdo ⬅️', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
        centro: { text: 'Eje Central ⬆️', bg: 'bg-sky-100 text-sky-900 border-sky-300' },
        derecha: { text: 'Carril Derecho ➡️', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
    };

    const laneConfig = hazard.lane ? laneLabels[hazard.lane] : null;
    const isCritical = hazard.severity === 'critico';

    return (
        <>
            {/* Non-invasive floating pill below turn banner */}
            <div 
                className="pointer-events-auto max-w-md w-full mx-auto mt-2 animate-slide-down"
            >
                <div 
                    className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border p-2.5 flex items-center gap-3 transition-all text-slate-800 ${
                        isCritical ? 'border-rose-400 ring-2 ring-rose-300/40' : 'border-emerald-200 ring-2 ring-emerald-400/20'
                    }`}
                >
                    {/* Thumbnail with camera badge and zoom hint */}
                    <button
                        type="button"
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-xs cursor-pointer group active:scale-95 transition-transform"
                        title="Toca para ver la fotografía en grande"
                    >
                        <img 
                            src={hazard.foto} 
                            alt={hazard.tipo || 'Evidencia de peligro'} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-600 rounded-tl-md flex items-center justify-center text-[8px] text-white">
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </span>
                    </button>

                    {/* Information column */}
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-2xs font-black text-slate-900 truncate leading-tight">
                                {hazard.tipo?.split('/')[0] || 'Alerta en Vía'}
                            </span>
                            {hazard.distMeters != null && (
                                <span className={`text-3xs font-extrabold px-1.5 py-0.5 rounded-full ${
                                    hazard.distMeters <= 30 ? 'bg-rose-100 text-rose-700 font-black' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    a {hazard.distMeters} m
                                </span>
                            )}
                        </div>

                        {laneConfig && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 w-max leading-none ${laneConfig.bg}`}>
                                {laneConfig.text}
                            </span>
                        )}

                        {hazard.descripcion && (
                            <p className="text-3xs text-slate-500 italic truncate mt-0.5">
                                "{hazard.descripcion}"
                            </p>
                        )}
                    </div>

                    {/* Dismiss Button */}
                    {onDismiss && (
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center border-none cursor-pointer shrink-0 transition-colors"
                            title="Descartar aviso"
                        >
                            <i className="fa-solid fa-xmark text-2xs"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Lightbox Modal when clicking the photo */}
            {isPhotoModalOpen && (
                <div 
                    className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in"
                    onClick={() => setIsPhotoModalOpen(false)}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden p-4 flex flex-col gap-3 animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                                    <i className="fa-solid fa-camera"></i>
                                </span>
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                                        {hazard.tipo?.split('/')[0] || 'Evidencia Fotográfica'}
                                    </h4>
                                    <span className="text-3xs text-slate-500 font-semibold">
                                        Reportado por la comunidad
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPhotoModalOpen(false)}
                                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border-none cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>

                        <div className="w-full max-h-72 rounded-2xl overflow-hidden border border-slate-200 bg-black flex items-center justify-center">
                            <img 
                                src={hazard.foto} 
                                alt={hazard.tipo || 'Evidencia de peligro'} 
                                className="w-full h-full max-h-72 object-contain"
                            />
                        </div>

                        <div className="flex items-center justify-between text-2xs font-bold text-slate-700 pt-1">
                            {laneConfig ? (
                                <span className={`px-2 py-1 rounded-xl border ${laneConfig.bg}`}>
                                    {laneConfig.text}
                                </span>
                            ) : <span></span>}
                            <button
                                onClick={() => setIsPhotoModalOpen(false)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border-none cursor-pointer text-xs"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
