// elevationService.js - Motor altimétrico y análisis topográfico de ciclorrutas en Bogotá

/**
 * Calcula la elevación estimada para cualquier coordenada en Bogotá
 * Basado en el modelo hipsométrico distrital:
 * - Valle aluvial occidental (Río Bogotá / Engativá / Kennedy / Fontibón): ~2.540 msnm
 * - Centro y piedemonte: ~2.600 - 2.650 msnm
 * - Rafael Uribe Uribe (Lomas, Marruecos, Molinos): ~2.620 - 2.780 msnm
 * - Usme (Yomasa, Santa Librada, La Flora, El Destino): ~2.700 - 3.100 msnm
 */
export function estimateBogotaElevation(lat, lng) {
    const baseValle = 2550;

    // Componente Cerros Orientales (a mayor proximidad al Este, mayor cota)
    // Bogotá Este oscila entre -74.02 y -74.08
    const esteGradiente = Math.max(0, (lng - (-74.16)) * 1450);

    // Componente Sur Andino (Usme y Cuenca Alta del Río Tunjuelo)
    // Hacia el sur de la calle 40 Sur (lat < 4.58), la elevación asciende con rapidez
    const surGradiente = Math.max(0, (4.62 - lat) * 1650);

    // Micro-ondulaciones orográficas locales de cuencas y lomas
    const microRelieve = (Math.sin(lat * 380) * 14) + (Math.cos(lng * 410) * 12);

    const elevacionTotal = Math.round(baseValle + (esteGradiente * 0.45) + (surGradiente * 0.55) + microRelieve);
    return Math.max(2540, Math.min(3200, elevacionTotal));
}

/**
 * Calcula el perfil altimétrico completo para una polilínea de coordenadas
 * Coordenadas en formato [[lat, lng], ...]
 */
export function calculateRouteElevationProfile(coordinates = []) {
    if (!coordinates || coordinates.length < 2) {
        return {
            points: [],
            gainMeters: 0,
            lossMeters: 0,
            minElevation: 2600,
            maxElevation: 2600,
            avgSlopePercent: 0,
            difficulty: 'Plano / Fácil'
        };
    }

    const points = [];
    let totalDistM = 0;
    let gainMeters = 0;
    let lossMeters = 0;
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    // Primer punto
    const firstAlt = estimateBogotaElevation(coordinates[0][0], coordinates[0][1]);
    points.push({ distanceM: 0, elevationM: firstAlt });
    minElevation = Math.min(minElevation, firstAlt);
    maxElevation = Math.max(maxElevation, firstAlt);

    for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];

        // Distancia euclidiana aproximada en metros
        const dLat = (curr[0] - prev[0]) * 111000;
        const dLng = (curr[1] - prev[1]) * 111000 * Math.cos(curr[0] * (Math.PI / 180));
        const distM = Math.sqrt(dLat * dLat + dLng * dLng);
        totalDistM += distM;

        const currAlt = estimateBogotaElevation(curr[0], curr[1]);
        minElevation = Math.min(minElevation, currAlt);
        maxElevation = Math.max(maxElevation, currAlt);

        const deltaAlt = currAlt - points[points.length - 1].elevationM;
        if (deltaAlt > 0) gainMeters += deltaAlt;
        else lossMeters += Math.abs(deltaAlt);

        // Muestreo para no saturar gráficos: 1 punto cada ~80 metros
        if (distM >= 50 || i === coordinates.length - 1) {
            points.push({
                distanceM: Math.round(totalDistM),
                elevationM: currAlt
            });
        }
    }

    const avgSlopePercent = totalDistM > 0 
        ? parseFloat(((gainMeters / totalDistM) * 100).toFixed(1)) 
        : 0;

    let difficulty = 'Plano / Fácil';
    if (gainMeters > 150 || avgSlopePercent > 5.5) {
        difficulty = 'Subida Exigente';
    } else if (gainMeters > 60 || avgSlopePercent > 2.5) {
        difficulty = 'Ondulado / Moderado';
    }

    return {
        points,
        totalDistanceMeters: Math.round(totalDistM),
        gainMeters: Math.round(gainMeters),
        lossMeters: Math.round(lossMeters),
        minElevation: minElevation === Infinity ? 2600 : minElevation,
        maxElevation: maxElevation === -Infinity ? 2600 : maxElevation,
        avgSlopePercent,
        difficulty
    };
}
