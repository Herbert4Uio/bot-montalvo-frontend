import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { User, Search, Edit3, Save, X } from 'lucide-react';
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
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]); // Array de Tag IDs
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

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditNotes(customer.notes || '');
    setEditTags(customer.tags.map(t => t.id));
    setEditProfileName(customer.profileName || '');
    setEditPhoneNumberReal(customer.phoneNumberReal || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    try {
      const res = await api.patch<Customer>(`/crm/contacts/${tenantId}/${editingCustomer.id}`, {
        notes: editNotes,
        tagIds: editTags,
        profileName: editProfileName,
        phoneNumberReal: editPhoneNumberReal
      });
      
      // Update local state
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? res.data : c));
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error saving contact', error);
    }
  };

  const toggleTag = (tagId: string) => {
    setEditTags(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="p-4 sm:p-8 pb-2 sm:pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-6">Directorio de Contactos</h1>
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-500" size={18} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
            placeholder="Buscar por teléfono, nombre o estado..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-8 pb-4 sm:pb-8">
        <div className="bg-slate-800 shadow-sm border border-slate-700 rounded-xl overflow-hidden hidden md:block">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900/50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Cliente</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Etiquetas</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Última Actividad</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700/50">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                        <User size={20} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-white">{customer.profileName || 'Desconocido'}</div>
                        <div className="text-sm text-slate-400 font-mono">{customer.phoneNumberReal || customer.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(customer.updatedAt).toLocaleDateString()} {new Date(customer.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openEditModal(customer)} className="text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-400/10 p-2 rounded-lg inline-flex items-center gap-2">
                      <Edit3 size={16} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No se encontraron clientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista móvil: tarjetas apiladas */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredCustomers.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl py-12 text-center text-slate-500">
              No se encontraron clientes.
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white truncate">{customer.profileName || 'Desconocido'}</p>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                        {new Date(customer.updatedAt).toLocaleDateString()} {new Date(customer.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{customer.phoneNumberReal || customer.phone}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
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
                    <div className="mt-3">
                      <button onClick={() => openEditModal(customer)} className="text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-400/10 p-2 rounded-lg inline-flex items-center gap-2 text-sm">
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

      {/* Modal de Edición */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Editar Cliente</h3>
                <p className="text-xs text-slate-500 font-mono mt-1">ID: {editingCustomer.phone}</p>
              </div>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ej. Juan Pérez"
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Número Real</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                          "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
                  placeholder="Añade recordatorios, intereses del cliente, objeciones..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end gap-3">
              <button 
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Save size={16} /> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
