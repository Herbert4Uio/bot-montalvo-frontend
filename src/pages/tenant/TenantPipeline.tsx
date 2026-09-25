import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, GripVertical, MoreHorizontal, Plus, X, DollarSign, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface Customer {
  id: string;
  phone: string;
  phoneNumberReal?: string;
  profileName?: string;
  pipelineStage: string;
  notes?: string;
  dealTitle?: string;
  dealValue?: number;
}

const STAGES = ['NUEVO LEAD', 'CALIFICADO', 'PRESUPUESTO ENVIADO', 'NEGOCIACION', 'GANADO', 'PERDIDO'];

// Column Component
function PipelineColumn({ id, title, customers, children }: { id: string, title: string, customers: Customer[], children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div id={`pipeline-column-${title}`} className="flex flex-col flex-shrink-0 w-[85vw] max-w-80 sm:w-80 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden h-full select-none [-webkit-touch-callout:none]">
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center gap-2 sticky top-0">
        <h3 className="font-bold text-white text-xs sm:text-sm truncate">{title}</h3>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full shrink-0 tabular-nums">{customers.length}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 min-h-0 p-2.5 sm:p-3 overflow-y-auto overscroll-contain space-y-3 min-h-[150px]">
        <SortableContext id={id} items={customers.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

// Card Component
interface SortableCustomerCardProps {
  customer: Customer;
  isCoarse: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onMoveStage: (customer: Customer, stage: string) => void;
  onEdit: (customer: Customer) => void;
}

function SortableCustomerCard({ customer, isCoarse, menuOpen, onToggleMenu, onCloseMenu, onMoveStage, onEdit }: SortableCustomerCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: customer.id,
    data: {
      type: 'Customer',
      customer,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "bg-slate-800 p-3.5 sm:p-4 rounded-lg border flex flex-col gap-2 group relative select-none [-webkit-touch-callout:none]",
        isDragging ? "border-emerald-500 shadow-xl opacity-50 z-50" : "border-slate-700 hover:border-slate-600 shadow-sm"
      )}
    >
      {menuOpen && (
        <button
          type="button"
          onClick={onCloseMenu}
          className="fixed inset-0 z-20 cursor-default"
          aria-label="Cerrar menú"
          tabIndex={-1}
        />
      )}
      <div className={clsx(
        "flex justify-between items-start gap-2",
        !isCoarse && "cursor-grab active:cursor-grabbing"
      )} {...(isCoarse ? {} : { ...attributes, ...listeners })}>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white mb-1 line-clamp-1">{customer.dealTitle}</p>
          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
            <User size={12} className="text-emerald-500 shrink-0" />
            <span className="truncate">{customer.profileName || customer.phoneNumberReal || customer.phone}</span>
          </div>
        </div>
        {isCoarse ? (
          <div className="relative z-30 shrink-0">
            <button
              type="button"
              onClick={onToggleMenu}
              className="p-2 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-700 transition-colors"
              aria-label="Mover deal de etapa"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={20} className="sm:hidden" />
              <MoreHorizontal size={18} className="hidden sm:block" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-30 overflow-hidden text-left">
                <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-800">
                  Mover a etapa
                </div>
                <div className="py-1">
                  {STAGES.map(stage => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => onMoveStage(customer, stage)}
                      className={clsx(
                        "w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between gap-2",
                        customer.pipelineStage === stage
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-slate-300 hover:text-white hover:bg-slate-800"
                      )}
                    >
                      <span className="truncate">{stage}</span>
                      {customer.pipelineStage === stage && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    </button>
                  ))}
                  <div className="border-t border-slate-800 mt-1 py-1">
                    <button
                      type="button"
                      onClick={() => { onCloseMenu(); onEdit(customer); }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Pencil size={14} /> Editar Deal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button type="button" onClick={() => onEdit(customer)} className="p-2 sm:p-1 -m-0.5 text-slate-400 hover:text-blue-400 active:text-blue-400 transition-colors z-10" aria-label="Editar deal">
              <Pencil size={14} />
            </button>
            <GripVertical size={16} className="text-slate-600 flex-shrink-0" />
          </div>
        )}
      </div>
      
      {(customer.dealValue || customer.notes) && (
        <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-col gap-1">
          {customer.dealValue != null && (
            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <DollarSign size={12} />
              {customer.dealValue.toLocaleString()}
            </p>
          )}
          {customer.notes && (
            <p className="text-xs text-slate-400 line-clamp-2 italic">"{customer.notes}"</p>
          )}
        </div>
      )}
    </div>
  );
}

// Main Board Component
export default function TenantPipeline() {
  const { tenantId } = useParams();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealNotes, setDealNotes] = useState('');

  const fetchContacts = async () => {
    try {
      const res = await api.get<Customer[]>(`/crm/contacts/${tenantId}`);
      setAllCustomers(res.data);
      // Solo mostrar en pipeline los que tienen un titulo de deal
      setCustomers(res.data.filter(c => c.dealTitle));
    } catch (error) {
      console.error('Error fetching contacts', error);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [tenantId]);

  const [isCoarse] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isCoarse ? { delay: 300, tolerance: 10 } : { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const customer = customers.find((c) => c.id === active.id);
    if (customer) {
      setActiveCustomer(customer);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveCustomer = active.data.current?.type === 'Customer';
    const isOverCustomer = over.data.current?.type === 'Customer';

    if (!isActiveCustomer) return;

    // Dropping a customer over another customer
    if (isActiveCustomer && isOverCustomer) {
      setCustomers((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === activeId);
        const overIndex = prev.findIndex((c) => c.id === overId);

        if (prev[activeIndex].pipelineStage !== prev[overIndex].pipelineStage) {
          const newCustomers = [...prev];
          newCustomers[activeIndex] = {
            ...newCustomers[activeIndex],
            pipelineStage: prev[overIndex].pipelineStage,
          };
          return arrayMove(newCustomers, activeIndex, overIndex);
        }

        return arrayMove(prev, activeIndex, overIndex);
      });
    }

    // Dropping a customer over an empty column
    const isOverColumn = STAGES.includes(overId as string);
    if (isActiveCustomer && isOverColumn) {
      setCustomers((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === activeId);
        const newCustomers = [...prev];
        newCustomers[activeIndex] = {
          ...newCustomers[activeIndex],
          pipelineStage: overId as string,
        };
        return arrayMove(newCustomers, activeIndex, activeIndex);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCustomer(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const customer = customers.find(c => c.id === activeId);
    
    if (customer) {
      // Si cambió la etapa, guardar en BD
      try {
        await api.patch(`/crm/contacts/${tenantId}/${customer.id}`, {
          pipelineStage: customer.pipelineStage
        });
      } catch (error) {
        console.error('Error updating stage', error);
      }
    }
  };

  const handleMoveStage = async (customer: Customer, stage: string) => {
    setMenuOpenId(null);
    const previous = customer.pipelineStage;
    if (previous === stage) return;

    // Actualización optimista
    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, pipelineStage: stage } : c));

    try {
      await api.patch(`/crm/contacts/${tenantId}/${customer.id}`, {
        pipelineStage: stage
      });
    } catch (error) {
      console.error('Error moving stage', error);
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, pipelineStage: previous } : c));
    }
  };

  const openCreateModal = () => {
    setModalMode('CREATE');
    setSelectedCustomerId('');
    setDealTitle('');
    setDealValue('');
    setDealNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setModalMode('EDIT');
    setSelectedCustomerId(customer.id);
    setDealTitle(customer.dealTitle || '');
    setDealValue(customer.dealValue ? customer.dealValue.toString() : '');
    setDealNotes(customer.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !dealTitle) return;

    try {
      const payload: any = {
        dealTitle,
      };
      if (modalMode === 'CREATE') {
        payload.pipelineStage = 'NUEVO LEAD';
      }
      // Si el campo está vacío, mandamos null para borrarlo
      payload.dealValue = dealValue ? parseFloat(dealValue) : null;
      payload.notes = dealNotes || null;

      await api.patch(`/crm/contacts/${tenantId}/${selectedCustomerId}`, payload);
      
      // Reset form & fetch
      setIsModalOpen(false);
      fetchContacts();
    } catch (error) {
      console.error('Error guardando deal', error);
    }
  };

  const handleDeleteDeal = async () => {
    if (!confirm('¿Estás seguro de eliminar este deal? Los datos del cliente se mantendrán, solo se borrará la oportunidad de venta.')) return;
    
    try {
      await api.patch(`/crm/contacts/${tenantId}/${selectedCustomerId}`, {
        dealTitle: null,
        dealValue: null,
        pipelineStage: 'NUEVO LEAD'
      });
      setIsModalOpen(false);
      fetchContacts();
    } catch (error) {
      console.error('Error eliminando deal', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      <div className="p-4 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Pipeline de Ventas</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            {isCoarse
              ? 'Toca el menú (⋮) de un deal para moverlo entre las etapas del embudo.'
              : 'Arrastra los deals entre las columnas para avanzar en el embudo.'}
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="shrink-0 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-4 py-2.5 sm:py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Nuevo Deal
        </button>
      </div>

      {/* Navegación por etapas */}
      <div className="px-4 sm:px-6 pt-2 select-none">
        <div className="flex gap-2 overflow-x-auto scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STAGES.map(stage => {
            const count = customers.filter(c => c.pipelineStage === stage).length;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => document.getElementById(`pipeline-column-${stage}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
                className="flex-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-emerald-500/60 hover:text-white active:bg-slate-700 transition-colors whitespace-nowrap"
              >
                {stage}
                <span className="text-[10px] font-bold bg-slate-700 text-slate-200 rounded-full px-1.5 py-0.5 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Embudo (columnas con scroll horizontal) */}
      <div className="flex-1 relative min-h-0">
        <div className="h-full overflow-x-auto overflow-y-hidden overscroll-x-contain p-3 sm:p-6 pt-3 sm:pt-4 scroll-smooth">
          <div className="flex h-full gap-3 sm:gap-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {STAGES.map(stage => {
              const stageCustomers = customers.filter(c => c.pipelineStage === stage);
              return (
                <PipelineColumn key={stage} id={stage} title={stage} customers={stageCustomers}>
                  {stageCustomers.map(customer => (
                    <SortableCustomerCard
                      key={customer.id}
                      customer={customer}
                      isCoarse={isCoarse}
                      menuOpen={menuOpenId === customer.id}
                      onToggleMenu={() => setMenuOpenId(menuOpenId === customer.id ? null : customer.id)}
                      onCloseMenu={() => setMenuOpenId(null)}
                      onMoveStage={handleMoveStage}
                      onEdit={openEditModal}
                    />
                  ))}
                  {stageCustomers.length === 0 && (
                    <div className="h-full min-h-[100px] border-2 border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-sm font-medium">
                      Soltar aquí
                    </div>
                  )}
                </PipelineColumn>
              );
            })}

            <DragOverlay>
              {activeCustomer ? (
                <div className="bg-slate-800 p-4 rounded-lg border border-emerald-500 shadow-2xl rotate-3 scale-105 opacity-80 select-none [-webkit-touch-callout:none]">
                  <p className="text-sm font-bold text-white mb-1">{activeCustomer.dealTitle}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <User size={12} className="text-emerald-500" />
                    <span>{activeCustomer.profileName || activeCustomer.phone}</span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 sm:w-12 bg-gradient-to-l from-slate-900 to-transparent" />
      </div>

      {/* Modal Nuevo Deal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md max-h-[92dvh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center gap-3 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-slate-800 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-white">{modalMode === 'CREATE' ? 'Crear Nuevo Deal' : 'Editar Deal'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="shrink-0 text-slate-400 hover:text-white transition-colors p-1 -mr-1" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveDeal} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:px-6 sm:pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Título del Deal</label>
                  <input 
                    required
                    type="text" 
                    value={dealTitle}
                    onChange={e => setDealTitle(e.target.value)}
                    placeholder="Ej. Diseño web completo"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-white placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Contacto / Cliente</label>
                  {modalMode === 'CREATE' ? (
                    <>
                      <select 
                        required
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      >
                        <option value="" disabled>Selecciona un contacto</option>
                        {allCustomers.filter(c => !c.dealTitle).map(c => (
                          <option key={c.id} value={c.id}>
                            {c.profileName ? `${c.profileName} - ` : ''}{c.phoneNumberReal || c.phone}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Solo se muestran contactos sin un deal activo.</p>
                    </>
                  ) : (
                    <div className="w-full bg-slate-800/50 border border-slate-800 rounded-lg px-4 py-2.5 sm:py-2 text-sm text-slate-400 cursor-not-allowed truncate">
                      {allCustomers.find(c => c.id === selectedCustomerId)?.profileName || allCustomers.find(c => c.id === selectedCustomerId)?.phone}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Valor ($) (Opcional)</label>
                  <input 
                    type="number" 
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={dealValue}
                    onChange={e => setDealValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 sm:py-2 text-base sm:text-sm text-white placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Notas (Opcional)</label>
                  <textarea 
                    rows={3}
                    value={dealNotes}
                    onChange={e => setDealNotes(e.target.value)}
                    placeholder="Información adicional sobre el trato..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 sm:py-2 text-base sm:text-sm text-white placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-800 bg-slate-950 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
                {modalMode === 'EDIT' ? (
                  <button 
                    type="button" 
                    onClick={handleDeleteDeal}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-lg font-medium text-red-400 hover:text-white hover:bg-red-500/20 active:bg-red-500/20 transition-colors"
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                ) : (
                  <div className="hidden sm:block" />
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg font-medium text-sm text-slate-300 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={!dealTitle || !selectedCustomerId}
                    className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 sm:py-2 rounded-lg font-medium transition-colors"
                  >
                    {modalMode === 'CREATE' ? 'Crear Deal' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
