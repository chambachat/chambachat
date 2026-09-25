import React, { useState } from 'react';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';

export default function ScraperTool({ onBack }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const toast = useToast();

  const handleScrape = async () => {
    if (!url) {
      toast.error('Ingresa una URL válida');
      return;
    }
    
    setLoading(true);
    setLogs(prev => [...prev, `[INFO] Iniciando extracción de: ${url}`]);
    
    try {
      const res = await fetch('/api/v1/admin/scrape/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Error en el servidor');
      }
      
      if (data.success) {
        setLogs(prev => [...prev, `[EXITO] ${data.message}. Job ID: ${data.job_id}`]);
        toast.success('Vacante scrapeada con éxito');
      } else {
        setLogs(prev => [...prev, `[AVISO] ${data.message}`]);
        toast.error(data.message);
      }
      
    } catch (err) {
      setLogs(prev => [...prev, `[ERROR] ${err.message}`]);
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
          <h1 className="text-xl font-bold">Herramienta de Scraping de Vacantes</h1>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">URL de la vacante (Computrabajo, OCC, etc)</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://www.computrabajo.com.mx/ofertas-de-trabajo/..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button 
                onClick={handleScrape}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Extraer
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Esta herramienta descargará el texto de la página y usará Gemini para buscar teléfonos o correos. Si los encuentra, la vacante se publica con vigencia de 15 días.
            </p>
          </div>
          
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Consola de Resultados</h3>
            <div className="bg-slate-900 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto text-xs font-mono text-emerald-400 space-y-1">
              {logs.length === 0 ? (
                <span className="text-slate-500">Esperando ejecución...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={log.startsWith('[ERROR]') ? 'text-rose-400' : log.startsWith('[EXITO]') ? 'text-emerald-400' : 'text-slate-300'}>
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
