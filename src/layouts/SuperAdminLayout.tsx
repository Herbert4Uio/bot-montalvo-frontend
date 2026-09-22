import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SuperAdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 p-3 sm:p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="text-emerald-400 shrink-0" />
          <h1 className="text-base sm:text-xl font-bold text-slate-100 truncate">SuperAdmin CRM</h1>
        </div>
        <nav className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link to="/superadmin" className="text-slate-300 hover:text-white px-3 py-2 rounded-md transition-colors text-sm sm:text-base">Tenants</Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700 hover:border-red-500/50"
          >
            <LogOut size={18} /> <span className="hidden sm:inline">Salir</span>
          </button>
        </nav>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
