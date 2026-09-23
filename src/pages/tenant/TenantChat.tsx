import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { io } from 'socket.io-client';
import { Send, User, Bot, UserCog, MessageSquare, ArrowLeft } from 'lucide-react';
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
  role?: string;
}

interface Customer {
  id: string;
  phone: string;
  phoneNumberReal?: string;
  profileName?: string;
  updatedAt: string;
  tags?: { id: string, name: string, color: string }[];
}

export default function TenantChat() {
  const { tenantId } = useParams();
  
  // Lista de clientes históricos (viene de BD + actualizaciones en vivo)
  const [activeClients, setActiveClients] = useState<Customer[]>([]);
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  
  // Historial de mensajes por cliente (llave = phone)
  const [chatHistory, setChatHistory] = useState<Record<string, Message[]>>({});
  
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filtro de etiquetas
  const [allTags, setAllTags] = useState<{ id: string, name: string, color: string }[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');

  // 1. Cargar la lista completa de clientes al iniciar
  useEffect(() => {
    const fetchCustomersAndTags = async () => {
      try {
        const [customersRes, tagsRes] = await Promise.all([
          api.get<Customer[]>(`/chat/customers/${tenantId}`),
          api.get(`/tags/${tenantId}`)
        ]);
        setActiveClients(customersRes.data);
        setAllTags(tagsRes.data);
      } catch (error) {
        console.error('Error fetching customers', error);
      }
    };
    fetchCustomersAndTags();
  }, [tenantId]);

  // 2. Conectar Socket.io
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:3000';
    const socketInstance = io(`${wsUrl}/whatsapp`, { transports: ['websocket', 'polling'] });

    socketInstance.on('connect', () => {
      console.log('Conectado a WebSockets para el Chat CRM');
    });

    socketInstance.on('new_message', (payload: IncomingPayload) => {
      if (payload.tenantId !== tenantId) return;

      const phone = payload.customerPhone;
      
      // Actualizar la lista de clientes (mover arriba o insertar nuevo)
      setActiveClients((prev) => {
        const existingClientIndex = prev.findIndex((c) => c.phone === phone);
        const updatedDate = new Date().toISOString();
        
        let newClientList = [...prev];
        
        if (existingClientIndex >= 0) {
          // Extraer y mover al inicio
          const [client] = newClientList.splice(existingClientIndex, 1);
          newClientList.unshift({ ...client, updatedAt: updatedDate, profileName: payload.profileName || client.profileName });
        } else {
          // Crear e insertar al inicio
          newClientList.unshift({
            id: Date.now().toString(),
            phone: phone,
            profileName: payload.profileName,
            updatedAt: updatedDate
          });
        }
        
        return newClientList;
      });

      // Añadir mensaje al historial si el chat está cargado
      const newMessage: Message = {
        role: payload.role || 'USER',
        content: payload.fullText,
        createdAt: new Date().toISOString()
      };

      setChatHistory((prev) => ({
        ...prev,
        [phone]: [...(prev[phone] || []), newMessage]
      }));
    });

    return () => {
      socketInstance.close();
    };
  }, [tenantId]);

  // 3. Cargar historial desde BD al seleccionar un cliente
  useEffect(() => {
    if (!selectedClient) return;

    const fetchHistory = async () => {
      try {
        const res = await api.get<Message[]>(`/chat/history/${tenantId}/${selectedClient.phone}`);
        setChatHistory((prev) => ({
          ...prev,
          [selectedClient.phone]: res.data
        }));
      } catch (error) {
        console.error('Error fetching history', error);
      }
    };

    fetchHistory();
  }, [selectedClient?.phone, tenantId]);

  // 4. Auto-scroll al fondo
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, selectedClient]);

  // 5. Enviar mensaje manual
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
      [selectedClient.phone]: [...(prev[selectedClient.phone] || []), newMessage]
    }));

    try {
      await api.post('/chat/send', {
        tenantId,
        customerPhone: selectedClient.phone,
        message: messageText
      });
      
      // Actualizar timestamp del cliente seleccionado a "ahora"
      setActiveClients((prev) => {
        const list = [...prev];
        const idx = list.findIndex(c => c.phone === selectedClient.phone);
        if (idx >= 0) {
          const [c] = list.splice(idx, 1);
          list.unshift({ ...c, updatedAt: new Date().toISOString() });
        }
        return list;
      });

    } catch (error) {
      console.error('Error enviando mensaje manual', error);
    }
  };

  const filteredClients = activeClients.filter(c => 
    selectedTag ? c.tags?.some(t => t.id === selectedTag) : true
  );

  return (
    <div className="flex h-full bg-slate-900 overflow-hidden">
      {/* Lista de Clientes (Sidebar del Chat) */}
      <div className={clsx(
        "w-full md:w-80 border-r border-slate-800 bg-slate-950 flex-col",
        selectedClient ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <h3 className="font-bold text-white flex items-center gap-2 mb-3">
            <MessageSquare size={18} className="text-emerald-400" />
            Todos los Chats
          </h3>
          <div className="mb-2">
            <select 
              value={selectedTag} 
              onChange={e => setSelectedTag(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded text-xs text-white p-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400 mt-1">{filteredClients.length} conversaciones</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredClients.length === 0 ? (
            <p className="p-4 text-slate-500 text-sm">No hay conversaciones aún.</p>
          ) : (
            filteredClients.map((client) => {
              const date = new Date(client.updatedAt);
              const isToday = date.toDateString() === new Date().toDateString();
              const timeString = isToday 
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <button
                  key={client.id || client.phone}
                  onClick={() => setSelectedClient(client)}
                  className={clsx(
                    "w-full text-left p-4 border-b border-slate-800 transition-all flex items-center gap-3 relative overflow-hidden group",
                    selectedClient?.phone === client.phone ? "bg-slate-800/80" : "hover:bg-slate-800/40"
                  )}
                >
                  {selectedClient?.phone === client.phone && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full" />
                  )}
                  <div className={clsx(
                    "p-2 rounded-full transition-colors",
                    selectedClient?.phone === client.phone ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400 group-hover:text-emerald-300 group-hover:bg-emerald-500/10"
                  )}>
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p className="text-sm font-bold text-slate-200 truncate pr-2">
                        {client.profileName || 'Usuario Desconocido'}
                      </p>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">{timeString}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      {client.phoneNumberReal ? `${client.phoneNumberReal} - ${client.phone}` : client.phone}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Ventana Principal de Chat */}
      <div className={clsx(
        "flex-1 flex-col bg-slate-900 relative min-w-0",
        selectedClient ? "flex" : "hidden md:flex"
      )}>
        {selectedClient ? (
          <>
            {/* Header del Chat */}
            <div className="min-h-16 border-b border-slate-800 flex items-center gap-3 px-4 lg:px-6 bg-slate-900 z-10 shadow-sm">
              <button
                onClick={() => setSelectedClient(null)}
                aria-label="Volver a la lista de chats"
                className="md:hidden shrink-0 p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-full shrink-0">
                <User size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-base lg:text-lg truncate">
                  {selectedClient.profileName || selectedClient.phoneNumberReal || selectedClient.phone}
                </h3>
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium tracking-wide">
                  {selectedClient.profileName && (
                    <span className="text-slate-400 font-mono truncate">
                      {selectedClient.phoneNumberReal ? `${selectedClient.phoneNumberReal} - ${selectedClient.phone}` : selectedClient.phone} &bull;
                    </span>
                  )}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  Chat Activo
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/20 font-medium shrink-0">
                <UserCog size={14} /> Modo Intervención (Si escribes, la IA se detiene)
              </div>
            </div>

            {/* Aviso de intervención (móvil) */}
            <div className="md:hidden flex items-center gap-1.5 text-[11px] bg-amber-500/10 text-amber-400 px-4 py-2 border-b border-amber-500/10 font-medium">
              <UserCog size={13} className="shrink-0" />
              Modo Intervención: si escribes, la IA se detiene
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {(chatHistory[selectedClient.phone] || []).length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <p>Cargando historial o chat vacío...</p>
                </div>
              ) : (
                (chatHistory[selectedClient.phone] || []).map((msg, idx) => {
                  const isBotOrAdmin = msg.role === 'ASSISTANT' || msg.role === 'SYSTEM';
                  return (
                    <div key={idx} className={clsx("flex", isBotOrAdmin ? "justify-end" : "justify-start")}>
                      <div className={clsx(
                        "max-w-[80%] sm:max-w-[75%] rounded-2xl px-4 sm:px-5 py-3 shadow-md relative group",
                        isBotOrAdmin 
                          ? "bg-emerald-600 text-white rounded-tr-sm" 
                          : "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm"
                      )}>
                        {isBotOrAdmin && (
                          <div className="flex items-center gap-1.5 text-emerald-200/80 mb-1.5 text-[10px] uppercase font-bold tracking-wider">
                            <Bot size={12} /> {msg.role === 'SYSTEM' ? 'ADMIN (MANUAL)' : 'IA BOT'}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800">
              <form onSubmit={sendManualMessage} className="flex gap-2 sm:gap-3 max-w-4xl mx-auto">
                <input
                  type="text"
                  placeholder="Escribe un mensaje para enviarlo como administrador..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 sm:px-6 py-3 text-sm sm:text-base text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-500 shadow-inner min-w-0"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white p-3 px-4 sm:px-6 rounded-full flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                >
                  <span className="hidden sm:inline">Enviar</span>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 p-4">
            <div className="hidden md:block">
              <div className="bg-slate-800/50 p-6 rounded-full mb-6 ring-1 ring-slate-700/50">
                <MessageSquare size={48} className="text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-300 mb-2">Bandeja de Entrada CRM</h2>
              <p className="text-sm text-slate-400 max-w-sm text-center">
                Selecciona una conversación del panel lateral para ver el historial completo y gestionar el bot.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}