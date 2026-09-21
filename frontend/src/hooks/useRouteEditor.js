import { useState } from 'react';
import { ROUTE_COLORS } from '../components/B2B/Routes/constants';
import { createCompanyRoute, updateCompanyRoute } from '../services/api';
import { reverseGeocode } from '../services/geocoding';

const DEFAULT_TURNO = 'Turno 1 (06:00 - 14:00)';
const shiftLabel = (s) => `${s.nombre} (${s.hora_entrada} - ${s.hora_salida})`;

const EMPTY_FORM = { nombre: '', turno: '', color_hex: ROUTE_COLORS[0].hex, descripcion: '' };

/** Horario estimado de la parada N: 05:30 AM + 12 min por parada previa. */
function estimateStopTime(stopIndex) {
  const totalMin = 30 + stopIndex * 12;
  const h = 5 + Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} AM`;
}

/**
 * Estado y acciones del formulario de creación/edición de una ruta de transporte.
 * `notify` es el objeto de useToast() (success/warning/error).
 */
export function useRouteEditor({ company, routes, shifts, onSaved, onSelectRoute, notify }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formStops, setFormStops] = useState([]);
  const [saving, setSaving] = useState(false);

  const defaultTurno = shifts.length > 0 ? shiftLabel(shifts[0]) : DEFAULT_TURNO;

  const startCreate = () => {
    setIsEditing(true);
    setEditingRouteId(null);
    setFormData({
      nombre: `Ruta ${routes.length + 1} - `,
      turno: defaultTurno,
      color_hex: ROUTE_COLORS[routes.length % ROUTE_COLORS.length].hex,
      descripcion: ''
    });
    setFormStops([]);
  };

  const startEdit = (route) => {
    setIsEditing(true);
    setEditingRouteId(route.id);
    setFormData({
      nombre: route.nombre || '',
      turno: route.turno || defaultTurno,
      color_hex: route.color_hex || ROUTE_COLORS[0].hex,
      descripcion: route.descripcion || ''
    });
    setFormStops(route.stops ? [...route.stops] : []);
    if (onSelectRoute) onSelectRoute(route);
  };

  const cancel = () => {
    setIsEditing(false);
    setEditingRouteId(null);
  };

  const changeField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  /** Tras crear un turno nuevo desde el formulario, seleccionarlo. */
  const useShift = (shift) => changeField('turno', shiftLabel(shift));

  const save = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!company) return;
    if (!formData.nombre.trim()) {
      notify.warning('Por favor asigna un nombre a la ruta de transporte.');
      return;
    }
    if (formStops.length === 0) {
      notify.warning('Debes agregar al menos una parada haciendo clic sobre el mapa.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        hora_inicio: formStops[0]?.horario,
        hora_llegada_planta: formStops[formStops.length - 1]?.horario,
        tiempo_estimado_min: formStops.length * 15,
        stops: formStops.map((s, idx) => ({
          orden: idx + 1,
          nombre: s.nombre || `Parada ${idx + 1}`,
          horario: s.horario || '05:45 AM',
          latitud: s.latitud,
          longitud: s.longitud,
          colonia_referencia: s.colonia_referencia || undefined,
          referencia_visual: s.referencia_visual || undefined,
        }))
      };

      if (editingRouteId) {
        await updateCompanyRoute(company.id, editingRouteId, payload);
      } else {
        await createCompanyRoute(company.id, payload);
      }

      cancel();
      if (onSaved) await onSaved();
      notify.success('Ruta guardada correctamente');
    } catch (err) {
      notify.error(err.message || 'Error al guardar ruta de transporte');
    } finally {
      setSaving(false);
    }
  };

  /** Clic en el mapa: agrega parada y completa nombre/colonia con geocodificación inversa. */
  const addStopFromMap = async ({ lat, lng }) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

    setFormStops(prev => [...prev, {
      id: tempId,
      orden: prev.length + 1,
      nombre: `Parada ${prev.length + 1}`,
      horario: estimateStopTime(prev.length),
      latitud: lat,
      longitud: lng,
      colonia_referencia: company?.municipio || 'Zona Metropolitana',
      referencia_visual: 'Punto fijado en mapa'
    }]);

    try {
      const geo = await reverseGeocode(lat, lng);
      if (!geo) return;
      setFormStops(prev => prev.map(s => (s.id !== tempId ? s : {
        ...s,
        nombre: geo.road ? `Parada ${geo.road}` : s.nombre,
        colonia_referencia: geo.area || s.colonia_referencia,
        referencia_visual: geo.road && geo.area ? `${geo.road}, ${geo.area}` : s.referencia_visual
      })));
    } catch (err) {
      // Sin red: la parada queda con los valores por defecto
    }
  };

  const updateStop = (idx, field, value) => {
    setFormStops(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const removeStop = (idx) => setFormStops(prev => prev.filter((_, i) => i !== idx));

  const moveStop = (idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= formStops.length) return;
    setFormStops(prev => {
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  return {
    isEditing,
    editingRouteId,
    formData,
    formStops,
    saving,
    startCreate,
    startEdit,
    cancel,
    changeField,
    useShift,
    save,
    addStopFromMap,
    updateStop,
    removeStop,
    moveStop
  };
}
