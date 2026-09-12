/**
 * Base de Datos de Destinos y Categorías de Movilidad Urbana en Bogotá
 * Diseñado para ciclistas urbanos en Ruta Clara.
 */

export const PLACE_CATEGORIES = {
    home: {
        id: 'home',
        label: 'Casa / Hogar',
        icon: 'fa-solid fa-house',
        emoji: '🏠',
        color: 'emerald',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        description: 'Punto de partida y retorno diario'
    },
    work: {
        id: 'work',
        label: 'Trabajo / Oficina',
        icon: 'fa-solid fa-briefcase',
        emoji: '💼',
        color: 'blue',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'Tu lugar laboral o coworking'
    },
    study: {
        id: 'study',
        label: 'Estudio / Universidad',
        icon: 'fa-solid fa-graduation-cap',
        emoji: '🎓',
        color: 'amber',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        description: 'Universidad, colegio o instituto'
    },
    gym: {
        id: 'gym',
        label: 'Gimnasio / Deporte',
        icon: 'fa-solid fa-dumbbell',
        emoji: '🏋️',
        color: 'orange',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        description: 'Entrenamiento, acondicionamiento y canchas'
    },
    shopping: {
        id: 'shopping',
        label: 'Supermercado / Tienda',
        icon: 'fa-solid fa-cart-shopping',
        emoji: '🛒',
        color: 'teal',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
        description: 'Compras de víveres o almacenes de cadena'
    },
    food: {
        id: 'food',
        label: 'Café / Restaurante',
        icon: 'fa-solid fa-mug-hot',
        emoji: '☕',
        color: 'rose',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        description: 'Encuentros sociales o trabajo remoto'
    },
    health: {
        id: 'health',
        label: 'Salud / Médico / EPS',
        icon: 'fa-solid fa-hospital',
        emoji: '🏥',
        color: 'red',
        badgeClass: 'bg-red-50 text-red-700 border-red-200',
        description: 'Clínicas, centros médicos y farmacias'
    },
    social: {
        id: 'social',
        label: 'Familia y Amigos',
        icon: 'fa-solid fa-heart',
        emoji: '👨‍👩‍👧',
        color: 'pink',
        badgeClass: 'bg-pink-50 text-pink-700 border-pink-200',
        description: 'Hogares de seres queridos visitados con frecuencia'
    },
    bike_shop: {
        id: 'bike_shop',
        label: 'Bici-Taller / Repuestos',
        icon: 'fa-solid fa-bicycle',
        emoji: '🚲',
        color: 'emerald',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        description: 'Mantenimiento, despinche y accesorios ciclistas'
    },
    park: {
        id: 'park',
        label: 'Parque / Ciclovía',
        icon: 'fa-solid fa-tree',
        emoji: '🌳',
        color: 'green',
        badgeClass: 'bg-green-50 text-green-700 border-green-200',
        description: 'Recreación al aire libre y rutas dominicales'
    },
    worship: {
        id: 'worship',
        label: 'Espiritual / Iglesia',
        icon: 'fa-solid fa-place-of-worship',
        emoji: '⛪',
        color: 'indigo',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        description: 'Centros de culto y comunidad'
    },
    custom: {
        id: 'custom',
        label: 'Otro / Personalizado',
        icon: 'fa-solid fa-bookmark',
        emoji: '📦',
        color: 'slate',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        description: 'Cualquier otro destino importante para ti'
    }
};

