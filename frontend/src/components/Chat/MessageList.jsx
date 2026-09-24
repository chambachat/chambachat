import React from 'react';
import MessageBubble from './MessageBubble';

/** Lista de burbujas. El desplazamiento al fondo lo controla ChatScrollArea (nunca la página). */
export default function MessageList({ messages, isTyping }) {
  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      
      {isTyping && (
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src="/chambot-v2.png"
            alt="Chambot"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 p-0.5 border border-emerald-300/80 object-contain shadow-xs shrink-0"
          />
          <div className="bg-slate-100 text-slate-500 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      )}
          </div>
  );
}
