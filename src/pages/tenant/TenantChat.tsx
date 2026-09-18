import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { io } from 'socket.io-client';
import { Send, User, Bot, UserCog } from 'lucide-react';
import clsx from 'clsx';

interface Message {
  id?: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | string;
  content: string;
  createdAt?: string;
}

interface IncomingPayload {
  tenantId: string;
  customerPhone: string;
  profileName: string;
  fullText: string;
  role?: string; // Sometimes we might want to differentiate
}

export default function TenantChat() {
  const { tenantId } = useParams();
  
  // Lista de clientes activos (podría venir de BD, pero por ahora en memoria/en vivo)
  const [activeClients, setActiveClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  
  // Historial de mensajes por cliente
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});
  
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Conectar Socket.io
  useEffect(() => {
    const newSocket = io('http://localhost:3000/whatsapp');

    newSocket.on('connect', () => {
      console.log('Conectado a WebSockets');
      // Podríamos emitir un evento para unirnos a una sala específica del tenant
    });

    newSocket.on('new_message', (payload: IncomingPayload) => {
      if (payload.tenantId !== tenantId) return;

      const phone = payload.customerPhone;
      
      // Añadir cliente a la lista si no existe
      setActiveClients((prev) => (prev.includes(phone) ? prev : [...prev, phone]));

      // Añadir mensaje al historial
      const newMessage: Message = {
        role: payload.role || 'USER', // Asumimos USER por defecto si viene del webhook
        content: payload.fullText,
        createdAt: new Date().toISOString()
      };

      setChatHistory((prev) => ({
        ...prev,
        [phone]: [...(prev[phone] || []), newMessage]
      }));
    });

    return () => {
      newSocket.close();
    };
  }, [tenantId]);

  // 2. Cargar historial desde BD al seleccionar un cliente
  useEffect(() => {
    if (!selectedClient) return;

    const fetchHistory = async () => {
      try {
        const res = await api.get<Message[]>(`/chat/history/${tenantId}/${selectedClient}`);
        setChatHistory((prev) => ({
          ...prev,
          [selectedClient]: res.data
        }));
      } catch (error) {
        console.error('Error fetching history', error);
      }
    };

    fetchHistory();
  }, [selectedClient, tenantId]);

  // 3. Auto-scroll al fondo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, selectedClient]);

  // 4. Enviar mensaje manual
  const sendManualMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedClient) return;

    const messageText = inputText;
    setInputText('');

    // Añadir optimísticamente a la UI
    const newMessage: Message = {
      role: 'ASSISTANT', // Lo marcamos como ASSISTANT o ADMIN
      content: messageText,
      createdAt: new Date().toISOString()
    };
    
    setChatHistory((prev) => ({
      ...prev,
      [selectedClient]: [...(prev[selectedClient] || []), newMessage]
    }));

    try {
      await api.post('/chat/send', {
        tenantId,
        customerPhone: selectedClient,
        message: messageText
      });
    } catch (error) {
      console.error('Error enviando mensaje manual', error);
    }
  };

  return (
    <div className="flex h-full bg-slate-900 overflow-hidden">
      {/* Lista de Clientes (Sidebar del Chat) */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800">
          <h3 className="font-bold text-white">Conversaciones Activas</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeClients.length === 0 ? (
            <p className="p-4 text-slate-500 text-sm">No hay mensajes recientes en vivo.</p>
          ) : (
            activeClients.map((phone) => (
              <button
                key={phone}
                onClick={() => setSelectedClient(phone)}
                className={clsx(
                  "w-full text-left p-4 border-b border-slate-800 transition-colors flex items-center gap-3",
                  selectedClient === phone ? "bg-slate-800" : "hover:bg-slate-800/50"
                )}
              >
                <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-full">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{phone}</p>
                  <p className="text-xs text-slate-400">Toca para ver el chat</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Ventana Principal de Chat */}
      <div className="flex-1 flex flex-col bg-slate-900 relative">
        {selectedClient ? (
          <>
            {/* Header del Chat */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-full">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{selectedClient}</h3>
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    En línea
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                <UserCog size={14} /> Modo Intervención (Si escribes, la IA se detiene)
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(chatHistory[selectedClient] || []).map((msg, idx) => {
                const isBotOrAdmin = msg.role === 'ASSISTANT' || msg.role === 'SYSTEM';
                return (
                  <div key={idx} className={clsx("flex", isBotOrAdmin ? "justify-end" : "justify-start")}>
                    <div className={clsx(
                      "max-w-[70%] rounded-2xl px-5 py-3 shadow-md",
                      isBotOrAdmin 
                        ? "bg-emerald-600 text-white rounded-tr-sm" 
                        : "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm"
                    )}>
                      {isBotOrAdmin && (
                        <div className="flex items-center gap-1 text-emerald-200 mb-1 text-[10px] uppercase font-bold tracking-wider">
                          <Bot size={12} /> {msg.role === 'SYSTEM' ? 'ADMIN' : 'IA BOT'}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <form onSubmit={sendManualMessage} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Escribe un mensaje manual para intervenir la conversación..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-6 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <MessageSquare size={64} className="mb-4 opacity-50" />
            <p className="text-lg">Selecciona una conversación del panel lateral</p>
            <p className="text-sm mt-2 opacity-75">O espera a que lleguen mensajes nuevos en vivo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Dummy import para el icono si no está en el top
import { MessageSquare } from 'lucide-react';
