import { useEffect, useState } from 'react';
import { api } from '../../lib/axios';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, ArrowRight } from 'lucide-react';

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
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
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 md:h-[42px]"
            disabled={!newTenantName || !adminEmail || !adminPassword}
          >
            <Plus size={20} /> Crear
          </button>
        </form>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-700">
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
                <li key={tenant.id} className="p-6 flex items-center justify-between hover:bg-slate-750 transition-colors">
                  <div>
                    <h3 className="text-lg font-bold text-white">{tenant.name}</h3>
                    <p className="text-sm text-slate-400 font-mono mt-1">ID: {tenant.id}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/tenant/${tenant.id}/dashboard`)}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Entrar <ArrowRight size={16} />
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
