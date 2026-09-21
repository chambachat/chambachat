/**
 * Geocodificación con Nominatim (OpenStreetMap) y GPS del navegador.
 * Único punto de acceso para reverse/search: antes estaba triplicado en
 * CompanyLocationModal, LocationPickerModal y TransportRoutesManager.
 */
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const HEADERS = { 'Accept-Language': 'es' };

/**
 * Coordenadas → dirección legible.
 * Devuelve null si Nominatim no responde.
 */
export async function reverseGeocode(lat, lon) {
  const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const addr = data?.address || {};

  const road = addr.road || addr.pedestrian || addr.industrial || addr.neighbourhood || addr.suburb || '';
  const neighborhood = addr.neighbourhood || addr.suburb || addr.residential || '';
  const city = addr.city || addr.town || addr.county || addr.municipality || '';
  const area = addr.suburb || addr.neighbourhood || addr.city_district || city;

  let formatted = road ? road + (addr.house_number ? ` #${addr.house_number}` : '') : '';
  if (neighborhood && neighborhood !== road) {
    formatted += formatted ? `, Col. ${neighborhood}` : `Col. ${neighborhood}`;
  }
  if (!formatted && data.display_name) {
    formatted = data.display_name.split(',').slice(0, 3).join(',');
  }

  return { address: addr, road, neighborhood, city, area, displayName: data.display_name || '', formatted };
}

/**
 * Texto → lista de resultados Nominatim acotados a Nuevo León.
 */
export async function searchAddress(query, limit = 5) {
  const q = encodeURIComponent(`${query.trim()}, Nuevo León, México`);
  const res = await fetch(`${NOMINATIM}/search?format=json&q=${q}&limit=${limit}&addressdetails=1`, { headers: HEADERS });
  if (!res.ok) return [];
  const results = await res.json();
  return Array.isArray(results) ? results : [];
}

/** Ciudad devuelta por Nominatim → nombre del catálogo de municipios NL (o null). */
export function matchMunicipio(cityName, municipios) {
  const city = (cityName || '').toLowerCase();
  if (!city) return null;
  return municipios.find(m => city.includes(m.toLowerCase()) || m.toLowerCase().includes(city)) || null;
}

/** Primeras 3 partes de un display_name de Nominatim. */
export function shortDisplayName(displayName) {
  return (displayName || '').split(',').slice(0, 3).join(',').trim();
}

/** GPS del navegador como promesa. Rechaza con Error si no hay soporte o el usuario niega permiso. */
export function getCurrentPosition(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Tu navegador no cuenta con soporte para GPS.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: Number(pos.coords.latitude.toFixed(5)), lon: Number(pos.coords.longitude.toFixed(5)) }),
      (err) => reject(err),
      options
    );
  });
}
