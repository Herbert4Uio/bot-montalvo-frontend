import { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  systemPrompt: string;
  createdAt: string;
}

export default function SuperadminDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTenantName, setNewTenantName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await api.get<Tenant[]>('/tenants');
      setTenants(res.data);
    } catch (error) {
      console.error('Error fetching tenants', error);
    } finally {
      setLoading(false);
    }
  };

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !adminEmail || !adminPassword) return;
    try {
      const id = newTenantName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await api.post('/tenants', {
        id,
        name: newTenantName,
        adminEmail,
        adminPassword
      });
      setNewTenantName('');
      setAdminEmail('');
      setAdminPassword('');
      fetchTenants();
    } catch (error) {
      console.error('Error creating tenant', error);
    }
  };

  const deleteTenant = async () => {
    if (!tenantToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/tenants/${tenantToDelete.id}`);
      setTenantToDelete(null);
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant', error);
      alert('Error al eliminar la empresa. Asegúrate de tener conexión.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Building className="text-emerald-400" /> Nuevo Tenant
        </h2>
        <form onSubmit={createTenant} className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Nombre Empresa</label>
            <input
              type="text"
              placeholder="Ej: Tienda ABC"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Email Administrador</label>
            <input
              type="email"
              placeholder="admin@tiendaabc.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 w-full md:w-auto md:h-[42px]"
            disabled={!newTenantName || !adminEmail || !adminPassword}
          >
            <Plus size={20} /> Crear
          </button>
        </form>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Tenants Registrados</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando...</div>
        ) : (
          <ul className="divide-y divide-slate-700">
            {tenants.length === 0 ? (
              <li className="p-8 text-center text-slate-400">No hay tenants creados.</li>
            ) : (
              tenants.map(tenant => (
                <li key={tenant.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-700/50 transition-colors">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white truncate">{tenant.name}</h3>
                    <p className="text-sm text-slate-400 font-mono mt-1 truncate">ID: {tenant.id}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/tenant/${tenant.id}/dashboard`)}
                    className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto"
                  >
                    Entrar <ArrowRight size={16} />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Modal de Advertencia de Eliminación */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-red-500/10 p-6 flex flex-col items-center text-center border-b border-red-500/20">
              <div className="bg-red-500/20 p-4 rounded-full mb-4">
                <AlertTriangle size={48} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¿Eliminar esta Empresa?</h3>
              <p className="text-slate-300">
                Estás a punto de eliminar permanentemente a <strong className="text-white">{tenantToDelete.name}</strong>.
              </p>
            </div>
            <div className="p-6">
              <ul className="text-sm text-slate-400 space-y-2 mb-6 list-disc list-inside">
                <li>Se borrará todo el historial de chats y clientes.</li>
                <li>Se borrarán los usuarios administradores del tenant.</li>
                <li>Se cerrará la sesión de WhatsApp vinculada.</li>
                <li className="font-bold text-red-400">Esta acción no se puede deshacer.</li>
              </ul>

              <div className="flex gap-3">
                <button
                  onClick={() => setTenantToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={deleteTenant}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg flex justify-center items-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                >
                  {isDeleting ? 'Eliminando...' : <><Trash2 size={18} /> Sí, Eliminar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
