import React from 'react';
import { caiPoints } from '../../data/caiPoints';

export default function SafeHavenEmergencyModal({
    isOpen,
    onClose,
    currentCoords,
    onNavigateToHaven,
    onTriggerVoiceAlert
}) {
    if (!isOpen) return null;

    // Coordenadas de referencia: posición actual del ciclista o coordenadas por defecto
    const refLat = currentCoords ? currentCoords[0] : 4.5317; // Usme por defecto
    const refLng = currentCoords ? currentCoords[1] : -74.1166;

    // Calcular distancias a todos los CAI y ordenar por proximidad
    const sortedCais = caiPoints.map(cai => {
        const dLat = (cai.lat - refLat) * 111000;
        const dLng = (cai.lng - refLng) * 111000 * Math.cos(refLat * (Math.PI / 180));
        const distM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
        return {
            ...cai,
            distanceMeters: distM
        };
    }).sort((a, b) => a.distanceMeters - b.distanceMeters);

    const nearestCai = sortedCais[0] || null;

    const handleEscapeToNearest = (targetCai) => {
        if (!targetCai) return;
        if (onTriggerVoiceAlert) {
            onTriggerVoiceAlert(`Alerta activada. Redirigiendo de emergencia al CAI más cercano: ${targetCai.name}. Mantén el pedaleo continuo hacia el refugio.`);
        }
        onNavigateToHaven(targetCai);
        onClose();
    };

    const handleShareSosWhatsApp = (targetCai) => {
        const mapsUrl = `https://maps.google.com/?q=${refLat.toFixed(5)},${refLng.toFixed(5)}`;
        const text = encodeURIComponent(
            `🚨 ALERTA SOS CICLISTA BOGOTÁ\n` +
            `Me encuentro en situación de riesgo en bicicleta.\n` +
            `📍 Mi ubicación actual: ${mapsUrl}\n` +
            `👮 Dirigiéndome al refugio seguro: ${targetCai ? targetCai.name : 'CAI cercano'}\n` +
            `Enviado desde Ruta Clara (SafeCycle Bogotá)`
        );
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-rose-500/30 w-full max-w-md overflow-hidden animate-scale-up">
                {/* Cabecera de emergencia */}
                <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 p-5 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-inner animate-pulse">
                            🛡️
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight flex items-center gap-1.5">
                                Refugio Seguro & CAI
                            </h2>
                            <p className="text-2xs font-semibold text-rose-100">
                                Asistencia y escape inmediato a estación policial
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center border-none cursor-pointer text-sm"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-5 flex flex-col gap-4">
                    {nearestCai && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                                        Punto Seguro Más Cercano
                                    </span>
                                    <h3 className="text-base font-black text-slate-900 mt-0.5">
                                        {nearestCai.name}
                                    </h3>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        {nearestCai.address || 'Localidad del cuadrante'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-rose-600">
                                        {nearestCai.distanceMeters > 1000 
                                            ? `${(nearestCai.distanceMeters / 1000).toFixed(1)} km` 
                                            : `${nearestCai.distanceMeters} m`}
                                    </span>
                                    <span className="block text-[9px] font-bold text-slate-500">
                                        ~{Math.max(1, Math.round(nearestCai.distanceMeters / 250))} min en bici
                                    </span>
                                </div>
                            </div>

                            {/* Botón de acción prioritaria */}
                            <button
                                onClick={() => handleEscapeToNearest(nearestCai)}
                                className="w-full py-3 px-4 rounded-xl font-extrabold text-xs text-white bg-rose-600 hover:bg-rose-700 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 border-none cursor-pointer"
                            >
                                <i className="fa-solid fa-person-running"></i>
                                <span>Ruta Directa de Escape a este CAI</span>
                            </button>
                        </div>
                    )}

                    {/* Botón WhatsApp SOS */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleShareSosWhatsApp(nearestCai)}
                            className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-emerald-800 bg-emerald-100 hover:bg-emerald-200/80 border border-emerald-300 transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
                        >
                            <i className="fa-brands fa-whatsapp text-emerald-600 text-sm"></i>
                            <span>Compartir SOS por WhatsApp</span>
                        </button>
                        
                        <a
                            href="tel:123"
                            className="py-2.5 px-4 rounded-xl font-black text-xs text-white bg-rose-700 hover:bg-rose-800 transition-all flex items-center justify-center gap-2 text-decoration-none shadow-xs"
                        >
                            <i className="fa-solid fa-phone"></i>
                            <span>123</span>
                        </a>
                    </div>

                    {/* Otros CAIs cercanos */}
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Otras estaciones y cuadrantes próximos
                        </span>
                        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                            {sortedCais.slice(1, 4).map(cai => (
                                <div 
                                    key={cai.id}
                                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                                >
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">
                                            {cai.name}
                                        </span>
                                        <span className="text-2xs text-slate-500">
                                            {cai.distanceMeters > 1000 
                                                ? `${(cai.distanceMeters / 1000).toFixed(1)} km` 
                                                : `${cai.distanceMeters} m`}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleEscapeToNearest(cai)}
                                        className="py-1 px-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-2xs rounded-lg border-none cursor-pointer"
                                    >
                                        Ir
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
