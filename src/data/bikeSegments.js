// Boundaries and segment data for SafeCycle Bogotá

export const localitiesMap = {
    usaquen: { code: '01', name: 'Usaquén', fullName: 'Usaquén (01)', center: [4.710, -74.030], zoom: 13, color: '#38bdf8' },
    chapinero: { code: '02', name: 'Chapinero', fullName: 'Chapinero (02)', center: [4.655, -74.058], zoom: 14, color: '#f43f5e' },
    santafe: { code: '03', name: 'Santa Fe', fullName: 'Santa Fe (03)', center: [4.598, -74.068], zoom: 14, color: '#10b981' },
    sancristobal: { code: '04', name: 'San Cristóbal', fullName: 'San Cristóbal (04)', center: [4.565, -74.085], zoom: 13, color: '#eab308' },
    usme: { code: '05', name: 'Usme', fullName: 'Usme (05)', center: [4.506, -74.115], zoom: 13, color: '#6366f1' },
    tunjuelito: { code: '06', name: 'Tunjuelito', fullName: 'Tunjuelito (06)', center: [4.580, -74.135], zoom: 14, color: '#84cc16' },
    bosa: { code: '07', name: 'Bosa', fullName: 'Bosa (07)', center: [4.620, -74.190], zoom: 13, color: '#06b6d4' },
    kennedy: { code: '08', name: 'Kennedy', fullName: 'Kennedy (08)', center: [4.625, -74.150], zoom: 13, color: '#ec4899' },
    fontibon: { code: '09', name: 'Fontibón', fullName: 'Fontibón (09)', center: [4.670, -74.145], zoom: 13, color: '#f97316' },
    engativa: { code: '10', name: 'Engativá', fullName: 'Engativá (10)', center: [4.700, -74.115], zoom: 13, color: '#3b82f6' },
    suba: { code: '11', name: 'Suba', fullName: 'Suba (11)', center: [4.735, -74.085], zoom: 13, color: '#14b8a6' },
    barriosunidos: { code: '12', name: 'Barrios Unidos', fullName: 'Barrios Unidos (12)', center: [4.665, -74.075], zoom: 14, color: '#a855f7' },
    teusaquillo: { code: '13', name: 'Teusaquillo', fullName: 'Teusaquillo (13)', center: [4.640, -74.085], zoom: 14, color: '#d946ef' },
    losmartires: { code: '14', name: 'Los Mártires', fullName: 'Los Mártires (14)', center: [4.605, -74.085], zoom: 14, color: '#64748b' },
    antonionarino: { code: '15', name: 'Antonio Nariño', fullName: 'Antonio Nariño (15)', center: [4.590, -74.105], zoom: 14, color: '#06b6d4' },
    puentearanda: { code: '16', name: 'Puente Aranda', fullName: 'Puente Aranda (16)', center: [4.615, -74.115], zoom: 14, color: '#f59e0b' },
    lacandelaria: { code: '17', name: 'La Candelaria', fullName: 'La Candelaria (17)', center: [4.597, -74.072], zoom: 15, color: '#ef4444' },
    ruu: { code: '18', name: 'Rafael Uribe', fullName: 'Rafael Uribe Uribe (18)', center: [4.575, -74.122], zoom: 14, color: '#a855f7' },
    ciudadbolivar: { code: '19', name: 'Ciudad Bolívar', fullName: 'Ciudad Bolívar (19)', center: [4.520, -74.150], zoom: 13, color: '#f43f5e' },
    sumapaz: { code: '20', name: 'Sumapaz', fullName: 'Sumapaz (20)', center: [4.030, -74.220], zoom: 10, color: '#10b981' }
};

