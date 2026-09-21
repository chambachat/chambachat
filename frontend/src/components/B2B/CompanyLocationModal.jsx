import React, { useState, useEffect } from 'react';
import { MapPin, X, Check, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { updateCompanyLocation } from '../../services/api';
import { MUNICIPIOS_NL, DEFAULT_CENTER } from '../../constants/municipios';
import { reverseGeocode, searchAddress, matchMunicipio, shortDisplayName, getCurrentPosition } from '../../services/geocoding';
import { useLeafletPin } from '../../hooks/useLeafletPin';
import MapCanvas from '../ui/MapCanvas';
import PlantLocationToolbar from './Location/PlantLocationToolbar';
import PlantLocationForm from './Location/PlantLocationForm';

const PLANT_PIN = {
  className: 'plant-location-pin',
  iconSize: [80, 48],
  iconAnchor: [40, 46],
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab;">
      <div style="background: #059669; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 11px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
        <span>🏭</span><span>Planta</span>
      </div>
      <div style="width: 14px; height: 14px; background: #059669; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
    </div>`
};

const round5 = (n) => Number(Number(n).toFixed(5));

export default function CompanyLocationModal({ isOpen, onClose, company, onSaved }) {
  const initialLat = company?.latitud ? Number(company.latitud) : DEFAULT_CENTER.lat;
  const initialLon = company?.longitud ? Number(company.longitud) : DEFAULT_CENTER.lon;

  const [lat, setLat] = useState(initialLat);
  const [lon, setLon] = useState(initialLon);
  const [direccion, setDireccion] = useState('');
  const [municipio, setMunicipio] = useState('Apodaca');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (isOpen && company) {
      setLat(initialLat);
      setLon(initialLon);
      setDireccion(company.direccion || '');
      setMunicipio(company.municipio || 'Apodaca');
      setSearchQuery('');
      setStatusMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen, company]);

  const applyMunicipioFromCity = (city) => {
    const found = matchMunicipio(city, MUNICIPIOS_NL);
    if (found) setMunicipio(found);
  };

  const performReverseGeocoding = async (targetLat, targetLon) => {
    setIsReverseGeocoding(true);
    try {
      const geo = await reverseGeocode(targetLat, targetLon);
      if (geo) {
        if (geo.formatted) setDireccion(geo.formatted);
        applyMunicipioFromCity(geo.city);
      }
    } catch (err) {
      console.warn('Error en geocodificación inversa:', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handlePinMoved = (newLat, newLon) => {
    const a = round5(newLat);
    const b = round5(newLon);
    setLat(a);
    setLon(b);
    setErrorMessage(null);
    performReverseGeocoding(a, b);
  };

  const { containerRef, moveTo } = useLeafletPin({
    isOpen,
    center: { lat: initialLat, lon: initialLon },
    zoom: company?.latitud ? 15 : 13,
    icon: PLANT_PIN,
    tooltip: 'Arrastra el pin para fijar la entrada de la planta',
    onMove: handlePinMoved,
    onUnavailable: () => setErrorMessage('El servicio de mapas no se cargó correctamente.'),
    delay: 200
  });

  const setPosition = (newLat, newLon) => {
    setLat(round5(newLat));
    setLon(round5(newLon));
    moveTo(newLat, newLon, 16);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const results = await searchAddress(searchQuery, 5);
      if (results.length === 0) {
        setErrorMessage(`No se encontraron resultados para "${searchQuery}". Prueba escribiendo el nombre de la avenida o parque industrial.`);
        return;
      }
      const best = results[0];
      setPosition(parseFloat(best.lat), parseFloat(best.lon));
      if (best.display_name) setDireccion(shortDisplayName(best.display_name));
      const addr = best.address || {};
      applyMunicipioFromCity(addr.city || addr.town || addr.county || addr.municipality);
    } catch (err) {
      console.error('Error buscando ubicación:', err);
      setErrorMessage('Ocurrió un error al buscar la dirección. Por favor arrastra el pin directamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectQuickZone = (zone) => {
    setPosition(zone.lat, zone.lon);
    setMunicipio(zone.mun);
    setDireccion(zone.name);
    setErrorMessage(null);
  };

  const handleUseGPS = async () => {
    setIsLocatingGps(true);
    setErrorMessage(null);
    try {
      const pos = await getCurrentPosition();
      setPosition(pos.lat, pos.lon);
      performReverseGeocoding(pos.lat, pos.lon);
      setStatusMessage('📍 Ubicación obtenida con éxito vía GPS.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.warn('Geolocation error:', err);
      setErrorMessage(
        err?.message?.includes('GPS')
          ? err.message
          : 'No se pudo acceder a tu ubicación GPS. Revisa los permisos de tu navegador o ubícala en el mapa.'
      );
    } finally {
      setIsLocatingGps(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!company?.id) return;
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const payload = { latitud: lat, longitud: lon, direccion: direccion.trim() || undefined, municipio: municipio || undefined };
      const res = await updateCompanyLocation(company.id, payload);
      setStatusMessage('✅ Ubicación de la planta guardada exitosamente.');
      if (onSaved) onSaved(res.company || { ...company, ...payload });
      setTimeout(onClose, 700);
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
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Ubicar Planta en el Mapa</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">GPS Planta</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{company?.nombre || 'Empresa'} &bull; {municipio}, N.L.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <PlantLocationToolbar
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearch}
            isSearching={isSearching}
            onUseGPS={handleUseGPS}
            isLocatingGps={isLocatingGps}
            onSelectZone={handleSelectQuickZone}
          />

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

          <MapCanvas
            containerRef={containerRef}
            hint="Haz clic o arrastra el marcador hasta la entrada o nave"
            spinCompass
            busy={isReverseGeocoding}
          />

          <PlantLocationForm
            lat={lat}
            lon={lon}
            direccion={direccion}
            onDireccionChange={setDireccion}
            municipio={municipio}
            onMunicipioChange={setMunicipio}
          />
        </div>

        <div className="p-4 sm:px-6 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveLocation}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando Coordenadas...</span></>
            ) : (
              <><Check className="w-4 h-4" /><span>Confirmar y Guardar Ubicación</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
