import React, { useState } from 'react';
import { ArrowLeft, Settings2, BarChart3, Video } from 'lucide-react';
import FlowOrchestrator from './FlowOrchestrator';
import SiteAnalytics from './SiteAnalytics';
import AdminVideos from './AdminVideos';

const TABS = [
  { key: 'analytics', label: 'Estadísticas', icon: BarChart3 },
  { key: 'videos', label: 'Videos', icon: Video },
  { key: 'prompts', label: 'Prompts', icon: Settings2 },
];

/** Vista del panel de administración: estadísticas y prompts del chatbot. */
export default function AdminView({ onBack }) {
  const [activeTab, setActiveTab] = useState('analytics');

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
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  activeTab === t.key
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 pb-16 p-4">
        {activeTab === 'analytics' && <SiteAnalytics />}
        {activeTab === 'videos' && <AdminVideos />}
        {activeTab === 'prompts' && <FlowOrchestrator onTestChat={onBack} />}
      </div>
    </div>
  );
}
