import React from 'react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import FlowOrchestrator from './FlowOrchestrator';

/** Vista del panel de administración de prompts del chatbot. */
export default function AdminView({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Volver al Chat</span>
          </button>
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-black text-slate-900">Panel de Administración de Prompts</span>
          </div>
        </div>
      </div>

      <div className="flex-1 pb-16">
        <FlowOrchestrator onTestChat={onBack} />
      </div>
    </div>
  );
}
