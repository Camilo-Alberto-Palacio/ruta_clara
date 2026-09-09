import React, { useState, useRef } from 'react';
import { emitToast } from '../../utils/toastService';

/**
 * Compresses an image file using an off-screen HTML5 canvas to keep
 * payload under ~80-120KB for localStorage and fast Leaflet rendering.
 */
function compressImage(file, maxDimension = 800, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
            img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
}

export default function PotholeReportModal({
    isOpen,
    onClose,
    onSubmitReport,
    userLocation,
    cyclistCoords
}) {
    const [lane, setLane] = useState('centro'); // 'izquierda' | 'centro' | 'derecha'
    const [severity, setSeverity] = useState('moderado'); // 'moderado' | 'critico'
    const [photo, setPhoto] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [description, setDescription] = useState('');
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsCompressing(true);
            const compressed = await compressImage(file, 800, 0.72);
            setPhoto(compressed);
        } catch (error) {
            console.error('Error al procesar la fotografía:', error);
            emitToast('No se pudo procesar la foto. Intenta con otra imagen.', 'error');
        } finally {
            setIsCompressing(false);
        }
    };

    const handleSubmit = () => {
        const coords = cyclistCoords 
            || (userLocation ? [userLocation.lat, userLocation.lng] : null)
            || [4.5317, -74.1166];

        onSubmitReport({
            lane,
            severity,
            foto: photo,
            descripcion: description.trim() || undefined,
            coords
        });

        // Reset fields
        setPhoto(null);
        setDescription('');
        setLane('centro');
        setSeverity('moderado');
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-sm sm:max-w-md overflow-hidden p-5 flex flex-col gap-3.5 animate-scale-up text-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg shadow-xs">
                            <i className="fa-solid fa-burst"></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 leading-tight">
                                Reportar Hueco / Bache en Vía
                            </h3>
                            <p className="text-2xs font-semibold text-slate-500">
                                Alerta para ciclistas, motos y vehículos
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center border-none cursor-pointer transition-colors"
                        title="Cerrar"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>

                {/* 1. Photo Capture / Upload */}
                <div>
                    <label className="text-2xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                        1. Evidencia Fotográfica
                    </label>

                    {photo ? (
                        <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
                            <img src={photo} alt="Evidencia de bache" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-800 text-2xs font-bold border-none cursor-pointer shadow-sm hover:bg-white"
                                >
                                    <i className="fa-solid fa-camera mr-1"></i> Cambiar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPhoto(null)}
                                    className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-2xs font-bold border-none cursor-pointer shadow-sm hover:bg-rose-700"
                                >
                                    <i className="fa-solid fa-trash mr-1"></i> Quitar
                                </button>
                            </div>
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-emerald-600/90 text-white text-3xs font-bold backdrop-blur-xs flex items-center gap-1">
                                <i className="fa-solid fa-circle-check"></i> Foto lista
                            </span>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isCompressing}
                            className="w-full h-24 rounded-2xl border-2 border-dashed border-orange-300 hover:border-orange-500 bg-orange-50/50 hover:bg-orange-50 flex flex-col items-center justify-center gap-1.5 text-orange-700 cursor-pointer transition-all active:scale-98"
                        >
                            {isCompressing ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin text-xl"></i>
                                    <span className="text-2xs font-bold">Comprimiendo fotografía...</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                        <i className="fa-solid fa-camera text-sm"></i>
                                    </div>
                                    <span className="text-xs font-black">Tomar o Subir Foto del Hueco</span>
                                    <span className="text-3xs text-orange-500 font-medium">Ayuda a medir su tamaño y profundidad</span>
                                </>
                            )}
                        </button>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="hidden"
                    />
                </div>

                {/* 2. Lane Selector (Izquierda, Centro, Derecha) */}
                <div>
                    <label className="text-2xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                        2. ¿En qué carril / sector de la vía está?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'izquierda', label: 'Izquierda', icon: 'fa-arrow-left', hint: 'Borde izq.' },
                            { id: 'centro', label: 'Centro', icon: 'fa-arrow-up', hint: 'Eje central' },
                            { id: 'derecha', label: 'Derecha', icon: 'fa-arrow-right', hint: 'Borde der.' }
                        ].map((item) => {
                            const isSelected = lane === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setLane(item.id)}
                                    className={`py-2.5 px-2 rounded-2xl border cursor-pointer flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                                        isSelected
                                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs ${
                                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200/80 text-slate-600'
                                    }`}>
                                        <i className={`fa-solid ${item.icon}`}></i>
                                    </div>
                                    <span className="text-2xs font-black leading-tight">{item.label}</span>
                                    <span className="text-3xs opacity-75">{item.hint}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Severity Selector */}
                <div>
                    <label className="text-2xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                        3. Peligrosidad
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setSeverity('moderado')}
                            className={`py-2 px-3 rounded-xl border text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 transition-all ${
                                severity === 'moderado'
                                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs'
                                    : 'border-slate-200 bg-slate-50/60 text-slate-500'
                            }`}
                        >
                            <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                            <span>Moderado</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSeverity('critico')}
                            className={`py-2 px-3 rounded-xl border text-xs font-extrabold cursor-pointer flex items-center justify-center gap-2 transition-all ${
                                severity === 'critico'
                                    ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs ring-2 ring-rose-500/20'
                                    : 'border-slate-200 bg-slate-50/60 text-slate-500'
                            }`}
                        >
                            <i className="fa-solid fa-radiation text-rose-600"></i>
                            <span>Crítico / Trampa</span>
                        </button>
                    </div>
                </div>

                {/* 4. Description (Optional) */}
                <div>
                    <label className="text-2xs font-semibold text-slate-500 block mb-1">
                        Detalle adicional (opcional):
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ej: Tapa de alcantarilla sin rejilla, hueco profundo..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
                        maxLength={100}
                    />
                </div>

                {/* GPS Notice */}
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 py-0.5">
                    <i className="fa-solid fa-location-crosshairs text-emerald-600"></i>
                    <span>Se fijará en tu ubicación GPS actual de la ruta</span>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs shadow-md border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
                    >
                        <i className="fa-solid fa-check"></i>
                        <span>Publicar Reporte de Hueco</span>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-600 font-bold text-xs border-none cursor-pointer transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
