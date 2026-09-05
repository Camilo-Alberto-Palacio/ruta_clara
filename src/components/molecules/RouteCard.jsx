import React from 'react';

export default function RouteCard({
    route,
    isActive,
    onClick
}) {
    let riskClass = 'risk-low';
    let riskText = 'Bajo';
    
    const scoreNum = parseFloat(route.avgRiskScore);
    if (scoreNum >= 7.0) {
        riskClass = 'risk-high';
        riskText = 'Alto';
    } else if (scoreNum >= 3.8) {
        riskClass = 'risk-mid';
        riskText = 'Medio';
    }

    const hasTrafficDelay = route.totalDelayMinutes && route.totalDelayMinutes > 0;

    return (
        <div 
            className={`route-card ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            <div className="route-card-header">
                <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="route-card-title">{route.name}</span>
                    {route.profileTag && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                            {route.profileTag}
                        </span>
                    )}
                </div>
                <span className="route-card-meta">
                    {route.distanceKm} km • {hasTrafficDelay ? (
                        <>
                            <span className="duration-original">{route.durationMin} min</span>
                            {' '}
                            <span className="duration-with-traffic">{route.durationWithTraffic} min</span>
                        </>
                    ) : (
                        <>{route.durationMin} min</>
                    )}
                </span>
            </div>
            {route.elevationProfile && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold my-1">
                    <span>⛰️ Desnivel: +{route.elevationProfile.gainMeters}m</span>
                    <span>Pendiente: {route.elevationProfile.avgSlopePercent}%</span>
                </div>
            )}
            <div className="route-card-risk">
                <span className="route-card-meta">Riesgo Promedio:</span>
                <span className={riskClass}>{route.avgRiskScore} ({riskText})</span>
            </div>
            {route.cost && (
                <div className="route-card-cost" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', fontSize: '0.72rem' }}>
                    <span className="route-card-meta">Costo Enrutamiento:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{route.cost}</span>
                </div>
            )}
            {hasTrafficDelay && (
                <div className="route-card-delay">
                    <span className="delay-badge">
                        <i className="fa-solid fa-car"></i> +{route.totalDelayMinutes} min por trancones
                    </span>
                </div>
            )}
        </div>
    );
}

