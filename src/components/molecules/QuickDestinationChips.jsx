import React from 'react';

export const POPULAR_DESTINATIONS = [
    { name: 'Portal Usme', icon: 'fa-solid fa-bus', coords: { lat: 4.5317, lng: -74.1166 } },
    { name: 'Estación Molinos', icon: 'fa-solid fa-train-subway', coords: { lat: 4.5631, lng: -74.1128 } },
    { name: 'Parque El Tunal', icon: 'fa-solid fa-tree', coords: { lat: 4.5761, lng: -74.1332 } },
    { name: 'UPZ Quiroga', icon: 'fa-solid fa-city', coords: { lat: 4.5815, lng: -74.1118 } },
    { name: 'Parque Entre Nubes', icon: 'fa-solid fa-mountain', coords: { lat: 4.5539, lng: -74.0934 } }
];

export default function QuickDestinationChips({ onSelectDestination, activeDestName = '' }) {
    return (
        <div className="flex flex-col gap-1.5 my-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-bolt-lightning text-amber-500"></i> Destinos Rápidos (1-Toque):
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar py-0.5">
                {POPULAR_DESTINATIONS.map((item, idx) => {
                    const isSelected = activeDestName && activeDestName.toLowerCase().includes(item.name.toLowerCase());
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectDestination && onSelectDestination(item)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border shadow-xs ${
                                isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm scale-[1.02]'
                                    : 'bg-white/80 hover:bg-white text-slate-700 hover:text-emerald-700 border-slate-200/80 hover:border-emerald-300'
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
