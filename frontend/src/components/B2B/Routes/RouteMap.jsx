import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { MUNICIPIOS_COORDS } from './constants';

export default function RouteMap({
  isEditing,
  activeRoute,
  stops,
  routeColor,
  companyLocation,
  onMapClick
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polylineLayerRef = useRef(null);
  const isEditingRef = useRef(isEditing);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    isEditingRef.current = isEditing;
    if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
      mapInstanceRef.current.getContainer().style.cursor = isEditing ? 'crosshair' : '';
    }
  }, [isEditing]);

  const companyLocationRef = useRef(companyLocation);
  useEffect(() => {
    companyLocationRef.current = companyLocation;
  }, [companyLocation]);

  const getCompanyCenter = () => {
    const comp = companyLocationRef.current;
    const lat = comp?.latitud ? parseFloat(comp.latitud) : null;
    const lon = comp?.longitud ? parseFloat(comp.longitud) : null;
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
      return [lat, lon];
    }
    if (!comp?.municipio) return [25.7816, -100.1887];
    const m = (comp.municipio || '').trim().toLowerCase();
    return MUNICIPIOS_COORDS[m] || [25.7816, -100.1887];
  };

  useEffect(() => {
    let timer = null;
    let isMounted = true;

    const initMap = () => {
      if (!mapContainerRef.current || !isMounted) return;
      if (typeof window === 'undefined' || !window.L) {
        timer = setTimeout(initMap, 100);
        return;
      }

      if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
        delete mapContainerRef.current._leaflet_id;
      }

      if (!mapInstanceRef.current) {
        const center = getCompanyCenter();
        const comp = companyLocationRef.current;
        const hasCoords = Boolean(comp?.latitud && comp?.longitud);
        const zoom = hasCoords ? 14 : 12;

        try {
          const map = window.L.map(mapContainerRef.current, {
            center: center,
            zoom: zoom,
            zoomControl: true,
          });

          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          }).addTo(map);

          markersLayerRef.current = window.L.layerGroup().addTo(map);
          polylineLayerRef.current = window.L.layerGroup().addTo(map);

          map.on('click', (e) => {
            if (!isEditingRef.current) return;
            const { lat, lng } = e.latlng;
            onMapClick({ lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) });
          });

          mapInstanceRef.current = map;
          if (isEditingRef.current && map.getContainer()) {
            map.getContainer().style.cursor = 'crosshair';
          }
          setMapReady(true);

          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 200);

        } catch (err) {
          console.error('Error inicializando mapa Leaflet:', err);
        }
      } else {
        mapInstanceRef.current.invalidateSize();
      }
    };

    timer = setTimeout(initMap, 60);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [onMapClick]);

  useEffect(() => {
    if (mapInstanceRef.current && companyLocation) {
      const center = getCompanyCenter();
      const hasCoords = Boolean(companyLocation?.latitud && companyLocation?.longitud);
      const zoom = hasCoords ? 14 : 12;
      mapInstanceRef.current.setView(center, zoom);
      mapInstanceRef.current.invalidateSize();
    }
  }, [mapReady, companyLocation?.id, companyLocation?.latitud, companyLocation?.longitud, companyLocation?.municipio]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    if (!markersLayerRef.current || !polylineLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    polylineLayerRef.current.clearLayers();

    const plantCenter = getCompanyCenter();
    const hasExactCoords = Boolean(companyLocation?.latitud && companyLocation?.longitud);

    const plantIcon = window.L.divIcon({
      className: 'custom-plant-pin',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="background-color: #059669; color: white; border: 2.5px solid white; border-radius: 9999px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
            🏭
          </div>
          <div style="background-color: #064e3b; color: #a7f3d0; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 6px; margin-top: 2px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.4); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ${hasExactCoords ? 'Planta (GPS)' : 'Planta'}
          </div>
        </div>
      `,
      iconSize: [60, 56],
      iconAnchor: [30, 20],
    });

    const plantMarker = window.L.marker(plantCenter, { icon: plantIcon })
      .bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 170px;">
          <b style="color: #0f172a;">🏭 Planta ${companyLocation?.nombre || 'Industrial'}</b>
          <div style="color: #059669; font-size: 11px; font-weight: 700; margin-top: 2px;">
            ${hasExactCoords ? '📍 Ubicación GPS Exacta' : '📍 Centro del Municipio'}
          </div>
          <div style="color: #64748b; font-size: 10px; margin-top: 2px;">
            ${companyLocation?.direccion || companyLocation?.municipio || 'Destino final del transporte'}
          </div>
          ${hasExactCoords ? `<div style="font-family: monospace; font-size: 10px; color: #059669; margin-top: 3px;">GPS: ${Number(companyLocation.latitud).toFixed(5)}, ${Number(companyLocation.longitud).toFixed(5)}</div>` : ''}
        </div>
      `)
      .addTo(markersLayerRef.current);

    const stopsToRender = isEditing ? stops : (activeRoute?.stops || []);
    const renderColor = isEditing ? routeColor : (activeRoute?.color_hex || '#059669');

    if (stopsToRender.length > 0) {
      const latlngs = [];

      stopsToRender.forEach((stop, idx) => {
        const pos = [stop.latitud, stop.longitud];
        latlngs.push(pos);

        const stopIcon = window.L.divIcon({
          className: 'custom-stop-pin',
          html: `
            <div style="background-color: ${renderColor}; color: white; border: 2px solid white; border-radius: 9999px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; box-shadow: 0 3px 6px rgba(0,0,0,0.25);">
              ${idx + 1}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = window.L.marker(pos, { icon: stopIcon }).addTo(markersLayerRef.current);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 160px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">
              <span style="background: ${renderColor}; color: white; border-radius: 6px; padding: 1px 6px; font-size: 10px;">Parada ${idx + 1}</span>
              <span>${stop.nombre}</span>
            </div>
            <div style="color: #059669; font-weight: 700; margin: 3px 0;">⏰ Pasa: ${stop.horario}</div>
            <div style="color: #64748b; font-size: 10px;">📍 ${stop.colonia_referencia || 'Sin referencia'}</div>
          </div>
        `);
      });

      const fullPath = [...latlngs, plantCenter];
      window.L.polyline(fullPath, {
        color: renderColor,
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(polylineLayerRef.current);

      if (latlngs.length > 0) {
        const bounds = window.L.latLngBounds(fullPath);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [mapReady, isEditing, stops, routeColor, activeRoute, companyLocation]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      const center = getCompanyCenter();
      const hasCoords = Boolean(companyLocation?.latitud && companyLocation?.longitud);
      mapInstanceRef.current.setView(center, hasCoords ? 15 : 13);
    }
  };

  const mapTitle = isEditing ? 'Trazando: Nueva Ruta' : (activeRoute ? activeRoute.nombre : 'Mapa de Rutas de Planta');

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-xs font-black text-slate-900">
            {mapTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
            <span>🏭 Planta</span>
          </span>
          <span>&bull;</span>
          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
            <span>● Paradas de paso</span>
          </span>
        </div>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
        <div
          ref={mapContainerRef}
          style={{ height: '540px', width: '100%', zIndex: 1 }}
          className="bg-slate-100"
        />

        <button
          type="button"
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur hover:bg-white text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 transition"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-600" />
          <span>Centrar en Planta</span>
        </button>
      </div>

      {activeRoute && !isEditing && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: activeRoute.color_hex || '#059669' }} 
            />
            <span className="font-bold text-slate-900">{activeRoute.nombre}</span>
            <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              {activeRoute.turno}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
            <span>{activeRoute.stops?.length || 0} paradas</span>
            <span>&bull;</span>
            <span>Primera parada: <strong>{activeRoute.hora_inicio || '05:30 AM'}</strong></span>
            <span>&bull;</span>
            <span>Llegada: <strong>{activeRoute.hora_llegada_planta || '06:45 AM'}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
