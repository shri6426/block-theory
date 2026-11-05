import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Clock, 
  CheckCircle, 
  Coffee, 
  Sandwich, 
  RefreshCw, 
  AlertCircle,
  Check,
  Filter
} from 'lucide-react';
import type { KDSTicket, PrepStatus } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';

export const KDSPage: React.FC = () => {
  const [tickets, setTickets] = useState<KDSTicket[]>([]);
  const [stationFilter, setStationFilter] = useState<'all' | 'coffee_counter' | 'food_counter'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const { success, error } = useNotification();

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 6000); // Poll kitchen orders every 6s
    return () => clearInterval(interval);
  }, [stationFilter]);

  const loadTickets = async () => {
    try {
      const res = await window.api.getKDSTickets(stationFilter);
      if (res.success && res.data) {
        setTickets(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItemStatus = async (itemId: number, currentStatus: PrepStatus) => {
    let nextStatus: PrepStatus = 'preparing';
    if (currentStatus === 'pending') nextStatus = 'preparing';
    else if (currentStatus === 'preparing') nextStatus = 'ready';
    else nextStatus = 'ready';

    try {
      const res = await window.api.updateOrderItemStatus({ itemId, status: nextStatus });
      if (res.success) {
        loadTickets();
        if (res.allItemsReady) {
          success('Order Ready', 'All items prepared! Order is ready for dispatch.');
        }
      }
    } catch (err: any) {
      error('KDS Error', err.message);
    }
  };

  const handleCompleteOrder = async (orderId: number) => {
    try {
      const res = await window.api.updateOrderStatus({ orderId, status: 'completed' });
      if (res.success) {
        success('Order Dispatched', 'Kitchen ticket cleared.');
        loadTickets();
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-bt-charcoal text-white overflow-hidden font-mono select-none">
      {/* Top Station Filter Header */}
      <div className="p-4 bg-[#141414] border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <UtensilsCrossed className="w-5 h-5 text-bt-brick" />
          <h1 className="text-base font-black uppercase tracking-widest text-white">
            Kitchen Display System (KDS)
          </h1>
          <span className="text-xs text-bt-concrete ml-2">
            Active Tickets: <span className="font-bold text-bt-brick">{tickets.length}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-white/20 bg-white/5 text-xs">
            <button
              onClick={() => setStationFilter('all')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                stationFilter === 'all' ? 'bg-bt-brick text-white' : 'text-bt-concrete hover:bg-white/10'
              }`}
            >
              All Stations
            </button>
            <button
              onClick={() => setStationFilter('coffee_counter')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors flex items-center gap-1.5 ${
                stationFilter === 'coffee_counter' ? 'bg-amber-600 text-white' : 'text-bt-concrete hover:bg-white/10'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Coffee Counter</span>
            </button>
            <button
              onClick={() => setStationFilter('food_counter')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors flex items-center gap-1.5 ${
                stationFilter === 'food_counter' ? 'bg-blue-600 text-white' : 'text-bt-concrete hover:bg-white/10'
              }`}
            >
              <Sandwich className="w-3.5 h-3.5" />
              <span>Food Prep</span>
            </button>
          </div>

          <button
            onClick={loadTickets}
            className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Ticket Cards Grid */}
      <div className="flex-1 p-5 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-bt-concrete/60 text-xs">
            <CheckCircle className="w-12 h-12 text-emerald-500 mb-3 opacity-60" />
            <span className="text-sm font-bold text-white tracking-widest uppercase">Kitchen is Clear</span>
            <span className="text-xs text-bt-concrete mt-1">Incoming POS orders will automatically show tickets here.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tickets.map(ticket => {
              // Timer color threshold
              const elapsed = ticket.elapsed_minutes;
              const timerColor = elapsed > 10 ? 'bg-red-950 text-red-300 border-red-700' :
                elapsed > 5 ? 'bg-amber-950 text-amber-300 border-amber-700' :
                'bg-emerald-950 text-emerald-300 border-emerald-700';

              const allReady = ticket.items.every(i => i.prep_status === 'ready');

              return (
                <div
                  key={ticket.order_id}
                  className={`bg-[#1E1E1E] border-2 flex flex-col justify-between shadow-xl transition-all ${
                    allReady ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white/15'
                  }`}
                >
                  {/* Ticket Header */}
                  <div className="p-3 bg-[#181818] border-b border-white/10 flex items-center justify-between">
                    <div>
                      <div className="font-black text-sm text-white tracking-wider">
                        #{ticket.order_number}
                      </div>
                      <div className="text-[10px] text-bt-concrete uppercase font-semibold">
                        {ticket.order_type.replace('_', ' ')}
                        {ticket.table_number ? ` • Table ${ticket.table_number}` : ''}
                      </div>
                    </div>

                    <div className={`px-2 py-0.5 border text-xs font-bold flex items-center gap-1 ${timerColor}`}>
                      <Clock className="w-3 h-3" />
                      <span>{elapsed}m</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-3 flex-1 overflow-y-auto space-y-2.5">
                    {ticket.items.map(item => {
                      const isReady = item.prep_status === 'ready';
                      const isPreparing = item.prep_status === 'preparing';

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItemStatus(item.id, item.prep_status)}
                          className={`p-2.5 border cursor-pointer transition-all ${
                            isReady 
                              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200 line-through opacity-70' 
                              : isPreparing
                              ? 'bg-amber-950/40 border-amber-800 text-amber-100 ring-1 ring-amber-500/30'
                              : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-xs leading-snug">
                              {item.quantity}x {item.product_name}
                            </span>
                            <span className={`text-[9px] uppercase font-bold px-1 py-0.2 ${
                              isReady ? 'bg-emerald-600 text-white' :
                              isPreparing ? 'bg-amber-600 text-white' :
                              'bg-white/10 text-bt-concrete'
                            }`}>
                              {item.prep_status}
                            </span>
                          </div>

                          {item.variant_name && (
                            <div className="text-[10px] text-bt-concrete mt-0.5">
                              Size: {item.variant_name}
                            </div>
                          )}

                          {item.addons && item.addons.length > 0 && (
                            <div className="text-[10px] text-bt-brick-light mt-0.5">
                              {item.addons.map(a => `+ ${a.name}`).join(', ')}
                            </div>
                          )}

                          {item.notes && (
                            <div className="text-[10px] italic text-amber-300 mt-1 bg-amber-900/30 p-1 border border-amber-700/50">
                              ⚠️ Note: {item.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {ticket.notes && (
                      <div className="p-2 bg-red-950/30 border border-red-800/40 text-[10px] text-red-200">
                        Order Note: {ticket.notes}
                      </div>
                    )}
                  </div>

                  {/* Ticket Footer Action */}
                  <div className="p-3 bg-[#181818] border-t border-white/10">
                    <button
                      onClick={() => handleCompleteOrder(ticket.order_id)}
                      className={`w-full py-2 uppercase font-bold text-xs tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                        allReady 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-bt-brick hover:bg-bt-brick-dark text-white'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{allReady ? 'Mark Dispatched' : 'Complete All Items'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

