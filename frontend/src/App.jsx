import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ChatSimulator from './components/B2C/ChatSimulator';
import RetentionPredictor from './components/B2B/RetentionPredictor';
import JobsManager from './components/B2B/JobsManager';
import CandidatesList from './components/B2B/CandidatesList';
import AnalyticsDashboard from './components/B2B/AnalyticsDashboard';
import FlowOrchestrator from './components/Admin/FlowOrchestrator';

export default function App() {
  const [activeTab, setActiveTab] = useState('predictor');

  return (
    <div className="min-h-screen bg-[#090e17] text-slate-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-16">
        {activeTab === 'b2c-chat' && <ChatSimulator />}
        {activeTab === 'predictor' && <RetentionPredictor />}
        {activeTab === 'jobs' && <JobsManager />}
        {activeTab === 'candidates' && <CandidatesList />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'admin-flow' && (
          <FlowOrchestrator onTestChat={() => setActiveTab('b2c-chat')} />
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-400">Chambachat V2 Core</span>
            <span>· Sistema Activo en Nuevo León</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>FastAPI Python Engine</span>
            <span>·</span>
            <span>PostgreSQL & SQLite Compatible</span>
            <span>·</span>
            <span>INEA Canalización Oficial</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
