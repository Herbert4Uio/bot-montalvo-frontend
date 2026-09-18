import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function TenantSettings() {
  const { tenantId } = useParams();
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const fetchTenant = async () => {
    try {
      const res = await api.get(`/tenants/${tenantId}`);
      if (res.data.systemPrompt) {
        setSystemPrompt(res.data.systemPrompt);
      }
    } catch (error) {
      console.error('Error fetching tenant', error);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/tenants/${tenantId}`, { systemPrompt });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex items-center gap-3">
          <Settings className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Configuración de Inteligencia Artificial</h2>
        </div>
        
        <form onSubmit={saveSettings} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              System Prompt (Comportamiento del Bot)
            </label>
            <p className="text-xs text-slate-500 mb-4">
              Instrucciones directas para OpenAI. Define la personalidad, el tono, y los límites del bot.
            </p>
            <textarea
              className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors resize-none font-mono text-sm"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Ej: Eres un asistente de ventas para la tienda XYZ. Responde siempre de manera amable y corta..."
            />
          </div>

          <div className="flex justify-end items-center gap-4">
            {saved && (
              <span className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle2 size={16} /> Guardado exitosamente
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
