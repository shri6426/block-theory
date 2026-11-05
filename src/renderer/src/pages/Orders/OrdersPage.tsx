import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  Printer, 
  RotateCcw, 
  Ban, 
  Eye, 
  RefreshCw, 
  CheckCircle, 
  X,
  FileText
} from 'lucide-react';
import type { Order } from '../../shared/types';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ReceiptModal } from '../../components/ReceiptModal';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Selected Order for details
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Thermal Receipt Modal
  const [printOrderId, setPrintOrderId] = useState<number | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Refund / Cancel Modal
  const [actionModal, setActionModal] = useState<{ type: 'refund' | 'cancel'; order: Order } | null>(null);
  const [actionReason, setActionReason] = useState<string>('');

  const { user, hasPermission } = useAuth();
  const { success, error } = useNotification();

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await window.api.listOrders({
        limit: 150,
        status: statusFilter || undefined,
      });
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId: number) => {
    setLoadingDetails(true);
    try {
      const res = await window.api.getOrderDetails(orderId);
      if (res.success && res.data) {
        setSelectedOrder(res.data);
      } else {
        error('Details Error', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleReprint = (orderId: number) => {
    setPrintOrderId(orderId);
    setIsReceiptOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!actionModal || !user) return;
    if (!actionReason.trim()) {
      error('Reason Required', 'Please enter a valid justification for this operation.');
      return;
    }

    try {
      if (actionModal.type === 'cancel') {
        const res = await window.api.cancelOrder({
          orderId: actionModal.order.id,
          reason: actionReason,
          userId: user.id,
        });
        if (res.success) {
          success('Order Cancelled', `Order #${actionModal.order.order_number} has been cancelled.`);
          loadOrders();
          setActionModal(null);
          setActionReason('');
          if (selectedOrder?.id === actionModal.order.id) setSelectedOrder(null);
        } else {
          error('Cancellation Failed', res.error);
        }
      } else if (actionModal.type === 'refund') {
        const res = await window.api.refundOrder({
          orderId: actionModal.order.id,
          reason: actionReason,
          userId: user.id,
        });
        if (res.success) {
          success('Order Refunded', `Payment refunded for #${actionModal.order.order_number}.`);
          loadOrders();
          setActionModal(null);
          setActionReason('');
          if (selectedOrder?.id === actionModal.order.id) setSelectedOrder(null);
        } else {
          error('Refund Failed', res.error);
        }
      }
    } catch (err: any) {
      error('Action Failed', err.message);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(term) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(term)) ||
      (o.table_number && o.table_number.includes(term))
    );
  });

  return (
    <div className="h-full w-full flex bg-bt-bg overflow-hidden font-mono select-none">
      {/* Orders Table Pane */}
      <div className="flex-1 flex flex-col h-full border-r border-bt-border overflow-hidden">
        {/* Controls */}
        <div className="p-4 bg-white border-b border-bt-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-bt-brick" />
            <h2 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
              Order Ledger & Invoices
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-bt-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order #, table, customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-bt-bg border border-bt-border text-xs focus:outline-none focus:border-bt-brick w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 bg-bt-bg border border-bt-border text-xs font-semibold focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={loadOrders}
              className="p-1.5 bg-bt-bg hover:bg-bt-border border border-bt-border text-bt-charcoal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-bt-charcoal text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Order #</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Table</th>
                <th className="py-2.5 px-3">Cashier</th>
                <th className="py-2.5 px-3">Total (₹)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-bt-muted">
                    No order records found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr 
                    key={o.id} 
                    className="hover:bg-bt-bg/70 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(o.id)}
                  >
                    <td className="py-2.5 px-3 font-bold text-bt-charcoal">
                      {o.order_number}
                    </td>
                    <td className="py-2.5 px-3 text-bt-muted">
                      {o.created_at.slice(11, 16)}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-semibold text-bt-charcoal">
                      {o.order_type.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-bt-muted">
                      {o.table_number ? `T${o.table_number}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-bt-muted">
                      {o.cashier_name}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-bt-brick">
                      ₹{o.total_amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${
                        o.status === 'completed' || o.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                        o.status === 'cancelled' || o.payment_status === 'refunded' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {o.payment_status === 'refunded' ? 'REFUNDED' : o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleReprint(o.id)}
                          title="Print Thermal Receipt"
                          className="p-1 bg-bt-bg hover:bg-bt-border text-bt-charcoal border border-bt-border"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {hasPermission('orders:manage') && o.status !== 'cancelled' && o.payment_status !== 'refunded' && (
                          <>
                            <button
                              onClick={() => setActionModal({ type: 'refund', order: o })}
                              title="Process Refund"
                              className="p-1 bg-bt-bg hover:bg-amber-100 text-amber-800 border border-bt-border"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setActionModal({ type: 'cancel', order: o })}
                              title="Cancel Order"
                              className="p-1 bg-bt-bg hover:bg-red-100 text-red-800 border border-bt-border"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Side-Drawer */}
      {selectedOrder && (
        <div className="w-96 bg-white border-l border-bt-border flex flex-col h-full shadow-xl">
          <div className="p-4 bg-bt-charcoal text-white flex items-center justify-between">
            <div>
              <div className="text-xs text-bt-concrete uppercase tracking-wider">Order Inspection</div>
              <div className="text-sm font-bold">{selectedOrder.order_number}</div>
            </div>
            <button onClick={() => setSelectedOrder(null)} className="p-1 text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs font-mono">
            {/* Meta */}
            <div className="bg-bt-bg p-3 border border-bt-border space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-bt-muted">Date:</span>
                <span className="font-semibold">{selectedOrder.created_at}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-bt-muted">Order Type:</span>
                <span className="font-semibold uppercase">{selectedOrder.order_type}</span>
              </div>
              {selectedOrder.table_number && (
                <div className="flex justify-between">
                  <span className="text-bt-muted">Table:</span>
                  <span className="font-semibold">Table {selectedOrder.table_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-bt-muted">Cashier:</span>
                <span className="font-semibold">{selectedOrder.cashier_name}</span>
              </div>
              {selectedOrder.customer_name && (
                <div className="flex justify-between text-bt-brick font-semibold">
                  <span>Customer:</span>
                  <span>{selectedOrder.customer_name}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <div className="font-bold uppercase text-[11px] text-bt-muted mb-2">Item Breakdown</div>
              <div className="divide-y divide-bt-border border border-bt-border">
                {selectedOrder.items?.map((it: any) => (
                  <div key={it.id} className="p-2.5">
                    <div className="flex justify-between font-semibold">
                      <span>{it.quantity}x {it.product_name}</span>
                      <span>₹{it.total_price.toFixed(2)}</span>
                    </div>
                    {it.variant_name && (
                      <div className="text-[10px] text-bt-muted">Size: {it.variant_name}</div>
                    )}
                    {it.addons && it.addons.length > 0 && (
                      <div className="text-[10px] text-bt-brick">
                        {it.addons.map((a: any) => `+ ${a.name}`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div className="bg-bt-bg p-3 border border-bt-border space-y-1 text-xs">
              <div className="flex justify-between text-bt-muted">
                <span>Taxable Subtotal:</span>
                <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
              </div>
              {selectedOrder.discount_amount > 0 && (
                <div className="flex justify-between text-bt-brick">
                  <span>Discount:</span>
                  <span>-₹{selectedOrder.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-bt-muted">
                <span>CGST (2.5%):</span>
                <span>₹{selectedOrder.cgst_amount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between text-bt-muted">
                <span>SGST (2.5%):</span>
                <span>₹{selectedOrder.sgst_amount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="pt-2 border-t border-bt-border flex justify-between font-bold text-sm text-bt-charcoal">
                <span>NET TOTAL:</span>
                <span className="text-bt-brick">₹{selectedOrder.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payments */}
            {selectedOrder.payments && selectedOrder.payments.length > 0 && (
              <div>
                <div className="font-bold uppercase text-[11px] text-bt-muted mb-1.5">Payment Records</div>
                <div className="space-y-1">
                  {selectedOrder.payments.map((p: any) => (
                    <div key={p.id} className="p-2 bg-bt-bg border border-bt-border text-[11px] flex justify-between items-center">
                      <div>
                        <span className="font-bold uppercase">{p.payment_method}</span>
                        {p.reference_number && (
                          <span className="text-[9px] text-bt-muted block">Ref: {p.reference_number}</span>
                        )}
                      </div>
                      <span className="font-bold">₹{p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-bt-border flex gap-2">
            <button
              onClick={() => handleReprint(selectedOrder.id)}
              className="flex-1 py-2 bg-bt-brick text-white uppercase font-bold text-xs flex items-center justify-center gap-2 hover:bg-bt-brick-dark"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      )}

      {/* Refund / Cancel Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6">
            <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal mb-2">
              {actionModal.type === 'refund' ? 'Authorise Order Refund' : 'Authorise Order Cancellation'}
            </h3>
            <p className="text-xs text-bt-muted mb-4">
              Order: <span className="font-bold text-bt-charcoal">#{actionModal.order.order_number}</span> (₹{actionModal.order.total_amount})
            </p>

            <div>
              <label className="block text-xs uppercase font-bold text-bt-charcoal mb-1">
                Audit Reason (Mandatory)
              </label>
              <textarea
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder="e.g. Customer changed mind / barista spilled milk / incorrect item prepared"
                className="w-full px-3 py-2 bg-bt-bg border border-bt-border text-xs focus:outline-none focus:border-bt-brick h-20"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-bt-border">
              <button
                onClick={() => { setActionModal(null); setActionReason(''); }}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-5 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Confirm {actionModal.type === 'refund' ? 'Refund' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview Modal */}
      <ReceiptModal
        orderId={printOrderId}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};

