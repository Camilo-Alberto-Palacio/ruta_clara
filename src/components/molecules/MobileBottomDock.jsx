import React from 'react';

export default function MobileBottomDock({
    onOpenSearch,
    onToggleResults,
    hasRoutes = false,
    activeRouteCount = 0,
    onEmergencySOS,
    onToggleCaravanas,
    onOpenReport,
    onToggleZen,
    isZenMode = false
}) {
    return (
        <nav 
            className="fixed bottom-4 left-3 right-3 z-40 max-w-md mx-auto rounded-3xl p-1.5 shadow-2xl backdrop-blur-2xl border flex items-center justify-around transition-all animate-slide-up"
            style={{
                background: 'rgba(255, 255, 255, 0.92)',
                borderColor: 'rgba(226, 232, 240, 0.85)',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.16)'
            }}
            aria-label="Barra de navegación ergonómica"
        >
            {/* 1. Buscar / Planificar */}
            <button
                type="button"
                onClick={onOpenSearch}
                className="flex flex-col items-center justify-center p-2 rounded-2xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-all border-none bg-transparent cursor-pointer flex-1"
                title="Buscar o planificar ruta"
            >
                <i className="fa-solid fa-route text-base text-emerald-600"></i>
                <span className="text-[10px] font-bold mt-1 tracking-tight">Ruta</span>
            </button>

            {/* 2. Resultados de Rutas (con badge) */}
            <button
                type="button"
                onClick={onToggleResults}
                className="relative flex flex-col items-center justify-center p-2 rounded-2xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-all border-none bg-transparent cursor-pointer flex-1"
                title="Ver alternativas de ruta"
            >
                <i className="fa-solid fa-list-check text-base text-slate-700"></i>
                <span className="text-[10px] font-bold mt-1 tracking-tight">Opciones</span>
                {hasRoutes && (
                    <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-scale-up">
                        {activeRouteCount || 3}
                    </span>
                )}
            </button>

            {/* 3. Botón Central SOS CAI (Emergencia - Hero Action) */}
            <button
                type="button"
                onClick={onEmergencySOS}
                className="w-12 h-12 -my-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center shadow-lg border-2 border-white/80 cursor-pointer animate-pulse transition-transform active:scale-95 flex-shrink-0"
                title="SOS Emergencia: Refugio en CAI más cercano"
            >
                <i className="fa-solid fa-triangle-exclamation text-base"></i>
                <span className="text-[8px] font-black tracking-wider uppercase mt-0.5">SOS</span>
            </button>

            {/* 4. Bici-Caravanas */}
            <button
                type="button"
                onClick={onToggleCaravanas}
                className="flex flex-col items-center justify-center p-2 rounded-2xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-all border-none bg-transparent cursor-pointer flex-1"
                title="Bici-Caravanas Comunitarias"
            >
                <i className="fa-solid fa-bicycle text-base text-emerald-600"></i>
                <span className="text-[10px] font-bold mt-1 tracking-tight">Pelotón</span>
            </button>

            {/* 5. Reportar Incidencia Ciudadana */}
            <button
                type="button"
                onClick={onOpenReport}
                className="flex flex-col items-center justify-center p-2 rounded-2xl text-slate-700 hover:text-amber-700 hover:bg-amber-50 transition-all border-none bg-transparent cursor-pointer flex-1"
                title="Reportar obstáculo o peligro"
            >
                <i className="fa-solid fa-bullhorn text-base text-amber-500"></i>
                <span className="text-[10px] font-bold mt-1 tracking-tight">Reportar</span>
            </button>

            {/* 6. Modo Zen / Limpiar Pantalla */}
            <button
                type="button"
                onClick={onToggleZen}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all border-none cursor-pointer flex-1 ${
                    isZenMode ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
                title={isZenMode ? "Restaurar paneles" : "Modo Zen: Mapa despejado"}
            >
                <i className={`fa-solid ${isZenMode ? 'fa-eye' : 'fa-compress'} text-base`}></i>
                <span className="text-[10px] font-bold mt-1 tracking-tight">{isZenMode ? 'Restaurar' : 'Zen'}</span>
            </button>
        </nav>
    );
}
