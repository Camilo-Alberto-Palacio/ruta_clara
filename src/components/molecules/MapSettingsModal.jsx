import React from 'react';

export default function MapSettingsModal({
    isOpen,
    onClose,
    localidad,
    onLocalidadChange,
    localitiesMap,
    viewMode,
    onViewModeChange,
    mapStyle,
    onMapStyleChange,
    mapLayers,
    onMapLayersChange,
    currentUser = null,
    onOpenAuthModal = () => {},
    onOpenTour = () => {}
}) {
    if (!isOpen) return null;

    const layerItems = [
        { key: 'favorites', label: 'Mis Sitios Guardados', icon: 'fa-star', color: '#10b981', desc: 'Casa, trabajo y lugares frecuentes' },
        { key: 'cais', label: 'CAIs de Policía', icon: 'fa-shield-halved', color: '#3b82f6', desc: 'Cuadrantes y refugios' },
        { key: 'citizenReports', label: 'Reportes y Baches', icon: 'fa-burst', color: '#ea580c', desc: 'Huecos e incidentes comunitarios' },
        { key: 'trafficLights', label: 'Semáforos en Vivo', icon: 'fa-traffic-light', color: '#10b981', desc: 'Ciclos y ola verde' },
        { key: 'trafficJams', label: 'Congestión y Tráfico', icon: 'fa-car-side', color: '#f97316', desc: 'Reportes viales Waze' },
        { key: 'construction', label: 'Frentes de Obra IDU', icon: 'fa-road-barrier', color: '#eab308', desc: 'Intervenciones y desvíos' },
        { key: 'accidents', label: 'Siniestros Viales', icon: 'fa-car-burst', color: '#ef4444', desc: 'Histórico de accidentalidad' },
        { key: 'robberies', label: 'Alertas de Hurto 24h', icon: 'fa-triangle-exclamation', color: '#dc2626', desc: 'Puntos críticos de seguridad' },
        { key: 'localities', label: 'Límites de Localidad', icon: 'fa-draw-polygon', color: '#6366f1', desc: 'Perímetros distritales' }
    ];

    const toggleLayer = (key) => {
        onMapLayersChange(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    return (
        <div 
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/45 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-slide-up text-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Pull Handle (Mobile) & Header */}
                <div className="pt-2.5 px-5 pb-3 border-b border-slate-100 flex flex-col gap-1.5 shrink-0">
                    <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto sm:hidden mb-1"></div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-base shadow-xs">
                                <i className="fa-solid fa-sliders"></i>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 leading-tight">
                                    Ajustes y Capas del Mapa
                                </h3>
                                <p className="text-2xs font-semibold text-slate-500">
                                    Personaliza tu visualización y capas de seguridad
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center border-none cursor-pointer transition-colors"
                            title="Cerrar ajustes"
                        >
                            <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                    </div>
                </div>

                {/* Scrollable Settings Body */}
                <div className="p-5 overflow-y-auto flex flex-col gap-4">
                    {/* Tarjeta de Cuenta y Perfil Ciudadano */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {currentUser ? (
                                currentUser.photoURL ? (
                                    <img 
                                        src={currentUser.photoURL} 
                                        alt={currentUser.displayName || 'Ciclista'} 
                                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shadow-2xs" 
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-2xs">
                                        {(currentUser.displayName || currentUser.email?.charAt(0) || 'U').toUpperCase()}
                                    </div>
                                )
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-2xs">
                                    <i className="fa-brands fa-google text-base"></i>
                                </div>
                            )}
                            <div>
                                <h4 className="text-xs font-black text-slate-900 m-0">
                                    {currentUser ? (currentUser.displayName || 'Ciclista Registrado') : 'Cuenta y Perfil Ciudadano'}
                                </h4>
                                <p className="text-2xs text-slate-500 m-0">
                                    {currentUser ? (currentUser.email || '') : 'Inicia sesión con Google para sincronizar'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenAuthModal();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs border border-emerald-300 shadow-2xs cursor-pointer transition-colors"
                        >
                            {currentUser ? 'Ver Perfil' : 'Ingresar'}
                        </button>
                    </div>

                    {/* Botón para ver el recorrido interactivo de botones */}
                    {onOpenTour && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onOpenTour();
                            }}
                            className="p-3 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-300 text-emerald-800 flex items-center justify-between cursor-pointer transition-all active:scale-98"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs shadow-xs">
                                    <i className="fa-solid fa-graduation-cap"></i>
                                </div>
                                <div className="text-left">
                                    <span className="text-xs font-black block leading-tight">Guía de Botones de la App</span>
                                    <span className="text-3xs text-emerald-700 font-medium">Aprende qué hace cada botón en 1 minuto</span>
                                </div>
                            </div>
                            <i className="fa-solid fa-chevron-right text-xs text-emerald-600"></i>
                        </button>
                    )}

                    {/* 1. Estilo Visual del Mapa */}
                    <div>
                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                            1. Estilo Visual de Calzada
                        </span>
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { key: 'light', label: 'Calles (Claro)', icon: 'fa-sun', desc: 'Máxima nitidez vial' },
                                { key: 'terrain', label: 'Relieve Topográfico', icon: 'fa-mountain', desc: 'Curvas de nivel y cerros' }
                            ].map(style => {
                                const isSelected = mapStyle === style.key;
                                return (
                                    <button
                                        key={style.key}
                                        type="button"
                                        onClick={() => onMapStyleChange(style.key)}
                                        className={`p-3 rounded-2xl border text-left cursor-pointer flex flex-col gap-1 transition-all active:scale-98 ${
                                            isSelected
                                                ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                                                : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                                                isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                <i className={`fa-solid ${style.icon}`}></i>
                                            </div>
                                            {isSelected && (
                                                <i className="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
                                            )}
                                        </div>
                                        <span className="text-xs font-black mt-1">{style.label}</span>
                                        <span className="text-3xs text-slate-500">{style.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. Localidad Activa */}
                    <div>
                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                            2. Localidad de Operación
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(localitiesMap).map(key => {
                                const isSelected = localidad === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => onLocalidadChange(key)}
                                        className={`py-2.5 px-3 rounded-2xl border text-center font-black text-xs cursor-pointer transition-all active:scale-98 ${
                                            isSelected
                                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {localitiesMap[key].fullName || localitiesMap[key].name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Modo de Aplicación */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xs">
                                <i className="fa-solid fa-flask-vial"></i>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">Modo Científico y CPTED</span>
                                <span className="text-3xs text-slate-500">Muestra pesos SHAP y simulaciones técnicas</span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={viewMode === 'tech'}
                                onChange={() => onViewModeChange(viewMode === 'citizen' ? 'tech' : 'citizen')}
                                className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    {/* 4. Capas del Mapa */}
                    <div>
                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                            4. Capas Viales y de Seguridad
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {layerItems.map(item => {
                                const active = mapLayers[item.key] !== false;
                                return (
                                    <div 
                                        key={item.key}
                                        onClick={() => toggleLayer(item.key)}
                                        className={`p-2.5 rounded-2xl border cursor-pointer flex items-center justify-between gap-2 transition-all select-none active:scale-98 ${
                                            active
                                                ? 'border-slate-200 bg-white shadow-2xs'
                                                : 'border-slate-100 bg-slate-50/50 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div 
                                                className="w-7 h-7 rounded-xl flex items-center justify-center text-xs shrink-0"
                                                style={{ 
                                                    background: active ? `${item.color}15` : '#f1f5f9',
                                                    color: active ? item.color : '#94a3b8'
                                                }}
                                            >
                                                <i className={`fa-solid ${item.icon}`}></i>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-2xs font-bold text-slate-800 truncate">
                                                    {item.label}
                                                </span>
                                                <span className="text-3xs text-slate-400 truncate">
                                                    {item.desc}
                                                </span>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => {}} // Handled by container onClick
                                            className="accent-emerald-600 w-4 h-4 cursor-pointer shrink-0"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer with Close Button */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs shadow-md border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
                    >
                        <i className="fa-solid fa-check"></i>
                        <span>Listo, aplicar ajustes</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
