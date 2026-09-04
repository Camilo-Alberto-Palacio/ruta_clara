import React, { useState, useMemo } from 'react';
import { calculatePriorityInterventionIndex } from '../../utils/priorityIndexService';
import { robberyReports } from '../../data/robberyReports';
import { constructionZones } from '../../data/constructionZones';
import { localitiesMap } from '../../data/bikeSegments';

export default function PriorityHeatmapPanel({
    isOpen,
    onClose,
    segments = {},
    citizenReports = [],
    localidad = 'all',
    onZoomToSegment
}) {
    const [selectedLocality, setSelectedLocality] = useState(localidad);

    const { topCritical, allRanked } = useMemo(() => {
        if (!isOpen) {
            return { topCritical: [], allRanked: [] };
        }
        return calculatePriorityInterventionIndex(
            segments,
            citizenReports,
            constructionZones,
            robberyReports,
            selectedLocality
        );
    }, [isOpen, segments, citizenReports, selectedLocality]);

    if (!isOpen) return null;

    const handleDownloadFicha = () => {
        const dateStr = new Date().toLocaleDateString('es-CO');
        const locName = localitiesMap[selectedLocality]?.fullName || 'DISTRITO CAPITAL (BOGOTÁ)';

        let content = `# FICHA TÉCNICA DE PRIORIZACIÓN DE INTERVENCIÓN (IPI)
**Entidad Receptora:** UAESP / IDU / Secretaría Distrital de Seguridad
**Semillero:** Construcción de software para la transformación del territorio
**Territorio:** ${locName}
**Fecha:** ${dateStr}

---

## 1. TOP 5 TRAMOS CON MÁXIMA PRIORIDAD DE INTERVENCIÓN PÚBLICA
`;

        topCritical.forEach((seg, idx) => {
            const firstCoord = seg.coordinates && seg.coordinates[0] ? `${seg.coordinates[0][0].toFixed(5)}, ${seg.coordinates[0][1].toFixed(5)}` : 'N/A';
            content += `
### ${idx + 1}. ${seg.name} (IPI: ${seg.ipiScore}/10)
- **Localidad / UPZ:** ${seg.localidad} - ${seg.upz}
- **Coordenadas de Referencia:** ${firstCoord}
- **Urgencia:** ${seg.urgency}
- **Entidad Responsable Asignada:** ${seg.entity}
- **Diagnóstico:** Iluminación ${seg.lightingType} (${seg.watts}W) | Hurtos reportados en sector: ${seg.nearbyRobberies}
- **Acción Técnica Recomendada:** ${seg.action}
`;
        });

        content += `
---
*Generado mediante el Algoritmo IPI de Ruta Clara Bogotá.*
`;

        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ficha_Priorizacion_IPI_${selectedLocality}_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-500/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
                {/* Cabecera */}
                <div className="p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            🏛️
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight">
                                Priorización de Inversión Pública (UAESP / IDU)
                            </h2>
                            <p className="text-2xs font-semibold text-amber-100">
                                Índice IPI para direccionamiento de recursos y cuadrillas de mantenimiento
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
                    {/* Filtro por localidad */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Filtrar Territorio:
                        </span>
                        <select
                            value={selectedLocality}
                            onChange={(e) => setSelectedLocality(e.target.value)}
                            className="minimal-select text-xs font-bold"
                        >
                            <option value="all">Todas las Localidades</option>
                            {Object.keys(localitiesMap).map(k => (
                                <option key={k} value={k}>{localitiesMap[k].name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Resumen ejecutivo de entidades */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                            <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-300">UAESP (Alumbrado)</span>
                            <span className="text-lg font-black text-amber-600 block mt-0.5">
                                {allRanked.filter(s => s.entity.includes('UAESP')).length} tramos
                            </span>
                            <span className="text-3xs text-slate-500">Requieren LED 200W</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
                            <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300">IDU (Malla Vial)</span>
                            <span className="text-lg font-black text-blue-600 block mt-0.5">
                                {allRanked.filter(s => s.entity.includes('IDU')).length} tramos
                            </span>
                            <span className="text-3xs text-slate-500">Repavimentación</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                            <span className="text-[10px] font-extrabold uppercase text-rose-700 dark:text-rose-300">Policía / C4</span>
                            <span className="text-lg font-black text-rose-600 block mt-0.5">
                                {allRanked.filter(s => s.entity.includes('Policía')).length} tramos
                            </span>
                            <span className="text-3xs text-slate-500">Vigilancia prioritaria</span>
                        </div>
                    </div>

                    {/* TOP 5 TRAMOS CRÍTICOS */}
                    <div>
                        <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                            Top 5 Tramos Más Urgentes por Intervenir (IPI Máximo)
                        </span>

                        <div className="flex flex-col gap-2.5">
                            {topCritical.map((seg, idx) => (
                                <div 
                                    key={seg.id}
                                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col gap-2 hover:border-amber-400 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-black text-slate-900 dark:text-white m-0">
                                                    {seg.name}
                                                </h4>
                                                <span className="text-3xs text-slate-500">
                                                    {seg.localidad} • {seg.upz}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                                                IPI: {seg.ipiScore}
                                            </span>
                                            <span className="block text-3xs text-slate-400 mt-0.5">{seg.urgency}</span>
                                        </div>
                                    </div>

                                    {/* Diagnóstico y acción */}
                                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 text-2xs flex flex-col gap-1">
                                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                            <span><strong>Entidad Destino:</strong> {seg.entity}</span>
                                            <span>💡 {seg.lightingType} ({seg.watts}W)</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 m-0 font-medium">
                                            🎯 <strong>Intervención Recomendada:</strong> {seg.action}
                                        </p>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => {
                                                if (onZoomToSegment && seg.coordinates && seg.coordinates[0]) {
                                                    onZoomToSegment(seg.coordinates[0]);
                                                    onClose();
                                                }
                                            }}
                                            className="text-2xs font-bold text-amber-600 hover:text-amber-700 bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"
                                        >
                                            <i className="fa-solid fa-map-location-dot"></i> Centrar en Mapa
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Botón Descargar Ficha Técnica */}
                    <button
                        onClick={handleDownloadFicha}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 flex items-center justify-center gap-2 border-none cursor-pointer shadow-md"
                    >
                        <i className="fa-solid fa-file-invoice"></i>
                        <span>Descargar Ficha Técnica Oficial de Intervención (.MD)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
