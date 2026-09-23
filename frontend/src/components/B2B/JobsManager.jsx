import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Search, Filter, Building2, Globe2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { getJobs, createJob, getUserCompanies } from '../../services/api';
import JobCard from '../Jobs/JobCard';
import NewJobModal from '../Jobs/NewJobModal';

/** Bolsa de vacantes del portal B2B: ver las propias o las de todas las empresas, y publicar a nombre de una planta del usuario. */
export default function JobsManager({ currentUser, activeCompany, onGoToTeam }) {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMuni, setFilterMuni] = useState('');
  const [scope, setScope] = useState('mine'); // 'mine' | 'all'
  const [scopeCompanyId, setScopeCompanyId] = useState(''); // '' = todas mis empresas
  const [showModal, setShowModal] = useState(false);

  // Empresas del usuario: alimentan el selector del alcance y el combo del modal
  useEffect(() => {
    (async () => {
      try {
        const data = await getUserCompanies();
        setCompanies(data || []);
        if (!data || data.length === 0) setScope('all');
      } catch (err) {
        console.error('Error cargando empresas:', err);
        setScope('all');
      }
    })();
  }, [currentUser?.email]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const filters = { municipio: filterMuni };
      if (scope === 'mine') {
        if (scopeCompanyId) filters.company_id = scopeCompanyId;
        else filters.mine = true;
      }
      setJobs(await getJobs(filters));
    } catch (err) {
      console.error('Error cargando vacantes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [filterMuni, scope, scopeCompanyId]);

  const handleCreate = async (newJob) => {
    try {
      await createJob(newJob);
      setShowModal(false);
      toast.success(`Vacante publicada a nombre de ${newJob.empresa_nombre}`);
      loadJobs();
      return true;
    } catch (err) {
      toast.error('Error al publicar vacante: ' + err.message);
      return false;
    }
  };

  const scopeBtn = (value) => `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
    scope === value ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
  }`;

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

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center mb-6">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Filter className="w-4 h-4 text-emerald-600" />
          Mostrar:
        </div>

        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 gap-1">
          <button type="button" onClick={() => setScope('mine')} disabled={companies.length === 0} className={`${scopeBtn('mine')} disabled:opacity-40`}>
            <Building2 className="w-3.5 h-3.5" />
            <span>Mis empresas</span>
          </button>
          <button type="button" onClick={() => setScope('all')} className={scopeBtn('all')}>
            <Globe2 className="w-3.5 h-3.5" />
            <span>Todas las empresas</span>
          </button>
        </div>

        {scope === 'mine' && companies.length > 1 && (
          <select
            value={scopeCompanyId}
            onChange={(e) => setScopeCompanyId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">Todas mis plantas ({companies.length})</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}

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
        <span className="text-xs text-slate-400 ml-auto font-medium">{jobs.length} vacante{jobs.length === 1 ? '' : 's'} activa{jobs.length === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Cargando vacantes...</div>
      ) : jobs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs bg-white border border-dashed border-slate-200 rounded-2xl">
          {scope === 'mine'
            ? 'Tus empresas aún no tienen vacantes publicadas. Usa "Publicar Nueva Vacante" para crear la primera.'
            : 'No hay vacantes que coincidan con el filtro.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}

      <NewJobModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreate}
        companies={companies}
        defaultCompany={activeCompany}
        onGoToTeam={onGoToTeam ? () => { setShowModal(false); onGoToTeam(); } : undefined}
      />
    </div>
  );
}
