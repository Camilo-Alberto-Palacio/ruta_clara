import React, { useState } from 'react';
import { calculateRisk } from '../../utils/riskCalculator';
import { localitiesMap } from '../../data/bikeSegments';

export default function InterventionSimulatorModal({
    isOpen,
    onClose,
    segments = {},
    localidad = 'usme',
    constructionZones = []
}) {
    if (!isOpen) return null;

    // Políticas de intervención urbanística
    const [upgradeLighting, setUpgradeLighting] = useState(true);
    const [installCai, setInstallCai] = useState(true);
    const [deployRouteGuards, setDeployRouteGuards] = useState(false);
    const [clearConstruction, setClearConstruction] = useState(false);
    const [selectedLocality, setSelectedLocality] = useState(localidad);

    // Filtrar tramos de la localidad seleccionada
    const localitySegs = Object.values(segments).filter(seg => {
        const segLoc = seg.localidad ? seg.localidad.toLowerCase() : '';
        if (selectedLocality === 'usme') return segLoc.includes('usme');
        if (selectedLocality === 'ruu') return segLoc.includes('rafael') || segLoc.includes('uribe');
        return true;
    });

    const targetSegs = localitySegs.length > 0 ? localitySegs : Object.values(segments);

    // 1. Cálculo BASELINE (sin intervenciones)
    let totalBaseScore = 0;
    let baseHighRiskCount = 0;

    targetSegs.forEach(seg => {
        const res = calculateRisk(seg, constructionZones, true, [], segments);
        const score = parseFloat(res.score);
        totalBaseScore += score;
        if (score >= 6.5) baseHighRiskCount++;
    });

    const avgBaseScore = targetSegs.length > 0 ? (totalBaseScore / targetSegs.length).toFixed(2) : '5.0';

    // 2. Cálculo SIMULADO (con intervenciones aplicadas)
    let totalSimScore = 0;
    let simHighRiskCount = 0;

    targetSegs.forEach(seg => {
        const modifiedSeg = {
            ...seg,
            lightingType: upgradeLighting ? 'LED' : seg.lightingType,
            watts: upgradeLighting ? 200 : seg.watts,
            guardianCai: installCai ? true : seg.guardianCai,
            guardianRuta: deployRouteGuards ? true : seg.guardianRuta
        };

        const res = calculateRisk(
            modifiedSeg,
            constructionZones,
            clearConstruction ? false : true,
            [],
            segments
        );
        const score = parseFloat(res.score);
        totalSimScore += score;
        if (score >= 6.5) simHighRiskCount++;
    });

    const avgSimScore = targetSegs.length > 0 ? (totalSimScore / targetSegs.length).toFixed(2) : '3.0';
    const reductionPercent = avgBaseScore > 0 
        ? (((parseFloat(avgBaseScore) - parseFloat(avgSimScore)) / parseFloat(avgBaseScore)) * 100).toFixed(1)
        : 0;

    const highRiskDelta = baseHighRiskCount - simHighRiskCount;

    // Exportar reporte Markdown para el semillero / ponencias
    const handleDownloadReport = () => {
        const locName = localitiesMap[selectedLocality]?.fullName || selectedLocality.toUpperCase();
        const dateStr = new Date().toLocaleDateString('es-CO');

        const report = `# INFORME TÉCNICO DE SIMULACIÓN CPTED - RUTA CLARA
**Proyecto:** SafeCycle Bogotá (Semillero Construcción de Software)
**Fecha de Generación:** ${dateStr}
**Territorio Analizado:** ${locName}
**Tramos Evaluados:** ${targetSegs.length} segmentos viales

---

## 1. POLÍTICAS DE INTERVENCIÓN URBANÍSTICA SIMULADAS
- Modernización a Alumbrado LED 200W: ${upgradeLighting ? 'APLICADO (100% de la red)' : 'NO APLICADO'}
- Despliegue de CAI Móviles / Cuadrantes en Puntos Ciegos: ${installCai ? 'APLICADO' : 'NO APLICADO'}
- Asignación de Guardias de Ruta (Gestores de Convivencia): ${deployRouteGuards ? 'APLICADO' : 'NO APLICADO'}
- Señalización y Mitigación de Frentes de Obra IDU: ${clearConstruction ? 'APLICADO' : 'NO APLICADO'}

---

## 2. RESULTADOS Y RETORNO SOCIAL ESTIMADO
- **Índice de Riesgo Base Promedio:** ${avgBaseScore} / 10.0
- **Índice de Riesgo Simulado Promedio:** ${avgSimScore} / 10.0
- **Reducción Global de Riesgo:** -${reductionPercent}%
- **Tramos en Riesgo Alto Inicial:** ${baseHighRiskCount}
- **Tramos en Riesgo Alto Final:** ${simHighRiskCount} (Se recuperaron ${highRiskDelta} tramos críticos)

---

## 3. RECOMENDACIÓN DE POLÍTICA PÚBLICA
La combinación de alumbrado LED de alta potencia con presencia policial móvil genera un retorno social inmediato en la reducción de factores de vulnerabilidad CPTED. Se recomienda priorizar la inversión distrital en los corredores con mayor densidad de hurtos.

*Generado automáticamente por Ruta Clara Simulación Distrital.*
`;

        const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Simulacion_CPTED_${selectedLocality}_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-500/30 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-scale-up">
                {/* Cabecera */}
                <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            🔬
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight">
                                Simulador de Intervención Distrital ("What-If")
                            </h2>
                            <p className="text-2xs font-semibold text-emerald-100">
                                Modelado masivo de políticas públicas e intervenciones CPTED
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

                {/* Cuerpo */}
                <div className="p-5 flex flex-col gap-4">
                    {/* Selector de territorio */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Localidad Objetivo:
                        </span>
                        <select 
                            value={selectedLocality}
                            onChange={(e) => setSelectedLocality(e.target.value)}
                            className="minimal-select text-xs font-bold"
                        >
                            {Object.keys(localitiesMap).map(k => (
                                <option key={k} value={k}>{localitiesMap[k].name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Políticas simulables */}
                    <div className="flex flex-col gap-2">
                        <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                            Políticas e Intervenciones Urbanas a Simular
                        </span>

                        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <div className="flex items-center gap-2.5">
                                <i className="fa-solid fa-lightbulb text-amber-500 text-sm"></i>
                                <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                        Modernización a Luminarias LED 200W
                                    </span>
                                    <span className="text-3xs text-slate-500">
                                        Reemplaza lámparas de sodio obsoletas por tecnología blanca de alta potencia
                                    </span>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={upgradeLighting} 
                                onChange={(e) => setUpgradeLighting(e.target.checked)}
                                className="accent-emerald-600 w-4 h-4 cursor-pointer"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <div className="flex items-center gap-2.5">
                                <i className="fa-solid fa-shield-halved text-blue-500 text-sm"></i>
                                <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                        Instalación de CAIs Móviles en Puntos Ciegos
                                    </span>
                                    <span className="text-3xs text-slate-500">
                                        Despliega presencia policial inmediata en pasos oscuros y túneles
                                    </span>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={installCai} 
                                onChange={(e) => setInstallCai(e.target.checked)}
                                className="accent-emerald-600 w-4 h-4 cursor-pointer"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <div className="flex items-center gap-2.5">
                                <i className="fa-solid fa-person-walking text-emerald-500 text-sm"></i>
                                <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                        Guardias de Ruta / Gestores de Movilidad
                                    </span>
                                    <span className="text-3xs text-slate-500">
                                        Acompañamiento humano continuo en horarios pico matutino y nocturno
                                    </span>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={deployRouteGuards} 
                                onChange={(e) => setDeployRouteGuards(e.target.checked)}
                                className="accent-emerald-600 w-4 h-4 cursor-pointer"
                            />
                        </label>

                        <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <div className="flex items-center gap-2.5">
                                <i className="fa-solid fa-triangle-exclamation text-rose-500 text-sm"></i>
                                <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                        Despeje y Mitigación de Frentes de Obra IDU
                                    </span>
                                    <span className="text-3xs text-slate-500">
                                        Habilitación de pasos provisionales segregados en zonas con obras viales
                                    </span>
                                </div>
                            </div>
                            <input 
                                type="checkbox" 
                                checked={clearConstruction} 
                                onChange={(e) => setClearConstruction(e.target.checked)}
                                className="accent-emerald-600 w-4 h-4 cursor-pointer"
                            />
                        </label>
                    </div>

                    {/* Tarjetas Comparativas de Resultados */}
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center flex flex-col justify-center">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Riesgo Base</span>
                            <span className="text-xl font-black text-rose-600 mt-0.5">{avgBaseScore}</span>
                            <span className="text-3xs text-slate-500">{baseHighRiskCount} tramos críticos</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-center flex flex-col justify-center">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase">Riesgo Simulado</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{avgSimScore}</span>
                            <span className="text-3xs text-emerald-600">{simHighRiskCount} tramos críticos</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-center flex flex-col justify-center">
                            <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold uppercase">Reducción Total</span>
                            <span className="text-xl font-black text-teal-600 dark:text-teal-400 mt-0.5">-{reductionPercent}%</span>
                            <span className="text-3xs text-teal-600">{highRiskDelta} tramos salvados</span>
                        </div>
                    </div>

                    {/* Botón de exportación */}
                    <button
                        onClick={handleDownloadReport}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 flex items-center justify-center gap-2 border-none cursor-pointer shadow-md mt-1"
                    >
                        <i className="fa-solid fa-file-arrow-down"></i>
                        <span>Exportar Dictamen Técnico CPTED (.MD)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
