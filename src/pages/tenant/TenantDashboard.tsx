import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { QrCode, RefreshCw, CheckCircle2, AlertCircle, LogOut, Trash2 } from 'lucide-react';

interface ConnectionStatus {
  tenantId: string;
  status: string;
  qr?: string;
}

export default function TenantDashboard() {
  const { tenantId } = useParams();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get<ConnectionStatus>(`/whatsapp/${tenantId}/status`);
      setStatus(res.data);
    } catch (error) {
      console.error('Error fetching status', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const connectWhatsapp = async () => {
    setConnecting(true);
    try {
      await api.post(`/whatsapp/${tenantId}/connect`);
      fetchStatus();
      // Empezar a hacer polling más rápido mientras esperamos el QR
      const fastInterval = setInterval(() => {
        fetchStatus();
      }, 2000);
      
      // Limpiar el interval rápido después de 20 segundos
      setTimeout(() => clearInterval(fastInterval), 20000);
    } catch (error) {
      console.error('Error connecting', error);
      setConnecting(false);
    }
  };

  useEffect(() => {
    if (status?.status === 'QR_READY' || status?.status === 'CONNECTED') {
      setConnecting(false);
    }
  }, [status?.status]);

  const disconnectWhatsapp = async () => {
    try {
      await api.post(`/whatsapp/${tenantId}/disconnect`);
      fetchStatus();
    } catch (error) {
      console.error('Error disconnecting', error);
    }
  };

  const clearMemory = async () => {
    if (!confirm('¿Estás seguro de que deseas limpiar la memoria de la IA? Esto borrará el historial de todos los chats para este Tenant y reiniciará el contexto.')) return;
    setClearing(true);
    try {
      await api.post(`/chat/clear/${tenantId}`);
      alert('Memoria de IA limpiada exitosamente. Las conversaciones iniciarán desde cero (con un máximo de 40 mensajes de memoria).');
    } catch (error) {
      console.error('Error clearing memory', error);
      alert('Hubo un error al limpiar la memoria.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-8 text-center space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
          <QrCode className="text-emerald-400" size={32} />
          Conexión de WhatsApp
        </h2>

        {loading && !status ? (
          <p className="text-slate-400">Comprobando estado...</p>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            {status?.status === 'CONNECTED' ? (
              <div className="flex flex-col items-center text-emerald-400 space-y-6">
                <CheckCircle2 size={64} className="animate-pulse" />
                <h3 className="text-xl font-bold text-white">Dispositivo Conectado</h3>
                <p className="text-slate-400">Tu bot está en línea y procesando mensajes para {tenantId}.</p>
                
                <button
                  onClick={disconnectWhatsapp}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/50 px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors mt-4"
                >
                  <LogOut size={18} /> Cerrar Conexión
                </button>
              </div>
            ) : status?.status === 'QR_READY' && status.qr ? (
              <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(52,211,153,0.3)] border-4 border-emerald-400/20 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent -translate-y-full group-hover:animate-[scan_2s_ease-in-out_infinite]" />
                  <img src={status.qr} alt="WhatsApp QR Code" className="w-64 h-64 relative z-10" />
                </div>
                <h3 className="text-lg font-bold text-white">Escanea el Código QR</h3>
                <p className="text-slate-400 max-w-sm">
                  Abre WhatsApp en tu teléfono, ve a "Dispositivos vinculados" y escanea este código.
                </p>
              </div>
            ) : connecting ? (
              <div className="flex flex-col items-center space-y-6 animate-in fade-in duration-300">
                <div className="w-64 h-64 bg-slate-700/50 rounded-xl border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent animate-pulse" />
                  <RefreshCw size={48} className="text-emerald-400 animate-spin mb-4" />
                  <p className="text-emerald-400 font-medium">Generando credenciales...</p>
                </div>
                <h3 className="text-lg font-bold text-white">Conectando con WhatsApp</h3>
                <p className="text-slate-400 max-w-sm">
                  Por favor espera un momento mientras inicializamos el motor de encriptación.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <div className="text-slate-500">
                  <AlertCircle size={64} className="mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-bold text-white">Desconectado</h3>
                  <p className="text-slate-400 mt-2">El motor no está corriendo para este Tenant.</p>
                </div>
                <button
                  onClick={connectWhatsapp}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-emerald-500/25"
                >
                  <QrCode /> Generar Código QR
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trash2 className="text-red-400" size={20} /> Memoria de la IA
          </h3>
          <p className="text-sm text-slate-400 mt-1">Limpia el contexto de <strong>todos</strong> los clientes. Útil si la IA se queda atascada.</p>
        </div>
        <button
          onClick={clearMemory}
          disabled={clearing}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {clearing ? <RefreshCw className="animate-spin" size={18} /> : <Trash2 size={18} />}
          Limpiar Historial
        </button>
      </div>
    </div>
  );
}
