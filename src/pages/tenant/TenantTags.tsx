import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Tag as TagIcon, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#d946ef', // fuchsia
  '#f43f5e', // rose
  '#64748b'  // slate
];

export default function TenantTags() {
  const { tenantId } = useParams();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    fetchTags();
  }, [tenantId]);

  const fetchTags = async () => {
    try {
      const res = await api.get<Tag[]>(`/tags/${tenantId}`);
      setTags(res.data);
    } catch (error) {
      console.error('Error fetching tags', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    setLoading(true);
    try {
      await api.post(`/tags/${tenantId}`, {
        name: newName.trim(),
        color: newColor
      });
      setNewName('');
      await fetchTags();
    } catch (error) {
      console.error('Error creating tag', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta etiqueta? Se quitará de todos los clientes.')) return;
    
    try {
      await api.delete(`/tags/${tenantId}/${tagId}`);
      setTags(tags.filter(t => t.id !== tagId));
    } catch (error) {
      console.error('Error deleting tag', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <TagIcon className="text-emerald-400 shrink-0" /> Gestión de Etiquetas
        </h1>
        <p className="text-slate-400">Crea etiquetas personalizadas para segmentar a tus clientes en el CRM.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Formulario Crear Etiqueta */}
        <div className="md:col-span-1">
          <div className="bg-slate-800 p-5 sm:p-6 rounded-xl border border-slate-700 shadow-xl sticky top-4 sm:top-8">
            <h3 className="text-lg font-bold text-white mb-4">Nueva Etiqueta</h3>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mayorista, VIP..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={clsx(
                        "w-8 h-8 rounded-full transition-transform ring-offset-2 ring-offset-slate-800",
                        newColor === color ? "scale-110 ring-2 ring-emerald-500 shadow-lg" : "hover:scale-110 opacity-70 hover:opacity-100"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm text-slate-400 mb-3">Vista previa:</p>
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border"
                  style={{ 
                    borderColor: newColor, 
                    color: newColor, 
                    backgroundColor: `${newColor}15` 
                  }}
                >
                  {newName || 'Nombre de etiqueta'}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !newName.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4 shadow-lg shadow-emerald-500/20"
              >
                <Plus size={18} /> {loading ? 'Creando...' : 'Crear Etiqueta'}
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Etiquetas */}
        <div className="md:col-span-2">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 bg-slate-900/50">
              <h3 className="text-lg font-bold text-white">Tus Etiquetas ({tags.length})</h3>
            </div>
            
            <div className="divide-y divide-slate-700/50">
              {tags.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <TagIcon size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Aún no has creado ninguna etiqueta.</p>
                </div>
              ) : (
                tags.map(tag => (
                  <div key={tag.id} className="p-4 flex items-center justify-between gap-3 flex-wrap hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <span 
                        className="inline-flex items-center px-3 py-1 rounded-md font-medium border truncate"
                        style={{ 
                          borderColor: tag.color, 
                          color: tag.color, 
                          backgroundColor: `${tag.color}15` 
                        }}
                      >
                        {tag.name}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(tag.id)}
                      className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
