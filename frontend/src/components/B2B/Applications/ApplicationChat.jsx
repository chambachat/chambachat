import React, { useState } from 'react';
import { Send } from 'lucide-react';

function MessageBubble({ message, candidateName }) {
  const isRecruiter = message.sender_type === 'recruiter';
  const isBot = message.sender_type === 'bot';

  if (message.sender_type === 'system') {
    return (
      <div className="text-center my-2">
        <span className="text-[10px] bg-slate-200/70 text-slate-600 px-3 py-1 rounded-full border border-slate-300/50 inline-block font-medium">
          {message.mensaje}
        </span>
      </div>
    );
  }

  const senderLabel = isRecruiter
    ? `${message.sender_name} (Tú)`
    : isBot
      ? 'Chambot (Asistente IA)'
      : `${candidateName} (Candidato)`;

  const bubbleClass = isRecruiter
    ? 'bg-emerald-600 text-white rounded-tr-none'
    : isBot
      ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-tl-none font-medium'
      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none';

  return (
    <div className={`flex flex-col ${isRecruiter ? 'items-end' : 'items-start'}`}>
      <div className="flex items-center gap-1.5 mb-1 px-1">
        {isBot && (
          <img src="/chambot.png" alt="Chambot" className="w-4 h-4 rounded-full object-contain p-0.5 bg-emerald-100 border border-emerald-300" />
        )}
        <span className={`text-[10px] font-bold ${isBot ? 'text-emerald-700' : 'text-slate-400'}`}>{senderLabel}</span>
      </div>

      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${bubbleClass}`}>
        <p className="whitespace-pre-wrap">{message.mensaje}</p>
        <span className={`text-[9px] block text-right mt-1 ${isRecruiter ? 'text-emerald-100' : 'text-slate-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export default function ApplicationChat({ app, recruiterName, onRecruiterNameChange, onSend, sending }) {
  const [replyText, setReplyText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const ok = await onSend(replyText, recruiterName);
    if (ok) setReplyText('');
  };

  return (
    <>
      <div className="flex-1 min-h-[300px] max-h-[360px] overflow-y-auto space-y-3 p-3 bg-[#fafafa] rounded-2xl border border-slate-200/80">
        {app.messages && app.messages.length > 0 ? (
          app.messages.map((m) => <MessageBubble key={m.id} message={m} candidateName={app.candidate_name} />)
        ) : (
          <div className="text-center py-10 text-xs text-slate-400">
            No hay mensajes en esta conversación aún. Escríbele al candidato abajo.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={recruiterName}
            onChange={(e) => onRecruiterNameChange(e.target.value)}
            placeholder="Tu nombre o planta (ej. Reclutamiento DHL)"
            className="w-48 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-[11px] text-slate-400">Este mensaje le aparecerá de inmediato en su ventana de chat.</span>
        </div>

        <div className="relative flex items-center">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Escribe un mensaje a ${app.candidate_name}...`}
            className="w-full py-3 pl-4 pr-24 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white shadow-sm transition"
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="absolute right-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <span>{sending ? 'Enviando...' : 'Enviar'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </>
  );
}
