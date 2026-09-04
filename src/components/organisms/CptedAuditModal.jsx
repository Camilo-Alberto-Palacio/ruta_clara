import React, { useState } from 'react';

export default function CptedAuditModal({
    isOpen,
    onClose,
    selectedSegment,
    onSaveAudit
}) {
    if (!isOpen) return null;

    // Estado del formulario de auditoría CPTED de 4 dimensiones (Escala 1 a 5)
    const [lightingScore, setLightingScore] = useState(3);
    const [surveillanceScore, setSurveillanceScore] = useState(3);
    const [blindSpotsScore, setBlindSpotsScore] = useState(3);
    const [demarcationScore, setDemarcationScore] = useState(3);
    const [escapeRoutesScore, setEscapeRoutesScore] = useState(3);
    const [signageScore, setSignageScore] = useState(3);
    const [maintenanceScore, setMaintenanceScore] = useState(3);
    const [pavementScore, setPavementScore] = useState(3);
    const [auditorNotes, setAuditorNotes] = useState('');
    const [auditorName, setAuditorName] = useState('Investigador Semillero');

    // Cálculo del Índice CPTED (0% a 100%)
    const totalPoints = lightingScore + surveillanceScore + blindSpotsScore + demarcationScore + escapeRoutesScore + signageScore + maintenanceScore + pavementScore;
    const maxPoints = 40;
    const cptedIndex = Math.round((totalPoints / maxPoints) * 100);

    const getIndexLabel = (val) => {
        if (val >= 75) return { label: 'Diseño Seguro Óptimo', color: '#10b981' };
        if (val >= 50) return { label: 'Vulnerabilidad Moderada', color: '#f59e0b' };
        return { label: 'Ambiente Altamente Inseguro', color: '#ef4444' };
    };

    const status = getIndexLabel(cptedIndex);

    const handleSaveAndExport = () => {
        const auditData = {
            segmentId: selectedSegment ? selectedSegment.id : 'audit_field',
            segmentName: selectedSegment ? selectedSegment.name : 'Tramo Auditado en Campo',
            cptedIndex,
            date: new Date().toLocaleDateString('es-CO'),
            auditorName,
            ratings: {
                lightingScore, surveillanceScore, blindSpotsScore,
                demarcationScore, escapeRoutesScore, signageScore,
                maintenanceScore, pavementScore
            },
            notes: auditorNotes.trim()
        };

        if (onSaveAudit) {
            onSaveAudit(auditData);
        }

        // Descarga de la Ficha CPTED
        const doc = `# FICHA TÉCNICA DE AUDITORÍA CPTED EN CAMPO
**Proyecto:** SafeCycle Bogotá - Semillero de Desarrollo de Software
**Tramo Evaluado:** ${auditData.segmentName}
**Auditor:** ${auditorName}
**Fecha:** ${auditData.date}

---

## 1. ÍNDICE CPTED GLOBAL: ${cptedIndex}% (${status.label})
*Escala de evaluación: 1 (Deficiente) a 5 (Excelente)*

### Dimensión 1: Vigilancia Natural
- Iluminación efectiva nocturna: ${lightingScore}/5
- Ojos en la calle (visibilidad de fachadas y peatones): ${surveillanceScore}/5
- Ausencia de puntos ciegos / vegetación desbordada: ${blindSpotsScore}/5

### Dimensión 2: Control Natural de Accesos
- Segregación y protección física de la ciclorruta: ${demarcationScore}/5
- Rutas de escape y salidas laterales despejadas: ${escapeRoutesScore}/5

### Dimensión 3: Refuerzo Territorial
- Señalización horizontal y vertical de ciclorruta: ${signageScore}/5

### Dimensión 4: Mantenimiento y Gestión
- Limpieza y ausencia de escombros/basuras: ${maintenanceScore}/5
- Estado superficial del pavimento y tapas de alcantarilla: ${pavementScore}/5

---

## 2. OBSERVACIONES DE CAMPO DEL AUDITOR:
${auditorNotes ? `"${auditorNotes}"` : 'Sin observaciones adicionales registradas.'}

---
*Ficha técnica oficial para diagnóstico urbano CPTED.*
`;

        const blob = new Blob([doc], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Auditoria_CPTED_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-teal-500/30 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-scale-up">
                {/* Cabecera */}
                <div className="p-5 bg-gradient-to-r from-teal-700 via-emerald-700 to-green-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                            📋
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight">
                                Auditoría CPTED de Campo
                            </h2>
                            <p className="text-2xs font-semibold text-teal-100">
                                Diagnóstico ambiental de los 4 pilares de prevención del delito
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
                    {/* Tramo e Índice CPTED actual */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">
                                Tramo a Auditar
                            </span>
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 m-0 mt-0.5">
                                {selectedSegment ? selectedSegment.name : 'Punto o tramo seleccionado'}
                            </h4>
                        </div>

                        <div className="text-right">
                            <span className="text-xl font-black" style={{ color: status.color }}>
                                {cptedIndex}%
                            </span>
                            <span className="block text-3xs font-bold" style={{ color: status.color }}>
                                {status.label}
                            </span>
                        </div>
                    </div>

                    {/* Formulario CPTED */}
                    <div className="flex flex-col gap-3">
                        <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                            1. Vigilancia Natural
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-2xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Iluminación nocturna: {lightingScore}/5
                                </label>
                                <input 
                                    type="range" min="1" max="5" value={lightingScore} 
                                    onChange={e => setLightingScore(parseInt(e.target.value))} 
                                    className="w-full accent-teal-600"
                                />
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Ojos en la calle: {surveillanceScore}/5
                                </label>
                                <input 
                                    type="range" min="1" max="5" value={surveillanceScore} 
                                    onChange={e => setSurveillanceScore(parseInt(e.target.value))} 
                                    className="w-full accent-teal-600"
                                />
                            </div>
                        </div>

                        <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                            2. Control de Accesos y Escape
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-2xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Segregación de calzada: {demarcationScore}/5
                                </label>
                                <input 
                                    type="range" min="1" max="5" value={demarcationScore} 
                                    onChange={e => setDemarcationScore(parseInt(e.target.value))} 
                                    className="w-full accent-teal-600"
                                />
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Vías de escape libres: {escapeRoutesScore}/5
                                </label>
                                <input 
                                    type="range" min="1" max="5" value={escapeRoutesScore} 
                                    onChange={e => setEscapeRoutesScore(parseInt(e.target.value))} 
                                    className="w-full accent-teal-600"
                                />
                            </div>
                        </div>

                        <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                            3. Mantenimiento y Pavimento
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-2xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Limpieza / Sin escombros: {maintenanceScore}/5
                                </label>
                                <input 
                                    type="range" min="1" max="5" value={maintenanceScore} 
                                    onChange={e => setMaintenanceScore(parseInt(e.target.value))} 
                                    className="w-full accent-teal-600"
                                />
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                    Calidad del pavimento: {pavementScore}/5
                                </label>
                                <input 
                                    type="range" min="1" max="5" value={pavementScore} 
                                    onChange={e => setPavementScore(parseInt(e.target.value))} 
                                    className="w-full accent-teal-600"
                                />
                            </div>
                        </div>

                        {/* Nombre del auditor y notas */}
                        <div className="flex gap-2 text-2xs">
                            <div className="flex-1 flex flex-col gap-1">
                                <label className="font-bold text-slate-600">Auditor Responsable:</label>
                                <input 
                                    type="text" 
                                    value={auditorName} 
                                    onChange={e => setAuditorName(e.target.value)} 
                                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 text-2xs">
                            <label className="font-bold text-slate-600">Notas de Observación en Campo:</label>
                            <textarea 
                                value={auditorNotes} 
                                onChange={e => setAuditorNotes(e.target.value)} 
                                placeholder="Puntos ciegos bajo el puente, luminarias intermitentes, cámaras de seguridad privadas visibles..."
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs resize-none h-16"
                            />
                        </div>
                    </div>

                    {/* Botón Guardar y Descargar */}
                    <button
                        onClick={handleSaveAndExport}
                        className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 flex items-center justify-center gap-2 border-none cursor-pointer shadow-md"
                    >
                        <i className="fa-solid fa-cloud-arrow-down"></i>
                        <span>Guardar Auditoría & Descargar Ficha CPTED (.MD)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
