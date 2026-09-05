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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-emerald-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-up">
                {/* Cabecera */}
                <div className="p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            📊
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight">
                                Calibración & Backtesting Empírico
                            </h2>
                            <p className="text-2xs font-semibold text-emerald-100">
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
                        <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
                            <span className="text-[9px] text-indigo-700 font-bold uppercase">Sensibilidad (Recall)</span>
                            <span className="text-xl font-black text-indigo-600 block mt-0.5">{recall}%</span>
                            <span className="text-3xs text-slate-400">Captura de delitos reales</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-[9px] text-emerald-700 font-bold uppercase">Precisión</span>
                            <span className="text-xl font-black text-emerald-600 block mt-0.5">{precision}%</span>
                            <span className="text-3xs text-slate-400">Certeza al alertar</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                            <span className="text-[9px] text-purple-700 font-bold uppercase">F1-Score</span>
                            <span className="text-xl font-black text-purple-600 block mt-0.5">{f1Score}%</span>
                            <span className="text-3xs text-slate-400">Balance armónico</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-center">
                            <span className="text-[9px] text-teal-700 font-bold uppercase">Exactitud (Accuracy)</span>
                            <span className="text-xl font-black text-teal-600 block mt-0.5">{accuracy}%</span>
                            <span className="text-3xs text-slate-400">{totalEvaluated} tramos cruzados</span>
                        </div>
                    </div>

                    {/* Matriz de Confusión 2x2 */}
                    <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-2xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fa-solid fa-table-cells text-emerald-600"></i> Matriz de Confusión Espacial
                            </span>
                            <span className="text-3xs text-slate-400">
                                Cruce con {incidentsMatched} incidentes geoespaciales
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300">
                                <div className="flex justify-between items-center">
                                    <span className="text-2xs font-bold text-emerald-800">Verdaderos Positivos (TP)</span>
                                    <span className="text-base font-black text-emerald-700">{tp}</span>
                                </div>
                                <p className="text-3xs text-slate-500 m-0 mt-0.5">
                                    El modelo alertó peligro y efectivamente hubo registros de hurtos/accidentes en el tramo.
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-100/70 border border-amber-300">
                                <div className="flex justify-between items-center">
                                    <span className="text-2xs font-bold text-amber-800">Falsos Positivos (FP)</span>
                                    <span className="text-base font-black text-amber-700">{fp}</span>
                                </div>
                                <p className="text-3xs text-slate-500 m-0 mt-0.5">
                                    El modelo alertó condiciones vulnerables (ej. oscuridad/sodio), pero no hubo denuncias aún.
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-300">
                                <div className="flex justify-between items-center">
                                    <span className="text-2xs font-bold text-rose-800">Falsos Negativos (FN)</span>
                                    <span className="text-base font-black text-rose-700">{fn}</span>
                                </div>
                                <p className="text-3xs text-slate-500 m-0 mt-0.5">
                                    El modelo clasificó como seguro pero hubo delitos registrados (oportunidad de calibración).
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-blue-100/70 border border-blue-300">
                                <div className="flex justify-between items-center">
                                    <span className="text-2xs font-bold text-blue-800">Verdaderos Negativos (TN)</span>
                                    <span className="text-base font-black text-blue-700">{tn}</span>
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
                        <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-600 text-2xs uppercase">
                                        <th className="p-2.5">Tramo</th>
                                        <th className="p-2.5">Predicho</th>
                                        <th className="p-2.5">Incidentes</th>
                                        <th className="p-2.5">Diagnóstico</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailedResults.map((item, idx) => (
                                        <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                                            <td className="p-2.5 font-semibold text-slate-800 max-w-[160px] truncate">
                                                {item.name}
                                            </td>
                                            <td className="p-2.5">
                                                <span className={`px-1.5 py-0.5 rounded text-3xs font-extrabold ${
                                                    item.predictedLevel === 'Alto' ? 'bg-rose-100 text-rose-700' : (item.predictedLevel === 'Medio' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')
                                                }`}>
                                                    {item.score} ({item.predictedLevel})
                                                </span>
                                            </td>
                                            <td className="p-2.5 text-slate-600">
                                                {item.incidentCount > 0 ? `🚨 ${item.incidentCount}` : 'Ninguno'}
                                            </td>
                                            <td className="p-2.5 text-2xs font-bold text-slate-700">
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
