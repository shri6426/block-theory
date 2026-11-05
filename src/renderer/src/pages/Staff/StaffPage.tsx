import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Plus, 
  Shield, 
  Key, 
  Lock, 
  RefreshCw, 
  X, 
  Edit,
  Phone,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { User, UserRole } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const StaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);

  const { success, error } = useNotification();
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await window.api.getStaff();
      if (res.success && res.data) {
        setStaffList(res.data);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.username || !editingStaff.name) return;

    try {
      const res = await window.api.saveStaff(editingStaff);
      if (res.success) {
        success('Staff Updated', `Saved employee "${editingStaff.name}".`);
        setEditingStaff(null);
        loadStaff();
      } else {
        error('Save Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const roleBadges: Record<UserRole, string> = {
    OWNER: 'bg-bt-brick text-white',
    MANAGER: 'bg-bt-charcoal text-white',
    CASHIER: 'bg-bt-beige text-bt-charcoal font-bold',
    KITCHEN_STAFF: 'bg-bt-concrete text-bt-charcoal font-bold',
  };

  return (
    <div className="h-full w-full flex flex-col bg-bt-bg overflow-hidden font-mono select-none">
      {/* Header */}
      <div className="p-4 bg-white border-b border-bt-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <UserCheck className="w-5 h-5 text-bt-brick" />
          <h2 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
            Staff & Role-Based Access Control (RBAC)
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {hasPermission('staff:manage') && (
            <button
              onClick={() => setEditingStaff({
                username: '',
                name: '',
                role: 'CASHIER',
                password: '',
                pin: '',
                phone: '',
                is_active: 1,
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Employee</span>
            </button>
          )}

          <button
            onClick={loadStaff}
            className="p-1.5 bg-bt-bg hover:bg-bt-border border border-bt-border text-bt-charcoal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map(s => (
            <div key={s.id} className="bg-white border border-bt-border p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-bt-charcoal">{s.name}</h3>
                    <span className="text-xs text-bt-muted">@{s.username}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest ${roleBadges[s.role]}`}>
                    {s.role.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-bt-muted">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-bt-concrete" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-bt-concrete" />
                    <span>PIN Login: {s.has_pin ? 'Enabled (4-digits)' : 'None'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-bt-concrete" />
                    <span>Status: {s.is_active ? 'Active' : 'Deactivated'}</span>
                  </div>
                  <div className="text-[10px] text-bt-concrete mt-1">
                    Last login: {s.last_login ? s.last_login.slice(0, 16) : 'Never'}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-bt-border flex justify-end">
                {hasPermission('staff:manage') && (
                  <button
                    onClick={() => setEditingStaff({ ...s, password: '', pin: '' })}
                    className="text-xs text-bt-brick hover:underline font-bold uppercase"
                  >
                    Edit / Change PIN
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= MODAL: EDIT STAFF ================= */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveStaff} className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                {editingStaff.id ? 'Edit Employee Credentials' : 'Register New Employee'}
              </h3>
              <button type="button" onClick={() => setEditingStaff(null)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-bt-muted font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingStaff.name || ''}
                  onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStaff.id}
                    value={editingStaff.username || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, username: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Role *</label>
                  <select
                    value={editingStaff.role}
                    onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value as UserRole })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                  >
                    <option value="CASHIER">CASHIER</option>
                    <option value="KITCHEN_STAFF">KITCHEN STAFF</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">
                    {editingStaff.id ? 'New Password (Optional)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    value={editingStaff.password || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, password: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">
                    4-Digit Terminal PIN
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editingStaff.pin || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, pin: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold text-center tracking-widest"
                    placeholder="e.g. 1234"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingStaff.phone || ''}
                    onChange={e => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Account Status</label>
                  <select
                    value={editingStaff.is_active}
                    onChange={e => setEditingStaff({ ...editingStaff, is_active: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold"
                  >
                    <option value="1">Active</option>
                    <option value="0">Deactivated</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Save Employee
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

