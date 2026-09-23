import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/axios';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, GripVertical, Plus, X, DollarSign } from 'lucide-react';
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

const STAGES = ['NUEVO LEAD', 'CALIFICADO', 'PRESUPUESTO ENVIADO', 'NEGOCIACION', 'GANADO'];

// Column Component
function PipelineColumn({ id, title, customers, children }: { id: string, title: string, customers: Customer[], children: React.ReactNode }) {
  return (
    <div id={`pipeline-column-${title}`} className="flex flex-col flex-shrink-0 w-80 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden h-full">
      <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center sticky top-0">
        <h3 className="font-bold text-white text-sm">{title}</h3>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{customers.length}</span>
      </div>
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        <SortableContext id={id} items={customers.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

// Card Component
function SortableCustomerCard({ customer }: { customer: Customer }) {
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
        "bg-slate-800 p-4 rounded-lg border flex flex-col gap-2 group relative",
        isDragging ? "border-emerald-500 shadow-xl opacity-50 z-50" : "border-slate-700 hover:border-slate-600 shadow-sm"
      )}
    >
      <div className="flex justify-between items-start cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <div>
          <p className="text-sm font-bold text-white mb-1 line-clamp-1">{customer.dealTitle}</p>
          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
            <User size={12} className="text-emerald-500" />
            <span className="truncate max-w-[150px]">{customer.profileName || customer.phoneNumberReal || customer.phone}</span>
          </div>
        </div>
        <GripVertical size={16} className="text-slate-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" />
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
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
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

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !dealTitle) return;

    try {
      const payload: any = {
        dealTitle,
        pipelineStage: 'NUEVO LEAD', // Empieza desde el principio
      };
      if (dealValue) payload.dealValue = parseFloat(dealValue);
      if (dealNotes) payload.notes = dealNotes;

      await api.patch(`/crm/contacts/${tenantId}/${selectedCustomerId}`, payload);
      
      // Reset form & fetch
      setIsModalOpen(false);
      setSelectedCustomerId('');
      setDealTitle('');
      setDealValue('');
      setDealNotes('');
      fetchContacts();
    } catch (error) {
      console.error('Error creando deal', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      <div className="p-4 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Pipeline de Ventas</h1>
          <p className="text-slate-400 text-sm mt-1">Arrastra los deals entre las columnas para avanzar en el embudo.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
        >
          <Plus size={16} />
          Nuevo Deal
        </button>
      </div>

      {/* Navegación por etapas */}
      <div className="px-4 sm:px-6 pt-2 select-none">
        <div className="flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STAGES.map(stage => {
            const count = customers.filter(c => c.pipelineStage === stage).length;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => document.getElementById(`pipeline-column-${stage}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })}
                className="flex-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-emerald-500/60 hover:text-white transition-colors whitespace-nowrap"
              >
                {stage}
                <span className="text-[10px] font-bold bg-slate-700 text-slate-200 rounded-full px-1.5 py-0.5">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Embudo (columnas con scroll horizontal) */}
      <div className="flex-1 relative min-h-0">
        <div className="h-full overflow-x-auto p-4 sm:p-6 pt-4 scroll-smooth">
          <div className="flex h-full gap-6">
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
                    <SortableCustomerCard key={customer.id} customer={customer} />
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
                <div className="bg-slate-800 p-4 rounded-lg border border-emerald-500 shadow-2xl rotate-3 scale-105 opacity-80">
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
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 bg-gradient-to-l from-slate-900 to-transparent" />
      </div>

      {/* Modal Nuevo Deal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white">Crear Nuevo Deal</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Título del Deal</label>
                <input 
                  required
                  type="text" 
                  value={dealTitle}
                  onChange={e => setDealTitle(e.target.value)}
                  placeholder="Ej. Diseño web completo"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Contacto / Cliente</label>
                <select 
                  required
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                >
                  <option value="" disabled>Selecciona un contacto</option>
                  {allCustomers.filter(c => !c.dealTitle).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.profileName ? `${c.profileName} - ` : ''}{c.phoneNumberReal || c.phone}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Solo se muestran contactos sin un deal activo.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Valor ($) (Opcional)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={dealValue}
                  onChange={e => setDealValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Notas (Opcional)</label>
                <textarea 
                  rows={3}
                  value={dealNotes}
                  onChange={e => setDealNotes(e.target.value)}
                  placeholder="Información adicional sobre el trato..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!dealTitle || !selectedCustomerId}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Guardar Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
