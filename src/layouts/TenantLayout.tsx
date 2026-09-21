import { Outlet, Link, useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Settings, QrCode, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TenantLayout() {
  const { tenantId } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-emerald-400 truncate">{tenantId}</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to={`/tenant/${tenantId}/dashboard`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <QrCode size={20} />
            Conexión
          </Link>
          <Link to={`/tenant/${tenantId}/chat`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <MessageSquare size={20} />
            Live Chat
          </Link>
          <Link to={`/tenant/${tenantId}/settings`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <Settings size={20} />
            Ajustes
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
          >
            <LogOut size={20} />
            Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
