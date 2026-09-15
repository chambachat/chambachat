import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Search, 
  X, 
  Check, 
  Building2, 
  Loader2, 
  AlertCircle, 
  Compass, 
  Sparkles, 
  CheckCircle2 
} from 'lucide-react';
import { updateCompanyLocation } from '../../services/api';

const MUNICIPIOS_NL = [
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
  'Sabinas Hidalgo',
  'Allende',
  'Zuazua'
];

const INDUSTRIAL_PARKS_NL = [
  { name: 'Parque Ind. Huinalá', mun: 'Apodaca', lat: 25.7485, lon: -100.1650 },
  { name: 'Parque Ind. Kronos', mun: 'Apodaca', lat: 25.7650, lon: -100.1800 },
  { name: 'Stiva Aeropuerto', mun: 'Apodaca', lat: 25.7800, lon: -100.1350 },
  { name: 'Parque Ind. Monterrey', mun: 'Apodaca', lat: 25.7550, lon: -100.2050 },
  { name: 'Planta KIA Motors', mun: 'Pesquería', lat: 25.7635, lon: -100.0070 },
  { name: 'Parque Nexxus XXI', mun: 'Escobedo', lat: 25.8150, lon: -100.3250 },
  { name: 'Parque Hofusan', mun: 'Salinas Victoria', lat: 25.9600, lon: -100.2750 },
  { name: 'Zona Ind. Santa Catarina', mun: 'Santa Catarina', lat: 25.6850, lon: -100.4700 },
  { name: 'Zona Ind. Valle Soleado', mun: 'Guadalupe', lat: 25.7042, lon: -100.1856 },
  { name: 'Parque Ciénega', mun: 'Ciénega de Flores', lat: 25.9520, lon: -100.1650 }
];

