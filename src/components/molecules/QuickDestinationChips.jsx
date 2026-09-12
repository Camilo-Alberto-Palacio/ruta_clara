import React from 'react';
import { BOGOTA_POPULAR_DESTINATIONS, PLACE_CATEGORIES } from '../../data/bogotaDestinations';

// Mantenemos compatibilidad con el array anterior
export const POPULAR_DESTINATIONS = BOGOTA_POPULAR_DESTINATIONS;

export default function QuickDestinationChips({
    onSelectDestination,
    activeDestName = '',
    userFavorites = [],
    onOpenManageFavorites
}) {
    return (
        <div className="flex flex-col gap-2 my-1.5">
            {/* Cabecera con botón directo a Administrar Lugares */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-bolt-lightning text-amber-500"></i> Destinos Rápidos (1-Toque):
                </span>
                {onOpenManageFavorites && (
                    <button
                        type="button"
                        onClick={onOpenManageFavorites}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        title="Gestionar mis sitios frecuentes"
                    >
                        <i className="fa-solid fa-star text-amber-500 text-[9px]"></i>
                        <span>Mis Sitios ({userFavorites.length})</span>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar py-0.5">
                {/* 1. Lugares Favoritos del Ciclista (Prioridad Máxima) */}
                {userFavorites.map((fav) => {
                    const catMeta = PLACE_CATEGORIES[fav.category] || PLACE_CATEGORIES.custom;
                    const isSelected = activeDestName && (
                        activeDestName.toLowerCase().includes(fav.label.toLowerCase()) ||
                        (fav.address && activeDestName.toLowerCase().includes(fav.address.toLowerCase()))
                    );

                    return (
                        <button
                            key={fav.id}
                            type="button"
                            onClick={() => onSelectDestination && onSelectDestination({
                                name: fav.label,
                                coords: fav.coords,
                                address: fav.address,
                                isFavorite: true
                            })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border shadow-xs ${
                                isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm scale-[1.02]'
                                    : 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border-emerald-200 hover:border-emerald-300'
                            }`}
                            title={`Planificar hacia ${fav.label}`}
                        >
                            <span>{catMeta.emoji}</span>
                            <span>{fav.label}</span>
                            <i className="fa-solid fa-star text-[9px] text-amber-400 ml-0.5"></i>
                        </button>
                    );
                })}

                {/* Si no tiene favoritos, mostrar chip amigable para agregarlos */}
                {(!userFavorites || userFavorites.length === 0) && onOpenManageFavorites && (
                    <button
                        type="button"
                        onClick={onOpenManageFavorites}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer border border-dashed border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 shadow-2xs"
                        title="Guardar Casa o Trabajo para acceder en 1 toque"
                    >
                        <i className="fa-solid fa-plus text-emerald-600 text-[10px]"></i>
                        <span>+ Guardar Casa / Trabajo</span>
                    </button>
                )}

                {/* 2. Destinos Populares de Bogotá */}
                {BOGOTA_POPULAR_DESTINATIONS.map((item, idx) => {
                    const isSelected = activeDestName && activeDestName.toLowerCase().includes(item.name.toLowerCase());
                    return (
                        <button
                            key={`popular_${idx}`}
                            type="button"
                            onClick={() => onSelectDestination && onSelectDestination(item)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border shadow-xs ${
                                isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm scale-[1.02]'
                                    : 'bg-white/90 hover:bg-white text-slate-700 hover:text-emerald-700 border-slate-200/80 hover:border-emerald-300'
                            }`}
                            title={`Planificar hacia ${item.name}`}
                        >
                            <i className={`${item.icon} text-[10px] ${isSelected ? 'text-white' : 'text-emerald-600'}`}></i>
                            <span>{item.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
