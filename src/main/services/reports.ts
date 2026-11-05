import { getDatabase } from '../db/client';
import type { DashboardMetrics, Order } from '../../shared/types';
import { round } from './billing';

export interface DateFilterRange {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string;   // 'YYYY-MM-DD'
}

export function getDateRangeClause(rangeType: string, custom?: DateFilterRange): { condition: string; params: string[] } {
  const today = new Date().toISOString().split('T')[0];

  switch (rangeType) {
    case 'today':
      return {
        condition: "date(o.created_at) = date('now', 'localtime')",
        params: [],
      };
    case 'yesterday':
      return {
        condition: "date(o.created_at) = date('now', 'localtime', '-1 day')",
        params: [],
      };
    case 'last_7_days':
      return {
        condition: "date(o.created_at) >= date('now', 'localtime', '-7 days')",
        params: [],
      };
    case 'last_30_days':
      return {
        condition: "date(o.created_at) >= date('now', 'localtime', '-30 days')",
        params: [],
      };
    case 'custom':
      if (custom && custom.startDate && custom.endDate) {
        return {
          condition: "date(o.created_at) BETWEEN date(?) AND date(?)",
          params: [custom.startDate, custom.endDate],
        };
      }
      return {
        condition: "date(o.created_at) = date('now', 'localtime')",
        params: [],
      };
    default:
      return {
        condition: "date(o.created_at) = date('now', 'localtime')",
        params: [],
      };
  }
}

export function getDashboardMetrics(rangeType: string = 'today', customRange?: DateFilterRange): DashboardMetrics {
  const db = getDatabase();
  const { condition, params } = getDateRangeClause(rangeType, customRange);

  // 1. Core Financial Aggregates
  const salesAgg = db.prepare(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as gross_sales,
      COALESCE(SUM(subtotal), 0) as net_sales,
      COUNT(id) as order_count,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(tax_amount), 0) as gst_collected
    FROM orders o
    WHERE ${condition} AND payment_status = 'paid'
  `).get(...params) as any;

  const grossSales = round(salesAgg.gross_sales || 0);
  const netSales = round(salesAgg.net_sales || 0);
  const orderCount = salesAgg.order_count || 0;
  const aov = orderCount > 0 ? round(grossSales / orderCount) : 0;
  const totalDiscounts = round(salesAgg.total_discounts || 0);
  const gstCollected = round(salesAgg.gst_collected || 0);

  // 2. Expenses for matching period
  let expCondition = "date(expense_date) = date('now', 'localtime')";
  let expParams: string[] = [];
  if (rangeType === 'yesterday') {
    expCondition = "date(expense_date) = date('now', 'localtime', '-1 day')";
  } else if (rangeType === 'last_7_days') {
    expCondition = "date(expense_date) >= date('now', 'localtime', '-7 days')";
  } else if (rangeType === 'last_30_days') {
    expCondition = "date(expense_date) >= date('now', 'localtime', '-30 days')";
  } else if (rangeType === 'custom' && customRange) {
    expCondition = "date(expense_date) BETWEEN date(?) AND date(?)";
    expParams = [customRange.startDate, customRange.endDate];
  }

  const expAgg = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses 
    FROM expenses 
    WHERE ${expCondition}
  `).get(...expParams) as any;

  const totalExpenses = round(expAgg.total_expenses || 0);

  // 3. Estimated Cost of Goods Sold (COGS) via ingredient costs
  const cogsAgg = db.prepare(`
    SELECT COALESCE(SUM(oi.quantity * r.quantity_required * i.cost_per_unit), 0) as cogs
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN recipes r ON r.product_id = oi.product_id
    JOIN ingredients i ON i.id = r.ingredient_id
    WHERE ${condition} AND o.payment_status = 'paid'
  `).get(...params) as any;

  const cogs = round(cogsAgg.cogs || 0);
  const estimatedGrossProfit = round(netSales - cogs);

  // 4. Best Selling Products
  const bestSellers = db.prepare(`
    SELECT 
      oi.product_name,
      SUM(oi.quantity) as total_quantity,
      SUM(oi.total_price) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE ${condition} AND o.payment_status = 'paid'
    GROUP BY oi.product_id, oi.product_name
    ORDER BY total_quantity DESC
    LIMIT 5
  `).all(...params) as any[];

  // 5. Sales By Category
  const categorySales = db.prepare(`
    SELECT 
      c.name as category_name,
      SUM(oi.total_price) as total_amount,
      COUNT(DISTINCT o.id) as order_count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN orders o ON oi.order_id = o.id
    WHERE ${condition} AND o.payment_status = 'paid'
    GROUP BY c.id, c.name
    ORDER BY total_amount DESC
  `).all(...params) as any[];

  // 6. Hourly Sales
  const hourly = db.prepare(`
    SELECT 
      strftime('%H:00', o.created_at) as hour,
      SUM(o.total_amount) as sales,
      COUNT(o.id) as orders
    FROM orders o
    WHERE ${condition} AND o.payment_status = 'paid'
    GROUP BY strftime('%H:00', o.created_at)
    ORDER BY hour ASC
  `).all(...params) as any[];

  // 7. Recent Orders
  const recentOrders = db.prepare(`
    SELECT o.*, u.name as cashier_name
    FROM orders o
    JOIN users u ON o.cashier_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 6
  `).all() as Order[];

  // 8. Low-Stock Alerts
  const lowStock = db.prepare(`
    SELECT name as ingredient_name, current_stock, min_stock, unit
    FROM ingredients
    WHERE current_stock <= min_stock
    ORDER BY current_stock ASC
  `).all() as any[];

  return {
    gross_sales: grossSales,
    net_sales: netSales,
    order_count: orderCount,
    average_order_value: aov,
    total_discounts: totalDiscounts,
    gst_collected: gstCollected,
    estimated_gross_profit: estimatedGrossProfit,
    total_expenses: totalExpenses,
    best_selling_products: bestSellers.map(b => ({
      product_name: b.product_name,
      total_quantity: Number(b.total_quantity),
      total_revenue: round(Number(b.total_revenue)),
    })),
    sales_by_category: categorySales.map(c => ({
      category_name: c.category_name,
      total_amount: round(Number(c.total_amount)),
      order_count: Number(c.order_count),
    })),
    hourly_sales: hourly.map(h => ({
      hour: h.hour,
      sales: round(Number(h.sales)),
      orders: Number(h.orders),
    })),
    recent_orders: recentOrders,
    low_stock_alerts: lowStock,
  };
}

