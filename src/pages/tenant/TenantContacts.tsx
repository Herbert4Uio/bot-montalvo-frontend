import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { User, Search, Edit3, Save, X, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Customer {
  id: string;
  phone: string;
  phoneNumberReal?: string;
  profileName?: string;
  pipelineStage: string;
  dealTitle?: string;
  dealValue?: number;
  notes?: string;
  tags: Tag[];
  updatedAt: string;
}

export default function TenantContacts() {
  const { tenantId } = useParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editProfileName, setEditProfileName] = useState('');
  const [editPhoneNumberReal, setEditPhoneNumberReal] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsRes, tagsRes] = await Promise.all([
          api.get<Customer[]>(`/crm/contacts/${tenantId}`),
          api.get<Tag[]>(`/tags/${tenantId}`)
        ]);
        setCustomers(contactsRes.data);
        setAllTags(tagsRes.data);
      } catch (error) {
        console.error('Error fetching contacts data', error);
      }
    };
    fetchData();
  }, [tenantId]);

  const filteredCustomers = customers.filter(c => 
    c.phone.includes(search) || 
    (c.phoneNumberReal && c.phoneNumberReal.includes(search)) ||
    (c.profileName && c.profileName.toLowerCase().includes(search.toLowerCase())) ||
    (c.dealTitle && c.dealTitle.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreateModal = () => {
    setModalMode('CREATE');
    setEditingCustomer(null);
    setEditPhone('');
    setEditNotes('');
    setEditTags([]);
    setEditProfileName('');
    setEditPhoneNumberReal('');
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setModalMode('EDIT');
    setEditingCustomer(customer);
    setEditPhone(customer.phone);
    setEditNotes(customer.notes || '');
    setEditTags(customer.tags.map(t => t.id));
    setEditProfileName(customer.profileName || '');
    setEditPhoneNumberReal(customer.phoneNumberReal || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        phone: editPhone, // Ignorado en PATCH por backend, pero requerido en POST
        notes: editNotes,
        tagIds: editTags,
        profileName: editProfileName,
        phoneNumberReal: editPhoneNumberReal
      };

      if (modalMode === 'CREATE') {
        const res = await api.post<Customer>(`/crm/contacts/${tenantId}`, payload);
        setCustomers(prev => [res.data, ...prev]);
      } else {
        if (!editingCustomer) return;
        const res = await api.patch<Customer>(`/crm/contacts/${tenantId}/${editingCustomer.id}`, payload);
        setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? res.data : c));
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving contact', error);
    }
  };

  const handleDelete = async () => {
    if (!editingCustomer) return;
    if (!confirm('¿Estás seguro de eliminar este contacto por completo? También se borrará todo su historial de chat.')) return;
    try {
      await api.delete(`/crm/contacts/${tenantId}/${editingCustomer.id}`);
      setCustomers(prev => prev.filter(c => c.id !== editingCustomer.id));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error deleting contact', error);
    }
  };

  const toggleTag = (tagId: string) => {
    setEditTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-4 sm:p-6 lg:p-8 pb-2 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-2">Directorio de Contactos</h1>
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-slate-500" size={18} />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2.5 sm:py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-base sm:text-sm text-slate-300 placeholder-slate-500 placeholder:text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Buscar por teléfono, nombre o estado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={openCreateModal}
          className="shrink-0 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-4 py-2.5 sm:py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Nuevo Contacto
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8">
        <div className="bg-slate-800 shadow-sm border border-slate-700 rounded-xl overflow-x-auto hidden md:block">
          <table className="w-full min-w-[560px] divide-y divide-slate-700">
            <thead className="bg-slate-900/50">
              <tr>
                <th scope="col" className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Etiquetas</th>
                <th scope="col" className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Última Actividad</th>
                <th scope="col" className="px-4 lg:px-6 py-3 lg:py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700/50">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                        <User size={20} />
                      </div>
                      <div className="ml-4 min-w-0">
                        <div className="text-sm font-bold text-white truncate max-w-[180px] lg:max-w-none">{customer.profileName || 'Desconocido'}</div>
                        <div className="text-sm text-slate-400 font-mono">{customer.phoneNumberReal || customer.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-3 lg:py-4">
                    <div className="flex flex-wrap gap-2">
                      {customer.tags.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">Sin etiquetas</span>
                      ) : (
                        customer.tags.map(tag => (
                          <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }}>
                            {tag.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(customer.updatedAt).toLocaleDateString()} {new Date(customer.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEditModal(customer)} className="text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-400/10 p-2 rounded-lg inline-flex items-center gap-2">
                      <Edit3 size={16} /> <span className="hidden lg:inline">Editar</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista móvil: tarjetas apiladas */}
        <div className="md:hidden flex flex-col gap-2.5 sm:gap-3">
          {filteredCustomers.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl py-12 px-4 text-center text-slate-500 text-sm">
              No se encontraron clientes.
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-slate-800 rounded-xl border border-slate-700 p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                      <p className="text-sm font-bold text-white truncate min-w-0">{customer.profileName || 'Desconocido'}</p>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                        {new Date(customer.updatedAt).toLocaleDateString()} {new Date(customer.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{customer.phoneNumberReal || customer.phone}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {customer.tags.length === 0 ? (
                        <span className="text-xs text-slate-500 italic">Sin etiquetas</span>
                      ) : (
                        customer.tags.map(tag => (
                          <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border max-w-full break-words" style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }}>
                            {tag.name}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="mt-3 -mb-1">
                      <button onClick={() => openEditModal(customer)} className="text-emerald-400 active:bg-emerald-400/20 hover:text-emerald-300 transition-colors bg-emerald-400/10 p-2.5 sm:p-2 rounded-lg inline-flex items-center gap-2 text-sm w-full sm:w-auto justify-center sm:justify-start">
                        <Edit3 size={16} /> Editar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Creación/Edición */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-700 w-full sm:max-w-lg overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {modalMode === 'CREATE' ? 'Crear Nuevo Contacto' : 'Editar Cliente'}
                </h3>
                {modalMode === 'EDIT' && (
                  <p className="text-xs text-slate-500 font-mono mt-1 truncate">{editingCustomer?.phone}</p>
                )}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="shrink-0 text-slate-400 hover:text-white transition-colors p-1 -mr-1" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 sm:space-y-6">
              {modalMode === 'CREATE' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Teléfono WhatsApp (Requerido)</label>
                  <input
                    required
                    type="text"
                    inputMode="tel"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 sm:p-2 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ej. 1234567890"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">Debe ser el identificador único (ej. número con código de país sin el +).</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 sm:p-2 text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ej. Juan Pérez"
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Número Real</label>
                  <input
                    type="text"
                    inputMode="tel"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 sm:p-2 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ej. +123456789"
                    value={editPhoneNumberReal}
                    onChange={(e) => setEditPhoneNumberReal(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Etiquetas Asignadas</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {allTags.map(tag => {
                    const isSelected = editTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={clsx(
                          "px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium transition-all border",
                          isSelected ? "opacity-100" : "opacity-40 hover:opacity-70 grayscale"
                        )}
                        style={{
                          borderColor: tag.color,
                          color: isSelected ? '#fff' : tag.color,
                          backgroundColor: isSelected ? tag.color : `${tag.color}15`,
                        }}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                  {allTags.length === 0 && (
                    <p className="text-sm text-slate-500 italic">No hay etiquetas creadas en este tenant. Ve a la sección Etiquetas.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notas Privadas</label>
                <textarea
                  rows={4}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
                  placeholder="Añade recordatorios, intereses del cliente, objeciones..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-950 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
              {modalMode === 'EDIT' ? (
                <button 
                  onClick={handleDelete}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg font-medium text-red-400 hover:text-white hover:bg-red-500/20 active:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              ) : (
                <div className="hidden sm:block" />
              )}
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors w-full sm:w-auto flex-1 sm:flex-none"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={modalMode === 'CREATE' && !editPhone}
                  className="px-4 py-2.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex justify-center items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20 w-full sm:w-auto flex-1 sm:flex-none"
                >
                  <Save size={16} /> {modalMode === 'CREATE' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
