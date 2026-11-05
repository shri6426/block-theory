import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Plus, 
  ShoppingBag, 
  Phone, 
  Mail, 
  MapPin, 
  RefreshCw, 
  X, 
  FileText,
  DollarSign,
  Trash2
} from 'lucide-react';
import type { Supplier, Purchase, Ingredient, PurchaseItem } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [tab, setTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [loading, setLoading] = useState<boolean>(true);

  // Supplier modal
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // New Purchase modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<number>(1);
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [purchaseNotes, setPurchaseNotes] = useState<string>('');

  const { success, error } = useNotification();
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'suppliers') {
        const res = await window.api.listSuppliers();
        if (res.success && res.data) setSuppliers(res.data);
      } else {
        const res = await window.api.listPurchases(50);
        if (res.success && res.data) setPurchases(res.data);
      }
      const ingRes = await window.api.getIngredients();
      if (ingRes.success && ingRes.data) setIngredients(ingRes.data);
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name) return;

    try {
      const res = await window.api.saveSupplier(editingSupplier);
      if (res.success) {
        success('Supplier Saved', `Saved "${editingSupplier.name}".`);
        setEditingSupplier(null);
        loadData();
      } else {
        error('Save Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleAddPurchaseItem = (ingId: number) => {
    const ing = ingredients.find(i => i.id === ingId);
    if (!ing) return;
    setPurchaseItems(prev => [
      ...prev,
      {
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        quantity: 100,
        unit_cost: ing.cost_per_unit,
        total_cost: 100 * ing.cost_per_unit,
      }
    ]);
  };

  const handleRecordPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (purchaseItems.length === 0) {
      error('Empty Order', 'Add at least one ingredient to record a purchase intake.');
      return;
    }
    if (!purchaseInvoiceNo.trim()) {
      error('Invoice Number Required', 'Enter supplier invoice number.');
      return;
    }

    try {
      const res = await window.api.recordPurchase({
        supplierId: purchaseSupplierId,
        invoiceNumber: purchaseInvoiceNo,
        purchaseDate,
        items: purchaseItems,
        notes: purchaseNotes,
        userId: user.id,
      });

      if (res.success) {
        success('Purchase Recorded', 'Inventory stock automatically updated.');
        setIsPurchaseModalOpen(false);
        setPurchaseItems([]);
        setPurchaseInvoiceNo('');
        setPurchaseNotes('');
        loadData();
      } else {
        error('Purchase Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-bt-bg overflow-hidden font-mono select-none">
      {/* Header */}
      <div className="p-4 bg-white border-b border-bt-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-bt-brick" />
          <h2 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
            Supplier & Procurement Management
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-bt-border text-xs">
            <button
              onClick={() => setTab('suppliers')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                tab === 'suppliers' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-charcoal hover:bg-bt-border'
              }`}
            >
              Suppliers Directory
            </button>
            <button
              onClick={() => setTab('purchases')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                tab === 'purchases' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-charcoal hover:bg-bt-border'
              }`}
            >
              Purchase Invoices
            </button>
          </div>

          {hasPermission('suppliers:manage') && (
            <>
              <button
                onClick={() => setEditingSupplier({ name: '', contact_person: '', phone: '', email: '', address: '' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-bt-border text-bt-charcoal text-xs font-bold uppercase hover:bg-bt-bg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Supplier</span>
              </button>

              <button
                onClick={() => {
                  setPurchaseSupplierId(suppliers.length > 0 ? suppliers[0].id : 1);
                  setPurchaseInvoiceNo(`SUP-${Date.now().toString().slice(-5)}`);
                  setPurchaseItems([]);
                  setIsPurchaseModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs font-bold uppercase tracking-wider"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Record Purchase</span>
              </button>
            </>
          )}

          <button
            onClick={loadData}
            className="p-1.5 bg-bt-bg hover:bg-bt-border border border-bt-border text-bt-charcoal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'suppliers' ? (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map(s => (
              <div key={s.id} className="bg-white border border-bt-border p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-sm text-bt-charcoal">{s.name}</h3>
                    <span className="text-[10px] text-bt-muted">ID: #{s.id}</span>
                  </div>

                  <div className="text-xs text-bt-brick font-semibold mt-1">
                    Contact: {s.contact_person || 'N/A'}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-bt-muted">
                    {s.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-bt-concrete" />
                        <span>{s.phone}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-bt-concrete" />
                        <span>{s.email}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-bt-concrete mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{s.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-bt-border flex justify-end">
                  {hasPermission('suppliers:manage') && (
                    <button
                      onClick={() => setEditingSupplier(s)}
                      className="text-xs text-bt-brick hover:underline font-bold uppercase"
                    >
                      Edit Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-bt-charcoal text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Purchase Date</th>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Items Received</th>
                <th className="py-2.5 px-3">Total Cost (₹)</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border bg-white">
              {purchases.map(p => (
                <tr key={p.id} className="hover:bg-bt-bg/60">
                  <td className="py-3 px-3 text-bt-muted">{p.purchase_date.slice(0, 10)}</td>
                  <td className="py-3 px-3 font-bold text-bt-charcoal">{p.invoice_number}</td>
                  <td className="py-3 px-3 font-semibold text-bt-charcoal">{p.supplier_name}</td>
                  <td className="py-3 px-3 text-bt-muted">
                    {p.items ? p.items.map(it => `${it.quantity} ${it.unit || ''} ${it.ingredient_name}`).join(', ') : '-'}
                  </td>
                  <td className="py-3 px-3 font-bold text-bt-brick">₹{p.total_amount.toFixed(2)}</td>
                  <td className="py-3 px-3 text-bt-muted max-w-xs truncate">{p.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= MODAL: EDIT SUPPLIER ================= */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveSupplier} className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                {editingSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button type="button" onClick={() => setEditingSupplier(null)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-bt-muted font-bold mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>

              <div>
                <label className="block text-bt-muted font-bold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={editingSupplier.contact_person || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, contact_person: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.phone || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={editingSupplier.email || ''}
                    onChange={e => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
              </div>

              <div>
                <label className="block text-bt-muted font-bold mb-1">Address</label>
                <input
                  type="text"
                  value={editingSupplier.address || ''}
                  onChange={e => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: RECORD PURCHASE ================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleRecordPurchase} className="bg-white border-2 border-bt-charcoal w-full max-w-xl shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                Record Supplier Purchase Intake
              </h3>
              <button type="button" onClick={() => setIsPurchaseModalOpen(false)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Supplier *</label>
                  <select
                    value={purchaseSupplierId}
                    onChange={e => setPurchaseSupplierId(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Invoice Ref # *</label>
                  <input
                    type="text"
                    required
                    value={purchaseInvoiceNo}
                    onChange={e => setPurchaseInvoiceNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
              </div>

              {/* Purchase items list */}
              <div>
                <label className="block text-bt-muted font-bold mb-1">Ingredients Received</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-bt-border p-2 bg-bt-bg">
                  {purchaseItems.length === 0 ? (
                    <div className="p-4 text-center text-bt-muted">
                      No ingredients added yet. Add from the dropdown below.
                    </div>
                  ) : (
                    purchaseItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white border border-bt-border">
                        <span className="font-bold text-bt-charcoal">{item.ingredient_name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.5"
                            value={item.quantity}
                            onChange={e => {
                              const qty = parseFloat(e.target.value) || 0;
                              setPurchaseItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: qty, total_cost: qty * it.unit_cost } : it));
                            }}
                            className="w-20 px-2 py-0.5 border border-bt-border text-center font-bold"
                          />
                          <span className="text-bt-muted">@ ₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_cost}
                            onChange={e => {
                              const cost = parseFloat(e.target.value) || 0;
                              setPurchaseItems(prev => prev.map((it, i) => i === index ? { ...it, unit_cost: cost, total_cost: it.quantity * cost } : it));
                            }}
                            className="w-20 px-2 py-0.5 border border-bt-border text-center font-bold"
                          />
                          <span className="font-bold text-bt-brick w-16 text-right">₹{item.total_cost.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => setPurchaseItems(prev => prev.filter((_, i) => i !== index))}
                            className="p-1 text-bt-concrete hover:text-bt-brick"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add item */}
              <div className="flex gap-2">
                <select id="purchaseAddIngSelect" className="flex-1 px-2.5 py-1.5 bg-bt-bg border border-bt-border">
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const sel = document.getElementById('purchaseAddIngSelect') as HTMLSelectElement;
                    handleAddPurchaseItem(parseInt(sel.value, 10));
                  }}
                  className="px-4 py-1.5 bg-bt-charcoal text-white font-bold uppercase hover:bg-bt-brick"
                >
                  + Add Item
                </button>
              </div>

              <div className="p-2 bg-bt-bg border border-bt-border flex justify-between font-bold">
                <span>Grand Total:</span>
                <span className="text-bt-brick">
                  ₹{purchaseItems.reduce((acc, it) => acc + it.total_cost, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Confirm Purchase & Update Stock
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

