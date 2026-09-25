import React, { useState } from 'react';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';

export default function ScraperTool({ onBack }) {
  const [platforms, setPlatforms] = useState({ computrabajo: true, occ: true });
  const [keywords, setKeywords] = useState('ayudante general\nmontacargista');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const toast = useToast();

  const handleToggle = (plat) => {
    setPlatforms(p => ({ ...p, [plat]: !p[plat] }));
  };

  const addLog = (msg, type = 'info') => {
    const prefix = type === 'error' ? '[ERROR]' : type === 'success' ? '[EXITO]' : '[INFO]';
    setLogs(prev => [...prev, `${prefix} ${msg}`]);
  };

  const handleScrape = async () => {
    const activePlatforms = Object.keys(platforms).filter(k => platforms[k]);
    if (activePlatforms.length === 0) {
      toast.error('Selecciona al menos una plataforma');
      return;
    }

    const lines = keywords.split('\n').map(k => k.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Ingresa al menos una palabra clave');
      return;
    }
    
    setLoading(true);
    setLogs([]);
    addLog(`Iniciando búsqueda de ${lines.length} palabras en ${activePlatforms.length} plataformas...`);
    
    let totalSaved = 0;

    try {
      for (const platform of activePlatforms) {
        for (const keyword of lines) {
          addLog(`Iniciando tarea: ${keyword} en ${platform}`);
          
          const res = await fetch('/api/v1/admin/scrape/search-and-run', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({ 
              platform, 
              keyword,
              location: "nuevo-leon",
              limit: 3
            })
          });
          
          const data = await res.json();
          
          if (!res.ok) {
            addLog(`Falló ${keyword} en ${platform}: ${data.detail}`, 'error');
            continue;
          }

          if (data.logs) {
            setLogs(prev => [...prev, ...data.logs.map(l => `[API] ${l}`)]);
          }
          
          if (data.success) {
            totalSaved += data.saved;
          }
        }
      }
      
      addLog(`Proceso finalizado. Total vacantes guardadas: ${totalSaved}`, 'success');
      toast.success(`Scraping completado. ${totalSaved} guardadas.`);
      
    } catch (err) {
      addLog(`Error general: ${err.message}`, 'error');
      toast.error('Falló el scraping: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-900 text-white">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Crawler Automático de Vacantes</h1>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Plataformas Objetivo</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={platforms.computrabajo} onChange={() => handleToggle('computrabajo')} className="w-5 h-5 text-emerald-600 rounded border-slate-300" />
                  <span className="text-slate-700">Computrabajo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={platforms.occ} onChange={() => handleToggle('occ')} className="w-5 h-5 text-emerald-600 rounded border-slate-300" />
                  <span className="text-slate-700">OCC Mundial</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Palabras Clave (Una por línea)</label>
              <textarea
                value={keywords}
                onChange={e => setKeywords(e.target.value)}
                rows={4}
                placeholder="ayudante general&#10;montacargista&#10;soldador"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-y"
              />
            </div>
            
            <button 
              onClick={handleScrape}
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? "Procesando Cola..." : "Iniciar Extracción Masiva"}
            </button>
            <p className="text-xs text-slate-500 text-center">
              Extraerá máximo 3 enlaces por palabra clave para evitar bloqueos. Cada enlace es validado por IA buscando medios de contacto.
            </p>
          </div>
          
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Consola en Vivo</h3>
            <div className="bg-slate-900 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto text-xs font-mono text-emerald-400 space-y-1">
              {logs.length === 0 ? (
                <span className="text-slate-500">Esperando ejecución...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={
                    log.includes('[ERROR]') ? 'text-rose-400' : 
                    log.includes('[EXITO]') ? 'text-emerald-400' : 
                    log.includes('Vacante Guardada') ? 'text-emerald-300 font-bold' :
                    'text-slate-300'
                  }>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
