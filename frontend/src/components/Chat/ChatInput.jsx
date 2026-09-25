import React, { useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ChatInput({ value, onChange, onSend, options, onSelectOption, disabled, placeholder, footer }) {
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() && !options.length) return;
    onSend();
  };

  return (
    <div className="p-3 sm:p-4 bg-gradient-to-t from-white via-white to-transparent w-full shrink-0">
      <div className="max-w-3xl mx-auto w-full">
        {options && options.length > 0 && (
          <div className="pl-0 sm:pl-10 pb-2 space-y-1.5 w-full min-w-0">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => onSelectOption(opt.value)}
                  className="text-xs font-semibold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition border shadow-sm bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-500 text-left"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="relative flex items-center bg-slate-50 border border-slate-300/80 rounded-2xl shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white transition"
        >
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder || 'Pregunta sobre vacantes, montacargas, sueldos...'}
            className="w-full py-3 sm:py-3.5 pl-3.5 sm:pl-4 pr-11 sm:pr-12 text-base sm:text-sm text-slate-800 bg-transparent focus:outline-none placeholder-slate-400"
          />

          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className="absolute right-2 sm:right-2.5 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white transition shadow-sm"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[10px] sm:text-[11px] text-center text-slate-400 mt-1.5 sm:mt-2 font-medium">
          {footer || 'Chambachat te orienta sobre vacantes operativas e industriales cerca de ti.'}
        </p>
      </div>
    </div>
  );
}
