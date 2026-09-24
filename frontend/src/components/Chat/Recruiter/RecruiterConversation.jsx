import React, { useMemo, useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Bot, BellOff, Sparkles } from 'lucide-react';
import MessageList from '../MessageList';
import ChatScrollArea from '../ChatScrollArea';
import ChatInput from '../ChatInput';
import ScreeningSummary from '../../B2B/Applications/ScreeningSummary';
import CandidateActionButtons from '../../B2B/Applications/CandidateActionButtons';
import { mapRecruiterMessage, initials } from '../../../services/recruiterChat';

function statusClass(status) {
  if (status === 'Contactado') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'Contratado') return 'bg-violet-100 text-violet-800 border-violet-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

/** Conversación de un candidato en modo empresa: encabezado con compatibilidad, mensajes y respuesta. */
export default function RecruiterConversation({ app, recruiterName, sending, onSend, onToggleBot, botActionLoading, onDelete, onToggleFavorite, onToggleBlock, actionLoading }) {
  const [text, setText] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const messages = useMemo(
    () => (app.messages || []).map(m => mapRecruiterMessage(m, app.candidate_name)),
    [app.messages, app.candidate_name]
  );
  const done = app.screening_status === 'done';
  const inProgress = app.screening_status === 'in_progress';
  const blocked = Boolean(app.blocked_by_company || app.blocked_by_candidate);
  const blockedText = app.blocked_by_company
    ? 'Bloqueaste a este candidato. Quita el bloqueo (escudo) para escribirle.'
    : 'El candidato bloqueó a tu empresa: no es posible escribirle.';

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await onSend(t);
  };

  return (
    <>
      <div className="border-b border-slate-100 bg-white px-3 sm:px-6 py-2.5 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">
              {initials(app.candidate_name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-black text-slate-900 truncate">{app.candidate_name}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border shrink-0 ${statusClass(app.status)}`}>{app.status}</span>
              </div>
              <span className="text-[11px] text-slate-500 block truncate">{app.job_titulo} · {app.empresa_nombre}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowDetail(v => !v)}
              title="Compatibilidad y respuestas de la entrevista"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black border transition ${
                done ? 'bg-emerald-600 text-white border-emerald-600' : inProgress ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{app.match_score != null ? `${app.match_score}%` : 'N/D'}{done && app.match_level ? ` · ${app.match_level}` : ''}</span>
              {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <CandidateActionButtons app={app} onToggleFavorite={onToggleFavorite} onToggleBlock={onToggleBlock} loading={actionLoading} />
            <button
              type="button"
              onClick={() => onToggleBot(!app.bot_silenced)}
              disabled={botActionLoading}
              title={app.bot_silenced ? 'Reactivar Chambot en este chat' : 'Silenciar Chambot en este chat'}
              className={`p-1.5 rounded-lg border transition disabled:opacity-40 ${
                app.bot_silenced ? 'text-slate-400 border-slate-200 hover:bg-slate-100' : 'text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {app.bot_silenced ? <BellOff className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onDelete(app)}
              title="Eliminar esta conversación y postulación"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showDetail && <ScreeningSummary app={app} />}
      </div>

      <ChatScrollArea sessionKey={app.id} messages={messages} innerClassName="max-w-3xl mx-auto w-full min-w-0 p-3.5 sm:p-6 space-y-4">
        <MessageList messages={messages} isTyping={false} />
      </ChatScrollArea>

      <ChatInput
        value={text}
        onChange={setText}
        onSend={handleSend}
        options={[]}
        onSelectOption={() => {}}
        disabled={sending || blocked}
        placeholder={blocked ? blockedText : `Responde a ${app.candidate_name}...`}
        footer={blocked ? blockedText : `Respondes como ${recruiterName}. ${app.bot_silenced ? 'Chambot está silenciado en este chat.' : 'Si tardas más de 2 min, Chambot apoya con los datos de la vacante.'}`}
      />
    </>
  );
}
