import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, LogIn } from 'lucide-react';
import { getJobComments, addJobComment } from '../../services/api';

/**
 * Sección de comentarios comunitarios para una vacante.
 * Cualquiera puede leer; solo usuarios logueados pueden comentar.
 */
export default function JobComments({ jobId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;
    getJobComments(jobId).then(setComments).catch(() => {});
  }, [jobId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!texto.trim() || texto.trim().length < 3) return;
    setSending(true);
    setError('');
    try {
      const newComment = await addJobComment(jobId, texto.trim());
      setComments(prev => [...prev, newComment]);
      setTexto('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `hace ${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `hace ${diffDays}d`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const maskEmail = (email) => {
    if (!email) return 'Usuario';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local.slice(0, 2)}***@${domain}`;
  };

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-emerald-600" />
        <span className="text-sm font-semibold text-gray-700">
          Comentarios {comments.length > 0 && `(${comments.length})`}
        </span>
      </div>

      {/* Lista de comentarios */}
      {comments.length === 0 ? (
        <p className="text-xs text-gray-400 italic mb-3">
          Sé el primero en aportar información sobre esta vacante.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-emerald-700">
                  {c.user_name || maskEmail(c.user_email)}
                </span>
                <span className="text-[10px] text-gray-400">{formatDate(c.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 leading-snug">{c.texto}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario para agregar comentario */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: Ahí pagan $2,800 semanal..."
            maxLength={500}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || texto.trim().length < 3}
            className="bg-emerald-600 text-white rounded-lg px-3 py-2 hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <LogIn className="w-3 h-3" />
          <span>Inicia sesión para comentar</span>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
