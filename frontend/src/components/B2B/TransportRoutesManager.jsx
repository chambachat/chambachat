import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../ui/Toast';
import { Bus, Plus, X, Building2, MapPin, CheckCircle2, AlertCircle, Navigation, Sparkles } from 'lucide-react';
import { 
  getUserCompanies, 
  getCompanyRoutes, 
  createCompanyRoute, 
  updateCompanyRoute, 
  deleteCompanyRoute 
} from '../../services/api';
import CompanyLocationModal from './CompanyLocationModal';
import { useCompanyShifts } from '../../hooks/useCompanyShifts';
import ShiftFormModal from './Team/ShiftFormModal';
import { ROUTE_COLORS } from './Routes/constants';
import RouteMap from './Routes/RouteMap';
import RouteList from './Routes/RouteList';
import RouteForm from './Routes/RouteForm';

export default function TransportRoutesManager({ currentUser, selectedCompany: propCompany, onCompanyChanged }) {
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(propCompany || null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Sincronizar propCompany si cambia desde el exterior
  useEffect(() => {
    if (propCompany) {
      setSelectedCompany(propCompany);
    }
  }, [propCompany]);

  // Modo edición / creación
  const [isEditing, setIsEditing] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    turno: '',
    color_hex: ROUTE_COLORS[0].hex,
    descripcion: ''
  });
  const [formStops, setFormStops] = useState([]);
  const [saving, setSaving] = useState(false);

  // Shifts
  const { shifts, savingShift, shiftError, saveShift, loadShifts } = useCompanyShifts(selectedCompany?.id);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  // 1. Cargar empresas
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        const userEmail = currentUser?.email;
        const hint = currentUser?.empresa_nombre || currentUser?.company_name;
        const comps = await getUserCompanies(userEmail, hint);
        setCompanies(comps || []);
        if (comps && comps.length > 0) {
          const current = propCompany 
            ? (comps.find(c => c.id === propCompany.id) || comps[0]) 
            : comps[0];
          setSelectedCompany(current);
        }
      } catch (err) {
        console.error('Error cargando empresas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, [currentUser?.email]);

  const loadRoutes = async (comp) => {
    if (!comp?.id) return;
    try {
      setLoading(true);
      const data = await getCompanyRoutes(comp.id);
      setRoutes(data || []);
      if (data && data.length > 0) {
        setActiveRoute(data[0]);
      } else {
        setActiveRoute(null);
      }
    } catch (err) {
      console.error('Error cargando rutas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompany?.id) {
      loadRoutes(selectedCompany);
      loadShifts(selectedCompany.id);
    }
  }, [selectedCompany?.id]);

  const handleStartCreate = () => {
    setIsEditing(true);
    setEditingRouteId(null);
    const initialTurno = shifts.length > 0
      ? `${shifts[0].nombre} (${shifts[0].hora_entrada} - ${shifts[0].hora_salida})`
      : 'Turno 1 (06:00 - 14:00)';
    
    setFormData({
      nombre: `Ruta ${routes.length + 1} - `,
      turno: initialTurno,
      color_hex: ROUTE_COLORS[routes.length % ROUTE_COLORS.length].hex,
      descripcion: ''
    });
    setFormStops([]);
  };

  const handleStartEdit = (route) => {
    setIsEditing(true);
    setEditingRouteId(route.id);
    const defaultTurno = shifts.length > 0
      ? `${shifts[0].nombre} (${shifts[0].hora_entrada} - ${shifts[0].hora_salida})`
      : 'Turno 1 (06:00 - 14:00)';
    
    setFormData({
      nombre: route.nombre || '',
      turno: route.turno || defaultTurno,
      color_hex: route.color_hex || ROUTE_COLORS[0].hex,
      descripcion: route.descripcion || ''
    });
    setFormStops(route.stops ? [...route.stops] : []);
    setActiveRoute(route);
  };

  const handleSaveShift = async (form) => {
    try {
      await saveShift(null, form);
      const newLabel = `${form.nombre} (${form.hora_entrada} - ${form.hora_salida})`;
      setFormData(prev => ({ ...prev, turno: newLabel }));
      setIsShiftModalOpen(false);
      toast.success('Turno creado correctamente');
    } catch (err) {
      // Error is handled in the hook and modal
    }
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (!formData.nombre.trim()) {
      toast.warning('Por favor asigna un nombre a la ruta de transporte.');
      return;
    }
    if (formStops.length === 0) {
      toast.warning('Debes agregar al menos una parada haciendo clic sobre el mapa.');
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
        await updateCompanyRoute(selectedCompany.id, editingRouteId, payload);
      } else {
        await createCompanyRoute(selectedCompany.id, payload);
      }

      setIsEditing(false);
      setEditingRouteId(null);
      await loadRoutes(selectedCompany);
      toast.success('Ruta guardada correctamente');
    } catch (err) {
      toast.error(err.message || 'Error al guardar ruta de transporte');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (routeId, routeName) => {
    const confirmed = await toast.confirm(`¿Seguro que deseas eliminar la ruta "${routeName}" y todas sus paradas?`);
    if (!confirmed) return;
    try {
      await deleteCompanyRoute(selectedCompany.id, routeId);
      await loadRoutes(selectedCompany);
      toast.success('Ruta eliminada');
    } catch (err) {
      toast.error(err.message || 'Error al eliminar ruta');
    }
  };

  const handleMapClick = async ({ lat, lng }) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    
    setFormStops(prev => {
      const nextOrder = prev.length + 1;
      const baseHour = 5;
      const totalMin = 30 + (prev.length * 12);
      const h = baseHour + Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} AM`;

      return [...prev, {
        id: tempId,
        orden: nextOrder,
        nombre: `Parada ${nextOrder}`,
        horario: formattedTime,
        latitud: lat,
        longitud: lng,
        colonia_referencia: selectedCompany?.municipio || 'Zona Metropolitana',
        referencia_visual: 'Punto fijado en mapa'
      }];
    });

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.neighbourhood || addr.suburb || '';
        const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || addr.town || '';

        setFormStops(prev => prev.map(s => {
          if (s.id === tempId) {
            return {
              ...s,
              nombre: road ? `Parada ${road}` : s.nombre,
              colonia_referencia: area || s.colonia_referencia,
              referencia_visual: road && area ? `${road}, ${area}` : s.referencia_visual
            };
          }
          return s;
        }));
      }
    } catch (err) {}
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateStop = (idx, field, value) => {
    setFormStops(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleRemoveStop = (idx) => {
    setFormStops(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveStop = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= formStops.length) return;
    setFormStops(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  if (!loading && companies.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 bg-amber-50 text-amber-600 rounded-3xl inline-flex border border-amber-200">
          <Building2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Empresa Pendiente de Registro</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Para crear y gestionar rutas de transporte en el mapa, primero debes dar de alta tu empresa y subir la Constancia de Situación Fiscal (CSF).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6 animate-fadeIn">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <Bus className="w-4 h-4" />
              <span>Logística de Personal & Movilidad NL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>Rutas de Transporte de Planta</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full">
                GPS & Horarios
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Traza sobre el mapa los puntos de recogida de operarios, asigna horarios exactos de paso y calcula con precisión los tiempos de traslado a tu planta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {!isEditing ? (
              <button
                type="button"
                onClick={handleStartCreate}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition shadow-sm group"
              >
                <Plus className="w-4 h-4 text-emerald-200 group-hover:rotate-90 transition-transform" />
                <span>Nueva Ruta de Transporte</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditingRouteId(null);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
              >
                <X className="w-4 h-4" />
                <span>Cancelar Edición</span>
              </button>
            )}
          </div>
        </div>

        {/* SELECTOR DE PLANTA Y RESUMEN */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Planta / Empresa:</span>
            <div className="relative min-w-[220px]">
              <select
                value={selectedCompany?.id || ''}
                onChange={(e) => {
                  const found = companies.find(c => c.id === parseInt(e.target.value));
                  if (found) setSelectedCompany(found);
                }}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer transition"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    🏭 {c.nombre} ({c.municipio})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-700 transition shadow-2xs"
              title="Ajustar o mover la ubicación exacta de la planta en el mapa"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>{selectedCompany?.latitud ? '📍 Reubicar Planta' : '📍 Ubicar Planta'}</span>
            </button>

            {selectedCompany?.latitud ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>GPS Listo ({Number(selectedCompany.latitud).toFixed(3)}, {Number(selectedCompany.longitud).toFixed(3)})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Ubicación aproximada</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>{routes.length} ruta{routes.length === 1 ? '' : 's'} activa{routes.length === 1 ? '' : 's'}</span>
            <span>&bull;</span>
            <span className="font-semibold text-emerald-700">Conectado con Chambot IA</span>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-950 block">
                Modo Captura GPS Activado: Haz clic sobre el mapa para colocar las paradas
              </span>
              <span className="text-[11px] text-emerald-800">
                Cada clic fijará una parada numerada en el recorrido que se conectará automáticamente con la planta.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-extrabold text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-200">
              {formStops.length} parada{formStops.length === 1 ? '' : 's'} fijada{formStops.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-4">
          {!isEditing ? (
            <RouteList 
              routes={routes} 
              activeRoute={activeRoute} 
              onSelectRoute={setActiveRoute} 
              onEditRoute={handleStartEdit} 
              onDeleteRoute={handleDeleteRoute} 
              onCreateRoute={handleStartCreate}
            />
          ) : (
            <RouteForm 
              formData={formData} 
              stops={formStops} 
              shifts={shifts} 
              onFormChange={handleFormChange}
              onSave={handleSaveRoute}
              onCancel={() => { setIsEditing(false); setEditingRouteId(null); }}
              onRemoveStop={handleRemoveStop}
              onMoveStop={handleMoveStop}
              onUpdateStop={handleUpdateStop}
              onOpenShiftModal={() => setIsShiftModalOpen(true)}
              saving={saving}
              editingRouteId={editingRouteId}
            />
          )}

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Sincronización con el Chat de Candidatos</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Las paradas y horarios que registres aquí se cruzan automáticamente con la ubicación del candidato cuando conversa con <strong>Chambot</strong>. El bot le indicará la parada más cercana a su colonia y a qué hora pasa el transporte.
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-3">
          <RouteMap 
            isEditing={isEditing}
            activeRoute={activeRoute}
            stops={formStops}
            routeColor={formData.color_hex}
            companyLocation={selectedCompany}
            onMapClick={handleMapClick}
          />
        </div>
      </div>

      <ShiftFormModal 
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        savingShift={savingShift}
        shiftError={shiftError}
        selectedCompany={selectedCompany}
      />

      <CompanyLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        company={selectedCompany}
        onSaved={(updatedComp) => {
          setSelectedCompany(prev => ({ ...prev, ...updatedComp }));
          setCompanies(prev => prev.map(c => c.id === updatedComp.id ? { ...c, ...updatedComp } : c));
          if (onCompanyChanged) onCompanyChanged(updatedComp);
        }}
      />
    </div>
  );
}
