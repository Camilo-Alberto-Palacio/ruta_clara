// modelValidationService.js - Motor de validación empírica y backtesting para SafeCycle Bogotá

import { calculateRisk } from './riskCalculator';

/**
 * Realiza un contraste espacial entre las predicciones del modelo y los incidentes reales
 * (Hurtos de SIEDCO/Policía y Siniestros Viales del CRUE)
 */
export function runEmpiricalBacktesting(segments = {}, robberyReports = [], accidentPoints = []) {
    const segmentList = Object.values(segments);
    if (segmentList.length === 0) {
        return {
            totalEvaluated: 0,
            tp: 0, fp: 0, fn: 0, tn: 0,
            accuracy: 0, precision: 0, recall: 0, f1Score: 0,
            incidentsMatched: 0
        };
    }

    const allIncidents = [
        ...robberyReports.map(r => ({ lat: r.lat, lng: r.lng, type: 'hurto' })),
        ...accidentPoints.map(a => ({ lat: a.lat, lng: a.lng, type: 'accidente' }))
    ];

    let tp = 0; // Predijo Alto/Medio y hubo incidentes reales
    let fp = 0; // Predijo Alto/Medio pero no hubo incidentes reales
    let fn = 0; // Predijo Bajo pero hubo incidentes reales (crítico)
    let tn = 0; // Predijo Bajo y no hubo incidentes reales
    let incidentsMatched = 0;

    const detailedResults = segmentList.map(seg => {
        const riskResult = calculateRisk(seg, [], true, [], segments);
        const score = parseFloat(riskResult.score);
        const isPredictedDangerous = score >= 4.8; // Umbral de clasificación binaria

        // Spatial match: ¿hay algún incidente a menos de 100m de este tramo?
        const nearbyIncidents = allIncidents.filter(inc => {
            return (seg.coordinates || []).some(pt => {
                const dLat = (pt[0] - inc.lat) * 111000;
                const dLng = (pt[1] - inc.lng) * 111000 * Math.cos(pt[0] * (Math.PI / 180));
                return Math.sqrt(dLat * dLat + dLng * dLng) <= 120;
            });
        });

        const hasRealIncidents = nearbyIncidents.length > 0;
        if (hasRealIncidents) incidentsMatched += nearbyIncidents.length;

        let classification;
        if (isPredictedDangerous && hasRealIncidents) {
            tp++;
            classification = 'TP (Verdadero Positivo)';
        } else if (isPredictedDangerous && !hasRealIncidents) {
            fp++;
            classification = 'FP (Falso Positivo)';
        } else if (!isPredictedDangerous && hasRealIncidents) {
            fn++;
            classification = 'FN (Falso Negativo)';
        } else {
            tn++;
            classification = 'TN (Verdadero Negativo)';
        }

        return {
            id: seg.id,
            name: seg.name,
            localidad: seg.localidad,
            score,
            predictedLevel: riskResult.level,
            hasRealIncidents,
            incidentCount: nearbyIncidents.length,
            classification
        };
    });

    const total = tp + fp + fn + tn;
    const accuracy = total > 0 ? parseFloat(((tp + tn) / total).toFixed(3)) : 0;
    const precision = (tp + fp) > 0 ? parseFloat((tp / (tp + fp)).toFixed(3)) : 0;
    const recall = (tp + fn) > 0 ? parseFloat((tp / (tp + fn)).toFixed(3)) : 0;
    const f1Score = (precision + recall) > 0 ? parseFloat((2 * (precision * recall) / (precision + recall)).toFixed(3)) : 0;

    return {
        totalEvaluated: total,
        tp,
        fp,
        fn,
        tn,
        accuracy: Math.round(accuracy * 100),
        precision: Math.round(precision * 100),
        recall: Math.round(recall * 100),
        f1Score: Math.round(f1Score * 100),
        incidentsMatched,
        detailedResults
    };
}
