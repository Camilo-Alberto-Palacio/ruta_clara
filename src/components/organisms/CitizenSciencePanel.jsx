import React, { useState, useRef } from 'react';
import { bikeCaravans } from '../../data/bikeCaravans';
import { emitToast } from '../../utils/toastService';

export default function CitizenSciencePanel({
    citizenReports = [],
    localidad,
    isReporting,
    setIsReporting,
    reportingType,
    setReportingType,
    reportingCoords,
    isSelectingCoords,
    setIsSelectingCoords,
    onSubmitReport,
    onCancelReport,
    onZoomToReport,
    onUpvoteReport,
    onResolveReport
}) {
    const [filterTab, setFilterTab] = useState('activos'); // 'activos' | 'resueltos' | 'caravanas'
    const [reportDescription, setReportDescription] = useState('');
    const [reportPhoto, setReportPhoto] = useState(null);
    const fileInputRef = useRef(null);

    // Filter reports for the active locality
    const localityReports = citizenReports.filter(r => {
        const reportLoc = r.properties?.localidad || '';
        if (localidad === 'usme') {
            return reportLoc.toLowerCase().includes('usme');
        } else if (localidad === 'ruu') {
            return reportLoc.toLowerCase().includes('rafael') || reportLoc.toLowerCase().includes('uribe');
        }
        return true;
    });

    const activeReports = localityReports.filter(r => r.properties?.estado !== 'resuelto');
    const resolvedReports = localityReports.filter(r => r.properties?.estado === 'resuelto');

    const getIconClass = (type) => {
        if (type.includes('Luminaria') || type.includes('lobo')) return 'fa-lightbulb text-yellow';
        if (type.includes('Hueco') || type.includes('destructiva')) return 'fa-triangle-exclamation text-yellow';
        return 'fa-hand text-red';
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2.5 * 1024 * 1024) {
            emitToast("La fotografía no debe superar 2.5 MB para garantizar rendimiento.", "warning");
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvt) => {
            setReportPhoto(loadEvt.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleFormSubmit = () => {
        onSubmitReport({
            tipo_novedad: reportingType,
            coordenadas: reportingCoords,
            descripcion: reportDescription.trim(),
            foto: reportPhoto
        });
        setReportDescription('');
        setReportPhoto(null);
    };

    const handleFormCancel = () => {
        setReportDescription('');
        setReportPhoto(null);
        onCancelReport();
    };

    return (
        <div className="citizen-science-card">
            <div className="flex items-center justify-between mb-1.5">
                <h3 className="m-0 flex items-center gap-1.5 text-sm font-extrabold text-slate-800">
                    <i className="fa-solid fa-people-group text-emerald-600"></i> Ciencia Ciudadana
                </h3>
                <span className="text-3xs uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    CPTED Colaborativo
                </span>
            </div>

            <p className="citizen-science-desc text-xs text-slate-500 mb-3">
                Reporta novedades físicas o asiste a bici-caravanas para actualizar la seguridad vial en tiempo real.
            </p>

            {/* Selector de sub-pestañas */}
            {!isReporting && (
                <div className="flex bg-slate-100 p-1 rounded-xl mb-3 gap-1">
                    <button
                        onClick={() => setFilterTab('activos')}
                        className={`flex-1 py-1.5 rounded-lg text-2xs font-extrabold border-none cursor-pointer transition-all ${
                            filterTab === 'activos' 
                                ? 'bg-white text-emerald-700 shadow-xs' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Activos ({activeReports.length})
                    </button>
                    <button
                        onClick={() => setFilterTab('resueltos')}
                        className={`flex-1 py-1.5 rounded-lg text-2xs font-extrabold border-none cursor-pointer transition-all ${
                            filterTab === 'resueltos' 
                                ? 'bg-white text-emerald-700 shadow-xs' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Resueltos ({resolvedReports.length})
                    </button>
                    <button
                        onClick={() => setFilterTab('caravanas')}
                        className={`flex-1 py-1.5 rounded-lg text-2xs font-extrabold border-none cursor-pointer transition-all ${
                            filterTab === 'caravanas' 
                                ? 'bg-white text-emerald-700 shadow-xs' 
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <i className="fa-solid fa-bicycle"></i> Caravanas
                    </button>
                </div>
            )}

            {!isReporting ? (
                <div className="flex flex-col gap-2.5">
                    <button
                        className="btn-flat btn-flat-primary w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                        onClick={() => setIsReporting(true)}
                    >
                        <i className="fa-solid fa-camera"></i> Reportar Novedad con Evidencia
                    </button>

                    {/* LISTA: REPORTES ACTIVOS */}
                    {filterTab === 'activos' && (
                        <div>
                            {activeReports.length === 0 ? (
                                <p className="text-2xs text-slate-400 text-center py-3 italic">
                                    No hay novedades activas registradas en esta localidad.
                                </p>
                            ) : (
                                <div className="citizen-reports-list flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                                    {activeReports.map((report) => (
                                        <div key={report.id} className="citizen-report-card-item p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    {report.properties.foto ? (
                                                        <img 
                                                            src={report.properties.foto} 
                                                            alt="Evidencia" 
                                                            className="w-9 h-9 rounded-lg object-cover border border-slate-300 flex-shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center flex-shrink-0">
                                                            <i className={`fa-solid ${getIconClass(report.properties.tipo_novedad)} text-xs`}></i>
                                                        </div>
                                                    )}
                                                    <div className="overflow-hidden">
                                                        <span className="text-xs font-bold text-slate-800 block truncate">
                                                            {report.properties.tipo_novedad.split('/')[0].trim()}
                                                        </span>
                                                        <span className="text-3xs text-slate-400">
                                                            {report.properties.fecha_creacion} • {report.properties.localidad}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Votos de respaldo */}
                                                <button
                                                    onClick={() => onUpvoteReport && onUpvoteReport(report.properties.id)}
                                                    className="py-1 px-2 rounded-lg bg-emerald-50 text-emerald-700 text-2xs font-extrabold flex items-center gap-1 border-none cursor-pointer hover:bg-emerald-100"
                                                    title="Respaldar reporte"
                                                >
                                                    <i className="fa-solid fa-circle-arrow-up"></i> {report.properties.numero_votos || 1}
                                                </button>
                                            </div>

                                            {report.properties.descripcion && (
                                                <p className="text-2xs text-slate-600 mt-1 mb-0 italic line-clamp-2">
                                                    "{report.properties.descripcion}"
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50">
                                                <button
                                                    onClick={() => onZoomToReport(report.properties.coordenadas)}
                                                    className="text-3xs text-emerald-600 hover:text-emerald-700 font-bold bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"
                                                >
                                                    <i className="fa-solid fa-crosshairs"></i> Ver en mapa
                                                </button>

                                                <button
                                                    onClick={() => onResolveReport && onResolveReport(report.properties.id)}
                                                    className="text-3xs text-slate-500 hover:text-emerald-600 font-bold bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"
                                                    title="Confirmar que la vía fue reparada o despejada"
                                                >
                                                    <i className="fa-solid fa-circle-check text-emerald-500"></i> ¿Ya se solucionó?
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LISTA: REPORTES RESUELTOS */}
                    {filterTab === 'resueltos' && (
                        <div className="citizen-reports-list flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                            {resolvedReports.length === 0 ? (
                                <p className="text-2xs text-slate-400 text-center py-3 italic">
                                    No hay reportes marcados como resueltos recientemente.
                                </p>
                            ) : (
                                resolvedReports.map(report => (
                                    <div key={report.id} className="p-2.5 rounded-xl bg-slate-50/60 border border-slate-200/50 opacity-80 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <i className="fa-solid fa-check-double text-emerald-600 text-sm"></i>
                                            <div>
                                                <span className="text-xs font-semibold text-slate-700 line-through">
                                                    {report.properties.tipo_novedad.split('/')[0]}
                                                </span>
                                                <span className="block text-3xs text-emerald-600 font-bold">
                                                    Resuelto por la comunidad
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onZoomToReport(report.properties.coordenadas)}
                                            className="text-3xs text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                                        >
                                            Ver
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* LISTA: BICI-CARAVANAS */}
                    {filterTab === 'caravanas' && (
                        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                            {bikeCaravans.map(caravan => (
                                <div key={caravan.id} className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-emerald-900">
                                            {caravan.name}
                                        </span>
                                        <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                            {caravan.badge}
                                        </span>
                                    </div>
                                    <p className="text-3xs text-slate-500 m-0">
                                        <strong>Punto de Encuentro:</strong> {caravan.meetingPoint.name}
                                    </p>
                                    <div className="flex items-center justify-between text-3xs font-semibold text-emerald-700 pt-1 border-t border-emerald-100">
                                        <span>⏰ Salida: {caravan.meetingPoint.departureTime}</span>
                                        <span>🛡️ Bono: {caravan.riskReductionFactor} Riesgo</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* FORMULARIO DE REPORTE CON FOTOGRAFÍA */
                <div className="report-form flex flex-col gap-2.5">
                    <div className="report-select-wrapper">
                        <label className="control-label text-2xs font-bold text-slate-600">Tipo de Novedad</label>
                        <select
                            className="report-select text-xs"
                            value={reportingType}
                            onChange={(e) => setReportingType(e.target.value)}
                        >
                            <option value="Luminaria Dañada / Boca de lobo">💡 Luminaria Dañada / Sector Oscuro (+0.8)</option>
                            <option value="Hueco crítico / Vía destructiva">⚠️ Bache / Trampa / Deterioro en vía (+0.5)</option>
                            <option value="Punto Crítico de Inseguridad (Atraco reciente)">🚨 Punto Crítico / Asalto reciente (+1.5)</option>
                        </select>
                    </div>

                    <div className="report-select-wrapper">
                        <label className="control-label text-2xs font-bold text-slate-600">Ubicación Geográfica</label>
                        <div
                            className={`map-pick-indicator text-xs p-2.5 rounded-xl border border-dashed flex items-center justify-center gap-2 cursor-pointer ${
                                isSelectingCoords ? 'active border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300'
                            }`}
                            onClick={() => setIsSelectingCoords(!isSelectingCoords)}
                        >
                            {isSelectingCoords ? (
                                <>
                                    <i className="fa-solid fa-crosshairs fa-spin text-emerald-600"></i> Haz clic en el mapa...
                                </>
                            ) : reportingCoords ? (
                                <>
                                    <i className="fa-solid fa-location-dot text-rose-500"></i> {reportingCoords[0].toFixed(5)}, {reportingCoords[1].toFixed(5)}
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-map-pin text-slate-400"></i> Tocar el mapa para ubicar
                                </>
                            )}
                        </div>
                    </div>

                    {/* Campo de descripción breve */}
                    <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600">Descripción o detalle (opcional):</label>
                        <input
                            type="text"
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            placeholder="Ej. Poste apagado frente al puente peatonal..."
                            className="text-xs p-2 rounded-xl border border-slate-200 bg-white"
                        />
                    </div>

                    {/* Adjuntar Fotografía */}
                    <div className="flex flex-col gap-1">
                        <label className="text-2xs font-bold text-slate-600 flex items-center justify-between">
                            <span>Evidencia Fotográfica:</span>
                            {reportPhoto && (
                                <button 
                                    onClick={() => setReportPhoto(null)}
                                    className="text-3xs text-rose-500 bg-transparent border-none cursor-pointer"
                                >
                                    Quitar foto
                                </button>
                            )}
                        </label>
                        
                        {reportPhoto ? (
                            <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-300">
                                <img src={reportPhoto} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-50/50"
                            >
                                <i className="fa-solid fa-camera text-emerald-600"></i> Tomar o Subir Foto
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handlePhotoChange}
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className="report-actions flex gap-2 mt-1">
                        <button
                            className="btn-flat btn-flat-primary flex-1 py-2 rounded-xl text-xs font-bold"
                            onClick={handleFormSubmit}
                            disabled={!reportingCoords}
                            style={{ opacity: reportingCoords ? 1 : 0.5, cursor: reportingCoords ? 'pointer' : 'not-allowed' }}
                        >
                            <i className="fa-solid fa-check"></i> Publicar Reporte
                        </button>
                        <button
                            className="btn-flat btn-flat-danger flex-1 py-2 rounded-xl text-xs font-bold"
                            onClick={handleFormCancel}
                        >
                            <i className="fa-solid fa-xmark"></i> Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
