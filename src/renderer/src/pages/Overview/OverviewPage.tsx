import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Receipt, 
  Percent, 
  Wallet, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight, 
  RefreshCw,
  Clock,
  Tag,
  BarChart2
} from 'lucide-react';
import type { DashboardMetrics } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';

export const OverviewPage: React.FC = () => {
  const [rangeType, setRangeType] = useState<string>('today');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { error } = useNotification();

  useEffect(() => {
    loadMetrics();
  }, [rangeType]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const customRange = rangeType === 'custom' && startDate && endDate 
        ? { startDate, endDate } 
        : undefined;

      const res = await window.api.getDashboardMetrics({ rangeType, customRange });
      if (res.success && res.data) {
        setMetrics(res.data);
      } else {
        error('Dashboard Error', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustom = () => {
    if (startDate && endDate) {
      loadMetrics();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-bt-bg overflow-y-auto p-6 font-mono select-none">
      {/* Header & Date Range Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-bt-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-bt-charcoal">
            Business Performance Dashboard
          </h1>
          <p className="text-xs text-bt-muted mt-0.5">
            Real-time transactional audit & operational analytics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['today', 'yesterday', 'last_7_days', 'last_30_days', 'custom'].map(t => (
            <button
              key={t}
              onClick={() => setRangeType(t)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border transition-colors ${
                rangeType === t 
                  ? 'bg-bt-charcoal text-white border-bt-charcoal' 
                  : 'bg-white border-bt-border text-bt-charcoal hover:bg-bt-bg'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}

          {rangeType === 'custom' && (
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-bt-border text-xs focus:outline-none"
              />
              <span className="text-xs text-bt-muted">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-bt-border text-xs focus:outline-none"
              />
              <button
                onClick={handleApplyCustom}
                className="px-3 py-1 bg-bt-brick text-white text-xs font-bold uppercase hover:bg-bt-brick-dark"
              >
                Go
              </button>
            </div>
          )}

          <button
            onClick={loadMetrics}
            title="Refresh Metrics"
            className="p-1.5 bg-white border border-bt-border text-bt-charcoal hover:bg-bt-bg ml-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="flex-1 flex items-center justify-center text-xs text-bt-muted">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-bt-brick" />
          <span>Aggregating ledger metrics...</span>
        </div>
      ) : metrics ? (
        <div className="space-y-6 pt-6">
          {/* Top 4 Primary KPI Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Revenue */}
            <div className="bg-white border-2 border-bt-charcoal p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-bt-muted uppercase font-bold tracking-wider">
                <span>Gross Revenue</span>
                <TrendingUp className="w-4 h-4 text-bt-brick" />
              </div>
              <div className="text-2xl font-black text-bt-charcoal mt-2">
                ₹{metrics.gross_sales.toFixed(2)}
              </div>
              <div className="text-[11px] text-bt-muted mt-1">
                Net Taxable: ₹{metrics.net_sales.toFixed(2)}
              </div>
              <div className="absolute top-0 left-0 w-1.5 h-full bg-bt-brick" />
            </div>

            {/* Total Orders & AOV */}
            <div className="bg-white border border-bt-border p-4 shadow-sm relative">
              <div className="flex items-center justify-between text-xs text-bt-muted uppercase font-bold tracking-wider">
                <span>Orders Fulfilled</span>
                <ShoppingBag className="w-4 h-4 text-bt-charcoal" />
              </div>
              <div className="text-2xl font-black text-bt-charcoal mt-2">
                {metrics.order_count}
              </div>
              <div className="text-[11px] text-bt-muted mt-1">
                Avg Order Value: ₹{metrics.average_order_value.toFixed(2)}
              </div>
            </div>

            {/* GST Collected */}
            <div className="bg-white border border-bt-border p-4 shadow-sm relative">
              <div className="flex items-center justify-between text-xs text-bt-muted uppercase font-bold tracking-wider">
                <span>GST Tax Collected</span>
                <Receipt className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                ₹{metrics.gst_collected.toFixed(2)}
              </div>
              <div className="text-[11px] text-bt-muted mt-1">
                CGST + SGST (Restaurant 5%)
              </div>
            </div>

            {/* Estimated Gross Profit */}
            <div className="bg-white border border-bt-border p-4 shadow-sm relative">
              <div className="flex items-center justify-between text-xs text-bt-muted uppercase font-bold tracking-wider">
                <span>Est. Gross Margin</span>
                <Wallet className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-bt-charcoal mt-2">
                ₹{metrics.estimated_gross_profit.toFixed(2)}
              </div>
              <div className="text-[11px] text-bt-muted mt-1">
                Less Recipe Ingredient Costs
              </div>
            </div>
          </div>

          {/* Secondary Stats Row: Discounts & Operating Expenses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-bt-border p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-bt-brick" />
                <span className="font-bold text-bt-charcoal uppercase">Total Discounts Given:</span>
              </div>
              <span className="font-bold text-bt-brick text-sm">₹{metrics.total_discounts.toFixed(2)}</span>
            </div>

            <div className="bg-white border border-bt-border p-3.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-bt-charcoal" />
                <span className="font-bold text-bt-charcoal uppercase">Operating Expenses Incurred:</span>
              </div>
              <span className="font-bold text-bt-charcoal text-sm">₹{metrics.total_expenses.toFixed(2)}</span>
            </div>
          </div>

          {/* Middle Section: Best Sellers & Category Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Sellers */}
            <div className="bg-white border border-bt-border p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-bt-border mb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-bt-brick" />
                  <span>Top Performing Menu Items</span>
                </h3>
                <span className="text-[10px] text-bt-muted">By Volume</span>
              </div>

              {metrics.best_selling_products.length === 0 ? (
                <div className="py-8 text-center text-bt-muted text-xs">No sales recorded in this interval.</div>
              ) : (
                <div className="divide-y divide-bt-border">
                  {metrics.best_selling_products.map((item, idx) => (
                    <div key={item.product_name} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 bg-bt-bg text-bt-charcoal font-bold flex items-center justify-center text-[10px] border border-bt-border">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-bt-charcoal">{item.product_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-bt-brick">{item.total_quantity} sold</span>
                        <span className="text-bt-muted text-[10px] block">₹{item.total_revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Performance */}
            <div className="bg-white border border-bt-border p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-bt-border mb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal flex items-center gap-2">
                  <Tag className="w-4 h-4 text-bt-charcoal" />
                  <span>Category Revenue Breakdown</span>
                </h3>
              </div>

              {metrics.sales_by_category.length === 0 ? (
                <div className="py-8 text-center text-bt-muted text-xs">No category revenue recorded.</div>
              ) : (
                <div className="space-y-3">
                  {metrics.sales_by_category.map(cat => {
                    const pct = metrics.gross_sales > 0 ? (cat.total_amount / metrics.gross_sales) * 100 : 0;
                    return (
                      <div key={cat.category_name} className="text-xs">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-bt-charcoal">{cat.category_name}</span>
                          <span className="font-bold text-bt-charcoal">₹{cat.total_amount.toFixed(2)} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-bt-bg h-2 border border-bt-border overflow-hidden">
                          <div className="bg-bt-brick h-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Alerts & Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low-Stock Inventory Alerts */}
            <div className="bg-white border border-bt-border p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-bt-border mb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-bt-brick" />
                  <span>Low Stock Ingredients</span>
                </h3>
                <span className="text-[10px] text-bt-brick font-bold">
                  {metrics.low_stock_alerts.length} Warnings
                </span>
              </div>

              {metrics.low_stock_alerts.length === 0 ? (
                <div className="py-6 text-center text-emerald-700 text-xs font-semibold">
                  All inventory ingredients are comfortably above threshold.
                </div>
              ) : (
                <div className="divide-y divide-bt-border">
                  {metrics.low_stock_alerts.map(ing => (
                    <div key={ing.ingredient_name} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-bt-charcoal">{ing.ingredient_name}</div>
                        <div className="text-[10px] text-bt-muted">Min Threshold: {ing.min_stock} {ing.unit}</div>
                      </div>
                      <div className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-300 font-bold text-xs">
                        {ing.current_stock} {ing.unit} left
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Orders Stream */}
            <div className="bg-white border border-bt-border p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-bt-border mb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-bt-charcoal flex items-center gap-2">
                  <Clock className="w-4 h-4 text-bt-charcoal" />
                  <span>Recent Settled Transactions</span>
                </h3>
              </div>

              {metrics.recent_orders.length === 0 ? (
                <div className="py-6 text-center text-bt-muted text-xs">No recent orders.</div>
              ) : (
                <div className="divide-y divide-bt-border">
                  {metrics.recent_orders.map(o => (
                    <div key={o.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-bt-charcoal">{o.order_number}</span>
                        <span className="text-[10px] text-bt-muted ml-2">
                          {o.order_type.toUpperCase()}{o.table_number ? ` (T${o.table_number})` : ''} • {o.created_at.slice(11, 16)}
                        </span>
                      </div>
                      <span className="font-bold text-bt-brick">₹{o.total_amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

