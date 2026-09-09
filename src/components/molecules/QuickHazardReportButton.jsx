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

    const handleOpenModalWithType = (typeKey = 'POTHOLE') => {
        setIsOpen(false);
        if (onOpenPotholeModal) {
            onOpenPotholeModal(typeKey);
        } else {
            handleSelectOption(typeKey);
        }
    };

    const hazardOptions = [
        { key: 'POTHOLE', ...HAZARD_TYPES.POTHOLE },
        { key: 'LIGHTING', ...HAZARD_TYPES.LIGHTING },
        { key: 'OBSTACLE', ...HAZARD_TYPES.OBSTACLE },
        { key: 'TRAFFIC_LIGHT', ...HAZARD_TYPES.TRAFFIC_LIGHT },
        { key: 'DANGER', ...HAZARD_TYPES.DANGER }
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
                                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-base shadow-xs">
                                    <i className="fa-solid fa-bullhorn"></i>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                                        Reporte en Ruta con Foto
                                    </h3>
                                    <p className="text-2xs font-semibold text-slate-500">
                                        Alerta a ciclistas, motos y conductores
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

                        {/* Featured Photo Action */}
                        <button
                            type="button"
                            onClick={() => handleOpenModalWithType('POTHOLE')}
                            className="w-full flex items-center gap-3.5 p-3 rounded-2xl text-left border-2 border-emerald-500/80 bg-emerald-50/80 cursor-pointer active:scale-98 transition-all hover:shadow-md hover:bg-emerald-100/70"
                        >
                            <div 
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-lg text-white shrink-0 shadow-xs bg-emerald-600"
                            >
                                <i className="fa-solid fa-camera"></i>
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-slate-900">
                                        Tomar Foto de Novedad
                                    </span>
                                    <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 uppercase">
                                        Foto + Vía
                                    </span>
                                </div>
                                <span className="text-2xs font-medium text-slate-600 truncate">
                                    Captura imagen, carril y gravedad
                                </span>
                            </div>
                            <i className="fa-solid fa-arrow-right text-xs text-emerald-700 mr-1"></i>
                        </button>

                        {/* All Hazard Options */}
                        <div className="flex flex-col gap-1.5 pt-0.5 max-h-60 overflow-y-auto pr-0.5">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">
                                Selecciona el tipo de peligro:
                            </span>
                            {hazardOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleOpenModalWithType(opt.key)}
                                    className="w-full flex items-center gap-3 p-2 rounded-2xl text-left border cursor-pointer active:scale-98 transition-all hover:shadow-sm"
                                    style={{
                                        background: opt.bg,
                                        borderColor: opt.border,
                                        color: '#0f172a'
                                    }}
                                >
                                    <div 
                                        className="w-8 h-8 rounded-xl flex items-center justify-center text-sm text-white shrink-0 shadow-xs"
                                        style={{ background: opt.color }}
                                    >
                                        <i className={opt.icon}></i>
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-xs font-black text-slate-900 leading-tight">
                                            {opt.label}
                                        </span>
                                        <span className="text-3xs font-medium text-slate-500 truncate">
                                            {opt.sublabel}
                                        </span>
                                    </div>
                                    <span className="text-3xs text-slate-500 flex items-center gap-1">
                                        <i className="fa-solid fa-camera text-2xs"></i>
                                    </span>
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
