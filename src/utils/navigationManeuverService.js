/**
 * Navigation Maneuver Service (Waze-style Turn-by-Turn generator)
 * Analyzes route geometry to calculate turns, bearings, maneuvers,
 * and upcoming navigation prompts.
 */

export function calculateBearing(p1, p2) {
    const lat1 = (p1[0] * Math.PI) / 180;
    const lon1 = (p1[1] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lon2 = (p2[1] * Math.PI) / 180;
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

export function calculateDistanceMeters(p1, p2) {
    if (!p1 || !p2) return 0;
    const dLat = (p2[0] - p1[0]) * 111000;
    const dLng = (p2[1] - p1[1]) * 111000 * Math.cos((p1[0] * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Calculates perpendicular distance in meters from a point to the nearest segment of a route polyline.
 * Used for dynamic off-route (rerouting) detection.
 */
export function calculateDistanceToRoute(point, routeCoordinates = []) {
    if (!point || !routeCoordinates || routeCoordinates.length === 0) {
        return { minDistanceMeters: Infinity, closestSegmentIndex: 0, closestCoordIndex: 0 };
    }
    if (routeCoordinates.length === 1) {
        const dist = calculateDistanceMeters(point, routeCoordinates[0]);
        return { minDistanceMeters: dist, closestSegmentIndex: 0, closestCoordIndex: 0 };
    }

    let minDistanceMeters = Infinity;
    let closestSegmentIndex = 0;
    let closestCoordIndex = 0;

    const pLat = point[0];
    const pLng = point[1];
    const cosLat = Math.cos((pLat * Math.PI) / 180);

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
        const a = routeCoordinates[i];
        const b = routeCoordinates[i + 1];

        // Convert delta to local meters projection around point
        const ax = (a[1] - pLng) * 111000 * cosLat;
        const ay = (a[0] - pLat) * 111000;
        const bx = (b[1] - pLng) * 111000 * cosLat;
        const by = (b[0] - pLat) * 111000;

        const segDx = bx - ax;
        const segDy = by - ay;
        const segLenSq = segDx * segDx + segDy * segDy;

        let distMeters;
        if (segLenSq < 0.0001) {
            distMeters = Math.sqrt(ax * ax + ay * ay);
        } else {
            // Project origin (0, 0) in relative meters onto segment AB
            const t = Math.max(0, Math.min(1, -(ax * segDx + ay * segDy) / segLenSq));
            const projX = ax + t * segDx;
            const projY = ay + t * segDy;
            distMeters = Math.sqrt(projX * projX + projY * projY);
        }

        if (distMeters < minDistanceMeters) {
            minDistanceMeters = distMeters;
            closestSegmentIndex = i;
            closestCoordIndex = (Math.sqrt(ax * ax + ay * ay) <= Math.sqrt(bx * bx + by * by)) ? i : i + 1;
        }
    }

    return {
        minDistanceMeters: Math.round(minDistanceMeters * 10) / 10,
        closestSegmentIndex,
        closestCoordIndex
    };
}

/**
 * Projects a user coordinate [lat, lng] onto the nearest route segment
 * if the perpendicular distance is within maxSnapMeters (default 10m).
 * Prevents erratic map puck jumping due to mobile GPS noise.
 */
export function snapToSegment(userCoords, routeCoordinates = [], maxSnapMeters = 10) {
    if (!userCoords || !routeCoordinates || routeCoordinates.length < 2) {
        return userCoords;
    }

    const pLat = userCoords[0];
    const pLng = userCoords[1];
    const cosLat = Math.cos((pLat * Math.PI) / 180);

    let minDistanceMeters = Infinity;
    let bestSnappedPoint = userCoords;

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
        const a = routeCoordinates[i];
        const b = routeCoordinates[i + 1];

        // Delta in local meters
        const ax = (a[1] - pLng) * 111000 * cosLat;
        const ay = (a[0] - pLat) * 111000;
        const bx = (b[1] - pLng) * 111000 * cosLat;
        const by = (b[0] - pLat) * 111000;

        const segDx = bx - ax;
        const segDy = by - ay;
        const segLenSq = segDx * segDx + segDy * segDy;

        if (segLenSq < 0.0001) continue;

        // Projection factor t clamped between [0, 1]
        const t = Math.max(0, Math.min(1, -(ax * segDx + ay * segDy) / segLenSq));
        
        // Orthogonal projection in lat/lng space
        const projLat = a[0] + t * (b[0] - a[0]);
        const projLng = a[1] + t * (b[1] - a[1]);

        // Calculate distance from user coordinate to projected point
        const projX = ax + t * segDx;
        const projY = ay + t * segDy;
        const dist = Math.sqrt(projX * projX + projY * projY);

        if (dist < minDistanceMeters) {
            minDistanceMeters = dist;
            bestSnappedPoint = [projLat, projLng];
        }
    }

    // Only snap if error is within maxSnapMeters threshold
    if (minDistanceMeters <= maxSnapMeters) {
        return bestSnappedPoint;
    }

    return userCoords;
}

/**
 * Calculates exact remaining route distance in meters from current coordinate along remaining route segments
 */
export function calculateRemainingRouteDistance(currentCoord, routeCoordinates = [], closestIndex = 0) {
    if (!routeCoordinates || routeCoordinates.length === 0 || !currentCoord) return 0;
    const lastIdx = routeCoordinates.length - 1;
    if (closestIndex >= lastIdx) {
        return Math.round(calculateDistanceMeters(currentCoord, routeCoordinates[lastIdx]));
    }

    let totalRemaining = calculateDistanceMeters(currentCoord, routeCoordinates[Math.min(closestIndex + 1, lastIdx)]);
    for (let i = closestIndex + 1; i < lastIdx; i++) {
        totalRemaining += calculateDistanceMeters(routeCoordinates[i], routeCoordinates[i + 1]);
    }

    return Math.round(totalRemaining);
}

/**
 * Generates turn-by-turn maneuvers from route coordinates
 */
export function generateRouteManeuvers(coordinates = []) {
    if (!coordinates || coordinates.length < 2) return [];

    const maneuvers = [];
    let cumulativeDist = 0;

    // Initial Departure Maneuver
    maneuvers.push({
        id: 'maneuver_start',
        index: 0,
        coord: coordinates[0],
        distanceFromStartMeters: 0,
        type: 'start',
        instruction: 'Inicia el recorrido y continúa recto por la ciclorruta',
        shortText: 'Continúa recto',
        icon: 'fa-arrow-up',
        announced150: true,
        announced50: true,
        announcedNow: true
    });

    // Detect significant turns (angle >= 35 degrees)
    for (let i = 1; i < coordinates.length - 1; i++) {
        const pPrev = coordinates[i - 1];
        const pCurr = coordinates[i];
        const pNext = coordinates[i + 1];

        const distSegment = calculateDistanceMeters(pPrev, pCurr);
        cumulativeDist += distSegment;

        const b1 = calculateBearing(pPrev, pCurr);
        const b2 = calculateBearing(pCurr, pNext);

        let angleDiff = (b2 - b1 + 360) % 360;
        if (angleDiff > 180) angleDiff -= 360;

        // Threshold for a real turn: |angleDiff| >= 35 deg
        if (Math.abs(angleDiff) >= 35) {
            let type = 'turn-right';
            let instruction = 'Gira a la derecha';
            let icon = 'fa-arrow-turn-right';

            if (angleDiff < -35 && angleDiff > -140) {
                type = 'turn-left';
                instruction = 'Gira a la izquierda';
                icon = 'fa-arrow-turn-left';
            } else if (angleDiff >= 35 && angleDiff <= 140) {
                type = 'turn-right';
                instruction = 'Gira a la derecha';
                icon = 'fa-arrow-turn-right';
            } else if (Math.abs(angleDiff) > 140) {
                type = 'u-turn';
                instruction = 'Haz un cambio de sentido';
                icon = 'fa-arrow-rotate-left';
            }

            maneuvers.push({
                id: `maneuver_${i}`,
                index: i,
                coord: pCurr,
                distanceFromStartMeters: Math.round(cumulativeDist),
                type,
                instruction,
                shortText: instruction,
                icon,
                announced150: false,
                announced50: false,
                announcedNow: false
            });
        }
    }

    // Add Final Destination Maneuver
    const totalDist = cumulativeDist + calculateDistanceMeters(coordinates[coordinates.length - 2], coordinates[coordinates.length - 1]);
    maneuvers.push({
        id: 'maneuver_end',
        index: coordinates.length - 1,
        coord: coordinates[coordinates.length - 1],
        distanceFromStartMeters: Math.round(totalDist),
        type: 'destination',
        instruction: 'Has llegado a tu destino',
        shortText: 'Destino alcanzado',
        icon: 'fa-flag-checkered',
        announced150: false,
        announced50: false,
        announcedNow: false
    });

    return maneuvers;
}

/**
 * Finds next upcoming maneuver ahead of cyclist
 */
export function getUpcomingManeuver(cyclistCoord, maneuvers = [], cyclistIndex = 0) {
    if (!maneuvers || maneuvers.length === 0 || !cyclistCoord) return null;

    // Filter maneuvers that are strictly ahead of current progress or within immediate 15m radius
    for (let i = 0; i < maneuvers.length; i++) {
        const m = maneuvers[i];
        if (m.type === 'start') continue;

        const dist = calculateDistanceMeters(cyclistCoord, m.coord);

        // If maneuver index is ahead of cyclist index OR within immediate 15m trigger zone
        if (m.index >= cyclistIndex || dist <= 15) {
            return {
                maneuver: m,
                distanceMeters: Math.round(dist)
            };
        }
    }

    // If past all turn maneuvers, return the destination maneuver
    const destManeuver = maneuvers.find(m => m.type === 'destination') || maneuvers[maneuvers.length - 1];
    if (destManeuver) {
        return {
            maneuver: destManeuver,
            distanceMeters: Math.round(calculateDistanceMeters(cyclistCoord, destManeuver.coord))
        };
    }

    return null;
}
