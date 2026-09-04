// bikeCaravans.js - Red de Bici-Caravanas y Pelotones Comunitarios Seguros de Bogotá

export const bikeCaravans = [
    {
        id: 'caravan_usme_centro',
        name: 'Bici-Caravana Usme ➔ Centro Histórico',
        organizer: 'Colectivo BiciUsme & Semillero Territorial',
        badge: 'Diaria Matutina',
        meetingPoint: {
            name: 'Plazoleta Portal Usme (Frente a Cicloparqueadero)',
            lat: 4.5317,
            lng: -74.1166,
            assemblyTime: '06:00 AM',
            departureTime: '06:15 AM'
        },
        returnTrip: {
            meetingPoint: 'Parque Santander (Carrera 7 con Calle 16)',
            departureTime: '06:00 PM'
        },
        days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
        scheduleHours: [6, 7, 18, 19], // Horas de vigencia activa
        avgSpeedKmh: 18,
        riskReductionFactor: -1.8, // Bonificación protectora colectiva
        description: 'Rodada grupal protegida de alta afluencia por la Troncal Caracas y Carrera 10. Acompañada con chalecos reflectivos.',
        color: '#10b981',
        coordinates: [
            [4.5317, -74.1166],
            [4.5420, -74.1150],
            [4.5530, -74.1135],
            [4.5631, -74.1128],
            [4.5750, -74.1080],
            [4.5880, -74.0950],
            [4.6010, -74.0750]
        ]
    },
    {
        id: 'caravan_ruu_boyaca',
        name: 'Pelotón Seguro Rafael Uribe ➔ Av. Boyacá',
        organizer: 'Comunidad Bici RUU & Red de Cuadrantes',
        badge: 'Inter-Localidad',
        meetingPoint: {
            name: 'Parque Metropolitano El Tunal (Puerta Ciclorruta)',
            lat: 4.5761,
            lng: -74.1332,
            assemblyTime: '06:20 AM',
            departureTime: '06:30 AM'
        },
        returnTrip: {
            meetingPoint: 'Portal Tunal',
            departureTime: '06:30 PM'
        },
        days: ['Lunes', 'Miércoles', 'Viernes'],
        scheduleHours: [6, 7, 18, 19],
        avgSpeedKmh: 19,
        riskReductionFactor: -1.5,
        description: 'Conexión colectiva entre Rafael Uribe Uribe, Tunjuelito y el corredor industrial de la Av. Boyacá.',
        color: '#06b6d4',
        coordinates: [
            [4.5761, -74.1332],
            [4.5815, -74.1118],
            [4.5680, -74.1250],
            [4.5580, -74.1400],
            [4.5520, -74.1520]
        ]
    },
    {
        id: 'caravan_nocturna_sur',
        name: 'Caravana Nocturna Segura del Sur',
        organizer: 'Red de Colectivos Ciclistas del Sur',
        badge: 'Rodada Nocturna',
        meetingPoint: {
            name: 'Estación Molinos (Costado Oriental)',
            lat: 4.5631,
            lng: -74.1128,
            assemblyTime: '07:45 PM',
            departureTime: '08:00 PM'
        },
        days: ['Martes', 'Jueves'],
        scheduleHours: [20, 21],
        avgSpeedKmh: 17,
        riskReductionFactor: -2.2, // Máxima protección en horario nocturno
        description: 'Acompañamiento nocturno en grupo cerrado con apoyo de iluminación potente y comunicación por radiofrecuencia.',
        color: '#a855f7',
        coordinates: [
            [4.5631, -74.1128],
            [4.5520, -74.1140],
            [4.5410, -74.1155],
            [4.5317, -74.1166]
        ]
    }
];

/**
 * Determina si una coordenada se beneficia de una caravana activa
 */
export function getCaravanSafetyBonus(lat, lng, hour = null) {
    const currentHour = hour !== null ? hour : new Date().getHours();
    
    for (const caravan of bikeCaravans) {
        if (caravan.scheduleHours.includes(currentHour)) {
            // Verificar si el punto está a menos de 150m de la ruta de la caravana
            const isNear = caravan.coordinates.some(pt => {
                const dLat = (pt[0] - lat) * 111000;
                const dLng = (pt[1] - lng) * 111000 * Math.cos(lat * (Math.PI / 180));
                return Math.sqrt(dLat * dLat + dLng * dLng) <= 200;
            });

            if (isNear) {
                return {
                    hasBonus: true,
                    bonusValue: caravan.riskReductionFactor,
                    caravanName: caravan.name,
                    organizer: caravan.organizer
                };
            }
        }
    }

    return { hasBonus: false, bonusValue: 0, caravanName: null };
}
