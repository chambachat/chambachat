import React, { useState } from 'react';
import { MapPin, X, Check } from 'lucide-react';
import { DEFAULT_CENTER, deduceMunicipioFromCoords } from '../../constants/municipios';
import { searchAddress, getCurrentPosition } from '../../services/geocoding';
import { useLeafletPin } from '../../hooks/useLeafletPin';
import MapCanvas from '../ui/MapCanvas';
import PickerToolbar from './LocationPicker/PickerToolbar';
import PickerDetailsForm from './LocationPicker/PickerDetailsForm';

const CANDIDATE_PIN = {
  className: 'custom-map-pin',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
      <div style="position: absolute; width: 36px; height: 36px; background-color: rgba(16, 185, 129, 0.25); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; background: #059669; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2.5px solid white;">
        <span style="font-size: 16px;">📍</span>
      </div>
    </div>`
};

const round5 = (n) => Number(Number(n).toFixed(5));

export default function LocationPickerModal({ isOpen, onClose, onLocationConfirmed, initialLocation = null }) {
  const [selectedLat, setSelectedLat] = useState(initialLocation?.lat || DEFAULT_CENTER.lat);
  const [selectedLon, setSelectedLon] = useState(initialLocation?.lon || DEFAULT_CENTER.lon);
  const [colonia, setColonia] = useState(initialLocation?.colonia || 'Huinalá');
  const [municipio, setMunicipio] = useState(initialLocation?.municipio || 'Apodaca');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  /** El pin se movió a mano: solo actualizar estado y deducir municipio. */
  const handlePinMove = (lat, lon) => {
    setSelectedLat(round5(lat));
    setSelectedLon(round5(lon));
    setMunicipio(deduceMunicipioFromCoords(lat, lon));
    setGpsError(null);
  };

  const { containerRef, moveTo } = useLeafletPin({
    isOpen,
    center: { lat: selectedLat || DEFAULT_CENTER.lat, lon: selectedLon || DEFAULT_CENTER.lon },
    zoom: 13,
    icon: CANDIDATE_PIN,
    onMove: handlePinMove,
    delay: 100
  });

  /** Movimiento programático (GPS, búsqueda): estado + mapa. */
  const jumpTo = (lat, lon) => {
    handlePinMove(lat, lon);
    moveTo(lat, lon, 14, false);
  };

  const handleUseCurrentGPS = async () => {
    setIsLocatingGPS(true);
    setGpsError(null);
    try {
      const pos = await getCurrentPosition();
      jumpTo(pos.lat, pos.lon);
    } catch (err) {
      console.warn('Geolocation error:', err);
      setGpsError(
        err?.message?.includes('GPS')
          ? 'Tu navegador no soporta geolocalización GPS.'
          : 'No pudimos acceder a tu GPS. Por favor selecciona tu colonia abajo o mueve el mapa.'
      );
    } finally {
      setIsLocatingGPS(false);
    }
  };

  const handleSelectQuickZone = (zone) => {
    setSelectedLat(zone.lat);
    setSelectedLon(zone.lon);
    setColonia(zone.colonia);
    setMunicipio(zone.municipio);
    setGpsError(null);
    moveTo(zone.lat, zone.lon, 14, false);
  };

  const handleSearchAddress = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsGeocoding(true);
    setGpsError(null);
    try {
      const results = await searchAddress(searchQuery, 3);
      if (results.length === 0) {
        setGpsError(`No encontramos "${searchQuery}". Puedes mover el pin en el mapa directamente o elegir una colonia abajo.`);
        return;
      }
      const best = results[0];
      jumpTo(parseFloat(best.lat), parseFloat(best.lon));
      setColonia(searchQuery.trim());
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
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <PickerToolbar
            onUseGPS={handleUseCurrentGPS}
            isLocatingGPS={isLocatingGPS}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearch={handleSearchAddress}
            isGeocoding={isGeocoding}
            error={gpsError}
            onSelectZone={handleSelectQuickZone}
          />

          <MapCanvas
            containerRef={containerRef}
            heightClass="h-56 sm:h-64"
            minHeight={220}
            hint="Toca el mapa o arrastra el pin"
            hintSide="right"
          />

          <PickerDetailsForm
            colonia={colonia}
            onColoniaChange={setColonia}
            municipio={municipio}
            onMunicipioChange={setMunicipio}
            lat={selectedLat}
            lon={selectedLon}
          />
        </div>

        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition">
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
