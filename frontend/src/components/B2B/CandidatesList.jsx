import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  MapPin, 
  Phone, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle,
  Award,
  Sparkles
} from 'lucide-react';
import { getCandidates } from '../../services/api';

export default function CandidatesList() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterInea, setFilterInea] = useState('');
  const [filterMuni, setFilterMuni] = useState('');
  const [filterEduc, setFilterEduc] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const data = await getCandidates({
        tag_inea: filterInea === '' ? null : filterInea === 'true',
        municipio: filterMuni,
        nivel_educativo: filterEduc,
      });
      setCandidates(data);
    } catch (err) {
      console.error('Error cargando candidatos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [filterInea, filterMuni, filterEduc]);

  const filtered = candidates.filter((c) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.telefono && c.telefono.includes(searchTerm)) ||
    (c.municipio && c.municipio.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalInea = candidates.filter((c) => c.tag_inea).length;
  const ineaPct = candidates.length > 0 ? ((totalInea / candidates.length) * 100).toFixed(1) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs tracking-wider uppercase mb-1">
            <Users className="w-4 h-4" />
            <span>Base de Talento Operativo · Nuevo León</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Operarios Registrados en Nuevo León
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Padrón de candidatos perfilados en Nuevo León con datos de ubicación, escolaridad y aspiración salarial.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 p-3 rounded-2xl shadow-sm">
            <span className="text-[11px] text-slate-400 font-bold block">Total Operarios</span>
            <span className="text-xl font-extrabold text-slate-900">{candidates.length}</span>
          </div>
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl shadow-sm">
            <span className="text-[11px] text-purple-700 font-bold flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Canalizados INEA
            </span>
            <span className="text-xl font-extrabold text-purple-700">
              {totalInea} <span className="text-xs text-purple-600 font-normal">({ineaPct}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center mb-6">
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
          />
        </div>

        <select
          value={filterMuni}
          onChange={(e) => setFilterMuni(e.target.value)}
          className="bg-slate-50 text-xs text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none"
        >
          <option value="">Todos los municipios</option>
          <option value="Apodaca">Apodaca</option>
          <option value="Pesquería">Pesquería</option>
          <option value="Monterrey">Monterrey</option>
          <option value="Guadalupe">Guadalupe</option>
          <option value="San Nicolás">San Nicolás</option>
          <option value="Escobedo">Escobedo</option>
          <option value="García">García</option>
          <option value="Santa Catarina">Santa Catarina</option>
        </select>
      </div>

      {/* Tabla de Candidatos */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando base de talento...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Operario / Contacto</th>
                  <th className="px-5 py-3.5">Ubicación</th>
                  <th className="px-5 py-3.5">Escolaridad</th>
                  <th className="px-5 py-3.5">Sueldo Deseado</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-400 font-bold">
                      #{cand.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{cand.nombre}</div>
                      <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {cand.telefono || 'Sin teléfono'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                        <MapPin className="w-3 h-3 text-sky-500" />
                        {cand.municipio || 'Nuevo León'}
                      </span>
                      <span className="block text-[10px] text-slate-400">CP {cand.codigo_postal || '64000'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                        cand.nivel_educativo === 'Primaria_Incompleta'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : cand.nivel_educativo === 'Tecnico'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cand.nivel_educativo.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      ${cand.sueldo_deseado ? cand.sueldo_deseado.toLocaleString('es-MX') : '2,200'} <span className="text-[10px] text-slate-400 font-normal">/sem</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 transition">
                        Ver Perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
