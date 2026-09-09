import React, { useState } from 'react';
import { HAZARD_TYPES } from '../../utils/quickReportService';

export default function QuickHazardReportButton({
    onReportHazard,
    onOpenPotholeModal,
    userLocation,
    isNavigating = false,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelectOption = (key) => {
        setIsOpen(false);
        if (onReportHazard) {
            onReportHazard(key);
        }
    };

    const handleOpenPothole = () => {
        setIsOpen(false);
        if (onOpenPotholeModal) {
            onOpenPotholeModal();
        } else {
            handleSelectOption('POTHOLE');
        }
    };

    const hazardOptions = [
        HAZARD_TYPES.LIGHTING,
        HAZARD_TYPES.OBSTACLE,
        HAZARD_TYPES.DANGER
    ];

    return (
        <div className={`relative ${className}`}>
            {/* 1. Modal / Radial Menu */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
                    onClick={() => setIsOpen(false)}
                >
                    <div 
                        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-xs sm:max-w-sm overflow-hidden p-5 flex flex-col gap-3 animate-scale-up text-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-base shadow-xs">
                                    <i className="fa-solid fa-bullhorn"></i>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                                        Reporte Rápido en Ruta
                                    </h3>
                                    <p className="text-2xs font-semibold text-slate-500">
                                        Alerta a ciclistas, motos y carros
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center border-none cursor-pointer transition-colors"
                                title="Cerrar"
                            >
                                <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                        </div>

                        {/* Pothole with Photo & Lane Featured Option */}
                        <button
                            type="button"
                            onClick={handleOpenPothole}
                            className="w-full flex items-center gap-3.5 p-3 rounded-2xl text-left border-2 border-orange-400/80 bg-orange-50/80 cursor-pointer active:scale-98 transition-all hover:shadow-md hover:bg-orange-100/70"
                        >
                            <div 
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg text-white shrink-0 shadow-xs bg-orange-600"
                            >
                                <i className="fa-solid fa-burst"></i>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-slate-900">
                                        Hueco / Bache en Vía
                                    </span>
                                    <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-orange-200 text-orange-900 uppercase">
                                        Foto + Carril
                                    </span>
                                </div>
                                <span className="text-2xs font-medium text-slate-600 truncate">
                                    Captura foto y carril (izq/centro/der)
                                </span>
                            </div>
                            <i className="fa-solid fa-camera text-xs text-orange-600 mr-1"></i>
                        </button>

                        {/* Other 1-touch Options */}
                        <div className="flex flex-col gap-2 pt-0.5">
                            {hazardOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelectOption(opt.id)}
                                    className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl text-left border cursor-pointer active:scale-98 transition-all hover:shadow-sm"
                                    style={{
                                        background: opt.bg,
                                        borderColor: opt.border,
                                        color: '#0f172a'
                                    }}
                                >
                                    <div 
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base text-white shrink-0 shadow-xs"
                                        style={{ background: opt.color }}
                                    >
                                        <i className={opt.icon}></i>
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-xs font-black text-slate-900">
                                            {opt.label}
                                        </span>
                                        <span className="text-2xs font-medium text-slate-500 truncate">
                                            {opt.sublabel}
                                        </span>
                                    </div>
                                    <i className="fa-solid fa-chevron-right text-xs text-slate-400 mr-1"></i>
                                </button>
                            ))}
                        </div>

                        {/* Location notice footer */}
                        <div className="text-[10px] text-slate-400 text-center font-medium pt-1 flex items-center justify-center gap-1">
                            <i className="fa-solid fa-location-dot text-emerald-500"></i>
                            <span>Captura tu posición GPS y expira en 60 min</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Floating Action Button (FAB) */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-12 h-12 rounded-2xl bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-all group ${
                    isNavigating ? 'ring-2 ring-amber-400 animate-pulse' : ''
                }`}
                style={{
                    boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)'
                }}
                title="Reporte Rápido de Peligro u Obstáculo"
                aria-label="Reportar novedad en ciclorruta"
            >
                <i className="fa-solid fa-triangle-exclamation text-lg group-hover:scale-110 transition-transform"></i>
            </button>
        </div>
    );
}
