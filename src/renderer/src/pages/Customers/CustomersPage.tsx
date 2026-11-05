import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Award, 
  Phone, 
  Mail, 
  Calendar, 
  RefreshCw, 
  X,
  Edit
} from 'lucide-react';
import type { Customer } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  const { success, error } = useNotification();
  const { hasPermission } = useAuth();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await window.api.listCustomers(150);
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editingCustomer.name) return;

    try {
      const res = await window.api.saveCustomer(editingCustomer as Customer);
      if (res.success) {
        success('Customer Saved', `Updated "${editingCustomer.name}".`);
        setEditingCustomer(null);
        loadCustomers();
      } else {
        error('Save Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const filteredCustomers = customers.filter(c => 
    !search.trim() ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="h-full w-full flex flex-col bg-bt-bg overflow-hidden font-mono select-none">
      {/* Header */}
      <div className="p-4 bg-white border-b border-bt-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-bt-brick" />
          <h2 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
            Customer Directory & Loyalty
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-bt-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search phone or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-bt-bg border border-bt-border text-xs focus:outline-none focus:border-bt-brick w-64"
            />
          </div>

          {hasPermission('customers:manage') && (
            <button
              onClick={() => setEditingCustomer({ name: '', phone: '', email: '', notes: '' })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Customer</span>
            </button>
          )}

          <button
            onClick={loadCustomers}
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
              <th className="py-2.5 px-3">Customer Name</th>
              <th className="py-2.5 px-3">Phone</th>
              <th className="py-2.5 px-3">Email</th>
              <th className="py-2.5 px-3">Loyalty Points</th>
              <th className="py-2.5 px-3">Lifetime Spend</th>
              <th className="py-2.5 px-3">Visits</th>
              <th className="py-2.5 px-3">Last Visit</th>
              <th className="py-2.5 px-3">Notes</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bt-border bg-white">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-bt-muted">
                  No customers found.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(c => (
                <tr key={c.id} className="hover:bg-bt-bg/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-bt-charcoal">{c.name}</td>
                  <td className="py-3 px-3 text-bt-charcoal font-semibold">{c.phone || '-'}</td>
                  <td className="py-3 px-3 text-bt-muted">{c.email || '-'}</td>
                  <td className="py-3 px-3 font-bold text-bt-brick flex items-center gap-1 mt-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>{c.loyalty_points}</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-bt-charcoal">₹{c.total_spent.toFixed(2)}</td>
                  <td className="py-3 px-3 text-bt-muted">{c.visit_count}</td>
                  <td className="py-3 px-3 text-bt-muted">{c.last_visit ? c.last_visit.slice(0, 10) : 'Never'}</td>
                  <td className="py-3 px-3 text-bt-muted max-w-xs truncate">{c.notes || '-'}</td>
                  <td className="py-3 px-3 text-right">
                    {hasPermission('customers:manage') && (
                      <button
                        onClick={() => setEditingCustomer(c)}
                        className="p-1 bg-bt-bg hover:bg-bt-border text-bt-charcoal border border-bt-border"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL: EDIT CUSTOMER ================= */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCustomer} className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                {editingCustomer.id ? 'Edit Customer' : 'Add Customer'}
              </h3>
              <button type="button" onClick={() => setEditingCustomer(null)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-bt-muted font-bold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={editingCustomer.phone || ''}
                    onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                    placeholder="e.g. 9840123456"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={e => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
              </div>

              <div>
                <label className="block text-bt-muted font-bold mb-1">Taste Preferences & Notes</label>
                <textarea
                  value={editingCustomer.notes || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  placeholder="e.g. Likes oat milk iced latte with cinnamon, no sugar"
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border h-20"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

