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
    } catch (error) {
      console.error('Error connecting', error);
    } finally {
      setConnecting(false);
    }
  };

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

        {loading ? (
          <p className="text-slate-400">Comprobando estado...</p>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            {status?.status === 'CONNECTED' ? (
              <div className="flex flex-col items-center text-emerald-400 space-y-6">
                <CheckCircle2 size={64} />
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
              <div className="flex flex-col items-center space-y-6">
                <div className="bg-white p-4 rounded-xl">
                  <img src={status.qr} alt="WhatsApp QR Code" className="w-64 h-64" />
                </div>
                <h3 className="text-lg font-bold text-white">Escanea el Código QR</h3>
                <p className="text-slate-400 max-w-sm">
                  Abre WhatsApp en tu teléfono, ve a "Dispositivos vinculados" y escanea este código.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6">
                <div className="text-slate-500">
                  <AlertCircle size={64} className="mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white">Desconectado</h3>
                  <p className="text-slate-400 mt-2">El motor no está corriendo para este Tenant.</p>
                </div>
                <button
                  onClick={connectWhatsapp}
                  disabled={connecting}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-3 transition-colors disabled:opacity-50"
                >
                  {connecting ? <RefreshCw className="animate-spin" /> : <QrCode />}
                  {connecting ? 'Inicializando...' : 'Generar Código QR'}
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
