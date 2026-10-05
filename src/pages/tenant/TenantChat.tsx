import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { io } from 'socket.io-client';
import { Send, User, Bot, UserCog, MessageSquare, ArrowLeft, Paperclip, XCircle, Search, Plus } from 'lucide-react';
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
  chatStatus: string;
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();

  // Filtro de etiquetas y bandejas
  const [allTags, setAllTags] = useState<{ id: string, name: string, color: string }[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [activeInbox, setActiveInbox] = useState<'BOT' | 'HUMAN' | 'CLOSED'>('BOT');

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

        // Auto-select contact from URL if present
        const contactParam = searchParams.get('contact');
        if (contactParam) {
          const found = customersRes.data.find(c => c.phone === contactParam);
          if (found) {
            setSelectedClient(found);
            setActiveInbox(found.chatStatus as 'BOT' | 'HUMAN' | 'CLOSED' || 'BOT');
          }
          // Remove param from URL without reloading
          setSearchParams({});
        }
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
            chatStatus: 'BOT',
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendManualMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedImage) || !selectedClient) return;

    const messageText = inputText;
    const currentImage = selectedImage;
    
    setInputText('');
    removeImage();

    // Añadir optimísticamente a la UI
    const newMessage: Message = {
      role: 'ADMIN',
      content: currentImage ? `[Imagen adjunta] ${messageText}`.trim() : messageText,
      createdAt: new Date().toISOString()
    };
    
    setChatHistory((prev) => ({
      ...prev,
      [selectedClient.phone]: [...(prev[selectedClient.phone] || []), newMessage]
    }));

    try {
      const formData = new FormData();
      formData.append('tenantId', tenantId || '');
      formData.append('customerPhone', selectedClient.phone);
      if (messageText) {
        formData.append('message', messageText);
      }
      if (currentImage) {
        formData.append('image', currentImage);
      }

      await api.post('/chat/send', formData);
      
      // Actualizar timestamp y status del cliente seleccionado a "ahora"
      setActiveClients((prev) => {
        const list = [...prev];
        const idx = list.findIndex(c => c.phone === selectedClient.phone);
        if (idx >= 0) {
          const [c] = list.splice(idx, 1);
          c.chatStatus = 'HUMAN';
          list.unshift({ ...c, updatedAt: new Date().toISOString() });
        }
        return list;
      });
      setSelectedClient(prev => prev ? { ...prev, chatStatus: 'HUMAN' } : null);
      setActiveInbox('HUMAN'); // Cambiamos de pestaña para no perderlo de vista

    } catch (error) {
      console.error('Error enviando mensaje manual', error);
    }
  };

  const changeChatStatus = async (status: 'BOT' | 'HUMAN' | 'CLOSED', clearMemory: boolean = true) => {
    if (!selectedClient) return;
    try {
      await api.post('/chat/status', {
        tenantId,
        customerPhone: selectedClient.phone,
        status,
        clearMemory
      });
      
      // Update local state
      setActiveClients(prev => prev.map(c => c.phone === selectedClient.phone ? { ...c, chatStatus: status } : c));
      setSelectedClient(prev => prev ? { ...prev, chatStatus: status } : null);
      
      // Cambiar a la bandeja correspondiente o si es BOT, limpiar el historial en pantalla si se requiere
      if (status === 'BOT' && clearMemory) {
        setChatHistory(prev => ({ ...prev, [selectedClient.phone]: [] })); // Se limpió en BD
      }
      setActiveInbox(status);

    } catch (error) {
      console.error('Error changing chat status', error);
    }
  };

  const filteredClients = activeClients.filter(c => {
    const matchesTag = selectedTag ? c.tags?.some(t => t.id === selectedTag) : true;
    const matchesInbox = (c.chatStatus || 'BOT') === activeInbox;
    return matchesTag && matchesInbox;
  });

  const newChatFilteredClients = activeClients.filter(c => 
    c.phone.includes(newChatSearch) || 
    (c.phoneNumberReal && c.phoneNumberReal.includes(newChatSearch)) ||
    (c.profileName && c.profileName.toLowerCase().includes(newChatSearch.toLowerCase()))
  );

  const handleStartNewChat = (customer: Customer) => {
    setSelectedClient(customer);
    setActiveInbox(customer.chatStatus as 'BOT' | 'HUMAN' | 'CLOSED' || 'BOT');
    setIsNewChatModalOpen(false);
    setNewChatSearch('');
  };

  return (
    <div className="flex h-full bg-slate-900 overflow-hidden">
      {/* Lista de Clientes (Sidebar del Chat) */}
      <div className={clsx(
        "w-full md:w-80 border-r border-slate-800 bg-slate-950 flex-col",
        selectedClient ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-400" />
              Todos los Chats
            </h3>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors"
              title="Nuevo Chat"
            >
              <Plus size={16} />
            </button>
          </div>
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
          
          <div className="flex rounded-md overflow-hidden bg-slate-800/50 p-1 gap-1">
            <button 
              onClick={() => setActiveInbox('BOT')}
              className={clsx("flex-1 py-2 text-[11px] font-bold rounded whitespace-nowrap", activeInbox === 'BOT' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700")}
            >
              🤖 IA
            </button>
            <button 
              onClick={() => setActiveInbox('HUMAN')}
              className={clsx("flex-1 py-2 text-[11px] font-bold rounded whitespace-nowrap", activeInbox === 'HUMAN' ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700")}
            >
              ⚠️ Humano
            </button>
            <button 
              onClick={() => setActiveInbox('CLOSED')}
              className={clsx("flex-1 py-2 text-[11px] font-bold rounded whitespace-nowrap", activeInbox === 'CLOSED' ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-700")}
            >
              ✅ Cerrados
            </button>
          </div>
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
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium tracking-wide min-w-0">
                  {selectedClient.profileName && (
                    <span className="text-slate-400 font-mono truncate min-w-0">
                      {selectedClient.phoneNumberReal ? `${selectedClient.phoneNumberReal} - ${selectedClient.phone}` : selectedClient.phone} &bull;
                    </span>
                  )}
                  <span className="shrink-0 flex items-center gap-1">
                    {selectedClient.chatStatus === 'BOT' && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span> Atendido por IA</>}
                    {selectedClient.chatStatus === 'HUMAN' && <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span> Intervención Humana</>}
                    {selectedClient.chatStatus === 'CLOSED' && <><span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span> Chat Cerrado</>}
                  </span>
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 shrink-0">
                {(selectedClient.chatStatus === 'BOT' || !selectedClient.chatStatus) && (
                  <button onClick={() => changeChatStatus('HUMAN')} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full border border-amber-500/20 text-xs font-bold transition-colors">
                    Pausar IA
                  </button>
                )}
                {selectedClient.chatStatus === 'HUMAN' && (
                  <>
                    <button onClick={() => setIsResumeModalOpen(true)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 text-xs font-bold transition-colors">
                      Reanudar IA
                    </button>
                    <button onClick={() => changeChatStatus('CLOSED')} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors">
                      Marcar Resuelto
                    </button>
                  </>
                )}
                {selectedClient.chatStatus === 'CLOSED' && (
                  <button onClick={() => setIsResumeModalOpen(true)} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 text-xs font-bold transition-colors">
                    Reabrir con IA
                  </button>
                )}
              </div>
            </div>

            {/* Estado y acciones (móvil) */}
            <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 py-2 space-y-2">
              {(selectedClient.chatStatus === 'HUMAN') && (
                <>
                  <p className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                    <UserCog size={13} className="shrink-0" />
                    Modo Intervención: la IA está pausada
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setIsResumeModalOpen(true)} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg py-2.5 text-xs font-bold transition-colors">
                      Reanudar IA
                    </button>
                    <button onClick={() => changeChatStatus('CLOSED')} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2.5 text-xs font-bold transition-colors">
                      Marcar Resuelto
                    </button>
                  </div>
                </>
              )}
              {selectedClient.chatStatus === 'CLOSED' && (
                <>
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
                    Chat marcado como resuelto.
                  </p>
                  <button onClick={() => changeChatStatus('BOT')} className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg py-2.5 text-xs font-bold transition-colors">
                    Reabrir con IA
                  </button>
                </>
              )}
              {(selectedClient.chatStatus === 'BOT' || !selectedClient.chatStatus) && (
                <button onClick={() => changeChatStatus('HUMAN')} className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg py-2.5 text-xs font-bold transition-colors">
                  Pausar IA (intervenir manualmente)
                </button>
              )}
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {(chatHistory[selectedClient.phone] || []).length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <p>Cargando historial o chat vacío...</p>
                </div>
              ) : (
                (chatHistory[selectedClient.phone] || []).map((msg, idx) => {
                  const isBot = msg.role === 'ASSISTANT';
                  const isSystemOrAdmin = msg.role === 'SYSTEM' || msg.role === 'ADMIN';
                  const isBotOrAdmin = isBot || isSystemOrAdmin;
                  return (
                    <div key={idx} className={clsx("flex", isBotOrAdmin ? "justify-end" : "justify-start")}>
                      <div className={clsx(
                        "max-w-[80%] sm:max-w-[75%] rounded-2xl px-4 sm:px-5 py-3 shadow-md relative group",
                        isBot 
                          ? "bg-emerald-600 text-white rounded-tr-sm" 
                          : isSystemOrAdmin 
                            ? "bg-amber-600 text-white rounded-tr-sm"
                            : "bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm"
                      )}>
                        {isBotOrAdmin && (
                          <div className={clsx(
                            "flex items-center gap-1.5 mb-1.5 text-[10px] uppercase font-bold tracking-wider",
                            isBot ? "text-emerald-200/80" : "text-amber-200/80"
                          )}>
                            {isSystemOrAdmin ? <UserCog size={12} /> : <Bot size={12} />}
                            {isSystemOrAdmin ? 'HUMANO (ADMIN)' : 'IA BOT'}
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
              {previewUrl && (
                <div className="max-w-4xl mx-auto mb-3 relative inline-block">
                  <div className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-800 p-2 pr-10 inline-flex items-center gap-3">
                    <img src={previewUrl} alt="Preview" className="h-16 object-contain rounded bg-slate-900" />
                    <div className="text-xs text-slate-400 font-medium">
                      <p className="text-slate-300 truncate max-w-[150px]">{selectedImage?.name}</p>
                      <p>{Math.round((selectedImage?.size || 0) / 1024)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              )}
              <form onSubmit={sendManualMessage} className="flex gap-2 sm:gap-3 max-w-4xl mx-auto items-end">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors flex items-center justify-center shrink-0 mb-0.5"
                  title="Adjuntar Imagen"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  placeholder="Escribe un mensaje para enviarlo como administrador..."
                  className="flex-1 h-12 bg-slate-900 border border-slate-700 rounded-full px-4 sm:px-6 text-sm sm:text-base text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-500 shadow-inner min-w-0"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() && !selectedImage}
                  className="h-12 bg-emerald-500 hover:bg-emerald-400 text-white px-4 sm:px-6 rounded-full flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20 active:translate-y-0.5 shrink-0"
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

      {/* Modal para Reanudar IA */}
      {isResumeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Opciones para Reanudar IA</h3>
              <p className="text-slate-400 text-sm mb-6">
                Elige cómo quieres que el chatbot retome esta conversación.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    changeChatStatus('BOT', false);
                    setIsResumeModalOpen(false);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors group"
                >
                  <div className="font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-2">
                    <Bot size={18} />
                    Mantener contexto del chat
                    <span className="ml-auto text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Recomendado</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    La IA leerá lo que acabas de conversar con el cliente y responderá de acuerdo al contexto actual.
                  </p>
                </button>
                
                <button 
                  onClick={() => {
                    changeChatStatus('BOT', true);
                    setIsResumeModalOpen(false);
                  }}
                  className="w-full text-left p-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <div className="font-bold text-white flex items-center gap-2">
                    <MessageSquare size={18} className="text-slate-400" />
                    Empezar un chat nuevo (Borrar memoria)
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    La IA olvidará todo lo hablado en esta sesión y saludará al cliente como si fuera su primera vez.
                  </p>
                </button>
              </div>
            </div>
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setIsResumeModalOpen(false)}
                className="px-5 py-2 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Nuevo Chat */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-10 sm:pt-20">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Plus size={20} className="text-emerald-400" />
                Nuevo Chat
              </h3>
              <button 
                onClick={() => setIsNewChatModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-800 bg-slate-900">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-slate-500" size={18} />
                </div>
                <input
                  type="text"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Buscar contacto por nombre o número..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {newChatFilteredClients.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No se encontraron contactos.
                </div>
              ) : (
                newChatFilteredClients.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleStartNewChat(customer)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800 transition-colors text-left group"
                  >
                    <div className="h-10 w-10 bg-slate-700 group-hover:bg-emerald-500/20 rounded-full flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0">
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{customer.profileName || 'Desconocido'}</div>
                      <div className="text-xs text-slate-400 font-mono truncate">{customer.phoneNumberReal || customer.phone}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}