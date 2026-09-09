import React, { useState, useEffect } from 'react';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import { emitToast } from '../../utils/toastService';

// Ubicaciones comunes predefinidas para fallback y acceso rápido
const PRESETS = [
    { name: 'Portal Usme', address: 'Av. Caracas con Calle 65 Sur', lat: 4.5317, lng: -74.1166, category: 'bus' },
    { name: 'Estación Molinos', address: 'Av. Caracas con Calle 51 Sur', lat: 4.5631, lng: -74.1128, category: 'bus' },
    { name: 'Parque Metropolitano El Tunal', address: 'Calle 48B Sur con Cra 24', lat: 4.5761, lng: -74.1332, category: 'park' },
    { name: 'Centro Mayor Centro Comercial', address: 'Calle 38A Sur # 34D-51 • Villa Mayor', lat: 4.5930, lng: -74.1245, category: 'mall' },
    { name: 'Alkosto - Venecia', address: 'Autopista Sur # 64-10 • Venecia, Tunjuelito', lat: 4.5960, lng: -74.1378, category: 'store' },
    { name: 'Centro Comercial Altavista', address: 'Cra 13 # 65C-58 Sur • Usme', lat: 4.5292, lng: -74.1132, category: 'mall' },
    { name: 'Alcaldía Local de Usme', address: 'Calle 137 Sur # 3A-44', lat: 4.4719, lng: -74.1205, category: 'civic' },
    { name: 'Estación Consuelo', address: 'Av. Caracas con Calle 50A Sur', lat: 4.5482, lng: -74.1154, category: 'bus' },
    { name: 'Estación Socorro', address: 'Av. Caracas con Calle 48C Sur', lat: 4.5552, lng: -74.1141, category: 'bus' },
    { name: 'Parque Entre Nubes', address: 'Vía al Llano • Usme / San Cristóbal', lat: 4.5539, lng: -74.0934, category: 'park' },
    { name: 'UPZ Quiroga', address: 'Calle 36 Sur con Cra 23', lat: 4.5815, lng: -74.1118, category: 'civic' }
];

// Helper to compute local distance in meters
function calcMeters(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const cosLat = Math.cos((lat1 * Math.PI) / 180);
    const dX = (lng2 - lng1) * 111000 * cosLat;
    const dY = (lat2 - lat1) * 111000;
    return Math.round(Math.sqrt(dX * dX + dY * dY));
}

function formatDist(meters) {
    if (meters === null || meters === undefined) return null;
    if (meters < 1000) return `${meters} m`;
    return `${(meters / 1000).toFixed(1)} km`;
}

function getCategoryIcon(cat, name = '') {
    const n = name.toLowerCase();
    if (cat === 'bus' || n.includes('portal') || n.includes('estación') || n.includes('estacion') || n.includes('transmilenio')) {
        return { icon: 'fa-solid fa-bus', color: 'text-red-600 bg-red-50' };
    }
    if (cat === 'park' || n.includes('parque') || n.includes('humedal')) {
        return { icon: 'fa-solid fa-tree', color: 'text-emerald-600 bg-emerald-50' };
    }
    if (cat === 'store' || n.includes('alkosto') || n.includes('éxito') || n.includes('exito') || n.includes('d1') || n.includes('olímpica') || n.includes('jumbo')) {
        return { icon: 'fa-solid fa-cart-shopping', color: 'text-amber-600 bg-amber-50' };
    }
    if (cat === 'mall' || n.includes('centro comercial') || n.includes('plaza') || n.includes('mall')) {
        return { icon: 'fa-solid fa-store', color: 'text-indigo-600 bg-indigo-50' };
    }
    if (cat === 'civic' || n.includes('alcaldía') || n.includes('cai') || n.includes('policía')) {
        return { icon: 'fa-solid fa-building-columns', color: 'text-sky-600 bg-sky-50' };
    }
    if (cat === 'gps') {
        return { icon: 'fa-solid fa-location-crosshairs', color: 'text-emerald-600 bg-emerald-50' };
    }
    return { icon: 'fa-solid fa-location-dot', color: 'text-slate-500 bg-slate-100' };
}

