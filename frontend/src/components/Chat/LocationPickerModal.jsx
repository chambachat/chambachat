import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  Check, 
  Compass, 
  Loader2, 
  Building, 
  Bus, 
  Info,
  AlertCircle
} from 'lucide-react';

const MUNICIPIOS_NL_LIST = [
  'Apodaca',
  'Pesquería',
  'Guadalupe',
  'Escobedo',
  'San Nicolás',
  'Monterrey',
  'García',
  'Santa Catarina',
  'Juárez',
  'Cadereyta'
];

const QUICK_ZONES = [
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

export default function LocationPickerModal({
  isOpen,
  onClose,
  onLocationConfirmed,
  initialLocation = null
}) {
  const [selectedLat, setSelectedLat] = useState(initialLocation?.lat || 25.7535);
  const [selectedLon, setSelectedLon] = useState(initialLocation?.lon || -100.1742);
  const [colonia, setColonia] = useState(initialLocation?.colonia || 'Huinalá');
  const [municipio, setMunicipio] = useState(initialLocation?.municipio || 'Apodaca');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Inicializar Leaflet
  useEffect(() => {
    if (!isOpen) return;

    // Timeout pequeño para asegurar que el DOM modal esté montado
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (typeof window === 'undefined' || !window.L) return;

      if (!mapInstanceRef.current) {
        const startLat = selectedLat || 25.7535;
        const startLon = selectedLon || -100.1742;

        const map = window.L.map(mapContainerRef.current, {
          center: [startLat, startLon],
          zoom: 13,
          zoomControl: true,
        });

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Icono de Pin Personalizado
        const customIcon = window.L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
              <div style="position: absolute; width: 36px; height: 36px; background-color: rgba(16, 185, 129, 0.25); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; background: #059669; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2.5px solid white;">
                <span style="font-size: 16px;">📍</span>
              </div>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        });

        const marker = window.L.marker([startLat, startLon], {
          icon: customIcon,
          draggable: true
        }).addTo(map);

        // Actualizar coordenadas al arrastrar el pin
        marker.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          handlePinMove(pos.lat, pos.lng);
        });

        // Mover pin al hacer clic en el mapa
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          handlePinMove(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Limpiar instancia al cerrar
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [isOpen]);

  const handlePinMove = async (lat, lon) => {
    setSelectedLat(Number(lat.toFixed(5)));
    setSelectedLon(Number(lon.toFixed(5)));
    setGpsError(null);

    // Intentar deducir municipio por proximidad o geocodificación inversa
    deduceMunicipioFromCoords(lat, lon);
  };

  const deduceMunicipioFromCoords = (lat, lon) => {
    // Estimación rápida de municipio según cuadrantes clave de NL
    if (lat >= 25.73 && lat <= 25.85 && lon >= -100.28 && lon <= -100.12) {
      setMunicipio('Apodaca');
    } else if (lat >= 25.72 && lat <= 25.85 && lon > -100.12) {
      setMunicipio('Pesquería');
    } else if (lat >= 25.63 && lat <= 25.73 && lon >= -100.26 && lon <= -100.15) {
      setMunicipio('Guadalupe');
    } else if (lat >= 25.76 && lat <= 25.88 && lon <= -100.26 && lon >= -100.42) {
      setMunicipio('Escobedo');
    } else if (lat >= 25.71 && lat <= 25.77 && lon >= -100.32 && lon <= -100.22) {
      setMunicipio('San Nicolás');
    } else if (lat >= 25.64 && lat <= 25.72 && lon <= -100.39 && lon >= -100.52) {
      setMunicipio('Santa Catarina');
    } else if (lat >= 25.76 && lat <= 25.88 && lon <= -100.48) {
      setMunicipio('García');
    } else {
      setMunicipio('Monterrey');
    }
  };

  // GPS Auto-detect
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización GPS.');
      return;
    }

    setIsLocatingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGPS(false);
        const { latitude, longitude } = pos.coords;
        setSelectedLat(Number(latitude.toFixed(5)));
        setSelectedLon(Number(longitude.toFixed(5)));
        deduceMunicipioFromCoords(latitude, longitude);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 14, { animate: true });
          markerRef.current.setLatLng([latitude, longitude]);
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        console.warn('Geolocation error:', err);
        setGpsError('No pudimos acceder a tu GPS. Por favor selecciona tu colonia abajo o mueve el mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Selección rápida de zona conocida
  const handleSelectQuickZone = (zone) => {
    setSelectedLat(zone.lat);
    setSelectedLon(zone.lon);
    setColonia(zone.colonia);
    setMunicipio(zone.municipio);
    setGpsError(null);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([zone.lat, zone.lon], 14, { animate: true });
      markerRef.current.setLatLng([zone.lat, zone.lon]);
    }
  };

  // Búsqueda por texto (Nominatim OSM)
  const handleSearchAddress = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsGeocoding(true);
    setGpsError(null);

    try {
      // Buscar en Nuevo León México
      const query = encodeURIComponent(`${searchQuery.trim()}, Nuevo León, Mexico`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=3`);
      const results = await res.json();

      if (results && results.length > 0) {
        const best = results[0];
        const lat = parseFloat(best.lat);
        const lon = parseFloat(best.lon);

        setSelectedLat(Number(lat.toFixed(5)));
        setSelectedLon(Number(lon.toFixed(5)));
        setColonia(searchQuery.trim());
        deduceMunicipioFromCoords(lat, lon);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([lat, lon], 14, { animate: true });
          markerRef.current.setLatLng([lat, lon]);
        }
      } else {
        setGpsError(`No encontramos "${searchQuery}". Puedes mover el pin en el mapa directamente o elegir una colonia abajo.`);
      }
    } catch (err) {
      console.warn('Error geocodificando:', err);
      setGpsError('Hubo un error de conexión al buscar la dirección. Mueve el pin directamente en el mapa.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleConfirm = () => {
    if (onLocationConfirmed) {
      onLocationConfirmed({
        lat: selectedLat,
        lon: selectedLon,
        colonia: colonia.trim() || 'Colonia Registrada',
        municipio: municipio || 'Apodaca'
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-start justify-between shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <MapPin className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>¿Por dónde vives?</span>
                <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Rutas y Vacantes Cercanas
                </span>
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Al ubicar tu colonia calculamos los camiones de personal y plantas más cercanas a ti.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Top GPS and Search Actions */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleUseCurrentGPS}
                disabled={isLocatingGPS}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition disabled:opacity-50 shrink-0"
              >
                {isLocatingGPS ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Detectando GPS...</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 text-emerald-200" />
                    <span>Usar mi ubicación actual (GPS)</span>
                  </>
                )}
              </button>

              <form onSubmit={handleSearchAddress} className="flex-1 flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar colonia o avenida (ej. Huinalá, Apodaca)..."
                    className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isGeocoding || !searchQuery.trim()}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center shrink-0"
                >
                  {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>
              </form>
            </div>

            {/* Error badge */}
            {gpsError && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{gpsError}</span>
              </div>
            )}

            {/* Quick Zones Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Zonas y colonias populares en NL:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ZONES.map((zone, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuickZone(zone)}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200/80 text-slate-700 transition"
                  >
                    📍 {zone.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
            <div 
              ref={mapContainerRef} 
              className="w-full h-56 sm:h-64 z-0"
              style={{ minHeight: '220px' }}
            />
            <div className="absolute top-2.5 right-2.5 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg shadow-sm border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1.5 pointer-events-none">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Toca el mapa o arrastra el pin</span>
            </div>
          </div>

          {/* Form details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Colonia o punto de referencia:
              </label>
              <input
                type="text"
                value={colonia}
                onChange={(e) => setColonia(e.target.value)}
                placeholder="Ej. Huinalá 2do sector, cerca de Bodega Aurrerá"
                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Municipio de Nuevo León:
              </label>
              <select
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                {MUNICIPIOS_NL_LIST.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Coordenadas seleccionadas: <strong className="text-slate-700 font-mono">{selectedLat}, {selectedLon}</strong></span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Bus className="w-3.5 h-3.5" />
                Rutas calculadas al guardar
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar y Guardar Ubicación</span>
          </button>
        </div>

      </div>
    </div>
  );
}
