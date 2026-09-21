import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Search, Filter } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { getJobs, createJob } from '../../services/api';
import JobCard from '../Jobs/JobCard';
import NewJobModal from '../Jobs/NewJobModal';

export default function JobsManager() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMuni, setFilterMuni] = useState('');
  const [showModal, setShowModal] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await getJobs({ municipio: filterMuni, apoyo_inea: null });
      setJobs(data);
    } catch (err) {
      console.error('Error cargando vacantes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [filterMuni]);

  const handleCreate = async (newJob) => {
    try {
      await createJob(newJob);
      setShowModal(false);
      toast.success('Vacante publicada');
      loadJobs();
      return true;
    } catch (err) {
      toast.error('Error al publicar vacante: ' + err.message);
      return false;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs tracking-wider uppercase mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Portal Reclutador B2B</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Bolsa de Vacantes Operativas</h1>
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
        <span className="text-xs text-slate-400 ml-auto font-medium">{jobs.length} vacantes activas</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando vacantes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}

      <NewJobModal isOpen={showModal} onClose={() => setShowModal(false)} onSubmit={handleCreate} />
    </div>
  );
}
