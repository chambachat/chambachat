/**
 * Ubicación del candidato (colonia/municipio + coordenadas) compartida entre el chat y el perfil.
 * Se guarda en localStorage y se avisa por evento para que el chat la refleje sin recargar.
 */
export const LOCATION_STORAGE_KEY = 'candidate_location';
export const LOCATION_UPDATED_EVENT = 'chambachat:location-updated';

export function readStoredLocation() {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

/** Guarda en este dispositivo sin avisar a nadie (sincronización silenciosa desde el perfil del usuario). */
export function persistStoredLocation(location) {
  try {
    if (location) localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
    else localStorage.removeItem(LOCATION_STORAGE_KEY);
  } catch (e) {}
}

/** Guarda y avisa (evento) para que el chat la refleje y se la comunique al bot. */
export function saveStoredLocation(location) {
  persistStoredLocation(location);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCATION_UPDATED_EVENT, { detail: location }));
  }
}

/** Ubicación confirmada del usuario autenticado (si la tiene) en el formato del chat. */
export function locationFromUser(user) {
  if (!user?.ubicacion_confirmada || user.latitud == null || user.longitud == null) return null;
  return {
    lat: user.latitud,
    lon: user.longitud,
    colonia: user.colonia || '',
    municipio: user.municipio || 'Apodaca',
  };
}

export function formatLocation(location) {
  if (!location) return '';
  return [location.colonia, location.municipio].filter(Boolean).join(', ');
}
