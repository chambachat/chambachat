import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/Toast';
import { 
  Briefcase, 
  Plus, 
  MapPin, 
  DollarSign, 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  Bus,
  Search,
  Filter
} from 'lucide-react';
import { getJobs, createJob } from '../../services/api';

export default function JobsManager() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMuni, setFilterMuni] = useState('');
  const [filterInea, setFilterInea] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [newJob, setNewJob] = useState({
    empresa_nombre: '',
    titulo: '',
    descripcion: '',
    sueldo_semanal_libre: 2400,
    turnos_fijos: true,
    apoyo_inea: true,
    transporte_incluido: true,
    municipio: 'Apodaca',
    latitud: 25.7816,
    longitud: -100.1887,
  });

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await getJobs({
        municipio: filterMuni,
        apoyo_inea: filterInea === '' ? null : filterInea === 'true',
      });
      setJobs(data);
    } catch (err) {
      console.error('Error cargando vacantes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [filterMuni, filterInea]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createJob(newJob);
      setShowModal(false);
      setNewJob({
        empresa_nombre: '',
        titulo: '',
        descripcion: '',
        sueldo_semanal_libre: 2400,
        turnos_fijos: true,
        apoyo_inea: true,
        transporte_incluido: true,
        municipio: 'Apodaca',
        latitud: 25.7816,
        longitud: -100.1887,
      });
      loadJobs();
    } catch (err) {
      toast.error('Error al publicar vacante: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs tracking-wider uppercase mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Portal Reclutador B2B</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bolsa de Vacantes Operativas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Gestión y publicación de puestos para plantas industriales en el corredor Monterrey, Apodaca, Pesquería y San Nicolás.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Publicar Nueva Vacante
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center mb-6">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Filter className="w-4 h-4 text-emerald-600" />
          Filtros:
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por municipio..."
            value={filterMuni}
            onChange={(e) => setFilterMuni(e.target.value)}
            className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <span className="text-xs text-slate-400 ml-auto font-medium">
          {jobs.length} vacantes activas
        </span>
      </div>

      {/* Grid de Vacantes */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando vacantes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-emerald-500 shadow-sm transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wide">
                      {job.empresa_nombre}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 leading-snug">
                      {job.titulo}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-emerald-600">
                      ${job.sueldo_semanal_libre.toLocaleString('es-MX')}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">libre/sem</span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  {job.descripcion || 'Sin descripción adicional.'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                    <MapPin className="w-3 h-3 text-sky-500" />
                    {job.municipio}
                  </span>
                  {job.transporte_incluido && (
                    <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                      <Bus className="w-3 h-3 text-amber-500" />
                      Transporte Incluido
                    </span>
                  )}
                  {job.turnos_fijos && (
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold border border-blue-200">
                      Turno Fijo
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">ID Vacante: #{job.id}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Activa
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear Vacante */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600" />
              Publicar Nueva Vacante de Manufactura
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nombre de la Empresa</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Nemak, Kia, Carrier..."
                  value={newJob.empresa_nombre}
                  onChange={(e) => setNewJob({ ...newJob, empresa_nombre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Título del Puesto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Operador de Prensa y Estampado"
                  value={newJob.titulo}
                  onChange={(e) => setNewJob({ ...newJob, titulo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sueldo Semanal Libre (MXN)</label>
                  <input
                    type="number"
                    min="1400"
                    max="6000"
                    required
                    value={newJob.sueldo_semanal_libre}
                    onChange={(e) => setNewJob({ ...newJob, sueldo_semanal_libre: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Municipio</label>
                  <select
                    value={newJob.municipio}
                    onChange={(e) => setNewJob({ ...newJob, municipio: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                  >
                    <option value="Apodaca">Apodaca</option>
                    <option value="Pesquería">Pesquería</option>
                    <option value="San Nicolás">San Nicolás</option>
                    <option value="Monterrey">Monterrey</option>
                    <option value="Escobedo">Escobedo</option>
                    <option value="Guadalupe">Guadalupe</option>
                    <option value="García">García</option>
                    <option value="Santa Catarina">Santa Catarina</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Descripción del Puesto</label>
                <textarea
                  rows="3"
                  placeholder="Detalles de turnos, actividades y prestaciones..."
                  value={newJob.descripcion}
                  onChange={(e) => setNewJob({ ...newJob, descripcion: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={newJob.turnos_fijos}
                    onChange={(e) => setNewJob({ ...newJob, turnos_fijos: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Turnos Fijos (Sin rolar)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={newJob.transporte_incluido}
                    onChange={(e) => setNewJob({ ...newJob, transporte_incluido: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Transporte de personal</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition font-bold shadow-sm"
                >
                  Guardar Vacante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
