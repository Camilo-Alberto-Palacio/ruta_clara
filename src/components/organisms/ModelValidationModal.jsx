import React, { useMemo } from 'react';
import { runEmpiricalBacktesting } from '../../utils/modelValidationService';
import { robberyReports } from '../../data/robberyReports';
import { accidentPoints } from '../../data/accidentPoints';

export default function ModelValidationModal({
    isOpen,
    onClose,
    segments = {}
}) {
    const metrics = useMemo(() => {
        if (!isOpen) {
            return { totalEvaluated: 0, tp: 0, fp: 0, fn: 0, tn: 0, accuracy: 0, precision: 0, recall: 0, f1Score: 0, incidentsMatched: 0, detailedResults: [] };
        }
        return runEmpiricalBacktesting(segments, robberyReports, accidentPoints);
    }, [isOpen, segments]);

    if (!isOpen) return null;

    const { totalEvaluated, tp, fp, fn, tn, accuracy, precision, recall, f1Score, incidentsMatched, detailedResults } = metrics;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-indigo-500/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
                {/* Cabecera */}
                <div className="p-5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            📊
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight">
                                Calibración & Backtesting Empírico
                            </h2>
                            <p className="text-2xs font-semibold text-indigo-200">
                                Contraste estadístico del modelo predictivo vs. incidentes reales
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
                    {/* Tarjetas de Métricas Estadísticas Clave */}
                    <div className="grid grid-cols-4 gap-2">
                        <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-center">
                            <span className="text-[9px] text-indigo-700 dark:text-indigo-300 font-bold uppercase">Sensibilidad (Recall)</span>
                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">{recall}%</span>
                            <span className="text-3xs text-slate-400">Captura de delitos reales</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center">
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold uppercase">Precisión</span>
                            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">{precision}%</span>
                            <span className="text-3xs text-slate-400">Certeza al alertar</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-center">
                            <span className="text-[9px] text-purple-700 dark:text-purple-300 font-bold uppercase">F1-Score</span>
                            <span className="text-xl font-black text-purple-600 dark:text-purple-400 block mt-0.5">{f1Score}%</span>
                            <span className="text-3xs text-slate-400">Balance armónico</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-center">
                            <span className="text-[9px] text-teal-700 dark:text-teal-300 font-bold uppercase">Exactitud (Accuracy)</span>
                            <span className="text-xl font-black text-teal-600 dark:text-teal-400 block mt-0.5">{accuracy}%</span>
                            <span className="text-3xs text-slate-400">{totalEvaluated} tramos cruzados</span>
                        </div>
                    </div>

                    {/* Matriz de Confusión 2x2 */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-2xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fa-solid fa-table-cells text-indigo-500"></i> Matriz de Confusión Espacial
                            </span>
                            <span className="text-3xs text-slate-400">
                                Cruce con {incidentsMatched} incidentes geoespaciales
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-2xs font-bold text-emerald-800 dark:text-emerald-300">Verdaderos Positivos (TP)</span>
                                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{tp}</span>
                                </div>
                                <p className="text-3xs text-slate-500 m-0 mt-0.5">
                                    El modelo alertó peligro y efectivamente hubo registros de hurtos/accidentes en el tramo.
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-100/70 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-2xs font-bold text-amber-800 dark:text-amber-300">Falsos Positivos (FP)</span>
                                    <span className="text-base font-black text-amber-700 dark:text-amber-400">{fp}</span>
                                </div>
                                <p className="text-3xs text-slate-500 m-0 mt-0.5">
                                    El modelo alertó condiciones vulnerables (ej. oscuridad/sodio), pero no hubo denuncias aún.
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-rose-100/70 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-2xs font-bold text-rose-800 dark:text-rose-300">Falsos Negativos (FN)</span>
                                    <span className="text-base font-black text-rose-700 dark:text-rose-400">{fn}</span>
                                </div>
                                <p className="text-3xs text-slate-500 m-0 mt-0.5">
                                    El modelo clasificó como seguro pero hubo delitos registrados (oportunidad de calibración).
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-blue-100/70 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-2xs font-bold text-blue-800 dark:text-blue-300">Verdaderos Negativos (TN)</span>
                                    <span className="text-base font-black text-blue-700 dark:text-blue-400">{tn}</span>
                                </div>
                                <p className="text-3xs text-slate-500 m-0 mt-0.5">
                                    El modelo clasificó vía segura y efectivamente no hay registros de delincuencia.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de clasificación tramo a tramo */}
                    <div>
                        <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                            Detalle de Validación por Segmento Vial ({detailedResults.length})
                        </span>
                        <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-2xs uppercase">
                                        <th className="p-2.5">Tramo</th>
                                        <th className="p-2.5">Predicho</th>
                                        <th className="p-2.5">Incidentes</th>
                                        <th className="p-2.5">Diagnóstico</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailedResults.map((item, idx) => (
                                        <tr key={idx} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200 max-w-[160px] truncate">
                                                {item.name}
                                            </td>
                                            <td className="p-2.5">
                                                <span className={`px-1.5 py-0.5 rounded text-3xs font-extrabold ${
                                                    item.predictedLevel === 'Alto' ? 'bg-rose-100 text-rose-700' : (item.predictedLevel === 'Medio' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
                                                }`}>
                                                    {item.score} ({item.predictedLevel})
                                                </span>
                                            </td>
                                            <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                                {item.incidentCount > 0 ? `🚨 ${item.incidentCount}` : 'Ninguno'}
                                            </td>
                                            <td className="p-2.5 text-2xs font-bold text-slate-700 dark:text-slate-300">
                                                {item.classification.split(' ')[0]}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
