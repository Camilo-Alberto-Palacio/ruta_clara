// priorityIndexService.js - Índice de Prioridad de Intervención (IPI) para entidades distritales (UAESP e IDU)

import { calculateRisk, calcularRiesgoCiudadano } from './riskCalculator';

/**
 * Calcula el IPI para cada tramo y devuelve los tramos más críticos clasificados por entidad responsable
 */
export function calculatePriorityInterventionIndex(
    segments = {},
    citizenReports = [],
    constructionZones = [],
    robberyReports = [],
    localidad = 'all'
) {
    const segmentList = Object.values(segments).filter(seg => {
        if (localidad === 'all') return true;
        const segLoc = seg.localidad ? seg.localidad.toLowerCase() : '';
        if (localidad === 'usme') return segLoc.includes('usme');
        if (localidad === 'ruu') return segLoc.includes('rafael') || segLoc.includes('uribe');
        return true;
    });

    const evaluated = segmentList.map(seg => {
        const riskData = calculateRisk(seg, constructionZones, true, citizenReports, segments);
        const baseScore = parseFloat(riskData.score);
        
        // Densidad ciudadana
        const citizenScore = calcularRiesgoCiudadano(seg.id, citizenReports, segments);

        // Densidad delictiva cercana
        const nearbyRobberies = robberyReports.filter(r => {
            return (seg.coordinates || []).some(pt => {
                const dLat = (pt[0] - r.lat) * 111000;
                const dLng = (pt[1] - r.lng) * 111000 * Math.cos(pt[0] * (Math.PI / 180));
                return Math.sqrt(dLat * dLat + dLng * dLng) <= 120;
            });
        }).length;

        // Fórmula IPI: 0 a 10
        const rawIpi = (baseScore * 0.50) + (Math.min(3, citizenScore) * 1.0) + (Math.min(4, nearbyRobberies * 0.8));
        const ipiScore = Math.min(10.0, parseFloat(rawIpi.toFixed(2)));

        // Determinar entidad competente y recomendación técnica
        let entity = 'IDU / Movilidad';
        let action = 'Repavimentación de ciclorruta y demarcación reflectiva de carril';
        
        if (seg.lightingType === 'Sodio' || seg.watts <= 100) {
            entity = 'UAESP (Alumbrado Público)';
            action = 'Reemplazo urgente de luminarias de vapor de sodio por LED de 200W+ y poda de arbolado';
        } else if (nearbyRobberies > 0 && !seg.guardianCai) {
            entity = 'Policía Metropolitana / Sec. Seguridad';
            action = 'Instalación de cámara de vigilancia domo conectada al C4 y patrullaje de cuadrante';
        } else if (seg.showConstruction) {
            entity = 'IDU (Frentes de Obra)';
            action = 'Auditoría a contratista por señalización deficiente y habilitación de sendero ciclista provisional';
        }

        return {
            id: seg.id,
            name: seg.name,
            localidad: seg.localidad,
            upz: seg.upz || 'UPZ Central',
            coordinates: seg.coordinates,
            lightingType: seg.lightingType,
            watts: seg.watts,
            baselineCrime: seg.baselineCrime,
            ipiScore,
            nearbyRobberies,
            citizenScore,
            entity,
            action,
            urgency: ipiScore >= 7.5 ? 'Crítica / Inmediata' : (ipiScore >= 5.0 ? 'Media / Prioritaria' : 'Programada')
        };
    });

    // Ordenar de mayor a menor urgencia
    evaluated.sort((a, b) => b.ipiScore - a.ipiScore);

    const topCritical = evaluated.slice(0, 5);

    return {
        totalEvaluated: evaluated.length,
        topCritical,
        allRanked: evaluated
    };
}
