import React from 'react';

export default function MessageBubble({ message }) {
  if (message.sender === 'system') {
    return (
      <div className="w-full flex justify-center my-2">
        <span className="text-[11px] bg-emerald-50 text-emerald-900 font-medium px-4 py-1.5 rounded-full border border-emerald-200/80 text-center max-w-lg shadow-2xs">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-2.5 sm:gap-3.5 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} min-w-0 w-full`}
    >
      {message.sender === 'bot' && (
        <img
          src="/chambot-redondo.png"
          alt="Chambot"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 p-0.5 border border-emerald-300/80 object-contain shadow-xs shrink-0"
        />
      )}

      {message.sender === 'recruiter' && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs sm:text-sm shadow shrink-0 text-white font-bold">
          👔
        </div>
      )}

      <div className="space-y-1.5 max-w-[88%] sm:max-w-[80%] min-w-0">
        <div
          className={`px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm break-words overflow-hidden ${
            message.sender === 'user'
              ? 'bg-slate-900 text-white rounded-tr-none'
              : message.sender === 'recruiter'
              ? 'bg-blue-50 text-slate-800 rounded-tl-none border border-blue-200'
              : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200/80'
          }`}
        >
          {message.sender === 'recruiter' && (
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-1">
              <span>{message.sender_name || 'Reclutador de Planta'}</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">Empresa</span>
            </div>
          )}
          {message.sender === 'bot' && message.sender_name && message.sender_name !== 'bot' && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
              <span>{message.sender_name}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">Asistente IA</span>
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          <span className="text-[10px] block text-right mt-1 text-slate-400">
            {message.time}
          </span>
        </div>
      </div>
    </div>
  );
}
