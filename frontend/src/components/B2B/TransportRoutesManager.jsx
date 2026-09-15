import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../ui/Toast';
import { 
  Bus, 
  MapPin, 
  Plus, 
  Clock, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Navigation, 
  Building2, 
  AlertCircle, 
  Save, 
  X, 
  MoveUp, 
  MoveDown, 
  Eye, 
  Layers, 
  Route as RouteIcon,
  Sparkles,
  Info,
  Loader2
} from 'lucide-react';
import { 
  getUserCompanies, 
  getCompanyRoutes, 
  createCompanyRoute, 
  updateCompanyRoute, 
  deleteCompanyRoute,
  getCompanyShifts,
  createCompanyShift
} from '../../services/api';
import CompanyLocationModal from './CompanyLocationModal';

const ROUTE_COLORS = [
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Azul Industrial', hex: '#2563eb' },
  { name: 'Morado / Violeta', hex: '#7c3aed' },
  { name: 'Ámbar / Naranja', hex: '#d97706' },
  { name: 'Rojo / Coral', hex: '#e11d48' },
  { name: 'Teal / Turquesa', hex: '#0d9488' }
];

const MUNICIPIOS_COORDS = {
  'monterrey': [25.6866, -100.3161],
  'apodaca': [25.7816, -100.1887],
  'guadalupe': [25.6775, -100.2597],
  'san nicolás de los garza': [25.7486, -100.2887],
  'san nicolas': [25.7486, -100.2887],
  'general escobedo': [25.7972, -100.3275],
  'escobedo': [25.7972, -100.3275],
  'pesquería': [25.7869, -100.0506],
  'pesqueria': [25.7869, -100.0506],
  'garcía': [25.8139, -100.5947],
  'garcia': [25.8139, -100.5947],
  'santa catarina': [25.6756, -100.4636],
  'juárez': [25.6481, -100.0933],
  'juarez': [25.6481, -100.0933]
};

