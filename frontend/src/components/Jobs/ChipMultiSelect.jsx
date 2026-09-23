import React from 'react';
import { Check } from 'lucide-react';

/** Selección múltiple con chips (prestaciones, certificaciones, requisitos físicos). */
export default function ChipMultiSelect({ label, options, value = [], onChange, hint }) {
  const toggle = (opt) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  };
  return (
    <div>
      <label className="block text-slate-700 font-semibold mb-1">
        {label}
        {value.length > 0 && <span className="ml-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">{value.length}</span>}
      </label>
      {hint && <p className="text-[10px] text-slate-400 mb-1.5">{hint}</p>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                active
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'
              }`}
            >
              {active && <Check className="w-3 h-3" />}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
