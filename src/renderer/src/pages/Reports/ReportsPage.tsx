import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  FileSpreadsheet, 
  Receipt, 
  TrendingUp, 
  RefreshCw,
  Clock,
  User,
  Coffee
} from 'lucide-react';
import type { DashboardMetrics } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';

export const ReportsPage: React.FC = () => {
  const [rangeType, setRangeType] = useState<string>('last_30_days');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { success, error } = useNotification();

  useEffect(() => {
    loadReports();
  }, [rangeType]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const customRange = { startDate, endDate };
      const res = await window.api.getDashboardMetrics({ rangeType, customRange });
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch (err: any) {
      error('Report Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSalesCSV = async () => {
    try {
      const res = await window.api.exportSalesReportCSV({ startDate, endDate });
      if (res.success && res.data) {
        downloadBlob(res.data, `BlockTheory_SalesReport_${startDate}_${endDate}.csv`, 'text/csv');
        success('Export Ready', 'Sales report CSV downloaded.');
      }
    } catch (err: any) {
      error('Export Error', err.message);
    }
  };

  const handleExportGSTCSV = async () => {
    try {
      const res = await window.api.exportGSTReportCSV({ startDate, endDate });
      if (res.success && res.data) {
        downloadBlob(res.data, `BlockTheory_GST_Audit_${startDate}_${endDate}.csv`, 'text/csv');
        success('Export Ready', 'GST audit report CSV downloaded.');
      }
    } catch (err: any) {
      error('Export Error', err.message);
    }
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-bt-bg overflow-y-auto p-6 font-mono select-none">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-bt-border flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-bt-brick" />
            <h1 className="text-xl font-bold uppercase tracking-wider text-bt-charcoal">
              Financial Audit & Analytics Reports
            </h1>
          </div>
          <p className="text-xs text-bt-muted mt-0.5">
            Database-certified GST reconciliations, P&L margin estimates and CSV extracts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportSalesCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-bt-border text-bt-charcoal text-xs font-bold uppercase hover:bg-bt-bg shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Sales CSV</span>
          </button>

          <button
            onClick={handleExportGSTCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs font-bold uppercase tracking-wider shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GST Audit CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="my-5 p-3.5 bg-white border border-bt-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          {['today', 'last_7_days', 'last_30_days', 'custom'].map(t => (
            <button
              key={t}
              onClick={() => setRangeType(t)}
              className={`px-3 py-1 uppercase font-semibold border transition-colors ${
                rangeType === t ? 'bg-bt-charcoal text-white border-bt-charcoal' : 'bg-bt-bg text-bt-charcoal border-bt-border'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-bt-muted">Custom Scope:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-2 py-1 bg-bt-bg border border-bt-border text-xs focus:outline-none"
          />
          <span className="text-bt-muted">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-2 py-1 bg-bt-bg border border-bt-border text-xs focus:outline-none"
          />
          <button
            onClick={loadReports}
            className="px-3 py-1 bg-bt-charcoal text-white font-bold uppercase hover:bg-bt-brick"
          >
            Query
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="flex-1 flex items-center justify-center text-xs text-bt-muted">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-bt-brick" />
          <span>Generating report models from SQLite store...</span>
        </div>
      ) : metrics ? (
        <div className="space-y-6">
          {/* P&L Snapshot */}
          <div className="bg-white border-2 border-bt-charcoal p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-bt-muted mb-4 pb-2 border-b border-bt-border flex items-center justify-between">
              <span>Financial Profit & Loss Statement (Selected Period)</span>
              <span className="text-emerald-700 font-bold">CERTIFIED FROM TRANSACTION RECORDS</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-bt-muted block">Gross Customer Billing:</span>
                <span className="text-xl font-black text-bt-charcoal">₹{metrics.gross_sales.toFixed(2)}</span>
                <span className="text-[10px] text-bt-muted block">{metrics.order_count} completed orders</span>
              </div>

              <div className="space-y-1">
                <span className="text-bt-muted block">Discounts & Promotions:</span>
                <span className="text-xl font-black text-bt-brick">-₹{metrics.total_discounts.toFixed(2)}</span>
                <span className="text-[10px] text-bt-muted block">Subtotal: ₹{metrics.net_sales.toFixed(2)}</span>
              </div>

              <div className="space-y-1">
                <span className="text-bt-muted block">Total GST Collected (5%):</span>
                <span className="text-xl font-black text-emerald-800">₹{metrics.gst_collected.toFixed(2)}</span>
                <span className="text-[10px] text-bt-muted block">50% CGST / 50% SGST</span>
              </div>

              <div className="space-y-1">
                <span className="text-bt-muted block">Estimated Gross Profit:</span>
                <span className="text-xl font-black text-bt-brick">₹{metrics.estimated_gross_profit.toFixed(2)}</span>
                <span className="text-[10px] text-bt-muted block">Net sales minus ingredients COGS</span>
              </div>
            </div>
          </div>

          {/* Category Performance & Best Sellers tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-bt-border p-5 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal pb-3 border-b border-bt-border mb-3">
                Product Sales Breakdown
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-bt-muted text-left border-b border-bt-border pb-1">
                    <th className="py-1">Menu Item</th>
                    <th className="py-1 text-center">Qty Sold</th>
                    <th className="py-1 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bt-border">
                  {metrics.best_selling_products.map(p => (
                    <tr key={p.product_name}>
                      <td className="py-2 font-semibold text-bt-charcoal">{p.product_name}</td>
                      <td className="py-2 text-center font-bold text-bt-muted">{p.total_quantity}</td>
                      <td className="py-2 text-right font-bold text-bt-brick">₹{p.total_revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-bt-border p-5 shadow-sm">
              <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal pb-3 border-b border-bt-border mb-3">
                Category Contribution
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-bt-muted text-left border-b border-bt-border pb-1">
                    <th className="py-1">Category</th>
                    <th className="py-1 text-center">Orders</th>
                    <th className="py-1 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bt-border">
                  {metrics.sales_by_category.map(c => (
                    <tr key={c.category_name}>
                      <td className="py-2 font-semibold text-bt-charcoal">{c.category_name}</td>
                      <td className="py-2 text-center text-bt-muted">{c.order_count}</td>
                      <td className="py-2 text-right font-bold text-bt-brick">₹{c.total_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

