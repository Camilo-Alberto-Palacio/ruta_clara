import React from 'react';

export default function MobileBottomDock({
    onOpenSearch,
    onToggleResults,
    hasRoutes = false,
    activeRouteCount = 0,
    onEmergencySOS,
    onOpenLayers,
    isZenMode = false
}) {
    return (
        <nav 
            className="fixed bottom-4 left-4 right-4 z-40 max-w-sm mx-auto rounded-3xl p-1.5 shadow-2xl border flex items-center justify-between transition-all animate-slide-up bg-white/98 border-slate-200/90"
            style={{
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)'
            }}
            aria-label="Barra de navegación móvil minimalista"
        >
            {/* 1. Planificar / Buscar Ruta */}
            <button
                type="button"
                onClick={hasRoutes ? onToggleResults : onOpenSearch}
                className="flex flex-col items-center justify-center py-2 px-3 rounded-2xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-all border-none bg-transparent cursor-pointer flex-1 relative"
                title={hasRoutes ? "Ver alternativas de ruta" : "Planificar ruta"}
            >
                <i className={`fa-solid ${hasRoutes ? 'fa-route' : 'fa-magnifying-glass'} text-lg text-emerald-600`}></i>
                <span className="text-[11px] font-extrabold mt-1 text-slate-800">
                    {hasRoutes ? 'Rutas' : 'Buscar'}
                </span>
                {hasRoutes && (
                    <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                        {activeRouteCount || 3}
                    </span>
                )}
            </button>

            {/* 2. Botón Central Hero SOS CAI (Emergencia) */}
            <button
                type="button"
                onClick={onEmergencySOS}
                className="w-13 h-13 -my-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center shadow-lg border-2 border-white cursor-pointer active:scale-95 transition-transform flex-shrink-0"
                style={{ boxShadow: '0 8px 20px rgba(225, 29, 72, 0.4)' }}
                title="SOS Emergencia: Refugio en CAI más cercano"
            >
                <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                <span className="text-[9px] font-black tracking-wider uppercase mt-0.5">SOS</span>
            </button>

            {/* 3. Capas y Opciones */}
            <button
                type="button"
                onClick={onOpenLayers}
                className="flex flex-col items-center justify-center py-2 px-3 rounded-2xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-all border-none bg-transparent cursor-pointer flex-1"
                title="Capas y Ajustes de Mapa"
            >
                <i className="fa-solid fa-sliders text-lg text-slate-700"></i>
                <span className="text-[11px] font-extrabold mt-1 text-slate-800">Ajustes</span>
            </button>
        </nav>
    );
}