export default function TransportRoutesManager({ currentUser, selectedCompany: propCompany, onCompanyChanged }) {
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(propCompany || null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Sincronizar propCompany si cambia desde el exterior
  useEffect(() => {
    if (propCompany) {
      setSelectedCompany(propCompany);
    }
  }, [propCompany]);

  // Modo edición / creación
  const [isEditing, setIsEditing] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formTurno, setFormTurno] = useState('');
  const [formColor, setFormColor] = useState(ROUTE_COLORS[0].hex);
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formStops, setFormStops] = useState([]);
  const [saving, setSaving] = useState(false);

  // Turnos laborales dinámicos de la empresa
  const [shifts, setShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [isQuickShiftModalOpen, setIsQuickShiftModalOpen] = useState(false);
  const [quickShiftNombre, setQuickShiftNombre] = useState('');
  const [quickShiftEntrada, setQuickShiftEntrada] = useState('06:00');
  const [quickShiftSalida, setQuickShiftSalida] = useState('14:00');
  const [quickShiftDias, setQuickShiftDias] = useState('Lunes a Sábado');
  const [quickShiftTipo, setQuickShiftTipo] = useState('Fijo');
  const [savingQuickShift, setSavingQuickShift] = useState(false);

  // Referencias para evitar stale closures en listeners de Leaflet
  const isEditingRef = useRef(isEditing);
  useEffect(() => {
    isEditingRef.current = isEditing;
    if (mapInstanceRef.current && mapInstanceRef.current.getContainer()) {
      mapInstanceRef.current.getContainer().style.cursor = isEditing ? 'crosshair' : '';
    }
  }, [isEditing]);

  const selectedCompanyRef = useRef(selectedCompany);
  useEffect(() => {
    selectedCompanyRef.current = selectedCompany;
  }, [selectedCompany]);

  // Referencias al mapa
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polylineLayerRef = useRef(null);

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

  // 2. Cargar turnos y rutas de la empresa activa
  const loadShifts = async (compId) => {
    if (!compId) return;
    try {
      setLoadingShifts(true);
      const data = await getCompanyShifts(compId);
      setShifts(data || []);
      if (data && data.length > 0) {
        const defaultT = `${data[0].nombre} (${data[0].hora_entrada} - ${data[0].hora_salida})`;
        setFormTurno(prev => prev || defaultT);
      }
    } catch (err) {
      console.error('Error cargando turnos de empresa:', err);
    } finally {
      setLoadingShifts(false);
    }
  };

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

  // Obtener centro geográfico de la planta (prioriza latitud y longitud fijadas por el usuario)
  const getCompanyCenter = () => {
    const lat = selectedCompany?.latitud ? parseFloat(selectedCompany.latitud) : null;
    const lon = selectedCompany?.longitud ? parseFloat(selectedCompany.longitud) : null;
    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
      return [lat, lon];
    }
    if (!selectedCompany?.municipio) return [25.7816, -100.1887];
    const m = (selectedCompany.municipio || '').trim().toLowerCase();
    return MUNICIPIOS_COORDS[m] || [25.7816, -100.1887];
  };

  // 3. Inicializar Leaflet Map
  useEffect(() => {
    let timer = null;
    let isMounted = true;

    const initMap = () => {
      if (!mapContainerRef.current || !isMounted) return;
      if (typeof window === 'undefined' || !window.L) {
        timer = setTimeout(initMap, 100);
        return;
      }

      // Si el elemento ya tenía un _leaflet_id huérfano, limpiarlo para evitar error fatal
      if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
        delete mapContainerRef.current._leaflet_id;
      }

      if (!mapInstanceRef.current) {
        const center = getCompanyCenter();
        const hasCoords = Boolean(selectedCompany?.latitud && selectedCompany?.longitud);
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

          // Evento de clic en el mapa para agregar parada
          map.on('click', async (e) => {
            // Evaluar siempre el valor actualizado de isEditing mediante ref
            if (!isEditingRef.current) return;
            const { lat, lng } = e.latlng;
            const latFixed = Number(lat.toFixed(5));
            const lngFixed = Number(lng.toFixed(5));
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

            // Añadir de inmediato a la lista de paradas
            setFormStops(prev => {
              const nextOrder = prev.length + 1;
              const baseHour = 5;
              const totalMin = 30 + (prev.length * 12);
              const h = baseHour + Math.floor(totalMin / 60);
              const m = totalMin % 60;
              const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} AM`;

              const newStop = {
                id: tempId,
                orden: nextOrder,
                nombre: `Parada ${nextOrder}`,
                horario: formattedTime,
                latitud: latFixed,
                longitud: lngFixed,
                colonia_referencia: selectedCompanyRef.current?.municipio || 'Zona Metropolitana',
                referencia_visual: 'Punto fijado en mapa'
              };
              return [...prev, newStop];
            });

            // Enriquecer en segundo plano con geocodificación inversa
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latFixed}&lon=${lngFixed}&accept-language=es`
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
            } catch (err) {
              // Si falla la geocodificación externa, la parada ya está fijada correctamente
            }
          });

          mapInstanceRef.current = map;
          if (isEditingRef.current && map.getContainer()) {
            map.getContainer().style.cursor = 'crosshair';
          }
          setMapReady(true);

          // Forzar invalidateSize para garantizar que los tiles carguen de inmediato
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
  }, []);

  // Recentrar mapa si cambia la empresa o su ubicación exacta
  useEffect(() => {
    if (mapInstanceRef.current && selectedCompany) {
      const center = getCompanyCenter();
      const hasCoords = Boolean(selectedCompany?.latitud && selectedCompany?.longitud);
      const zoom = hasCoords ? 14 : 12;
      mapInstanceRef.current.setView(center, zoom);
      mapInstanceRef.current.invalidateSize();
    }
  }, [mapReady, selectedCompany?.id, selectedCompany?.latitud, selectedCompany?.longitud, selectedCompany?.municipio]);

  // 4. Renderizar marcadores y polilínea en el mapa según el estado
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    if (!markersLayerRef.current || !polylineLayerRef.current) return;

    // Limpiar capas previas
    markersLayerRef.current.clearLayers();
    polylineLayerRef.current.clearLayers();

    const plantCenter = getCompanyCenter();
    const hasExactCoords = Boolean(selectedCompany?.latitud && selectedCompany?.longitud);

    // Marcador de la Planta / Destino
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
          <b style="color: #0f172a;">🏭 Planta ${selectedCompany?.nombre || 'Industrial'}</b>
          <div style="color: #059669; font-size: 11px; font-weight: 700; margin-top: 2px;">
            ${hasExactCoords ? '📍 Ubicación GPS Exacta' : '📍 Centro del Municipio'}
          </div>
          <div style="color: #64748b; font-size: 10px; margin-top: 2px;">
            ${selectedCompany?.direccion || selectedCompany?.municipio || 'Destino final del transporte'}
          </div>
          ${hasExactCoords ? `<div style="font-family: monospace; font-size: 10px; color: #059669; margin-top: 3px;">GPS: ${Number(selectedCompany.latitud).toFixed(5)}, ${Number(selectedCompany.longitud).toFixed(5)}</div>` : ''}
        </div>
      `)
      .addTo(markersLayerRef.current);

    // Decidir qué paradas mostrar:
    // Si estamos editando, mostrar formStops; si no, mostrar activeRoute?.stops
    const stopsToRender = isEditing ? formStops : (activeRoute?.stops || []);
    const routeColor = isEditing ? formColor : (activeRoute?.color_hex || '#059669');

    if (stopsToRender.length > 0) {
      const latlngs = [];

      stopsToRender.forEach((stop, idx) => {
        const pos = [stop.latitud, stop.longitud];
        latlngs.push(pos);

        const stopIcon = window.L.divIcon({
          className: 'custom-stop-pin',
          html: `
            <div style="background-color: ${routeColor}; color: white; border: 2px solid white; border-radius: 9999px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; box-shadow: 0 3px 6px rgba(0,0,0,0.25);">
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
              <span style="background: ${routeColor}; color: white; border-radius: 6px; padding: 1px 6px; font-size: 10px;">Parada ${idx + 1}</span>
              <span>${stop.nombre}</span>
            </div>
            <div style="color: #059669; font-weight: 700; margin: 3px 0;">⏰ Pasa: ${stop.horario}</div>
            <div style="color: #64748b; font-size: 10px;">📍 ${stop.colonia_referencia || 'Nuevo León'}</div>
          </div>
        `);
      });

      // Trazar línea hacia la planta como destino final
      const fullPath = [...latlngs, plantCenter];
      window.L.polyline(fullPath, {
        color: routeColor,
        weight: 5,
        opacity: 0.85,
        dashArray: '8, 8',
      }).addTo(polylineLayerRef.current);

      // Ajustar vista para abarcar todos los puntos
      if (latlngs.length > 0) {
        const bounds = window.L.latLngBounds(fullPath);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [mapReady, isEditing, formStops, formColor, activeRoute, selectedCompany]);

  // Iniciar creación de nueva ruta
  const handleStartCreate = () => {
    setIsEditing(true);
    setEditingRouteId(null);
    setFormNombre(`Ruta ${routes.length + 1} - `);
    const initialTurno = shifts.length > 0
      ? `${shifts[0].nombre} (${shifts[0].hora_entrada} - ${shifts[0].hora_salida})`
      : 'Turno 1 (06:00 - 14:00)';
    setFormTurno(initialTurno);
    setFormColor(ROUTE_COLORS[routes.length % ROUTE_COLORS.length].hex);
    setFormDescripcion('');
    setFormStops([]);
  };

  // Iniciar edición de ruta existente
  const handleStartEdit = (route) => {
    setIsEditing(true);
    setEditingRouteId(route.id);
    setFormNombre(route.nombre);
    const defaultTurno = shifts.length > 0
      ? `${shifts[0].nombre} (${shifts[0].hora_entrada} - ${shifts[0].hora_salida})`
      : 'Turno 1 (06:00 - 14:00)';
    setFormTurno(route.turno || defaultTurno);
    setFormColor(route.color_hex || ROUTE_COLORS[0].hex);
    setFormDescripcion(route.descripcion || '');
    setFormStops(route.stops ? [...route.stops] : []);
    setActiveRoute(route);
  };

  // Guardar turno rápido desde el creador de rutas
  const handleSaveQuickShift = async (e) => {
    e.preventDefault();
    if (!selectedCompany?.id || !quickShiftNombre.trim()) return;
    setSavingQuickShift(true);
    try {
      await createCompanyShift(selectedCompany.id, {
        nombre: quickShiftNombre.trim(),
        hora_entrada: quickShiftEntrada.trim(),
        hora_salida: quickShiftSalida.trim(),
        dias: quickShiftDias.trim(),
        tipo: quickShiftTipo.trim()
      });
      await loadShifts(selectedCompany.id);
      const newLabel = `${quickShiftNombre.trim()} (${quickShiftEntrada.trim()} - ${quickShiftSalida.trim()})`;
      setFormTurno(newLabel);
      setIsQuickShiftModalOpen(false);
      setQuickShiftNombre('');
    } catch (err) {
      toast.error(err.message || 'Error al registrar turno laboral');
    } finally {
      setSavingQuickShift(false);
    }
  };

  // Guardar ruta (Crear o Actualizar)
  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (!formNombre.trim()) {
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
        nombre: formNombre.trim(),
        turno: formTurno,
        color_hex: formColor,
        descripcion: formDescripcion.trim() || undefined,
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
    } catch (err) {
      toast.error(err.message || 'Error al guardar ruta de transporte');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar ruta
  const handleDeleteRoute = async (routeId, routeName) => {
    const confirmed = await toast.confirm(`¿Seguro que deseas eliminar la ruta "${routeName}" y todas sus paradas?`);
    if (!confirmed) return;
    try {
      await deleteCompanyRoute(selectedCompany.id, routeId);
      await loadRoutes(selectedCompany);
    } catch (err) {
      toast.error(err.message || 'Error al eliminar ruta');
    }
  };

  // Eliminar una parada en edición
  const handleRemoveStop = (idx) => {
    setFormStops(prev => prev.filter((_, i) => i !== idx));
  };

  // Reordenar paradas
  const handleMoveStop = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= formStops.length) return;
    const newStops = [...formStops];
    const temp = newStops[idx];
    newStops[idx] = newStops[targetIdx];
    newStops[targetIdx] = temp;
    setFormStops(newStops);
  };

  // Actualizar datos de una parada individual en edición
  const handleUpdateStopField = (idx, field, value) => {
    setFormStops(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Si no tiene empresa registrada
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

            {/* BOTÓN PARA REUBICAR PLANTA */}
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

      {/* AVISO DEL MODO DE EDICIÓN EN MAPA */}
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

      {/* LAYOUT PRINCIPAL: LISTA/EDITOR + MAPA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: LISTA DE RUTAS O FORMULARIO DE EDICIÓN (5 COLUMNAS) */}
        <div className="lg:col-span-5 space-y-4">
          {!isEditing ? (
            /* LISTA DE RUTAS REGISTRADAS */
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RouteIcon className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900">Rutas de esta Planta</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {routes.length} total
                </span>
              </div>

              {routes.length === 0 ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                  <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl inline-flex">
                    <Bus className="w-8 h-8" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">No hay rutas registradas</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Agrega tu primera ruta de transporte haciendo clic en "Nueva Ruta" y seleccionando los puntos en el mapa.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                  >
                    Crear Primera Ruta
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {routes.map((r) => {
                    const isSelected = activeRoute?.id === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setActiveRoute(r)}
                        className={`p-4 rounded-2xl border transition cursor-pointer text-left space-y-2.5 ${
                          isSelected
                            ? 'bg-slate-50/90 border-slate-400 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-white shadow-xs"
                              style={{ backgroundColor: r.color_hex || '#059669' }}
                            />
                            <span className="text-xs font-black text-slate-900 truncate block">
                              {r.nombre}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(r);
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Editar ruta y paradas"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRoute(r.id, r.nombre);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Eliminar ruta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <span className="text-[11px] font-semibold text-slate-500 block">
                          {r.turno || 'Turno Matutino'}
                        </span>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span><strong>{r.stops?.length || 0}</strong> paradas</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Inicia: <strong>{r.hora_inicio || '05:30 AM'}</strong></span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="pt-2 flex items-center justify-between text-[10px] text-emerald-700 font-bold border-t border-slate-100">
                            <span>Visualizando en el mapa &rarr;</span>
                            <span>{r.hora_llegada_planta ? `Llegada a nave: ${r.hora_llegada_planta}` : 'Destino: Planta'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* FORMULARIO DE CREACIÓN O EDICIÓN DE RUTA */
            <form onSubmit={handleSaveRoute} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      {editingRouteId ? 'Editar Ruta de Transporte' : 'Registrar Nueva Ruta'}
                    </h3>
                    <span className="text-[10px] text-slate-400">Datos y paradas GPS</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Ruta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Ruta 1 - Huinalá / Pueblo Nuevo"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Turno Asociado *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickShiftModalOpen(true)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nuevo Turno</span>
                  </button>
                </div>
                <select
                  value={formTurno}
                  onChange={(e) => setFormTurno(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                >
                  {shifts.length > 0 ? (
                    shifts.map(s => {
                      const val = `${s.nombre} (${s.hora_entrada} - ${s.hora_salida})`;
                      return (
                        <option key={s.id} value={val}>
                          {s.nombre} &bull; {s.hora_entrada} a {s.hora_salida} ({s.dias || 'Lunes a Sábado'})
                        </option>
                      );
                    })
                  ) : (
                    <option value="Turno 1 (06:00 - 14:00)">Turno 1 (06:00 - 14:00)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Color de Trazado en Mapa
                </label>
                <div className="flex items-center gap-2">
                  {ROUTE_COLORS.map(c => (
                    <button
                      type="button"
                      key={c.hex}
                      onClick={() => setFormColor(c.hex)}
                      className={`w-7 h-7 rounded-full transition transform ${
                        formColor === c.hex ? 'scale-125 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110 opacity-70'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* LISTA DE PARADAS EN MODO EDICIÓN */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Paradas Fijadas ({formStops.length})
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    Haz clic en el mapa para sumar
                  </span>
                </div>

                {formStops.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                    Aún no hay paradas. Haz clic en una avenida en el mapa a la derecha para agregar el primer punto.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {formStops.map((stop, idx) => (
                      <div key={stop.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-5 h-5 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center shrink-0"
                              style={{ backgroundColor: formColor }}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800">Parada #{idx + 1}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveStop(idx, -1)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Subir orden"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === formStops.length - 1}
                              onClick={() => handleMoveStop(idx, 1)}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              title="Bajar orden"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStop(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                              title="Quitar parada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Nombre / Punto</label>
                            <input
                              type="text"
                              value={stop.nombre}
                              onChange={(e) => handleUpdateStopField(idx, 'nombre', e.target.value)}
                              placeholder="ej. Soriana Huinalá"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Horario de paso</label>
                            <input
                              type="text"
                              value={stop.horario}
                              onChange={(e) => handleUpdateStopField(idx, 'horario', e.target.value)}
                              placeholder="05:45 AM"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono font-bold text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                          <span>GPS: {stop.latitud}, {stop.longitud}</span>
                          <span className="text-emerald-700 font-semibold">&rarr; Destino: Planta</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !formNombre.trim() || formStops.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Guardando...' : 'Guardar Ruta'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TARJETA DE AYUDA / INFORMACIÓN */}
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

        {/* COLUMNA DERECHA: MAPA INTERACTIVO LEAFLET (7 COLUMNAS) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-900">
                  {isEditing ? `Trazando: ${formNombre || 'Nueva Ruta'}` : (activeRoute ? activeRoute.nombre : 'Mapa de Rutas de Planta')}
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

            {/* CONTENEDOR DEL MAPA LEAFLET */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
              <div
                ref={mapContainerRef}
                style={{ height: '540px', width: '100%', zIndex: 1 }}
                className="bg-slate-100"
              />

              {/* Botón flotante para recentrar en la planta */}
              <button
                type="button"
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                    const center = getCompanyCenter();
                    const hasCoords = Boolean(selectedCompany?.latitud && selectedCompany?.longitud);
                    mapInstanceRef.current.setView(center, hasCoords ? 15 : 13);
                  }
                }}
                className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur hover:bg-white text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 transition"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                <span>Centrar en Planta</span>
              </button>
            </div>

            {/* BARRA DE DETALLE DE LA RUTA SELECCIONADA */}
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
        </div>
      </div>

      {/* MODAL RÁPIDO PARA CREAR TURNO */}
      {isQuickShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn">
            <button
              onClick={() => setIsQuickShiftModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Crear Turno para esta Planta</h3>
                <p className="text-xs text-slate-500">
                  {selectedCompany?.nombre}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveQuickShift} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Turno *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Turno 1 (Matutino) o Turno Especial"
                  value={quickShiftNombre}
                  onChange={(e) => setQuickShiftNombre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Entrada *
                  </label>
                  <input
                    type="time"
                    required
                    value={quickShiftEntrada}
                    onChange={(e) => setQuickShiftEntrada(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Salida *
                  </label>
                  <input
                    type="time"
                    required
                    value={quickShiftSalida}
                    onChange={(e) => setQuickShiftSalida(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Días
                  </label>
                  <select
                    value={quickShiftDias}
                    onChange={(e) => setQuickShiftDias(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Lunes a Sábado">Lunes a Sábado</option>
                    <option value="Lunes a Viernes">Lunes a Viernes</option>
                    <option value="4x3 (Jornada 12h)">4x3 (Jornada 12h)</option>
                    <option value="Fines de Semana">Fines de Semana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={quickShiftTipo}
                    onChange={(e) => setQuickShiftTipo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Fijo">Fijo</option>
                    <option value="Rolado">Rolado</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Nocturno">Nocturno</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickShiftModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingQuickShift || !quickShiftNombre.trim()}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  {savingQuickShift ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Turno</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA REUBICAR PLANTA */}
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
