import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Printer, 
  Database, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  RotateCcw, 
  Download, 
  Upload, 
  Store,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import type { AppSettings, TaxConfig } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [printers, setPrinters] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const { success, error, info } = useNotification();
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const sRes = await window.api.getSettings();
      if (sRes.success && sRes.data) setSettings(sRes.data);

      const pRes = await window.api.listPrinters();
      if (pRes.success && pRes.data) setPrinters(pRes.data);

      const bRes = await window.api.listBackups();
      if (bRes.success && bRes.data) setBackups(bRes.data);
    } catch (err: any) {
      error('Settings Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await window.api.saveSettings(settings);
      if (res.success) {
        success('Settings Saved', 'Application configuration updated successfully.');
      } else {
        error('Save Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const res = await window.api.createBackup('manual_user');
      if (res.success) {
        success('Backup Created', `Snapshot saved as ${res.data.filename}`);
        const bRes = await window.api.listBackups();
        if (bRes.success && bRes.data) setBackups(bRes.data);
      } else {
        error('Backup Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleRestoreBackup = async (filepath: string) => {
    if (!confirm('CAUTION: Restoring will overwrite the current active database with this snapshot. A safety copy of the current state will be kept. Proceed?')) {
      return;
    }
    try {
      const res = await window.api.restoreBackup(filepath);
      if (res.success) {
        success('Database Restored', res.message);
        loadAll();
      } else {
        error('Restore Failed', res.message);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleResetDemoData = async () => {
    if (!confirm('Reset demo menu items, recipes, tables, and seed stock? Real financial transactions will not be altered unless forced.')) {
      return;
    }
    try {
      const res = await window.api.resetDemoData();
      if (res.success) {
        success('Demo Restored', res.message);
        loadAll();
      } else {
        error('Reset Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  if (loading || !settings) {
    return (
      <div className="h-full flex items-center justify-center font-mono text-xs text-bt-muted">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-bt-brick" />
        <span>Loading system configuration...</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-bt-bg overflow-y-auto p-6 font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-bt-border flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-bt-brick" />
            <h1 className="text-xl font-bold uppercase tracking-wider text-bt-charcoal">
              System Settings & Hardware Integration
            </h1>
          </div>
          <p className="text-xs text-bt-muted mt-0.5">
            Configure Indian GST compliance, thermal printer widths, local backups & demo mode
          </p>
        </div>

        {hasPermission('settings:manage') && (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 pt-6 max-w-4xl">
        {/* Section 1: Business Profile & Indian GST */}
        <div className="bg-white border-2 border-bt-charcoal p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-bt-border mb-4">
            <Store className="w-4 h-4 text-bt-brick" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal">
              Café Identity & Legal GSTIN Profile
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-bt-muted font-bold mb-1">Official Café Business Name</label>
              <input
                type="text"
                value={settings.cafe_name}
                onChange={e => setSettings({ ...settings, cafe_name: e.target.value })}
                className="w-full px-3 py-1.5 bg-bt-bg border border-bt-border font-bold"
              />
            </div>
            <div>
              <label className="block text-bt-muted font-bold mb-1">Store / Outlet Branch</label>
              <input
                type="text"
                value={settings.outlet_name}
                onChange={e => setSettings({ ...settings, outlet_name: e.target.value })}
                className="w-full px-3 py-1.5 bg-bt-bg border border-bt-border font-bold"
              />
            </div>
            <div>
              <label className="block text-bt-muted font-bold mb-1">Address Line 1</label>
              <input
                type="text"
                value={settings.address_line1}
                onChange={e => setSettings({ ...settings, address_line1: e.target.value })}
                className="w-full px-3 py-1.5 bg-bt-bg border border-bt-border"
              />
            </div>
            <div>
              <label className="block text-bt-muted font-bold mb-1">Address Line 2 / Landmark</label>
              <input
                type="text"
                value={settings.address_line2}
                onChange={e => setSettings({ ...settings, address_line2: e.target.value })}
                className="w-full px-3 py-1.5 bg-bt-bg border border-bt-border"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-bt-muted font-bold mb-1">City</label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={e => setSettings({ ...settings, city: e.target.value })}
                  className="w-full px-2 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>
              <div>
                <label className="block text-bt-muted font-bold mb-1">State</label>
                <input
                  type="text"
                  value={settings.state}
                  onChange={e => setSettings({ ...settings, state: e.target.value })}
                  className="w-full px-2 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>
              <div>
                <label className="block text-bt-muted font-bold mb-1">Pincode</label>
                <input
                  type="text"
                  value={settings.pincode}
                  onChange={e => setSettings({ ...settings, pincode: e.target.value })}
                  className="w-full px-2 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-bt-muted font-bold mb-1">Store Contact Phone</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>
              <div>
                <label className="block text-bt-muted font-bold mb-1">Official Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={e => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-bt-muted font-bold mb-1">GSTIN Number (Indian GST)</label>
                <input
                  type="text"
                  value={settings.gstin}
                  onChange={e => setSettings({ ...settings, gstin: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold text-bt-brick"
                />
              </div>
              <div>
                <label className="block text-bt-muted font-bold mb-1">FSSAI License #</label>
                <input
                  type="text"
                  value={settings.fssai}
                  onChange={e => setSettings({ ...settings, fssai: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.is_tax_inclusive}
                  onChange={e => setSettings({ ...settings, is_tax_inclusive: e.target.checked })}
                  className="w-4 h-4 accent-bt-brick"
                />
                <span className="font-bold text-bt-charcoal">Tax-Inclusive Pricing (Menu price includes GST)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Thermal Receipt & Printing */}
        <div className="bg-white border border-bt-border p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-bt-border mb-4">
            <Printer className="w-4 h-4 text-bt-brick" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal">
              Hardware: Thermal Receipt Printer Integration
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-bt-muted font-bold mb-1">Thermal Paper Roll Width</label>
              <div className="flex border border-bt-border">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, thermal_printer_width: '80mm' })}
                  className={`flex-1 py-2 font-bold uppercase transition-colors ${
                    settings.thermal_printer_width === '80mm' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-charcoal'
                  }`}
                >
                  80mm Standard POS
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, thermal_printer_width: '58mm' })}
                  className={`flex-1 py-2 font-bold uppercase transition-colors ${
                    settings.thermal_printer_width === '58mm' ? 'bg-bt-charcoal text-white' : 'bg-bt-bg text-bt-charcoal'
                  }`}
                >
                  58mm Compact Roll
                </button>
              </div>
            </div>

            <div>
              <label className="block text-bt-muted font-bold mb-1">Connected Windows Printer</label>
              <select
                value={settings.printer_name}
                onChange={e => setSettings({ ...settings, printer_name: e.target.value })}
                className="w-full px-2.5 py-2 bg-bt-bg border border-bt-border font-bold"
              >
                <option value="Default">System Default Printer</option>
                {printers.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-bt-muted font-bold mb-1">Receipt Footer Branded Message</label>
              <input
                type="text"
                value={settings.receipt_footer_msg}
                onChange={e => setSettings({ ...settings, receipt_footer_msg: e.target.value })}
                className="w-full px-3 py-1.5 bg-bt-bg border border-bt-border"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Database Backups & Integrity */}
        <div className="bg-white border border-bt-border p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-bt-border mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal">
                SQLite Persistence & Disaster Recovery
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCreateBackup}
              className="flex items-center gap-1.5 px-3 py-1 bg-bt-charcoal text-white text-xs font-bold uppercase hover:bg-bt-brick"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Snapshot Backup Now</span>
            </button>
          </div>

          <div className="text-xs text-bt-muted mb-3">
            Database path: <code className="text-bt-charcoal bg-bt-bg px-2 py-0.5 border border-bt-border">%APPDATA%/BlockTheoryPOS/blocktheory.db</code>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto border border-bt-border p-2 bg-bt-bg text-xs">
            {backups.length === 0 ? (
              <div className="p-4 text-center text-bt-muted">No backup archives found.</div>
            ) : (
              backups.map(b => (
                <div key={b.filename} className="p-2.5 bg-white border border-bt-border flex items-center justify-between">
                  <div>
                    <div className="font-bold text-bt-charcoal">{b.filename}</div>
                    <div className="text-[10px] text-bt-muted">
                      Created: {b.createdAt.slice(0, 16)} • Size: {(b.sizeBytes / 1024).toFixed(1)} KB • Integrity: {b.isValid ? 'VERIFIED ✓' : 'FAILED'}
                    </div>
                  </div>
                  {hasPermission('backup:manage') && (
                    <button
                      type="button"
                      onClick={() => handleRestoreBackup(b.filepath)}
                      className="px-2.5 py-1 bg-bt-bg border border-bt-border hover:bg-bt-border font-bold uppercase text-[10px]"
                    >
                      Restore
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 4: Demo Environment Control */}
        <div className="bg-white border border-bt-border p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-bt-border mb-3">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal">
              Demo Environment & Menu Reset
            </h3>
          </div>

          <p className="text-xs text-bt-muted mb-4">
            Resetting demo data repopulates the standard Block Theory menu, recipes, ingredients, tables, and demo staff.
          </p>

          {hasPermission('demo:reset') && (
            <button
              type="button"
              onClick={handleResetDemoData}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm"
            >
              Reset Demo Menu & Sample Stock
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

