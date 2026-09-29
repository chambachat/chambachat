import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Video, CheckCircle, XCircle } from 'lucide-react';
import { authHeaders } from '../../services/api';

const API_BASE = '/api/v1';

export default function AdminVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', tiktok_url: '', keywords: '', is_active: true });

  const loadVideos = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/videos`, { headers: authHeaders() });
      if (res.ok) {
        setVideos(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/admin/videos/${editingId}` : `${API_BASE}/admin/videos`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setEditingId(null);
        setFormData({ title: '', tiktok_url: '', keywords: '', is_active: true });
        loadVideos();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar video?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/videos/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) loadVideos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (v) => {
    setEditingId(v.id);
    setFormData({ title: v.title, tiktok_url: v.tiktok_url, keywords: v.keywords || '', is_active: v.is_active });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando videos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-500" />
            Videos Tutoriales (TikToks)
          </h2>
          <p className="text-sm text-slate-500">Agrega videos para que aparezcan en el feed de los candidatos.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-700">{editingId ? 'Editar Video' : 'Nuevo Video'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block text-sm">
            Título
            <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="Ej. Cómo subir puntos Aura" />
          </label>
          <label className="block text-sm">
            URL de TikTok
            <input type="url" required value={formData.tiktok_url} onChange={e => setFormData({ ...formData, tiktok_url: e.target.value })} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="https://www.tiktok.com/@chambachat/video/..." />
          </label>
          <label className="block text-sm md:col-span-2">
            Palabras clave (separadas por comas)
            <input type="text" value={formData.keywords} onChange={e => setFormData({ ...formData, keywords: e.target.value })} className="mt-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border" placeholder="puntos aura, perfil, aplicar" />
          </label>
          <div className="flex items-center gap-2 mt-4 md:col-span-2">
            <input type="checkbox" id="v-active" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
            <label htmlFor="v-active" className="text-sm">Video activo</label>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
            {editingId ? 'Guardar Cambios' : 'Agregar Video'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ title: '', tiktok_url: '', keywords: '', is_active: true }); }} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border shadow-sm divide-y">
        {videos.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No hay videos registrados.</div>
        ) : videos.map(v => (
          <div key={v.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div>
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                {v.title}
                {v.is_active ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
              </div>
              <div className="text-xs text-slate-500 mt-1 truncate max-w-sm"><a href={v.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{v.tiktok_url}</a></div>
              {v.keywords && <div className="text-xs text-slate-400 mt-1">Palabras clave: {v.keywords}</div>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(v)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(v.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white shadow-sm border rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
