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
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Users className="w-4 h-4" />
            <span>Base de Talento Operativo · Nuevo León</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Operarios & Canalización INEA
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Padrón de 100+ candidatos perfilados en Nuevo León. Identificación de rezago educativo canalizado a acreditación de primaria/secundaria con alta lealtad operativa.
          </p>
        </div>

        {/* Quick KPI Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
            <span className="text-[11px] text-slate-400 font-bold block">Total Operarios</span>
            <span className="text-xl font-extrabold text-white">{candidates.length}</span>
          </div>
          <div className="bg-purple-950/40 border border-purple-800/60 p-3 rounded-xl">
            <span className="text-[11px] text-purple-300 font-bold flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Canalizados INEA
            </span>
            <span className="text-xl font-extrabold text-purple-400">
              {totalInea} <span className="text-xs text-purple-300/80 font-normal">({ineaPct}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center mb-6">
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <select
          value={filterInea}
          onChange={(e) => setFilterInea(e.target.value)}
          className="bg-slate-950 text-xs text-white px-3 py-2 rounded-lg border border-slate-800 focus:outline-none"
        >
          <option value="">Todos los perfiles</option>
          <option value="true">Solo con Tag INEA (Aceptó apoyo)</option>
          <option value="false">Sin Tag INEA</option>
        </select>

        <select
          value={filterEduc}
          onChange={(e) => setFilterEduc(e.target.value)}
          className="bg-slate-950 text-xs text-white px-3 py-2 rounded-lg border border-slate-800 focus:outline-none"
        >
          <option value="">Toda escolaridad</option>
          <option value="Primaria_Incompleta">Primaria / Incompleta</option>
          <option value="Secundaria">Secundaria Terminada</option>
          <option value="Preparatoria">Preparatoria / Bachillerato</option>
          <option value="Tecnico">Carrera Técnica</option>
        </select>

        <select
          value={filterMuni}
          onChange={(e) => setFilterMuni(e.target.value)}
          className="bg-slate-950 text-xs text-white px-3 py-2 rounded-lg border border-slate-800 focus:outline-none"
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
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Cargando base de talento...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">ID</th>
                  <th className="px-5 py-3.5">Operario / Contacto</th>
                  <th className="px-5 py-3.5">Ubicación</th>
                  <th className="px-5 py-3.5">Escolaridad</th>
                  <th className="px-5 py-3.5">Estatus INEA</th>
                  <th className="px-5 py-3.5">Sueldo Deseado</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-mono text-slate-500 font-bold">
                      #{cand.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white text-sm">{cand.nombre}</div>
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {cand.telefono || 'Sin teléfono'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                        <MapPin className="w-3 h-3 text-sky-400" />
                        {cand.municipio || 'Nuevo León'}
                      </span>
                      <span className="block text-[10px] text-slate-500">CP {cand.codigo_postal || '64000'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                        cand.nivel_educativo === 'Primaria_Incompleta'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : cand.nivel_educativo === 'Tecnico'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {cand.nivel_educativo.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {cand.tag_inea ? (
                        <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-full font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                          tag_inea = TRUE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <XCircle className="w-3.5 h-3.5" /> No requiere
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-200">
                      ${cand.sueldo_deseado ? cand.sueldo_deseado.toLocaleString('es-MX') : '2,200'} <span className="text-[10px] text-slate-400 font-normal">/sem</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 transition">
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
