import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Plus, 
  AlertTriangle, 
  TrendingDown, 
  History, 
  Search, 
  RefreshCw, 
  X,
  Edit,
  SlidersHorizontal,
  Flame
} from 'lucide-react';
import type { Ingredient, StockMovement, UnitType } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const InventoryPage: React.FC = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState<string>('');
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');
  const [loading, setLoading] = useState<boolean>(true);

  // Adjustment Modal State
  const [adjustingIngredient, setAdjustingIngredient] = useState<Ingredient | null>(null);
  const [adjustQty, setAdjustQty] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'manual_adjustment' | 'wastage'>('manual_adjustment');

  // Create / Edit Ingredient Modal
  const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient> | null>(null);

  const { success, error } = useNotification();
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'stock') {
        const res = await window.api.getIngredients();
        if (res.success && res.data) setIngredients(res.data);
      } else {
        const res = await window.api.getStockMovements(150);
        if (res.success && res.data) setMovements(res.data);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingIngredient || !user) return;
    const qtyNum = parseFloat(adjustQty);
    if (isNaN(qtyNum) || qtyNum === 0) {
      error('Invalid Quantity', 'Please enter a non-zero adjustment quantity.');
      return;
    }
    if (!adjustReason.trim()) {
      error('Reason Required', 'Mandatory audit reason must be supplied for stock adjustments.');
      return;
    }

    try {
      const res = await window.api.adjustStock({
        ingredientId: adjustingIngredient.id,
        quantityChange: qtyNum,
        reason: adjustReason,
        userId: user.id,
        type: adjustType,
      });

      if (res.success) {
        success('Stock Adjusted', `Updated ${adjustingIngredient.name} by ${qtyNum} ${adjustingIngredient.unit}.`);
        setAdjustingIngredient(null);
        setAdjustQty('');
        setAdjustReason('');
        loadData();
      } else {
        error('Adjustment Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient || !editingIngredient.name) return;

    try {
      const res = await window.api.saveIngredient(editingIngredient);
      if (res.success) {
        success('Saved Ingredient', `Inventory record "${editingIngredient.name}" updated.`);
        setEditingIngredient(null);
        loadData();
      } else {
        error('Save Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const filteredIngredients = ingredients.filter(i => 
    !search.trim() || 
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full w-full flex flex-col bg-bt-bg overflow-hidden font-mono select-none">
      {/* Top Header & Tab Controls */}
      <div className="p-4 bg-white border-b border-bt-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Boxes className="w-5 h-5 text-bt-brick" />
          <h2 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
            Ingredient-Level Inventory Management
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex border border-bt-border text-xs">
            <button
              onClick={() => setTab('stock')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors ${
                tab === 'stock' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-charcoal hover:bg-bt-border'
              }`}
            >
              Current Stock
            </button>
            <button
              onClick={() => setTab('movements')}
              className={`px-3 py-1.5 font-bold uppercase transition-colors flex items-center gap-1.5 ${
                tab === 'movements' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-charcoal hover:bg-bt-border'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Movement Ledger</span>
            </button>
          </div>

          {tab === 'stock' && hasPermission('inventory:manage') && (
            <button
              onClick={() => setEditingIngredient({
                name: '',
                code: `ING-${Date.now().toString().slice(-4)}`,
                current_stock: 0,
                min_stock: 500,
                unit: 'g',
                cost_per_unit: 1.0,
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Ingredient</span>
            </button>
          )}

          <button
            onClick={loadData}
            className="p-1.5 bg-bt-bg hover:bg-bt-border border border-bt-border text-bt-charcoal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'stock' ? (
          <div>
            <div className="p-3 bg-bt-bg border-b border-bt-border flex items-center justify-between">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-bt-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter ingredients..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-bt-border text-xs focus:outline-none focus:border-bt-brick"
                />
              </div>
              <div className="text-xs text-bt-muted">
                Showing {filteredIngredients.length} managed ingredients
              </div>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-bt-charcoal text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Ingredient Name</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">Min Threshold</th>
                  <th className="py-2.5 px-3">Cost / Unit</th>
                  <th className="py-2.5 px-3">Primary Supplier</th>
                  <th className="py-2.5 px-3">Health Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bt-border bg-white">
                {filteredIngredients.map(ing => {
                  const isLow = ing.current_stock <= ing.min_stock;
                  return (
                    <tr key={ing.id} className="hover:bg-bt-bg/60 transition-colors">
                      <td className="py-3 px-3 font-bold text-bt-charcoal">{ing.code}</td>
                      <td className="py-3 px-3 font-bold text-bt-charcoal">{ing.name}</td>
                      <td className="py-3 px-3 font-bold text-sm">
                        <span className={isLow ? 'text-bt-brick' : 'text-bt-charcoal'}>
                          {ing.current_stock} {ing.unit}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-bt-muted">{ing.min_stock} {ing.unit}</td>
                      <td className="py-3 px-3 text-bt-muted">₹{ing.cost_per_unit.toFixed(2)}</td>
                      <td className="py-3 px-3 text-bt-muted">{ing.supplier_name || 'Generic Wholesaler'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider ${
                          isLow ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {isLow ? 'LOW STOCK' : 'OPTIMAL'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasPermission('inventory:adjust') && (
                            <button
                              onClick={() => { setAdjustingIngredient(ing); setAdjustQty(''); setAdjustReason(''); }}
                              title="Manual Stock Adjustment"
                              className="p-1 bg-bt-bg hover:bg-bt-border text-bt-charcoal border border-bt-border flex items-center gap-1 px-2 text-[10px]"
                            >
                              <SlidersHorizontal className="w-3 h-3 text-bt-brick" />
                              <span>Adjust</span>
                            </button>
                          )}
                          {hasPermission('inventory:manage') && (
                            <button
                              onClick={() => setEditingIngredient(ing)}
                              className="p-1 bg-bt-bg hover:bg-bt-border text-bt-charcoal border border-bt-border"
                              title="Edit Ingredient"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-bt-charcoal text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Ingredient</th>
                <th className="py-2.5 px-3">Movement Type</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Audit Justification</th>
                <th className="py-2.5 px-3">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border bg-white">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-bt-bg/60">
                  <td className="py-2.5 px-3 text-bt-muted">{m.created_at}</td>
                  <td className="py-2.5 px-3 font-bold text-bt-charcoal">{m.ingredient_name}</td>
                  <td className="py-2.5 px-3 uppercase text-[10px] font-bold">
                    <span className={`px-1.5 py-0.2 ${
                      m.movement_type === 'purchase' ? 'bg-emerald-100 text-emerald-800' :
                      m.movement_type === 'sale_deduction' ? 'bg-blue-100 text-blue-800' :
                      m.movement_type === 'wastage' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {m.movement_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold font-mono">
                    {m.movement_type === 'sale_deduction' || m.movement_type === 'wastage' ? '-' : '+'}
                    {m.quantity} {m.unit}
                  </td>
                  <td className="py-2.5 px-3 text-bt-muted max-w-xs truncate">{m.reason}</td>
                  <td className="py-2.5 px-3 text-bt-charcoal font-semibold">{m.user_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ================= MODAL: STOCK ADJUSTMENT ================= */}
      {adjustingIngredient && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleAdjustSubmit} className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-3">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                  Adjust Inventory Stock
                </h3>
                <span className="text-xs text-bt-brick font-semibold">
                  {adjustingIngredient.name} (Current: {adjustingIngredient.current_stock} {adjustingIngredient.unit})
                </span>
              </div>
              <button type="button" onClick={() => setAdjustingIngredient(null)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-bt-muted font-bold mb-1">Adjustment Type</label>
                <div className="flex border border-bt-border text-xs">
                  <button
                    type="button"
                    onClick={() => setAdjustType('manual_adjustment')}
                    className={`flex-1 py-1.5 uppercase font-bold ${
                      adjustType === 'manual_adjustment' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-charcoal'
                    }`}
                  >
                    Reconciliation / Intake
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('wastage')}
                    className={`flex-1 py-1.5 uppercase font-bold ${
                      adjustType === 'wastage' ? 'bg-bt-brick text-white' : 'bg-bt-bg text-bt-charcoal'
                    }`}
                  >
                    Wastage / Spoilage
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-bt-muted font-bold mb-1">
                  Quantity ({adjustingIngredient.unit}) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder={adjustType === 'wastage' ? 'e.g. -50' : 'e.g. +100 or -20'}
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 bg-bt-bg border border-bt-border text-sm font-bold font-mono"
                />
                <span className="text-[10px] text-bt-muted mt-0.5 block">
                  Use negative sign to decrease stock (e.g. -200), positive to increase.
                </span>
              </div>

              <div>
                <label className="block text-bt-muted font-bold mb-1">Mandatory Audit Justification *</label>
                <textarea
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Physical inventory count verified, spilled steamed milk jug, supplier replacement"
                  className="w-full px-3 py-2 bg-bt-bg border border-bt-border text-xs h-20"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setAdjustingIngredient(null)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Apply Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: EDIT INGREDIENT ================= */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveIngredient} className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                {editingIngredient.id ? 'Edit Ingredient' : 'Create Ingredient'}
              </h3>
              <button type="button" onClick={() => setEditingIngredient(null)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-bt-muted font-bold mb-1">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  value={editingIngredient.name || ''}
                  onChange={e => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Code / SKU *</label>
                  <input
                    type="text"
                    required
                    value={editingIngredient.code || ''}
                    onChange={e => setEditingIngredient({ ...editingIngredient, code: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Unit of Measure *</label>
                  <select
                    value={editingIngredient.unit || 'g'}
                    onChange={e => setEditingIngredient({ ...editingIngredient, unit: e.target.value as UnitType })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="ml">Millilitres (ml)</option>
                    <option value="l">Litres (l)</option>
                    <option value="pcs">Pieces (pcs)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Min Alert Stock Threshold</label>
                  <input
                    type="number"
                    value={editingIngredient.min_stock || 0}
                    onChange={e => setEditingIngredient({ ...editingIngredient, min_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Cost Per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingIngredient.cost_per_unit || 0}
                    onChange={e => setEditingIngredient({ ...editingIngredient, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingIngredient(null)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