export default function FormField({
    value,
    onChange,
    placeholder,
    iconClass = '',
    onSelectOnMap,
    isSelecting = false,
    title = '',
    onSelectLocation,
    showGpsButton = false,
    userLocation = null
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);

    useEffect(() => {
        if (!showDropdown) return;

        // Si el valor está vacío, muestra las ubicaciones recomendadas (presets) con distancia
        if (!value.trim()) {
            const list = PRESETS.map(p => {
                const dist = userLocation ? calcMeters(userLocation.lat, userLocation.lng, p.lat, p.lng) : null;
                return { ...p, type: 'preset', distanceMeters: dist };
            });
            if (userLocation) {
                list.sort((a, b) => (a.distanceMeters ?? 999999) - (b.distanceMeters ?? 999999));
            }
            setSuggestions(list);
            setLoading(false);
            return;
        }

        // Si ya contiene un formato de coordenada exacta (del mapa), no busca en la API
        const coordRegex = /^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/;
        if (coordRegex.test(value)) {
            setSuggestions([]);
            return;
        }

        // Si el valor coincide exactamente con un preset o con una ubicación GPS reciente, no busca
        if (PRESETS.some(p => p.name === value) || value.includes('(Mi ubicación)') || value.includes('Ubicación GPS')) {
            return;
        }

        setLoading(true);
        const delayDebounceFn = setTimeout(async () => {
            try {
                // Consultar Nominatim con addressdetails=1 y delimitado al área metropolitana de Bogotá
                const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)},+Bogota,+Colombia&format=json&addressdetails=1&limit=10&countrycodes=co&viewbox=-74.28,4.42,-74.00,4.82`;
                const response = await fetch(url, {
                    headers: {
                        'Accept-Language': 'es'
                    }
                });
                const data = await response.json();
                if (data && data.length > 0) {
                    const results = data.map(item => {
                        const addr = item.address || {};
                        const rawTitle = item.display_name.split(',')[0].trim();
                        
                        // Enriquecer título si es una marca comercial conocida (Alkosto, Éxito, D1, etc.)
                        const brand = rawTitle.toLowerCase();
                        let enrichedTitle = rawTitle;
                        const branchOrSub = addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter;
                        const road = addr.road;

                        if (brand.includes('alkosto') || brand.includes('éxito') || brand.includes('exito') || brand.includes('d1') || brand.includes('olímpica') || brand.includes('jumbo')) {
                            if (branchOrSub && !rawTitle.toLowerCase().includes(branchOrSub.toLowerCase())) {
                                enrichedTitle = `${rawTitle} - ${branchOrSub}`;
                            } else if (road && !rawTitle.toLowerCase().includes(road.toLowerCase())) {
                                enrichedTitle = `${rawTitle} (${road})`;
                            }
                        }

                        // Construir dirección legible y específica para que hasta un niño pueda ubicarse
                        const addressParts = [];
                        if (road) {
                            addressParts.push(addr.house_number ? `${road} #${addr.house_number}` : road);
                        }
                        if (branchOrSub) {
                            addressParts.push(branchOrSub);
                        }
                        if (addr.city_district && addr.city_district !== branchOrSub) {
                            addressParts.push(addr.city_district);
                        }
                        const cleanAddress = addressParts.length > 0 
                            ? addressParts.join(' • ') 
                            : item.display_name.split(',').slice(1, 4).join(',').trim();

                        const lat = parseFloat(item.lat);
                        const lng = parseFloat(item.lon);
                        const distMeters = userLocation ? calcMeters(userLocation.lat, userLocation.lng, lat, lng) : null;

                        // Categoría para iconos
                        let cat = 'place';
                        if (item.type === 'supermarket' || item.class === 'shop' || addr.shop) cat = 'store';
                        else if (item.type === 'mall' || item.class === 'commercial') cat = 'mall';
                        else if (item.class === 'highway' || item.type === 'bus_stop' || item.type === 'station') cat = 'bus';
                        else if (item.class === 'leisure' || item.type === 'park') cat = 'park';

                        return {
                            name: enrichedTitle,
                            address: cleanAddress,
                            fullName: item.display_name,
                            lat,
                            lng,
                            category: cat,
                            type: 'nominatim',
                            distanceMeters: distMeters
                        };
                    });

                    // Ordenar por cercanía al usuario (los más cercanos primero)
                    if (userLocation) {
                        results.sort((a, b) => (a.distanceMeters ?? 999999) - (b.distanceMeters ?? 999999));
                    }

                    setSuggestions(results);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error("Autocomplete fetch failed:", error);
                // Fallback a presets filtrados localmente
                const filteredPresets = PRESETS.filter(p => 
                    p.name.toLowerCase().includes(value.toLowerCase()) ||
                    (p.address && p.address.toLowerCase().includes(value.toLowerCase()))
                ).map(p => ({
                    ...p,
                    type: 'preset',
                    distanceMeters: userLocation ? calcMeters(userLocation.lat, userLocation.lng, p.lat, p.lng) : null
                }));
                if (userLocation) {
                    filteredPresets.sort((a, b) => (a.distanceMeters ?? 999999) - (b.distanceMeters ?? 999999));
                }
                setSuggestions(filteredPresets);
            } finally {
                setLoading(false);
            }
        }, 350); // Debounce ágil de 350ms

        return () => clearTimeout(delayDebounceFn);
    }, [value, showDropdown, userLocation]);

    const handleSelect = (s) => {
        onChange(s.name);
        if (onSelectLocation) {
            onSelectLocation({ lat: s.lat, lng: s.lng }, s.name);
        }
        setShowDropdown(false);
    };

    const handleGeolocate = () => {
        if (!navigator.geolocation) {
            emitToast("La geolocalización no es soportada por tu navegador.", "warning");
            return;
        }

        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                let displayName = `Ubicación GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
                    const res = await fetch(url, {
                        headers: {
                            'Accept-Language': 'es'
                        }
                    });
                    const data = await res.json();
                    if (data && data.display_name) {
                        displayName = data.display_name.split(',')[0] + ' (Mi ubicación)';
                    }
                } catch (error) {
                    console.error("Reverse geocoding failed:", error);
                }

                onChange(displayName);
                if (onSelectLocation) {
                    onSelectLocation({ lat: latitude, lng: longitude }, displayName);
                }
                emitToast("Ubicación GPS fijada correctamente", "success");
                setGpsLoading(false);
            },
            (error) => {
                console.error("GPS Error:", error);
                emitToast("No se pudo obtener tu ubicación. Verifica los permisos de tu navegador.", "error");
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
        );
    };

    return (
        <div className="route-input-group w-full">
            <div className="input-with-icon w-full relative flex items-center bg-slate-100/80 border border-slate-200/60 rounded-xl px-3 py-2">
                <i className={`${iconClass} flex-shrink-0 mr-2`}></i>
                <Input
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        if (onSelectLocation) {
                            // Limpia las coordenadas guardadas ya que el usuario empezó a escribir manualmente
                            onSelectLocation(null, e.target.value);
                        }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 300)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none outline-none text-slate-800 text-xs py-0.5"
                />

                {value && value.includes('ubicación') && (
                    <span className="flex-shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wider mr-1.5 select-none flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        GPS
                    </span>
                )}

                {/* Dropdown de Sugerencias Enriquecidas con Dirección, Distancia e Icono */}
                {showDropdown && (suggestions.length > 0 || loading) && (
                    <ul 
                        className="suggestions-dropdown absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100"
                        style={{ boxShadow: '0 12px 35px rgba(0, 0, 0, 0.12)' }}
                    >
                        {loading ? (
                            <li className="suggestion-info p-3.5 text-xs text-slate-500 flex items-center justify-center gap-2">
                                <i className="fa-solid fa-spinner fa-spin text-emerald-600"></i>
                                <span>Buscando ubicaciones en Bogotá...</span>
                            </li>
                        ) : (
                            suggestions.map((s, idx) => {
                                const catVisual = getCategoryIcon(s.category, s.name);
                                const distFormatted = formatDist(s.distanceMeters);
                                const isClose = s.distanceMeters !== null && s.distanceMeters < 5000;

                                return (
                                    <li
                                        key={idx}
                                        className="suggestion-item p-2.5 hover:bg-emerald-50/70 active:bg-emerald-100/70 cursor-pointer flex items-center justify-between gap-2.5 transition-colors"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSelect(s);
                                        }}
                                        onTouchStart={(e) => {
                                            e.preventDefault();
                                            handleSelect(s);
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${catVisual.color}`}>
                                                <i className={`${catVisual.icon} text-xs`}></i>
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                                                    {s.name}
                                                </span>
                                                {s.address && (
                                                    <span className="text-[11px] font-medium text-slate-500 truncate leading-tight mt-0.5">
                                                        {s.address}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {distFormatted && (
                                            <div className="flex-shrink-0 pl-1">
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                                    isClose 
                                                        ? 'bg-emerald-100 text-emerald-800' 
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    <i className="fa-solid fa-location-arrow text-[8px]"></i>
                                                    {distFormatted}
                                                </span>
                                            </div>
                                        )}
                                    </li>
                                );
                            })
                        )}
                        {!loading && suggestions.length === 0 && (
                            <li className="suggestion-info p-3 text-xs text-slate-500 text-center">
                                No se encontraron resultados exactos. Intenta con otra referencia.
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {/* Buttons rendered outside the input */}
            {showGpsButton && (
                <Button
                    variant="icon-select"
                    onClick={handleGeolocate}
                    title="Usar mi ubicación GPS"
                    disabled={gpsLoading}
                >
                    <i className={`fa-solid ${gpsLoading ? 'fa-spinner fa-spin' : 'fa-location-arrow'}`}></i>
                </Button>
            )}
            {onSelectOnMap && (
                <Button
                    variant="icon-select"
                    active={isSelecting}
                    onClick={onSelectOnMap}
                    title={title}
                >
                    <i className="fa-solid fa-location-crosshairs"></i>
                </Button>
            )}
        </div>
    );
}
