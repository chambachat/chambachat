import React, { useEffect, useState } from 'react';
import { Ban, Building2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { getMyBlocks, removeBlock } from '../../services/api';

/** Empresas que el candidato bloqueó; desde aquí puede quitar el bloqueo. */
export default function BlockedCompanies() {
  const toast = useToast();
  const [blocks, setBlocks] = useState(null);

  useEffect(() => {
    getMyBlocks()
      .then(list => setBlocks((list || []).filter(b => b.blocker_type === 'candidate' && b.mine)))
      .catch(() => setBlocks([]));
  }, []);

  if (!blocks || blocks.length === 0) return null;

  const unblock = async (block) => {
    if (!(await toast.confirm(`¿Quitar el bloqueo a ${block.company_nombre || 'esta empresa'}? Sus reclutadores podrán volver a escribirte.`))) return;
    try {
      await removeBlock(block.id);
      setBlocks(prev => prev.filter(b => b.id !== block.id));
      toast.success('Bloqueo retirado');
    } catch (err) {
      toast.error(err.message || 'No se pudo quitar el bloqueo');
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-2">
      <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wide">
        <Ban className="w-4 h-4 text-rose-600" />
        <span>Empresas bloqueadas ({blocks.length})</span>
      </div>
      <ul className="space-y-1.5">
        {blocks.map(block => (
          <li key={block.id} className="flex items-center justify-between gap-2 bg-white border border-rose-100 rounded-xl px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 min-w-0 text-slate-800 font-semibold">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{block.company_nombre || `Empresa #${block.company_id}`}</span>
            </span>
            <button type="button" onClick={() => unblock(block)} className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0">
              Desbloquear
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
