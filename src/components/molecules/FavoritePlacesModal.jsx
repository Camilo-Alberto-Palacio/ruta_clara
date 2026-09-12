import React, { useState } from 'react';
import { PLACE_CATEGORIES } from '../../data/bogotaDestinations';
import { favoritePlacesService } from '../../services/favoritePlacesService';

export default function FavoritePlacesModal({
    isOpen,
    onClose,
    currentUser,
    userLocation,
    onSelectPlaceAndNavigate,
    onSelectLocationOnMap,
    showToast = () => {}
}) {
    const [favorites, setFavorites] = useState(() => 
        favoritePlacesService.getLocalFavorites(currentUser?.uid)
    );
    const [isAdding, setIsAdding] = useState(false);
    const [editingPlace, setEditingPlace] = useState(null);

    // Form state
    const [category, setCategory] = useState('home');
    const [label, setLabel] = useState('');
    const [address, setAddress] = useState('');
    const [coords, setCoords] = useState(null);
    const [isDefaultMorning, setIsDefaultMorning] = useState(false);
    const [isDefaultEvening, setIsDefaultEvening] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Cargar favoritos al abrir o cambiar usuario
    React.useEffect(() => {
        if (!isOpen) return;
        const unsub = favoritePlacesService.subscribeFavorites(currentUser?.uid, (list) => {
            setFavorites(list || []);
        });
        return () => unsub();
    }, [isOpen, currentUser?.uid]);

    if (!isOpen) return null;

    const resetForm = () => {
        setCategory('home');
        setLabel('');
        setAddress('');
        setCoords(null);
        setIsDefaultMorning(false);
        setIsDefaultEvening(false);
        setIsAdding(false);
        setEditingPlace(null);
    };

    const handleStartAdd = (prefillCategory = 'home') => {
        resetForm();
        setCategory(prefillCategory);
        setLabel(PLACE_CATEGORIES[prefillCategory]?.label || '');
        if (prefillCategory === 'home') {
            setIsDefaultEvening(true);
        } else if (prefillCategory === 'work' || prefillCategory === 'study') {
            setIsDefaultMorning(true);
        }
        setIsAdding(true);
    };

    const handleStartEdit = (place) => {
        setEditingPlace(place);
        setCategory(place.category || 'custom');
        setLabel(place.label || '');
        setAddress(place.address || '');
        setCoords(place.coords || null);
        setIsDefaultMorning(Boolean(place.isDefaultMorning));
        setIsDefaultEvening(Boolean(place.isDefaultEvening));
        setIsAdding(true);
    };

    const handleUseCurrentLocation = () => {
        if (!userLocation) {
            showToast("📍 Esperando señal GPS actual...", "info");
            return;
        }
        setCoords({ lat: userLocation.lat, lng: userLocation.lng });
        if (!address) {
            setAddress(`Coordenadas actuales (${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)})`);
        }
        showToast("📍 Ubicación GPS actual fijada", "success");
    };

    const handleSelectOnMapClick = () => {
        if (onSelectLocationOnMap) {
            onSelectLocationOnMap((selectedCoords, selectedAddress) => {
                setCoords(selectedCoords);
                setAddress(selectedAddress || `Punto en el mapa (${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)})`);
                showToast("🗺️ Ubicación del mapa seleccionada", "success");
            });
        }
    };

    const handleSavePlace = async (e) => {
        e.preventDefault();
        if (!label.trim()) {
            showToast("⚠️ Ingresa un nombre para este sitio", "info");
            return;
        }
        if (!coords || !coords.lat || !coords.lng) {
            showToast("⚠️ Fija la ubicación con GPS o en el mapa", "info");
            return;
        }

        setIsSaving(true);
        try {
            const placeData = {
                id: editingPlace ? editingPlace.id : undefined,
                category,
                label: label.trim(),
                address: address.trim() || 'Ubicación seleccionada',
                coords,
                isDefaultMorning,
                isDefaultEvening,
                visitCount: editingPlace ? editingPlace.visitCount : 0
            };

            await favoritePlacesService.saveFavorite(currentUser?.uid, placeData);
            showToast(`⭐ ¡Lugar "${placeData.label}" guardado!`, "success");
            resetForm();
        } catch (err) {
            console.error(err);
            showToast("Error guardando el lugar favorito", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePlace = async (placeId, placeName) => {
        if (!window.confirm(`¿Deseas eliminar "${placeName}" de tus lugares frecuentes?`)) return;
        try {
            await favoritePlacesService.deleteFavorite(currentUser?.uid, placeId);
            showToast(`🗑️ "${placeName}" eliminado`, "info");
            if (editingPlace?.id === placeId) resetForm();
        } catch (err) {
            console.error(err);
            showToast("Error eliminando lugar", "error");
        }
    };

    const handleNavigate = (place) => {
        if (onSelectPlaceAndNavigate) {
            favoritePlacesService.recordPlaceVisit(currentUser?.uid, place.id);
            onSelectPlaceAndNavigate(place);
            if (onClose) onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[2100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-lg w-full max-h-[90vh] flex flex-col relative overflow-hidden animate-scale-up text-slate-800"
                style={{ boxShadow: '0 25px 60px rgba(0, 0, 0, 0.2)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shadow-xs">
                            <i className="fa-solid fa-star text-amber-500"></i>
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Mis Lugares Importantes</h2>
                            <p className="text-xs text-slate-500 font-medium">
                                {currentUser ? `Guardados en la cuenta de ${currentUser.displayName?.split(' ')[0]}` : 'Guardados localmente en tu dispositivo'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center border-none cursor-pointer transition-colors"
                        title="Cerrar"
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                    {/* Formulario Agregar / Editar */}
                    {isAdding ? (
                        <form onSubmit={handleSavePlace} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <i className="fa-solid fa-pen-to-square"></i>
                                    {editingPlace ? 'Editar Lugar' : 'Nuevo Lugar Importante'}
                                </span>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer border-none bg-transparent"
                                >
                                    Cancelar
                                </button>
                            </div>

                            {/* Selector de Categoría en Carrusel */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase">
                                    Categoría de Sitio:
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                                    {Object.values(PLACE_CATEGORIES).map(cat => {
                                        const isSel = category === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => {
                                                    setCategory(cat.id);
                                                    if (!label || Object.values(PLACE_CATEGORIES).some(c => c.label === label)) {
                                                        setLabel(cat.label);
                                                    }
                                                }}
                                                className={`flex items-center gap-1.5 p-2 rounded-xl text-left text-xs font-bold border transition-all cursor-pointer ${
                                                    isSel
                                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm scale-[1.02]'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                                                }`}
                                            >
                                                <span className="text-sm">{cat.emoji}</span>
                                                <span className="truncate text-[11px]">{cat.label.split('/')[0]}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Nombre Personalizado */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                                    Nombre o Apodo del Sitio:
                                </label>
                                <input 
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="Ej: Mi Oficina Salitre, Casa de Mamá, SmartFit Cl 80"
                                    className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                                    required
                                />
                            </div>

                            {/* Dirección y Coordenadas */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase">
                                    Ubicación Geográfica:
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={handleUseCurrentLocation}
                                        className="flex-1 py-2 px-2.5 bg-white hover:bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                                    >
                                        <i className="fa-solid fa-location-crosshairs text-emerald-600"></i>
                                        <span>Usar mi GPS actual</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSelectOnMapClick}
                                        className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                                    >
                                        <i className="fa-solid fa-map-pin text-rose-500"></i>
                                        <span>Elegir en mapa</span>
                                    </button>
                                </div>
                                <input 
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Referencia de dirección (ej: Carrera 7 con Calle 72)"
                                    className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-emerald-500 shadow-xs"
                                />
                                {coords && (
                                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                        <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                        <span>Coordenadas fijadas: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Opciones de Sugerencia Automática */}
                            <div className="pt-1 border-t border-slate-200/60 space-y-1.5">
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    Sugerencias Inteligentes (Smart Commute):
                                </span>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={isDefaultMorning}
                                        onChange={(e) => setIsDefaultMorning(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                    />
                                    <span>🌅 Sugerir por la mañana (Destino de trabajo / estudio habitual)</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={isDefaultEvening}
                                        onChange={(e) => setIsDefaultEvening(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                    />
                                    <span>🌆 Sugerir por la tarde / noche (Regreso habitual a casa)</span>
                                </label>
                            </div>

                            {/* Botón Guardar */}
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm border-none cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            >
                                <i className="fa-solid fa-floppy-disk"></i>
                                <span>{isSaving ? 'Guardando...' : (editingPlace ? 'Actualizar Lugar' : 'Guardar en Mis Lugares')}</span>
                            </button>
                        </form>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {favorites.length} {favorites.length === 1 ? 'lugar guardado' : 'lugares guardados'}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleStartAdd('home')}
                                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs border-none cursor-pointer transition-all active:scale-95"
                            >
                                <i className="fa-solid fa-plus text-xs"></i>
                                <span>Agregar Sitio</span>
                            </button>
                        </div>
                    )}

                    {/* Lista de Favoritos */}
                    {!isAdding && favorites.length === 0 && (
                        <div className="py-8 px-4 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mb-3 shadow-2xs">
                                🚲
                            </div>
                            <h3 className="text-sm font-bold text-slate-800 mb-1">Aún no tienes lugares guardados</h3>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                                Guarda tus destinos frecuentes para que Ruta Clara te sugiera la ruta más segura automáticamente con 1 solo toque.
                            </p>
                            
                            {/* Plantillas Rápidas 1-Toque */}
                            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                                <button
                                    type="button"
                                    onClick={() => handleStartAdd('home')}
                                    className="p-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all"
                                >
                                    <span>🏠</span>
                                    <span>Guardar Casa</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStartAdd('work')}
                                    className="p-2.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-xl border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all"
                                >
                                    <span>💼</span>
                                    <span>Guardar Trabajo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStartAdd('study')}
                                    className="p-2.5 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-xl border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all"
                                >
                                    <span>🎓</span>
                                    <span>Universidad</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleStartAdd('gym')}
                                    className="p-2.5 bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-800 rounded-xl border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-all"
                                >
                                    <span>🏋️</span>
                                    <span>Gimnasio</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {!isAdding && favorites.length > 0 && (
                        <div className="space-y-2.5">
                            {favorites.map(place => {
                                const catMeta = PLACE_CATEGORIES[place.category] || PLACE_CATEGORIES.custom;
                                return (
                                    <div 
                                        key={place.id}
                                        className="p-3.5 bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-300 shadow-2xs hover:shadow-sm transition-all flex items-center justify-between gap-3 group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg flex-shrink-0 shadow-2xs border border-emerald-100">
                                                {catMeta.emoji}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-900 truncate">
                                                        {place.label}
                                                    </span>
                                                    {place.isDefaultMorning && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                                            🌅 Mañana
                                                        </span>
                                                    )}
                                                    {place.isDefaultEvening && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            🌆 Tarde
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                                    {place.address || catMeta.label}
                                                </p>
                                                {place.visitCount > 0 && (
                                                    <span className="text-[10px] text-slate-400 font-semibold">
                                                        {place.visitCount} {place.visitCount === 1 ? 'viaje realizado' : 'viajes realizados'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {/* Botón Ir / Pedalear Aquí */}
                                            <button
                                                type="button"
                                                onClick={() => handleNavigate(place)}
                                                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 border border-emerald-200 hover:border-emerald-600 transition-all cursor-pointer active:scale-95 shadow-2xs"
                                                title={`Pedalear hacia ${place.label}`}
                                            >
                                                <i className="fa-solid fa-diamond-turn-right text-xs"></i>
                                                <span className="hidden sm:inline">Ir</span>
                                            </button>

                                            {/* Editar */}
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(place)}
                                                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center border-none cursor-pointer transition-colors"
                                                title="Editar lugar"
                                            >
                                                <i className="fa-solid fa-pen text-xs"></i>
                                            </button>

                                            {/* Eliminar */}
                                            <button
                                                type="button"
                                                onClick={() => handleDeletePlace(place.id, place.label)}
                                                className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center border-none cursor-pointer transition-colors"
                                                title="Eliminar lugar"
                                            >
                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Informativo */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-shield-halved text-emerald-600"></i>
                        <span>Privacidad: tus sitios son personales y cifrados</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="font-bold text-slate-700 hover:text-emerald-700 cursor-pointer bg-transparent border-none"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
}
