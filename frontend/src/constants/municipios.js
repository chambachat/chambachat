/**
 * Catálogo geográfico único de Nuevo León para el frontend.
 * Cualquier componente que necesite municipios, coordenadas, parques
 * industriales o zonas rápidas debe importarlo de aquí.
 * El equivalente en backend es app/services/geo.py.
 */

// Huinalá, Apodaca: centro por defecto de los mapas
export const DEFAULT_CENTER = { lat: 25.7535, lon: -100.1742 };

// Coordenadas [lat, lon] por municipio (claves en minúsculas, con y sin acento)
export const MUNICIPIOS_COORDS = {
  'monterrey': [25.6866, -100.3161],
  'apodaca': [25.7816, -100.1887],
  'guadalupe': [25.6775, -100.2597],
  'san nicolás de los garza': [25.7486, -100.2887],
  'san nicolás': [25.7486, -100.2887],
  'san nicolas': [25.7486, -100.2887],
  'general escobedo': [25.7972, -100.3275],
  'escobedo': [25.7972, -100.3275],
  'pesquería': [25.7869, -100.0506],
  'pesqueria': [25.7869, -100.0506],
  'garcía': [25.8139, -100.5947],
  'garcia': [25.8139, -100.5947],
  'santa catarina': [25.6756, -100.4636],
  'juárez': [25.6481, -100.0933],
  'juarez': [25.6481, -100.0933],
};

export function getMunicipioCoords(nombre) {
  const key = (nombre || '').trim().toLowerCase();
  return MUNICIPIOS_COORDS[key] || MUNICIPIOS_COORDS['apodaca'];
}

// Lista completa para formularios de empresa (alta, edición, ubicación de planta)
export const MUNICIPIOS_NL = [
  'Apodaca',
  'Pesquería',
  'San Nicolás de los Garza',
  'Monterrey',
  'General Escobedo',
  'Guadalupe',
  'Santa Catarina',
  'García',
  'Ciénega de Flores',
  'Salinas Victoria',
  'Santiago',
  'San Pedro Garza García',
  'Cadereyta Jiménez',
  'Juárez',
  'El Carmen',
  'Montemorelos',
  'Linares',
  'Marín',
  'Doctor Arroyo',
  'Sabinas Hidalgo',
  'Allende',
  'Zuazua',
  'Hidalgo',
  'Abasolo',
];

// Lista corta y coloquial para el selector del candidato en el chat
export const MUNICIPIOS_NL_CANDIDATO = [
  'Apodaca',
  'Pesquería',
  'Guadalupe',
  'Escobedo',
  'San Nicolás',
  'Monterrey',
  'García',
  'Santa Catarina',
  'Juárez',
  'Cadereyta',
];

// Parques industriales para ubicar plantas
export const INDUSTRIAL_PARKS_NL = [
  { name: 'Parque Ind. Huinalá', mun: 'Apodaca', lat: 25.7485, lon: -100.1650 },
  { name: 'Parque Ind. Kronos', mun: 'Apodaca', lat: 25.7650, lon: -100.1800 },
  { name: 'Stiva Aeropuerto', mun: 'Apodaca', lat: 25.7800, lon: -100.1350 },
  { name: 'Parque Ind. Monterrey', mun: 'Apodaca', lat: 25.7550, lon: -100.2050 },
  { name: 'Planta KIA Motors', mun: 'Pesquería', lat: 25.7635, lon: -100.0070 },
  { name: 'Parque Nexxus XXI', mun: 'Escobedo', lat: 25.8150, lon: -100.3250 },
  { name: 'Parque Hofusan', mun: 'Salinas Victoria', lat: 25.9600, lon: -100.2750 },
  { name: 'Zona Ind. Santa Catarina', mun: 'Santa Catarina', lat: 25.6850, lon: -100.4700 },
  { name: 'Zona Ind. Valle Soleado', mun: 'Guadalupe', lat: 25.7042, lon: -100.1856 },
  { name: 'Parque Ciénega', mun: 'Ciénega de Flores', lat: 25.9520, lon: -100.1650 },
];

// Colonias frecuentes de operarios para el selector rápido del candidato
export const QUICK_ZONES = [
  { label: 'Huinalá, Apodaca', lat: 25.7535, lon: -100.1742, colonia: 'Huinalá', municipio: 'Apodaca' },
  { label: 'Pueblo Nuevo, Apodaca', lat: 25.7689, lon: -100.1612, colonia: 'Pueblo Nuevo', municipio: 'Apodaca' },
  { label: 'Santa Rosa, Apodaca', lat: 25.8080, lon: -100.1985, colonia: 'Santa Rosa', municipio: 'Apodaca' },
  { label: 'Valle Soleado, Gpe', lat: 25.7042, lon: -100.1856, colonia: 'Valle Soleado', municipio: 'Guadalupe' },
  { label: 'Centro Pesquería', lat: 25.7836, lon: -100.0528, colonia: 'Centro', municipio: 'Pesquería' },
  { label: 'Valle de Sta María, Pesquería', lat: 25.7610, lon: -100.0820, colonia: 'Valle de Santa María', municipio: 'Pesquería' },
  { label: 'La Alianza, Escobedo', lat: 25.8350, lon: -100.3950, colonia: 'La Alianza', municipio: 'Escobedo' },
  { label: 'La Fama, Santa Catarina', lat: 25.6740, lon: -100.4420, colonia: 'La Fama', municipio: 'Santa Catarina' },
  { label: 'Solidaridad, Monterrey', lat: 25.7620, lon: -100.3850, colonia: 'Solidaridad', municipio: 'Monterrey' },
];

/**
 * Estimación rápida de municipio por cuadrantes del área metropolitana de Monterrey.
 * Se usa cuando el candidato mueve el pin y no queremos esperar a Nominatim.
 */
export function deduceMunicipioFromCoords(lat, lon) {
  if (lat >= 25.73 && lat <= 25.85 && lon >= -100.28 && lon <= -100.12) return 'Apodaca';
  if (lat >= 25.72 && lat <= 25.85 && lon > -100.12) return 'Pesquería';
  if (lat >= 25.63 && lat <= 25.73 && lon >= -100.26 && lon <= -100.15) return 'Guadalupe';
  if (lat >= 25.76 && lat <= 25.88 && lon <= -100.26 && lon >= -100.42) return 'Escobedo';
  if (lat >= 25.71 && lat <= 25.77 && lon >= -100.32 && lon <= -100.22) return 'San Nicolás';
  if (lat >= 25.64 && lat <= 25.72 && lon <= -100.39 && lon >= -100.52) return 'Santa Catarina';
  if (lat >= 25.76 && lat <= 25.88 && lon <= -100.48) return 'García';
  return 'Monterrey';
}
