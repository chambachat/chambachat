import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  Save, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  MessageSquare,
  FileCode
} from 'lucide-react';
import { getPrompts, updatePrompt } from '../../services/api';

export default function FlowOrchestrator({ onTestChat }) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [savedSuccessKey, setSavedSuccessKey] = useState(null);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data = await getPrompts();
      setPrompts(data);
    } catch (err) {
      console.error('Error cargando prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleTextChange = (stepKey, newText) => {
    setPrompts((prev) =>
      prev.map((p) => (p.step_key === stepKey ? { ...p, prompt_texto: newText } : p))
    );
  };

  const handleTitleChange = (stepKey, newTitle) => {
    setPrompts((prev) =>
      prev.map((p) => (p.step_key === stepKey ? { ...p, titulo_admin: newTitle } : p))
    );
  };

  const handleSave = async (prompt) => {
    setSavingKey(prompt.step_key);
    try {
      await updatePrompt(prompt.step_key, {
        titulo_admin: prompt.titulo_admin,
        prompt_texto: prompt.prompt_texto,
        opciones_json: prompt.opciones_json,
        activo: prompt.activo,
      });
      setSavedSuccessKey(prompt.step_key);
      setTimeout(() => {
        setSavedSuccessKey(null);
      }, 3000);
    } catch (err) {
      alert('Error al guardar prompt: ' + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Settings2 className="w-4 h-4" />
            <span>Orquestación de Flujos Dinámica (Propia)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Panel de Administración del Chatbot
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl mt-1">
            Modifica en tiempo real los textos y saludos del asistente. Los cambios se guardan directamente en PostgreSQL y surten efecto inmediato sin reiniciar el backend ni desplegar código.
          </p>
        </div>

        <button
          onClick={onTestChat}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-sm w-fit"
        >
          <MessageSquare className="w-4 h-4" />
          Probar en el Simulador de Chat
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Explicación de Arquitectura No-Code */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <span className="font-bold text-emerald-950">Sustitución de herramientas de terceros: </span>
          Este panel administra la tabla <code className="bg-emerald-100/80 px-1.5 py-0.5 rounded text-emerald-900 font-mono">bot_flow_config</code>. Cualquier ajuste en los copys (como las variables <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-emerald-900 font-mono">{'{nombre}'}</code>) es inyectado dinámicamente en el motor conversacional.
        </div>
      </div>

      {/* Lista de Prompts Configurables */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">Cargando orquestador de flujos...</div>
      ) : (
        <div className="space-y-6">
          {prompts.map((p) => {
            const isSaving = savingKey === p.step_key;
            const isSaved = savedSuccessKey === p.step_key;
            const isIneaStep = p.step_key === 'inea_prompt';

            return (
              <div
                key={p.step_key}
                className={`rounded-2xl p-6 border transition shadow-sm ${
                  isIneaStep 
                    ? 'bg-purple-50/40 border-purple-200' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                      #{p.step_order}
                    </span>
                    <div>
                      <input
                        type="text"
                        value={p.titulo_admin}
                        onChange={(e) => handleTitleChange(p.step_key, e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-900 hover:border-b hover:border-slate-300 focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono block">
                        Clave de paso: <code className="text-slate-600">{p.step_key}</code>
                      </span>
                    </div>
                  </div>

                  {isIneaStep && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200 flex items-center gap-1 w-fit">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Paso INEA
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Texto del Mensaje que el Bot dirá en este paso:
                  </label>
                  <textarea
                    rows={isIneaStep ? 4 : 3}
                    value={p.prompt_texto}
                    onChange={(e) => handleTextChange(p.step_key, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans"
                  />
                  {p.step_key === 'ask_municipio' && (
                    <span className="text-[11px] text-slate-500 block">
                      Nota: Puedes utilizar <code className="text-emerald-700 font-mono font-semibold">{'{nombre}'}</code> para personalizar el saludo con el nombre capturado.
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {isSaved && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" /> ¡Guardado en PostgreSQL con éxito!
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleSave(p)}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Guardando en BD...' : 'Guardar Cambio'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
