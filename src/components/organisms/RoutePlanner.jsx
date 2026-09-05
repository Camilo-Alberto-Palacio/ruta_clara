import React, { useState } from 'react';
import FormField from '../molecules/FormField';
import Button from '../atoms/Button';
import Switch from '../atoms/Switch';
import ToggleGroup from '../molecules/ToggleGroup';
import QuickDestinationChips from '../molecules/QuickDestinationChips';
import { localitiesMap } from '../../data/bikeSegments';

export default function RoutePlanner({
    originInput,
    onOriginInputChange,
    destInput,
    onDestInputChange,
    selectingLocationMode,
    onSelectLocationModeChange,
    onCalculateRoute,
    onClearRoute,
    hasRoute,
    isLoading,
    onSelectOriginLocation,
    onSelectDestLocation,
    mapLayers = { localities: true, cais: true, construction: true, accidents: true, robberies: true, caravans: true },
    onMapLayersChange,
    showBrandLogo = false,
    localidad,
    onLocalidadChange,
    viewMode,
    onViewModeChange,
    departureHour = null,
    onDepartureHourChange,
    weatherData = null
}) {
    const handleToggle = (key, val) => {
        if (onMapLayersChange) {
            onMapLayersChange(prev => ({
                ...prev,
                [key]: val
            }));
        }
    };

    const [layersOpen, setLayersOpen] = useState(false);

    return (
        <div className="route-planner-card">
            {showBrandLogo && (
                <div className="flex flex-col gap-3.5 mb-3.5 animate-fade-in border-b border-slate-200/50 pb-3.5">
                    <div className="flex items-center gap-2">
                        <img src={`${import.meta.env.BASE_URL}Logo.svg`} alt="Ruta Clara Logo" className="w-8 h-8" />
                        <h1 className="font-extrabold text-lg text-emerald-700">Ruta Clara</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="locality-select-wrapper">
                            <i className="fa-solid fa-map-location-dot select-icon"></i>
                            <select 
                                value={localidad} 
                                onChange={(e) => onLocalidadChange(e.target.value)}
                                className="minimal-select"
                                aria-label="Selección de Localidad"
                            >
                                {Object.keys(localitiesMap).map(key => (
                                    <option key={key} value={key}>
                                        {localitiesMap[key].name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <ToggleGroup
                            options={[
                                { value: 'citizen', label: 'Ciudadano' },
                                { value: 'tech', label: 'Científico' }
                            ]}
                            activeValue={viewMode}
                            onChange={onViewModeChange}
                            ariaLabel="Modo de Vista"
                        />
                    </div>
                </div>
            )}
            
            <FormField
                value={originInput}
                onChange={onOriginInputChange}
                placeholder="Origen: clic mapa o buscar..."
                iconClass="fa-solid fa-circle-play text-green"
                onSelectOnMap={() => onSelectLocationModeChange('origin')}
                isSelecting={selectingLocationMode === 'origin'}
                title="Fijar origen en el mapa"
                onSelectLocation={onSelectOriginLocation}
                showGpsButton={true}
            />
            
            <FormField
                value={destInput}
                onChange={onDestInputChange}
                placeholder="Destino: clic mapa o buscar..."
                iconClass="fa-solid fa-location-dot text-red"
                onSelectOnMap={() => onSelectLocationModeChange('destination')}
                isSelecting={selectingLocationMode === 'destination'}
                title="Fijar destino en el mapa"
                onSelectLocation={onSelectDestLocation}
                showGpsButton={false}
            />

            {/* Quick Destination Chips (Heurística 6) */}
            <QuickDestinationChips 
                onSelectDestination={(item) => {
                    onSelectDestLocation(item.coords, item.name);
                    if (onCalculateRoute) {
                        onCalculateRoute(null, item.coords, item.name);
                    }
                }}
                activeDestName={destInput}
            />

            {/* Time of Day & Weather Context (CU-01) */}
            <div style={{
                background: 'rgba(241, 245, 249, 0.65)',
                borderRadius: '0.75rem',
                padding: '0.55rem 0.65rem',
                margin: '0.6rem 0 0.75rem 0',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <i className="fa-regular fa-clock" style={{ color: 'var(--accent-color)' }}></i> Hora de Salida:
                    </label>
                    <select
                        value={departureHour === null ? '' : String(departureHour)}
                        onChange={(e) => onDepartureHourChange && onDepartureHourChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                        style={{
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '0.45rem',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#1e293b',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">Ahora (En vivo)</option>
                        <option value="6">06:00 AM (Mañana)</option>
                        <option value="12">12:00 PM (Mediodía)</option>
                        <option value="18">18:00 PM (Hora Pico)</option>
                        <option value="21">21:00 PM (Nocturno)</option>
                    </select>
                </div>

                {weatherData && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.68rem',
                        color: 'var(--text-secondary)',
                        background: '#ffffff',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.4rem',
                        border: '1px solid #e2e8f0'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{weatherData.icon}</span>
                            <strong style={{ color: '#0f172a' }}>{weatherData.temperature}°C</strong>
                            <span>{weatherData.description}</span>
                        </span>
                        {weatherData.isRainy && (
                            <span style={{
                                color: '#b91c1c',
                                fontWeight: '700',
                                background: '#fee2e2',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.62rem'
                            }}>
                                🌧️ +1.4 Riesgo Lluvia
                            </span>
                        )}
                    </div>
                )}
            </div>
            
            <div className="route-buttons-row">
                <Button
                    variant="primary"
                    onClick={onCalculateRoute}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin margin-right-xs"></i> Procesando...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-compass"></i> Calcular Ruta
                        </>
                    )}
                </Button>
                {hasRoute && (
                    <Button
                        variant="secondary"
                        onClick={onClearRoute}
                        id="btn-clear-route"
                    >
                        <i className="fa-solid fa-trash-can"></i> Limpiar
                    </Button>
                )}
            </div>

            {/* Map Layer Selector Controls — collapsed accordion */}
            <div className="map-layers-section" style={{ marginTop: '0.85rem', borderTop: '1px solid var(--border-surface)', paddingTop: '0.65rem' }}>
                <button
                    onClick={() => setLayersOpen(o => !o)}
                    style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.1rem 0',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        letterSpacing: '0.03em'
                    }}
                    aria-expanded={layersOpen}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa-solid fa-layer-group" style={{ color: 'var(--accent-color)' }}></i>
                        Capas del Mapa
                    </span>
                    <i className={`fa-solid fa-chevron-${layersOpen ? 'up' : 'down'}`} style={{ fontSize: '0.65rem' }}></i>
                </button>
                {layersOpen && (
                    <div className="layer-switches-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.6rem' }}>
                        <div className="layer-switch-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-map text-muted" style={{ marginRight: '0.4rem', width: '12px' }}></i> Límites de Localidades
                            </span>
                            <Switch id="layer-switch-localities" checked={mapLayers.localities} onChange={(val) => handleToggle('localities', val)} />
                        </div>
                        <div className="layer-switch-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-shield-halved" style={{ marginRight: '0.4rem', width: '12px', color: '#38bdf8' }}></i> CAIs de Policía
                            </span>
                            <Switch id="layer-switch-cais" checked={mapLayers.cais} onChange={(val) => handleToggle('cais', val)} />
                        </div>
                        <div className="layer-switch-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-person-digging" style={{ marginRight: '0.4rem', width: '12px', color: '#f97316' }}></i> Zonas de Obra (IDU)
                            </span>
                            <Switch id="layer-switch-construction" checked={mapLayers.construction} onChange={(val) => handleToggle('construction', val)} />
                        </div>
                        <div className="layer-switch-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-car-burst" style={{ marginRight: '0.4rem', width: '12px', color: '#eab308' }}></i> Accidentes Recientes
                            </span>
                            <Switch id="layer-switch-accidents" checked={mapLayers.accidents} onChange={(val) => handleToggle('accidents', val)} />
                        </div>
                        <div className="layer-switch-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-mask" style={{ marginRight: '0.4rem', width: '12px', color: '#ef4444' }}></i> Robos Últimas 24h
                            </span>
                            <Switch id="layer-switch-robberies" checked={mapLayers.robberies} onChange={(val) => handleToggle('robberies', val)} />
                        </div>
                        <div className="layer-switch-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-car" style={{ marginRight: '0.4rem', width: '12px', color: '#f97316' }}></i> Trancones en Tiempo Real
                            </span>
                            <Switch id="layer-switch-traffic-jams" checked={mapLayers.trafficJams} onChange={(val) => handleToggle('trafficJams', val)} />
                        </div>
                        <div className="layer-switch-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-people-group" style={{ marginRight: '0.4rem', width: '12px', color: 'var(--accent-color)' }}></i> Reportes Ciudadanos
                            </span>
                            <Switch id="layer-switch-citizen-reports" checked={mapLayers.citizenReports} onChange={(val) => handleToggle('citizenReports', val)} />
                        </div>
                        <div className="layer-switch-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                <i className="fa-solid fa-bicycle" style={{ marginRight: '0.4rem', width: '12px', color: '#10b981' }}></i> Bici-Caravanas (Pelotones)
                            </span>
                            <Switch id="layer-switch-caravans" checked={mapLayers.caravans} onChange={(val) => handleToggle('caravans', val)} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
