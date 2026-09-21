import { useEffect, useRef } from 'react';

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Mapa Leaflet con un solo pin arrastrable, para modales.
 *
 * - Se inicializa cuando `isOpen` pasa a true y se destruye al cerrar.
 * - `onMove(lat, lon)` se dispara al arrastrar el pin o hacer clic en el mapa
 *   (siempre con la versión más reciente del callback, sin closures viejos).
 * - `moveTo(lat, lon, zoom, fly)` mueve pin y vista desde fuera.
 *
 * Leaflet se carga por <script> global (window.L).
 */
export function useLeafletPin({ isOpen, center, zoom = 13, icon = null, tooltip = null, onMove, onUnavailable, delay = 150 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Refs para leer siempre el valor actual dentro del efecto de apertura
  const onMoveRef = useRef(onMove);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  onMoveRef.current = onMove;
  centerRef.current = center;
  zoomRef.current = zoom;

  useEffect(() => {
    if (!isOpen) return undefined;

    const timer = setTimeout(() => {
      const L = typeof window !== 'undefined' ? window.L : null;
      if (!containerRef.current) return;
      if (!L) {
        if (onUnavailable) onUnavailable();
        return;
      }

      const { lat, lon } = centerRef.current;
      const z = zoomRef.current;

      if (mapRef.current) {
        mapRef.current.invalidateSize();
        mapRef.current.setView([lat, lon], z);
        if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
        return;
      }

      const map = L.map(containerRef.current, { center: [lat, lon], zoom: z, zoomControl: true });
      L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);

      const markerOptions = { draggable: true, autoPan: true };
      if (icon) markerOptions.icon = L.divIcon(icon);
      const marker = L.marker([lat, lon], markerOptions).addTo(map);

      if (tooltip) {
        marker.bindTooltip(tooltip, { permanent: false, direction: 'top', offset: [0, -35] });
      }

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        if (onMoveRef.current) onMoveRef.current(pos.lat, pos.lng);
      });
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        if (onMoveRef.current) onMoveRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    }
  }, [isOpen]);

  const moveTo = (lat, lon, z = 16, fly = true) => {
    if (!mapRef.current || !markerRef.current) return;
    if (fly) {
      mapRef.current.flyTo([lat, lon], z, { duration: 1.2 });
    } else {
      mapRef.current.setView([lat, lon], z, { animate: true });
    }
    markerRef.current.setLatLng([lat, lon]);
  };

  return { containerRef, moveTo };
}