export function exportSalesReportCSV(startDate: string, endDate: string): string {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT 
      o.order_number,
      o.created_at,
      o.order_type,
      o.table_number,
      u.name as cashier,
      o.subtotal,
      o.discount_amount,
      o.tax_amount,
      o.total_amount,
      o.payment_status,
      (SELECT GROUP_CONCAT(payment_method, '/') FROM payments WHERE order_id = o.id) as payment_methods
    FROM orders o
    JOIN users u ON o.cashier_id = u.id
    WHERE date(o.created_at) BETWEEN date(?) AND date(?)
    ORDER BY o.created_at ASC
  `).all(startDate, endDate) as any[];

  const headers = [
    'Order Number',
    'Date & Time',
    'Order Type',
    'Table',
    'Cashier',
    'Subtotal (₹)',
    'Discount (₹)',
    'GST (₹)',
    'Total (₹)',
    'Payment Status',
    'Payment Methods'
  ];

  const csvRows = [headers.join(',')];

  for (const r of rows) {
    csvRows.push([
      `"${r.order_number}"`,
      `"${r.created_at}"`,
      `"${r.order_type}"`,
      `"${r.table_number || '-'}"`,
      `"${r.cashier || '-'}"`,
      r.subtotal,
      r.discount_amount,
      r.tax_amount,
      r.total_amount,
      `"${r.payment_status}"`,
      `"${r.payment_methods || 'cash'}"`,
    ].join(','));
  }

  return csvRows.join('\n');
}

export function exportGSTReportCSV(startDate: string, endDate: string): string {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT 
      inv.invoice_number,
      inv.created_at,
      inv.order_number,
      inv.customer_name,
      inv.customer_phone,
      inv.subtotal,
      inv.discount_amount,
      inv.cgst,
      inv.sgst,
      inv.igst,
      inv.total_amount,
      inv.payment_method
    FROM invoices inv
    WHERE date(inv.created_at) BETWEEN date(?) AND date(?)
    ORDER BY inv.created_at ASC
  `).all(startDate, endDate) as any[];

  const headers = [
    'Invoice Number',
    'Date & Time',
    'Order Ref',
    'Customer Name',
    'Customer Phone',
    'Taxable Value (₹)',
    'Discount (₹)',
    'CGST (₹)',
    'SGST (₹)',
    'IGST (₹)',
    'Total Invoice Amount (₹)',
    'Payment Mode'
  ];

  const csvRows = [headers.join(',')];

  for (const r of rows) {
    csvRows.push([
      `"${r.invoice_number}"`,
      `"${r.created_at}"`,
      `"${r.order_number}"`,
      `"${r.customer_name || 'Walk-in'}"`,
      `"${r.customer_phone || '-'}"`,
      r.subtotal,
      r.discount_amount,
      r.cgst,
      r.sgst,
      r.igst,
      r.total_amount,
      `"${r.payment_method}"`,
    ].join(','));
  }

  return csvRows.join('\n');
}

