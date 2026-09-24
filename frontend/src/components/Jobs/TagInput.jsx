import React, { useMemo, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';

const MAX_TAGS = 20;
const MAX_LEN = 60;

/**
 * Entrada de etiquetas con sugerencias: escribes, eliges de la lista o presionas Enter / coma
 * para agregar un valor propio. Sirve para catálogos abiertos (certificaciones, condiciones)
 * que crecen con cada giro sin tocar código.
 */
export default function TagInput({ label, hint, value = [], onChange, suggestions = [], placeholder = 'Escribe y presiona Enter...' }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);

  const normalized = useMemo(() => new Set(value.map(v => v.toLowerCase())), [value]);
  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    return suggestions
      .filter(s => !normalized.has(s.toLowerCase()))
      .filter(s => !q || s.toLowerCase().includes(q))
      .slice(0, 8);
  }, [suggestions, normalized, text]);

  const add = (raw) => {
    const clean = (raw || '').trim().replace(/\s+/g, ' ').slice(0, MAX_LEN);
    if (!clean || normalized.has(clean.toLowerCase()) || value.length >= MAX_TAGS) return;
    onChange([...value, clean]);
    setText('');
    setHighlight(0);
  };

  const remove = (tag) => onChange(value.filter(v => v !== tag));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (open && filtered[highlight] && text.trim() && filtered[highlight].toLowerCase().startsWith(text.trim().toLowerCase())) add(filtered[highlight]);
      else add(text);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); setOpen(true); setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Backspace' && !text && value.length) {
      remove(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const canAddCustom = text.trim() && !normalized.has(text.trim().toLowerCase()) && !filtered.some(s => s.toLowerCase() === text.trim().toLowerCase());

  return (
    <div>
      <label className="block text-slate-700 font-semibold mb-1">
        {label}
        {value.length > 0 && <span className="ml-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{value.length}</span>}
      </label>
      {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}

      <div
        className="relative"
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
      >
        <div
          onClick={() => inputRef.current?.focus()}
          className="min-h-[42px] flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 focus-within:border-emerald-500 focus-within:bg-white transition cursor-text"
        >
          {value.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-medium px-2 py-0.5 rounded-lg">
              <span>{tag}</span>
              <button type="button" onClick={() => remove(tag)} className="hover:bg-white/20 rounded p-0.5" aria-label={`Quitar ${tag}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={text}
            maxLength={MAX_LEN}
            placeholder={value.length ? '' : placeholder}
            onChange={(e) => { setText(e.target.value); setOpen(true); setHighlight(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="flex-1 min-w-[140px] bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none py-0.5"
          />
        </div>

        {open && (filtered.length > 0 || canAddCustom) && (
          <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-52 overflow-y-auto py-1 text-xs">
            {filtered.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(s)}
                  className={`w-full text-left px-3 py-1.5 hover:bg-emerald-50 hover:text-emerald-800 ${i === highlight ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700'}`}
                >
                  {s}
                </button>
              </li>
            ))}
            {canAddCustom && (
              <li className={filtered.length ? 'border-t border-slate-100' : ''}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(text)}
                  className="w-full text-left px-3 py-1.5 flex items-center gap-1.5 text-emerald-700 font-semibold hover:bg-emerald-50"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar "{text.trim()}"</span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
