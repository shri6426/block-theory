import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  RefreshCw,
  X,
  CreditCard,
  Banknote,
  Tag
} from 'lucide-react';
import type { Expense, ExpenseCategory } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [loading, setLoading] = useState<boolean>(true);

  // New Expense Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Ingredients');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newMethod, setNewMethod] = useState<string>('upi');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { success, error } = useNotification();
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    loadExpenses();
  }, [categoryFilter, monthFilter]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await window.api.listExpenses({
        category: categoryFilter || undefined,
        month: monthFilter || undefined,
      });
      if (res.success && res.data) {
        setExpenses(res.data);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(newAmount);
    if (isNaN(amt) || amt <= 0) {
      error('Invalid Amount', 'Enter a valid expense amount.');
      return;
    }
    if (!newDesc.trim()) {
      error('Description Required', 'Please provide a clear description.');
      return;
    }

    try {
      const res = await window.api.saveExpense({
        id: 0,
        category: newCategory,
        amount: amt,
        description: newDesc,
        payment_method: newMethod,
        recorded_by: user.id,
        expense_date: newDate,
        created_at: new Date().toISOString(),
      });

      if (res.success) {
        success('Expense Recorded', `Logged ₹${amt} under ${newCategory}.`);
        setIsModalOpen(false);
        setNewAmount('');
        setNewDesc('');
        loadExpenses();
      } else {
        error('Failed to Record', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      const res = await window.api.deleteExpense(id);
      if (res.success) {
        success('Expense Deleted', 'Record removed.');
        loadExpenses();
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const categories: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Ingredients',
    'Salaries',
    'Maintenance',
    'Packaging',
    'Marketing',
    'Miscellaneous'
  ];

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="h-full w-full flex flex-col bg-bt-bg overflow-hidden font-mono select-none">
      {/* Header */}
      <div className="p-4 bg-white border-b border-bt-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ReceiptText className="w-5 h-5 text-bt-brick" />
          <div>
            <h2 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
              Operating Expense Management
            </h2>
            <span className="text-[11px] text-bt-muted">
              Total Incurred: <strong className="text-bt-brick">₹{totalExpenseAmount.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-2 py-1 bg-bt-bg border border-bt-border text-xs focus:outline-none"
          />

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-2 py-1 bg-bt-bg border border-bt-border text-xs font-semibold focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {hasPermission('expenses:manage') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          )}

          <button
            onClick={loadExpenses}
            className="p-1.5 bg-bt-bg hover:bg-bt-border border border-bt-border text-bt-charcoal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-bt-charcoal text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Description</th>
              <th className="py-2.5 px-3">Payment Mode</th>
              <th className="py-2.5 px-3">Amount (₹)</th>
              <th className="py-2.5 px-3">Recorded By</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bt-border bg-white">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-bt-muted">
                  No expense records logged for this filter.
                </td>
              </tr>
            ) : (
              expenses.map(e => (
                <tr key={e.id} className="hover:bg-bt-bg/60 transition-colors">
                  <td className="py-3 px-3 text-bt-muted">{e.expense_date}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-bt-bg border border-bt-border font-bold text-[10px] uppercase text-bt-charcoal">
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-bt-charcoal max-w-sm">{e.description}</td>
                  <td className="py-3 px-3 uppercase text-[10px] font-semibold text-bt-muted">{e.payment_method}</td>
                  <td className="py-3 px-3 font-bold text-bt-brick">₹{e.amount.toFixed(2)}</td>
                  <td className="py-3 px-3 text-bt-muted">{e.recorder_name}</td>
                  <td className="py-3 px-3 text-right">
                    {hasPermission('expenses:manage') && (
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1 text-bt-concrete hover:text-bt-brick"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL: RECORD EXPENSE ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveExpense} className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                Record Operating Expense
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Expense Category *</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold text-bt-brick"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-bt-muted font-bold mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="e.g. Monthly high-speed fiber internet for Alwarpet store"
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Payment Method</label>
                  <select
                    value={newMethod}
                    onChange={e => setNewMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-semibold"
                  >
                    <option value="upi">UPI / NetBanking</option>
                    <option value="cash">Petty Cash</option>
                    <option value="card">Company Debit/Credit Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