export default function CompanyLocationModal({
  isOpen,
  onClose,
  company,
  onSaved
}) {
  const [lat, setLat] = useState(25.7535);
  const [lon, setLon] = useState(-100.1742);
  const [direccion, setDireccion] = useState('');
  const [municipio, setMunicipio] = useState('Apodaca');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Sincronizar estado inicial cuando se abre el modal con los datos de la empresa
  useEffect(() => {
    if (isOpen && company) {
      const initialLat = company.latitud ? Number(company.latitud) : 25.7535;
      const initialLon = company.longitud ? Number(company.longitud) : -100.1742;
      setLat(initialLat);
      setLon(initialLon);
      setDireccion(company.direccion || '');
      setMunicipio(company.municipio || 'Apodaca');
      setSearchQuery('');
      setSearchResults([]);
      setStatusMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, company]);

  // Inicializar Leaflet cuando el modal se abra
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      if (typeof window === 'undefined' || !window.L) {
        setErrorMessage('El servicio de mapas no se cargó correctamente.');
        return;
      }

      const initialLat = company?.latitud ? Number(company.latitud) : lat;
      const initialLon = company?.longitud ? Number(company.longitud) : lon;

      if (!mapInstanceRef.current) {
        const map = window.L.map(mapContainerRef.current, {
          center: [initialLat, initialLon],
          zoom: company?.latitud ? 15 : 13,
          zoomControl: true,
        });

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);

        // Marcador con ícono personalizado y diseño llamativo
        const pinHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab;">
            <div style="background: #059669; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white; display: flex; items-center; gap: 4px; margin-bottom: 2px;">
              <span>🏭</span>
              <span>Planta</span>
            </div>
            <div style="width: 14px; height: 14px; background: #059669; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
          </div>
        `;

        const plantIcon = window.L.divIcon({
          className: 'plant-location-pin',
          html: pinHtml,
          iconSize: [80, 48],
          iconAnchor: [40, 46]
        });

        const marker = window.L.marker([initialLat, initialLon], {
          icon: plantIcon,
          draggable: true,
          autoPan: true
        }).addTo(map);

        // Tooltip instructivo
        marker.bindTooltip('Arrastra el pin para fijar la entrada de la planta', {
          permanent: false,
          direction: 'top',
          offset: [0, -35]
        });

        // Evento arrastrar pin
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          handlePinMoved(newPos.lat, newPos.lng, true);
        });

        // Evento clic en mapa
        map.on('click', (e) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          marker.setLatLng([clickLat, clickLng]);
          handlePinMoved(clickLat, clickLng, true);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([initialLat, initialLon], company?.latitud ? 15 : 13);
        if (markerRef.current) {
          markerRef.current.setLatLng([initialLat, initialLon]);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Limpiar instancia al desmontar/cerrar modal
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [isOpen]);

  // Manejar cambio de posición del pin
  const handlePinMoved = (newLat, newLon, doReverseGeocode = true) => {
    const fixedLat = Number(newLat.toFixed(5));
    const fixedLon = Number(newLon.toFixed(5));
    setLat(fixedLat);
    setLon(fixedLon);
    setErrorMessage(null);

    if (doReverseGeocode) {
      performReverseGeocoding(fixedLat, fixedLon);
    }
  };

  // Geocodificación inversa con Nominatim OpenStreetMap
  const performReverseGeocoding = async (targetLat, targetLon) => {
    setIsReverseGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLon}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'es'
        }
      });
      if (!res.ok) return;

      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const street = addr.road || addr.pedestrian || addr.industrial || addr.suburb || '';
        const houseNumber = addr.house_number ? ` #${addr.house_number}` : '';
        const neighborhood = addr.neighbourhood || addr.suburb || addr.residential || '';
        const city = addr.city || addr.town || addr.county || addr.municipality || '';

        let formatted = '';
        if (street) formatted += street + houseNumber;
        if (neighborhood && neighborhood !== street) {
          formatted += formatted ? `, Col. ${neighborhood}` : `Col. ${neighborhood}`;
        }
        if (data.display_name && !formatted) {
          formatted = data.display_name.split(',').slice(0, 3).join(',');
        }

        if (formatted) {
          setDireccion(formatted);
        }

        // Deducir municipio si coincide con lista NL
        const foundMun = MUNICIPIOS_NL.find(m => 
          city.toLowerCase().includes(m.toLowerCase()) || 
          m.toLowerCase().includes(city.toLowerCase())
        );
        if (foundMun) {
          setMunicipio(foundMun);
        }
      }
    } catch (err) {
      console.warn('Error en geocodificación inversa:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Buscar dirección por texto
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);
    setSearchResults([]);

    try {
      const q = encodeURIComponent(`${searchQuery.trim()}, Nuevo León, México`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'es' }
      });
      const results = await res.json();

      if (results && results.length > 0) {
        setSearchResults(results);
        applyLocationResult(results[0]);
      } else {
        setErrorMessage(`No se encontraron resultados para "${searchQuery}". Prueba escribiendo el nombre de la avenida o parque industrial.`);
      }
    } catch (err) {
      console.error('Error buscando ubicación:', err);
      setErrorMessage('Ocurrió un error al buscar la dirección. Por favor arrastra el pin directamente.');
    } finally {
      setIsSearching(false);
    }
  };

  // Aplicar un resultado de búsqueda o zona rápida
  const applyLocationResult = (item) => {
    const newLat = parseFloat(item.lat);
    const newLon = parseFloat(item.lon);

    setLat(Number(newLat.toFixed(5)));
    setLon(Number(newLon.toFixed(5)));

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([newLat, newLon], 16, { duration: 1.2 });
      markerRef.current.setLatLng([newLat, newLon]);
    }

    if (item.display_name) {
      const parts = item.display_name.split(',');
      const simpleAddress = parts.slice(0, 3).join(',').trim();
      setDireccion(simpleAddress);
    }

    if (item.address) {
      const city = item.address.city || item.address.town || item.address.county || item.address.municipality || '';
      const foundMun = MUNICIPIOS_NL.find(m => 
        city.toLowerCase().includes(m.toLowerCase()) || 
        m.toLowerCase().includes(city.toLowerCase())
      );
      if (foundMun) setMunicipio(foundMun);
    }

    setSearchResults([]);
  };

  // Aplicar zona industrial rápida
  const handleSelectQuickZone = (zone) => {
    setLat(zone.lat);
    setLon(zone.lon);
    setMunicipio(zone.mun);
    setDireccion(zone.name);
    setErrorMessage(null);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([zone.lat, zone.lon], 16, { duration: 1.2 });
      markerRef.current.setLatLng([zone.lat, zone.lon]);
    }
  };

  // Usar GPS en tiempo real
  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Tu navegador no cuenta con soporte para GPS.');
      return;
    }

    setIsLocatingGps(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingGps(false);
        const { latitude, longitude } = pos.coords;
        const fixedLat = Number(latitude.toFixed(5));
        const fixedLon = Number(longitude.toFixed(5));

        setLat(fixedLat);
        setLon(fixedLon);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([fixedLat, fixedLon], 16, { duration: 1.2 });
          markerRef.current.setLatLng([fixedLat, fixedLon]);
        }

        performReverseGeocoding(fixedLat, fixedLon);
        setStatusMessage('📍 Ubicación obtenida con éxito vía GPS.');
        setTimeout(() => setStatusMessage(null), 3000);
      },
      (err) => {
        setIsLocatingGps(false);
        console.warn('Geolocation error:', err);
        setErrorMessage('No se pudo acceder a tu ubicación GPS. Revisa los permisos de tu navegador o ubícala en el mapa.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Guardar ubicación en la API
  const handleSaveLocation = async () => {
    if (!company?.id) return;

    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const payload = {
        latitud: lat,
        longitud: lon,
        direccion: direccion.trim() || undefined,
        municipio: municipio || undefined
      };

      const res = await updateCompanyLocation(company.id, payload);
      setStatusMessage('✅ Ubicación de la planta guardada exitosamente.');

      if (onSaved) {
        onSaved(res.company || { ...company, ...payload });
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error al guardar ubicación de planta:', err);
      setErrorMessage(err.message || 'Error al guardar la ubicación de la planta.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Ubicar Planta en el Mapa</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  GPS Planta
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {company?.nombre || 'Empresa'} &bull; {municipio}, N.L.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* BARRA DE BÚSQUEDA Y GPS */}
          <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar parque industrial, calle o referencia (ej. Parque Huinalá, Stiva...)"
                className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 shadow-xs"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleUseGPS}
              disabled={isLocatingGps}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 hover:border-emerald-300 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
              title="Detectar ubicación actual mediante el GPS del dispositivo"
            >
              {isLocatingGps ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Navigation className="w-4 h-4 text-emerald-600" />
              )}
              <span>{isLocatingGps ? 'Localizando...' : 'Mi Ubicación GPS'}</span>
            </button>
          </div>

          {/* PARQUES INDUSTRIALES / ZONAS RÁPIDAS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Zonas Industriales Frecuentes en NL:
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Clic para centrar</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {INDUSTRIAL_PARKS_NL.map((zone) => (
                <button
                  key={zone.name}
                  type="button"
                  onClick={() => handleSelectQuickZone(zone)}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-slate-700 whitespace-nowrap shrink-0 transition"
                >
                  📍 {zone.name}
                </button>
              ))}
            </div>
          </div>

          {/* MENSAJES DE ESTADO */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700 font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-700 font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* CONTENEDOR DEL MAPA LEAFLET */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
            <div 
              ref={mapContainerRef} 
              className="h-[340px] sm:h-[380px] w-full z-10"
              style={{ minHeight: '300px' }}
            />

            {/* BADGE FLOTANTE DE AYUDA */}
            <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-700 font-bold flex items-center gap-1.5 pointer-events-none">
              <Compass className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '8s' }} />
              <span>Haz clic o arrastra el marcador rojo/verde hasta la entrada o nave</span>
            </div>

            {/* BADGE DE CARGA GEODATOS */}
            {isReverseGeocoding && (
              <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-bold flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                <span>Identificando dirección...</span>
              </div>
            )}
          </div>

          {/* DETALLES DE LA UBICACIÓN Y AJUSTES */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Datos de la Planta para Postulantes y Rutas
              </span>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                <span>Lat: <strong className="text-slate-800">{lat}</strong></span>
                <span>&bull;</span>
                <span>Lon: <strong className="text-slate-800">{lon}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Dirección o Referencia de Planta
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej. Carretera a Huinalá Km 2.5, Parque Ind. Kronos"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Municipio
                </label>
                <select
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {MUNICIPIOS_NL.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              💡 <strong>¿Para qué sirve?</strong> Estas coordenadas permitirán a los candidatos calcular su tiempo de traslado en el chat de ChambaChat y verificar si las rutas de transporte empresarial pasan cerca de sus domicilios.
            </p>
          </div>

        </div>

        {/* FOOTER ACCIONES */}
        <div className="p-4 sm:px-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando Coordenadas...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar y Guardar Ubicación</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