export const bikeSegments = {
    // ==========================================
    // Usme Localidad (10 Tramos)
    // ==========================================
    'usme_caracas_norte': {
        id: 'usme_caracas_norte',
        name: 'Av. Caracas Sur (Molinos a Portal Usme)',
        localidad: 'Usme (05)',
        upz: 'UPZ 59 - El Danubio',
        baselineCrime: 'Alto',
        coordinates: [
            [4.550, -74.110],
            [4.542, -74.110],
            [4.532, -74.108]
        ],
        lightingType: 'Sodio',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'usme_caracas': {
        id: 'usme_caracas',
        name: 'Av. Caracas Sur (Portal Usme a Yomasa)',
        localidad: 'Usme (05)',
        upz: 'UPZ 57 - Gran Yomasa',
        baselineCrime: 'Alto',
        coordinates: [
            [4.532, -74.108],
            [4.524, -74.111],
            [4.515, -74.114],
            [4.502, -74.117],
            [4.492, -74.119]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'usme_caracas_sur': {
        id: 'usme_caracas_sur',
        name: 'Av. Caracas Sur (Yomasa a Alfonso López)',
        localidad: 'Usme (05)',
        upz: 'UPZ 56 - Alfonso López',
        baselineCrime: 'Medio',
        coordinates: [
            [4.492, -74.119],
            [4.485, -74.122],
            [4.478, -74.125],
            [4.468, -74.128]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'usme_boyaca': {
        id: 'usme_boyaca',
        name: 'Av. Boyacá Sur (Meissen a Yomasa)',
        localidad: 'Usme (05)',
        upz: 'UPZ 58 - Comuneros',
        baselineCrime: 'Alto',
        coordinates: [
            [4.515, -74.128],
            [4.505, -74.121],
            [4.497, -74.115],
            [4.488, -74.107]
        ],
        lightingType: 'Sodio',
        watts: 75,
        weather: 'seco',
        visibility: 1,
        guardianCai: false,
        guardianRuta: false
    },
    'usme_yomasa_int': {
        id: 'usme_yomasa_int',
        name: 'Ciclorruta Gran Yomasa Interna',
        localidad: 'Usme (05)',
        upz: 'UPZ 57 - Gran Yomasa',
        baselineCrime: 'Alto',
        coordinates: [
            [4.505, -74.121],
            [4.502, -74.115],
            [4.503, -74.110]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'usme_comuneros_int': {
        id: 'usme_comuneros_int',
        name: 'Conector Interno Comuneros',
        localidad: 'Usme (05)',
        upz: 'UPZ 58 - Comuneros',
        baselineCrime: 'Medio',
        coordinates: [
            [4.497, -74.115],
            [4.493, -74.110],
            [4.491, -74.103]
        ],
        lightingType: 'LED',
        watts: 100,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'usme_alopez': {
        id: 'usme_alopez',
        name: 'Vía al Llano (Alfonso López)',
        localidad: 'Usme (05)',
        upz: 'UPZ 56 - Alfonso López',
        baselineCrime: 'Medio',
        coordinates: [
            [4.488, -74.120],
            [4.482, -74.116],
            [4.476, -74.110]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: true
    },
    'usme_danubio': {
        id: 'usme_danubio',
        name: 'Ciclorruta El Danubio - La Fiscala',
        localidad: 'Usme (05)',
        upz: 'UPZ 59 - El Danubio',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.515, -74.115],
            [4.512, -74.108],
            [4.507, -74.102]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: false
    },
    'usme_fiscala': {
        id: 'usme_fiscala',
        name: 'Conector La Fiscala Alta',
        localidad: 'Usme (05)',
        upz: 'UPZ 59 - El Danubio',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.525, -74.105],
            [4.520, -74.100],
            [4.515, -74.098]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 3,
        guardianCai: false,
        guardianRuta: false
    },
    'usme_valles': {
        id: 'usme_valles',
        name: 'Ciclorruta Valles de Cafam',
        localidad: 'Usme (05)',
        upz: 'UPZ 57 - Gran Yomasa',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.512, -74.108],
            [4.504, -74.106],
            [4.498, -74.102]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: false,
        guardianRuta: false
    },

    // ==========================================
    // Rafael Uribe Uribe Localidad (10 Tramos)
    // ==========================================
    'ruu_primero_mayo': {
        id: 'ruu_primero_mayo',
        name: 'Av. Primero de Mayo (Carrera 27 a Carrera 24)',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 39 - Quiroga',
        baselineCrime: 'Alto',
        coordinates: [
            [4.589, -74.114],
            [4.582, -74.121],
            [4.577, -74.127]
        ],
        lightingType: 'Sodio',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_primero_mayo_oriente': {
        id: 'ruu_primero_mayo_oriente',
        name: 'Av. Primero de Mayo (Carrera 24 a Carrera 10)',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 39 - Quiroga',
        baselineCrime: 'Medio',
        coordinates: [
            [4.589, -74.114],
            [4.593, -74.107],
            [4.596, -74.102]
        ],
        lightingType: 'Sodio',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_caracas_molinos': {
        id: 'ruu_caracas_molinos',
        name: 'Av. Caracas Sur (Quiroga a Molinos)',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 53 - Marco Fidel Suárez',
        baselineCrime: 'Alto',
        coordinates: [
            [4.577, -74.116],
            [4.568, -74.114],
            [4.560, -74.112],
            [4.550, -74.110]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_carrera24': {
        id: 'ruu_carrera24',
        name: 'Av. Carrera 24 (Cl 27 Sur a Cl 40 Sur)',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 39 - Quiroga',
        baselineCrime: 'Medio',
        coordinates: [
            [4.586, -74.125],
            [4.578, -74.123],
            [4.573, -74.121]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_gustavo_restrepo': {
        id: 'ruu_gustavo_restrepo',
        name: 'Ciclorruta Gustavo Restrepo / Centenario',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 39 - Quiroga',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.582, -74.122],
            [4.580, -74.115],
            [4.577, -74.116]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_cl40sur': {
        id: 'ruu_cl40sur',
        name: 'Calle 40 Sur (Marruecos a Caracas)',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 54 - Marruecos',
        baselineCrime: 'Alto',
        coordinates: [
            [4.574, -74.117],
            [4.568, -74.124],
            [4.561, -74.129]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 1,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_marruecos_sur': {
        id: 'ruu_marruecos_sur',
        name: 'Ciclorruta Marruecos Sur (Conector Caracas)',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 54 - Marruecos',
        baselineCrime: 'Alto',
        coordinates: [
            [4.561, -74.129],
            [4.558, -74.122],
            [4.554, -74.118],
            [4.550, -74.110]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_diana_turbay': {
        id: 'ruu_diana_turbay',
        name: 'Acceso Diana Turbay (Subida Principal)',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 55 - Diana Turbay',
        baselineCrime: 'Alto',
        coordinates: [
            [4.562, -74.118],
            [4.557, -74.122],
            [4.551, -74.120],
            [4.544, -74.124]
        ],
        lightingType: 'Sodio',
        watts: 50,
        weather: 'seco',
        visibility: 1,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_chimi': {
        id: 'ruu_chimi',
        name: 'Conector Chiminigagua - Diana Turbay',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 55 - Diana Turbay',
        baselineCrime: 'Alto',
        coordinates: [
            [4.551, -74.120],
            [4.548, -74.115],
            [4.546, -74.110]
        ],
        lightingType: 'Sodio',
        watts: 75,
        weather: 'seco',
        visibility: 1,
        guardianCai: false,
        guardianRuta: false
    },
    'ruu_marco_fidel': {
        id: 'ruu_marco_fidel',
        name: 'Conectora Marco Fidel Suárez',
        localidad: 'Rafael Uribe Uribe (18)',
        upz: 'UPZ 53 - Marco Fidel Suárez',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.579, -74.114],
            [4.573, -74.111],
            [4.567, -74.114]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: false
    },

    // ==========================================
    // Chapinero (02)
    // ==========================================
    'chap_septima_sur': {
        id: 'chap_septima_sur',
        name: 'Carrera 7ma (Parque Nacional a Calle 60 - Javeriana)',
        localidad: 'Chapinero (02)',
        upz: 'UPZ 89 - San Isidro Patios',
        baselineCrime: 'Medio',
        coordinates: [
            [4.6240, -74.0650],
            [4.6340, -74.0635],
            [4.6440, -74.0620]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'chap_septima_norte': {
        id: 'chap_septima_norte',
        name: 'Carrera 7ma (Calle 60 a Calle 100 - Chicó)',
        localidad: 'Chapinero (02)',
        upz: 'UPZ 90 - El Refugio',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.6440, -74.0620],
            [4.6620, -74.0570],
            [4.6830, -74.0490]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'chap_carrera11': {
        id: 'chap_carrera11',
        name: 'Ciclorruta Carrera 11 (Calle 82 a Calle 100 - Virrey)',
        localidad: 'Chapinero (02)',
        upz: 'UPZ 90 - El Refugio',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.6660, -74.0550],
            [4.6738, -74.0535],
            [4.6840, -74.0480]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: false,
        guardianRuta: false
    },
    'chap_calle72': {
        id: 'chap_calle72',
        name: 'Calle 72 Corredor Financiero (Cra 7ma a Av. Caracas)',
        localidad: 'Chapinero (02)',
        upz: 'UPZ 99 - Chapinero',
        baselineCrime: 'Medio',
        coordinates: [
            [4.6560, -74.0580],
            [4.6575, -74.0620],
            [4.6590, -74.0665]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: true,
        guardianRuta: false
    },

    // ==========================================
    // Santa Fe (03) & La Candelaria (17)
    // ==========================================
    'stafe_eje_ambiental': {
        id: 'stafe_eje_ambiental',
        name: 'Eje Ambiental / Av. Jiménez (Cra 1 a Cra 10)',
        localidad: 'Santa Fe (03)',
        upz: 'UPZ 91 - Sagrado Corazón',
        baselineCrime: 'Alto',
        coordinates: [
            [4.6015, -74.0661],
            [4.6010, -74.0715],
            [4.6025, -74.0760]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: true,
        guardianRuta: true
    },
    'stafe_carrera7_centro': {
        id: 'stafe_carrera7_centro',
        name: 'Carrera 7ma Peatonal (Plaza de Bolívar a Calle 26)',
        localidad: 'Santa Fe (03)',
        upz: 'UPZ 92 - La Macarena',
        baselineCrime: 'Medio',
        coordinates: [
            [4.5980, -74.0760],
            [4.6070, -74.0710],
            [4.6150, -74.0680]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'candelaria_cl10': {
        id: 'candelaria_cl10',
        name: 'Calle 10 Histórica (Plazoleta Chorro de Quevedo)',
        localidad: 'La Candelaria (17)',
        upz: 'UPZ 94 - La Candelaria',
        baselineCrime: 'Medio',
        coordinates: [
            [4.5970, -74.0700],
            [4.5960, -74.0720],
            [4.5950, -74.0745]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 2,
        guardianCai: true,
        guardianRuta: false
    },

    // ==========================================
    // Teusaquillo (13)
    // ==========================================
    'teusa_calle26_oriente': {
        id: 'teusa_calle26_oriente',
        name: 'Av. Calle 26 (Av. Caracas a Cra 30 / U. Nacional)',
        localidad: 'Teusaquillo (13)',
        upz: 'UPZ 106 - Teusaquillo',
        baselineCrime: 'Medio',
        coordinates: [
            [4.6160, -74.0730],
            [4.6260, -74.0810],
            [4.6320, -74.0860]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'teusa_calle26_salitre': {
        id: 'teusa_calle26_salitre',
        name: 'Av. Calle 26 (Cra 30 a Gran Estación / Cra 66)',
        localidad: 'Teusaquillo (13)',
        upz: 'UPZ 107 - Quinta Paredes',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.6320, -74.0860],
            [4.6410, -74.0950],
            [4.6475, -74.1023]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'teusa_calle53': {
        id: 'teusa_calle53',
        name: 'Ciclorruta Calle 53 (Galerías a Parque Simón Bolívar)',
        localidad: 'Teusaquillo (13)',
        upz: 'UPZ 106 - Teusaquillo',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.6450, -74.0720],
            [4.6510, -74.0830],
            [4.6583, -74.0935]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 3,
        guardianCai: false,
        guardianRuta: true
    },
    'teusa_nqs_centro': {
        id: 'teusa_nqs_centro',
        name: 'Av. NQS / Carrera 30 (Calle 26 a Movistar Arena)',
        localidad: 'Teusaquillo (13)',
        upz: 'UPZ 107 - Quinta Paredes',
        baselineCrime: 'Medio',
        coordinates: [
            [4.6310, -74.0840],
            [4.6420, -74.0810],
            [4.6520, -74.0780]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },

    // ==========================================
    // Suba (11)
    // ==========================================
    'suba_av_suba_sur': {
        id: 'suba_av_suba_sur',
        name: 'Av. Suba (Calle 100 a Humedal Córdoba)',
        localidad: 'Suba (11)',
        upz: 'UPZ 71 - Niza',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.6920, -74.0680],
            [4.7080, -74.0770],
            [4.7190, -74.0830]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: false
    },
    'suba_av_suba_norte': {
        id: 'suba_av_suba_norte',
        name: 'Av. Suba (Humedal Córdoba a Portal Suba)',
        localidad: 'Suba (11)',
        upz: 'UPZ 27 - Suba Rincón',
        baselineCrime: 'Medio',
        coordinates: [
            [4.7190, -74.0830],
            [4.7330, -74.0900],
            [4.7478, -74.0954]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: true,
        guardianRuta: true
    },
    'suba_calle134': {
        id: 'suba_calle134',
        name: 'Ciclorruta Calle 134 (Auto Norte a Av. Suba)',
        localidad: 'Suba (11)',
        upz: 'UPZ 71 - Niza',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.7230, -74.0530],
            [4.7240, -74.0690],
            [4.7250, -74.0810]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 3,
        guardianCai: false,
        guardianRuta: false
    },

    // ==========================================
    // Usaquén (01)
    // ==========================================
    'usaq_auto_norte': {
        id: 'usaq_auto_norte',
        name: 'Autopista Norte (Calle 100 a Calle 170 / Portal Norte)',
        localidad: 'Usaquén (01)',
        upz: 'UPZ 10 - La Uribe',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.6930, -74.0590],
            [4.7230, -74.0530],
            [4.7554, -74.0458]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'usaq_carrera7_norte': {
        id: 'usaq_carrera7_norte',
        name: 'Carrera 7ma (Calle 100 a Usaquén Plaza / Calle 127)',
        localidad: 'Usaquén (01)',
        upz: 'UPZ 12 - Toberín',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.6830, -74.0490],
            [4.6980, -74.0320],
            [4.7080, -74.0290]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: false
    },

    // ==========================================
    // Kennedy (08)
    // ==========================================
    'kenn_americas_oriente': {
        id: 'kenn_americas_oriente',
        name: 'Av. Las Américas (Puente Aranda Cra 50 a Banderas)',
        localidad: 'Kennedy (08)',
        upz: 'UPZ 46 - Castilla',
        baselineCrime: 'Alto',
        coordinates: [
            [4.6280, -74.1160],
            [4.6250, -74.1370],
            [4.6220, -74.1530]
        ],
        lightingType: 'Sodio',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: true,
        guardianRuta: true
    },
    'kenn_americas_portal': {
        id: 'kenn_americas_portal',
        name: 'Av. Las Américas (Banderas a Portal Américas)',
        localidad: 'Kennedy (08)',
        upz: 'UPZ 47 - Kennedy Central',
        baselineCrime: 'Alto',
        coordinates: [
            [4.6220, -74.1530],
            [4.6260, -74.1680],
            [4.6293, -74.1788]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 1,
        guardianCai: false,
        guardianRuta: true
    },
    'kenn_alameda_tintal': {
        id: 'kenn_alameda_tintal',
        name: 'Alameda El Porvenir (Biblioteca El Tintal a Patio Bonito)',
        localidad: 'Kennedy (08)',
        upz: 'UPZ 82 - Patio Bonito',
        baselineCrime: 'Alto',
        coordinates: [
            [4.6400, -74.1620],
            [4.6330, -74.1690],
            [4.6260, -74.1760]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: true,
        guardianRuta: false
    },
    'kenn_boyaca_sur': {
        id: 'kenn_boyaca_sur',
        name: 'Av. Boyacá (Av. Primero de Mayo a Sevillana)',
        localidad: 'Kennedy (08)',
        upz: 'UPZ 45 - Carvajal',
        baselineCrime: 'Medio',
        coordinates: [
            [4.6050, -74.1480],
            [4.5990, -74.1440],
            [4.5920, -74.1410]
        ],
        lightingType: 'Sodio',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },

    // ==========================================
    // Fontibón (09)
    // ==========================================
    'font_calle26_occidente': {
        id: 'font_calle26_occidente',
        name: 'Av. Calle 26 (Gran Estación a Aeropuerto El Dorado)',
        localidad: 'Fontibón (09)',
        upz: 'UPZ 110 - Fontibón San Pablo',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.6475, -74.1023],
            [4.6650, -74.1200],
            [4.6970, -74.1420]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'font_ferrocarril': {
        id: 'font_ferrocarril',
        name: 'Ciclorruta Av. Ferrocarril (Cra 68 a Fontibón Centro)',
        localidad: 'Fontibón (09)',
        upz: 'UPZ 114 - Modelia',
        baselineCrime: 'Medio',
        coordinates: [
            [4.6450, -74.1130],
            [4.6580, -74.1280],
            [4.6710, -74.1430]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },

    // ==========================================
    // Engativá (10)
    // ==========================================
    'enga_calle80': {
        id: 'enga_calle80',
        name: 'Ciclorruta Calle 80 (Cra 68 a Portal 80)',
        localidad: 'Engativá (10)',
        upz: 'UPZ 75 - Minuto de Dios',
        baselineCrime: 'Medio',
        coordinates: [
            [4.6780, -74.0790],
            [4.6940, -74.0970],
            [4.7095, -74.1105]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'enga_calle63_occidente': {
        id: 'enga_calle63_occidente',
        name: 'Ciclorruta Calle 63 (Simón Bolívar a Álamos / SENA)',
        localidad: 'Engativá (10)',
        upz: 'UPZ 77 - Las Ferias',
        baselineCrime: 'Medio',
        coordinates: [
            [4.6620, -74.0990],
            [4.6740, -74.1110],
            [4.6853, -74.1205]
        ],
        lightingType: 'LED',
        watts: 150,
        weather: 'seco',
        visibility: 2,
        guardianCai: false,
        guardianRuta: false
    },

    // ==========================================
    // Bosa (07) & Tunjuelito (06)
    // ==========================================
    'tunj_auto_sur': {
        id: 'tunj_auto_sur',
        name: 'Autopista Sur (Sevillana a Alkosto Venecia)',
        localidad: 'Tunjuelito (06)',
        upz: 'UPZ 42 - Venecia',
        baselineCrime: 'Alto',
        coordinates: [
            [4.5920, -74.1410],
            [4.5950, -74.1390],
            [4.5971, -74.1378]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 2,
        guardianCai: true,
        guardianRuta: false
    },
    'tunj_parque_tunal': {
        id: 'tunj_parque_tunal',
        name: 'Anillo Perimetral Parque El Tunal',
        localidad: 'Tunjuelito (06)',
        upz: 'UPZ 62 - Tunjuelito',
        baselineCrime: 'Bajo',
        coordinates: [
            [4.5761, -74.1332],
            [4.5790, -74.1310],
            [4.5770, -74.1280]
        ],
        lightingType: 'LED',
        watts: 200,
        weather: 'seco',
        visibility: 3,
        guardianCai: true,
        guardianRuta: true
    },
    'bosa_porvenir_sur': {
        id: 'bosa_porvenir_sur',
        name: 'Alameda El Porvenir (Bosa Recreo a San Bernardino)',
        localidad: 'Bosa (07)',
        upz: 'UPZ 84 - Bosa Occidental',
        baselineCrime: 'Alto',
        coordinates: [
            [4.6200, -74.1850],
            [4.6150, -74.1950],
            [4.6100, -74.2050]
        ],
        lightingType: 'Sodio',
        watts: 100,
        weather: 'seco',
        visibility: 1,
        guardianCai: false,
        guardianRuta: false
    }
};
