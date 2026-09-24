import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';

const NEAR_BOTTOM_PX = 140;

/**
 * Área desplazable del chat.
 * - Desplaza solo este contenedor, nunca la página: el encabezado con el menú queda siempre visible.
 * - Al cambiar de conversación baja al fondo de inmediato.
 * - Cuando llegan mensajes baja al fondo si el usuario ya estaba abajo o si el mensaje es suyo;
 *   si estaba leyendo arriba, muestra un botón "Nuevos mensajes" en lugar de moverlo.
 * - Si el contenido crece sin nuevos mensajes (tarjetas, carrusel) se mantiene pegado al fondo.
 */
export default function ChatScrollArea({
  children,
  sessionKey,
  messages = [],
  isTyping = false,
  className = '',
  innerClassName = 'max-w-3xl mx-auto w-full min-w-0 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6',
}) {
  const scrollerRef = useRef(null);
  const innerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const lastCountRef = useRef(messages.length);
  const lastSessionRef = useRef(sessionKey);
  const [pendingNew, setPendingNew] = useState(false);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    nearBottomRef.current = true;
    setPendingNew(false);
  }, []);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    nearBottomRef.current = distance < NEAR_BOTTOM_PX;
    if (nearBottomRef.current) setPendingNew(false);
  };

  // Otra conversación: al fondo sin animación
  useEffect(() => {
    if (lastSessionRef.current === sessionKey) return;
    lastSessionRef.current = sessionKey;
    lastCountRef.current = messages.length;
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [sessionKey, messages.length, scrollToBottom]);

  // Mensajes nuevos o indicador "escribiendo"
  const lastId = messages.length ? messages[messages.length - 1].id : null;
  useEffect(() => {
    const count = messages.length;
    const grew = count > lastCountRef.current;
    lastCountRef.current = count;
    if (!grew && !isTyping) return;
    const mine = grew && messages[count - 1]?.sender === 'user';
    if (nearBottomRef.current || mine) {
      requestAnimationFrame(() => scrollToBottom(count <= 1 ? 'auto' : 'smooth'));
    } else if (grew) {
      setPendingNew(true);
    }
  }, [messages.length, lastId, isTyping, scrollToBottom]);

  // El contenido crece (imágenes, tarjetas): seguir pegado al fondo si ya estábamos ahí
  useEffect(() => {
    const el = scrollerRef.current;
    const inner = innerRef.current;
    if (!el || !inner || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      if (nearBottomRef.current) el.scrollTo({ top: el.scrollHeight });
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative flex-1 min-h-0 w-full">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className={`h-full overflow-y-auto overflow-x-hidden overscroll-contain ${className}`}
      >
        <div ref={innerRef} className={innerClassName}>
          {children}
        </div>
      </div>

      {pendingNew && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg transition animate-fadeIn"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Nuevos mensajes</span>
        </button>
      )}
    </div>
  );
}
