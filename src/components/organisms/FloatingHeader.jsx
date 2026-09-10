import React from 'react';
import ToggleGroup from '../molecules/ToggleGroup';
import { localitiesMap } from '../../data/bikeSegments';

export default function FloatingHeader({
    localidad,
    onLocalidadChange,
    viewMode,
    onViewModeChange,
    hideLogo = false,
    currentUser = null,
    onOpenAuthModal = () => {}
}) {
    const viewModeOpts = [
        { value: 'citizen', label: 'Ciudadano' },
        { value: 'tech', label: 'Científico' }
    ];

    return (
        <header className="app-header floating-header-card">
            {!hideLogo && (
                <div className="header-logo animate-fade-in">
                    <div className="logo-icon" style={{ background: 'transparent', boxShadow: 'none', borderRadius: '0', animation: 'none' }}>
                        <img src={`${import.meta.env.BASE_URL}Logo.svg`} alt="Ruta Clara Logo" style={{ width: '32px', height: '32px' }} />
                    </div>
                    <div className="logo-text">
                        <h1>Ruta <span>Clara</span></h1>
                    </div>
                </div>
            )}
            
            <div className="header-controls">
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
                    options={viewModeOpts}
                    activeValue={viewMode}
                    onChange={onViewModeChange}
                    ariaLabel="Modo de Vista"
                />

                {/* Botón / Avatar de Cuenta y Google Sign-In */}
                <button
                    onClick={onOpenAuthModal}
                    className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all cursor-pointer text-slate-700 active:scale-95 ml-1"
                    title={currentUser ? `Perfil: ${currentUser.displayName}` : "Iniciar sesión con Google"}
                    aria-label="Perfil y cuenta de usuario"
                >
                    {currentUser ? (
                        <>
                            {currentUser.photoURL ? (
                                <img 
                                    src={currentUser.photoURL} 
                                    alt={currentUser.displayName} 
                                    className="w-7 h-7 rounded-full object-cover border border-emerald-500 shadow-2xs"
                                />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                                    {(currentUser.displayName || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="hidden md:inline text-xs font-bold text-slate-800 max-w-[85px] truncate">
                                {currentUser.displayName.split(' ')[0]}
                            </span>
                        </>
                    ) : (
                        <>
                            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                                <i className="fa-brands fa-google text-xs"></i>
                            </div>
                            <span className="hidden sm:inline text-xs font-bold text-emerald-700 pr-1">
                                Ingresar
                            </span>
                        </>
                    )}
                </button>
            </div>
        </header>
    );
}