export const BOGOTA_POPULAR_DESTINATIONS = [
    // Nodos Intermodales & Portales
    {
        name: 'Portal Usme',
        category: 'transit',
        icon: 'fa-solid fa-bus',
        localidad: 'Usme (05)',
        coords: { lat: 4.5317, lng: -74.1166 },
        address: 'Av. Caracas con Calle 65 Sur'
    },
    {
        name: 'Estación Molinos',
        category: 'transit',
        icon: 'fa-solid fa-train-subway',
        localidad: 'Rafael Uribe Uribe (18)',
        coords: { lat: 4.5631, lng: -74.1128 },
        address: 'Av. Caracas con Calle 51 Sur'
    },
    {
        name: 'Portal 80',
        category: 'transit',
        icon: 'fa-solid fa-bus',
        localidad: 'Engativá (10)',
        coords: { lat: 4.7095, lng: -74.1105 },
        address: 'Calle 80 con Carrera 100'
    },
    {
        name: 'Portal Norte',
        category: 'transit',
        icon: 'fa-solid fa-bus',
        localidad: 'Suba (11)',
        coords: { lat: 4.7554, lng: -74.0458 },
        address: 'Autopista Norte con Calle 170'
    },
    {
        name: 'Portal Américas',
        category: 'transit',
        icon: 'fa-solid fa-bus',
        localidad: 'Kennedy (08)',
        coords: { lat: 4.6293, lng: -74.1788 },
        address: 'Av. Ciudad de Cali con Av. Villavicencio'
    },
    {
        name: 'Portal Suba',
        category: 'transit',
        icon: 'fa-solid fa-bus',
        localidad: 'Suba (11)',
        coords: { lat: 4.7478, lng: -74.0954 },
        address: 'Av. Suba con Calle 145'
    },

    // Parques y Recreación
    {
        name: 'Parque Simón Bolívar',
        category: 'park',
        icon: 'fa-solid fa-tree',
        localidad: 'Teusaquillo (13)',
        coords: { lat: 4.6583, lng: -74.0935 },
        address: 'Calle 63 con Carrera 60'
    },
    {
        name: 'Parque El Tunal',
        category: 'park',
        icon: 'fa-solid fa-tree',
        localidad: 'Tunjuelito (06)',
        coords: { lat: 4.5761, lng: -74.1332 },
        address: 'Calle 48B Sur con Carrera 24'
    },
    {
        name: 'Parque El Virrey',
        category: 'park',
        icon: 'fa-solid fa-tree',
        localidad: 'Chapinero (02)',
        coords: { lat: 4.6738, lng: -74.0535 },
        address: 'Calle 88 con Carrera 15'
    },
    {
        name: 'Parque Entre Nubes',
        category: 'park',
        icon: 'fa-solid fa-mountain',
        localidad: 'Usme (05)',
        coords: { lat: 4.5539, lng: -74.0934 },
        address: 'Cerros del Sur de Bogotá'
    },
    {
        name: 'Alto de Patios (Ciclorruta)',
        category: 'park',
        icon: 'fa-solid fa-bicycle',
        localidad: 'Chapinero (02)',
        coords: { lat: 4.6685, lng: -74.0205 },
        address: 'Vía a La Calera Km 6'
    },

    // Centros de Estudio & Universidades
    {
        name: 'Universidad Nacional',
        category: 'study',
        icon: 'fa-solid fa-graduation-cap',
        localidad: 'Teusaquillo (13)',
        coords: { lat: 4.6372, lng: -74.0839 },
        address: 'Carrera 30 con Calle 45'
    },
    {
        name: 'Pontificia Universidad Javeriana',
        category: 'study',
        icon: 'fa-solid fa-graduation-cap',
        localidad: 'Chapinero (02)',
        coords: { lat: 4.6288, lng: -74.0645 },
        address: 'Carrera 7 con Calle 40'
    },
    {
        name: 'Universidad de Los Andes',
        category: 'study',
        icon: 'fa-solid fa-graduation-cap',
        localidad: 'Santa Fe (03)',
        coords: { lat: 4.6015, lng: -74.0661 },
        address: 'Carrera 1 Este con Calle 19A'
    },
    {
        name: 'SENA Complejo Salitre / Álamos',
        category: 'study',
        icon: 'fa-solid fa-graduation-cap',
        localidad: 'Engativá (10)',
        coords: { lat: 4.6853, lng: -74.1205 },
        address: 'Calle 63 con Carrera 93'
    },

    // Comercio y Centros de Servicios
    {
        name: 'Centro Mayor',
        category: 'shopping',
        icon: 'fa-solid fa-store',
        localidad: 'Antonio Nariño (15)',
        coords: { lat: 4.5932, lng: -74.1245 },
        address: 'Autopista Sur con Calle 38A Sur'
    },
    {
        name: 'Gran Estación',
        category: 'shopping',
        icon: 'fa-solid fa-bag-shopping',
        localidad: 'Teusaquillo (13)',
        coords: { lat: 4.6475, lng: -74.1023 },
        address: 'Calle 26 con Carrera 66'
    },
    {
        name: 'Alkosto Venecia',
        category: 'shopping',
        icon: 'fa-solid fa-cart-shopping',
        localidad: 'Tunjuelito (06)',
        coords: { lat: 4.5971, lng: -74.1378 },
        address: 'Autopista Sur con Carrera 53'
    },
    {
        name: 'Plaza de Paloquemao',
        category: 'shopping',
        icon: 'fa-solid fa-apple-whole',
        localidad: 'Los Mártires (14)',
        coords: { lat: 4.6135, lng: -74.0862 },
        address: 'Calle 19 con Carrera 22'
    },

    // Salud y Hospitales
    {
        name: 'Clínica Colombia',
        category: 'health',
        icon: 'fa-solid fa-hospital',
        localidad: 'Teusaquillo (13)',
        coords: { lat: 4.6445, lng: -74.0988 },
        address: 'Calle 23 con Carrera 66'
    },
    {
        name: 'Hospital San Ignacio',
        category: 'health',
        icon: 'fa-solid fa-hospital',
        localidad: 'Chapinero (02)',
        coords: { lat: 4.6295, lng: -74.0641 },
        address: 'Carrera 7 con Calle 42'
    },

    // Bici-Talleres y Asistencia Mecánica
    {
        name: 'Bici-Taller Séptima con 60',
        category: 'bike_shop',
        icon: 'fa-solid fa-wrench',
        localidad: 'Chapinero (02)',
        coords: { lat: 4.6455, lng: -74.0620 },
        address: 'Carrera 7 con Calle 60'
    },
    {
        name: 'Bici-Punto Américas con 50',
        category: 'bike_shop',
        icon: 'fa-solid fa-bicycle',
        localidad: 'Puente Aranda (16)',
        coords: { lat: 4.6280, lng: -74.1160 },
        address: 'Av. Las Américas con Carrera 50'
    }
];
