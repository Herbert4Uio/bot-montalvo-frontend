import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Users, MessageCircle, BarChart3, TrendingUp } from 'lucide-react';

interface DashboardStats {
  totalContacts: number;
  totalDeals: number;
  totalDealValue: number;
  messagesSent: number;
  stageDistribution: Record<string, number>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];
const STAGES = ['NUEVO LEAD', 'CALIFICADO', 'PRESUPUESTO ENVIADO', 'NEGOCIACION', 'GANADO'];

export default function TenantCrmDashboard() {
  const { tenantId } = useParams();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get<DashboardStats>(`/crm/dashboard/${tenantId}`);
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching dashboard stats', error);
      }
    };
    fetchStats();
  }, [tenantId]);

  if (!stats) {
    return <div className="flex h-full items-center justify-center text-slate-500">Cargando métricas...</div>;
  }

  // Preparar datos para Recharts
  const barData = STAGES.map(stage => ({
    name: stage,
    Leads: stats.stageDistribution[stage] || 0
  }));

  const pieData = STAGES.filter(s => stats.stageDistribution[s] > 0).map(stage => ({
    name: stage,
    value: stats.stageDistribution[stage]
  }));

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full bg-slate-900 overflow-y-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Dashboard Analitico</h1>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-8">
        <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 flex items-center gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-emerald-500/20 text-emerald-400 rounded-full shrink-0">
            <Users size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-slate-400">Total Contactos</p>
            <p className="text-xl sm:text-2xl font-bold text-white truncate">{stats.totalContacts}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 flex items-center gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-blue-500/20 text-blue-400 rounded-full shrink-0">
            <BarChart3 size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-slate-400">Deals Activos</p>
            <p className="text-xl sm:text-2xl font-bold text-white truncate">{stats.totalDeals}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 flex items-center gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-purple-500/20 text-purple-400 rounded-full shrink-0">
            <TrendingUp size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-slate-400">Valor Estimado</p>
            <p className="text-lg sm:text-2xl font-bold text-white truncate">${stats.totalDealValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700 flex items-center gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-amber-500/20 text-amber-400 rounded-full shrink-0">
            <MessageCircle size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-slate-400">Mensajes Intercambiados</p>
            <p className="text-xl sm:text-2xl font-bold text-white truncate">{stats.messagesSent}</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700">
          <h2 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6">Leads por Etapa (Embudo)</h2>
          <div className="h-[260px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 0, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={90} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Bar dataKey="Leads" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-700">
          <h2 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6">Distribución Activa</h2>
          <div className="h-[260px] sm:h-[300px] flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500">No hay suficientes datos para el gráfico.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
