import { Outlet, Link, NavLink, useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Settings, QrCode, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

export default function TenantLayout() {
  const { tenantId } = useParams();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navTabs = [
    { to: `/tenant/${tenantId}/dashboard`, icon: QrCode, label: 'Conexión' },
    { to: `/tenant/${tenantId}/dashboard-crm`, icon: MessageSquare, label: 'CRM Dashboard' },
    { to: `/tenant/${tenantId}/chat`, icon: MessageSquare, label: 'Live Chat' },
    { to: `/tenant/${tenantId}/pipeline`, icon: MessageSquare, label: 'Embudo (Pipeline)' },
    { to: `/tenant/${tenantId}/contacts`, icon: MessageSquare, label: 'Contactos' },
    { to: `/tenant/${tenantId}/tags`, icon: Settings, label: 'Etiquetas' },
    { to: `/tenant/${tenantId}/settings`, icon: Settings, label: 'Ajustes' },
  ];

  const tabLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
      isActive
        ? 'bg-emerald-500/20 text-emerald-400'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
    );

  return (
    <div className="h-dvh flex flex-col md:flex-row bg-slate-900 overflow-hidden">
      {/* Header móvil */}
      <div className="relative md:hidden shrink-0 border-b border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="text-emerald-400 shrink-0" size={20} />
            <h2 className="text-base font-bold text-emerald-400 truncate">{tenantId}</h2>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-red-400 transition-colors shrink-0"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
        <div className="relative">
          <nav className="flex px-3 pb-3 gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navTabs.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} className={tabLinkClass}>
                <Icon size={16} />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 bg-gradient-to-l from-slate-950 to-transparent" />
        </div>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-56 lg:w-64 bg-slate-950 border-r border-slate-800 flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-emerald-400 truncate">{tenantId}</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to={`/tenant/${tenantId}/dashboard`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <QrCode size={20} />
            Conexión
          </Link>
          <Link to={`/tenant/${tenantId}/dashboard-crm`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <MessageSquare size={20} />
            Dashboard
          </Link>
          <Link to={`/tenant/${tenantId}/chat`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <MessageSquare size={20} />
            Live Chat
          </Link>
          <Link to={`/tenant/${tenantId}/pipeline`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <MessageSquare size={20} />
            Pipelines
          </Link>
          <Link to={`/tenant/${tenantId}/contacts`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <MessageSquare size={20} />
            Contactos
          </Link>
          <Link to={`/tenant/${tenantId}/tags`} className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
            <Settings size={20} />
            Etiquetas
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
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto md:overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}