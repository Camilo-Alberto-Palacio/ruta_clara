import React from 'react';

export default function ElevationChart({ profile }) {
    if (!profile || !profile.points || profile.points.length < 2) {
        return null;
    }

    const { points, gainMeters, lossMeters, minElevation, maxElevation, avgSlopePercent, difficulty } = profile;

    // Dimensiones del SVG
    const width = 280;
    const height = 75;
    const padding = { top: 12, right: 10, bottom: 20, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxDist = points[points.length - 1].distanceM || 1000;
    const altRange = Math.max(15, maxElevation - minElevation);

    // Mapeo a coordenadas SVG
    const polyPoints = points.map(pt => {
        const x = padding.left + (pt.distanceM / maxDist) * chartW;
        const y = padding.top + chartH - ((pt.elevationM - minElevation) / altRange) * chartH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = `M ${polyPoints.join(' L ')}`;
    const areaD = `${pathD} L ${(padding.left + chartW).toFixed(1)},${(padding.top + chartH).toFixed(1)} L ${padding.left.toFixed(1)},${(padding.top + chartH).toFixed(1)} Z`;

    const getDifficultyColor = (diff) => {
        if (diff.includes('Exigente')) return '#ef4444';
        if (diff.includes('Moderado')) return '#f59e0b';
        return '#10b981';
    };

    return (
        <div className="elevation-profile-widget p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 mt-2">
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <i className="fa-solid fa-mountain text-emerald-600"></i> Altimetría & Pendiente
                </span>
                <span 
                    className="text-2xs font-extrabold px-2 py-0.5 rounded-full"
                    style={{ 
                        background: `${getDifficultyColor(difficulty)}20`,
                        color: getDifficultyColor(difficulty)
                    }}
                >
                    {difficulty}
                </span>
            </div>

            {/* SVG Mini Chart */}
            <div className="w-full flex justify-center overflow-hidden">
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                    <defs>
                        <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.03" />
                        </linearGradient>
                    </defs>

                    {/* Guías horizontales mín y máx */}
                    <line 
                        x1={padding.left} 
                        y1={padding.top} 
                        x2={padding.left + chartW} 
                        y2={padding.top} 
                        stroke="currentColor" 
                        strokeOpacity="0.12" 
                        strokeDasharray="2,2" 
                    />
                    <line 
                        x1={padding.left} 
                        y1={padding.top + chartH} 
                        x2={padding.left + chartW} 
                        y2={padding.top + chartH} 
                        stroke="currentColor" 
                        strokeOpacity="0.12" 
                    />

                    {/* Etiquetas de cota */}
                    <text x={padding.left - 4} y={padding.top + 4} fontSize="8" fill="currentColor" opacity="0.6" textAnchor="end" fontWeight="600">
                        {maxElevation}m
                    </text>
                    <text x={padding.left - 4} y={padding.top + chartH} fontSize="8" fill="currentColor" opacity="0.6" textAnchor="end" fontWeight="600">
                        {minElevation}m
                    </text>

                    {/* Área sombreada y línea */}
                    <path d={areaD} fill="url(#elevationGrad)" />
                    <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Distancia total etiqueta */}
                    <text x={padding.left + chartW} y={height - 4} fontSize="8" fill="currentColor" opacity="0.5" textAnchor="end">
                        {(maxDist / 1000).toFixed(1)} km
                    </text>
                </svg>
            </div>

            {/* Métricas resumen en badges */}
            <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-slate-200/50 text-center">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-semibold">Desnivel +</span>
                    <span className="text-xs font-black text-emerald-600">+{gainMeters} m</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-semibold">Desnivel -</span>
                    <span className="text-xs font-black text-slate-600">-{lossMeters} m</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 font-semibold">Pendiente Prom.</span>
                    <span className="text-xs font-black text-amber-600">{avgSlopePercent}%</span>
                </div>
            </div>
        </div>
    );
}
