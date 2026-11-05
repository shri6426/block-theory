import { ipcMain, BrowserWindow } from 'electron';
import { getDatabase } from '../db/client';
import { seedDatabase } from '../db/seed';
import { loginWithPassword, loginWithPin, getAllStaff, checkPermission } from '../services/auth';
import { 
  processCheckout, 
  holdCurrentOrder, 
  listHeldOrders, 
  resumeHeldOrder, 
  deleteHeldOrder, 
  getAppSettings 
} from '../services/billing';
import { 
  getAllIngredients, 
  adjustStock, 
  recordPurchase, 
  getStockMovements, 
  getPurchasesHistory 
} from '../services/inventory';
import { getActiveKDSTickets, updateOrderItemStatus, updateOrderStatus } from '../services/kds';
import { getDashboardMetrics, exportSalesReportCSV, exportGSTReportCSV } from '../services/reports';
import { getInvoiceWithDetails, generateThermalReceiptHtml } from '../services/printer';
import { createDatabaseBackup, listBackups, restoreDatabaseBackup } from '../db/backup';
import type { Customer, Expense, Product, CheckoutPayload } from '../../shared/types';
import bcrypt from 'bcryptjs';

export function registerIpcHandlers(): void {
  const db = getDatabase();

  // --- AUTH ---
  ipcMain.handle('auth:login-password', async (_, { username, password }) => {
    return loginWithPassword(username, password);
  });

  ipcMain.handle('auth:login-pin', async (_, { pin }) => {
    return loginWithPin(pin);
  });

  ipcMain.handle('auth:get-staff', async () => {
    return { success: true, data: getAllStaff() };
  });

  ipcMain.handle('auth:save-staff', async (_, staff) => {
    try {
      if (staff.id) {
        if (staff.password) {
          const passHash = bcrypt.hashSync(staff.password, 10);
          db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passHash, staff.id);
        }
        if (staff.pin) {
          const pinHash = bcrypt.hashSync(staff.pin, 10);
          db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(pinHash, staff.id);
        }
        db.prepare(`
          UPDATE users 
          SET name = ?, role = ?, phone = ?, is_active = ?
          WHERE id = ?
        `).run(staff.name, staff.role, staff.phone || null, staff.is_active ?? 1, staff.id);
      } else {
        const passHash = bcrypt.hashSync(staff.password || 'welcome123', 10);
        const pinHash = staff.pin ? bcrypt.hashSync(staff.pin, 10) : null;
        db.prepare(`
          INSERT INTO users (username, name, password_hash, pin_hash, role, phone, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(staff.username, staff.name, passHash, pinHash, staff.role, staff.phone || null);
      }
      return { success: true, data: getAllStaff() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- POS / CATALOG ---
  ipcMain.handle('pos:get-catalog', async () => {
    try {
      const categories = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC').all();
      const products = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC').all() as Product[];
      const variants = db.prepare('SELECT * FROM product_variants').all() as any[];
      const addons = db.prepare('SELECT * FROM product_addons').all() as any[];

      // Attach variants and addons
      for (const p of products) {
        p.variants = variants.filter(v => v.product_id === p.id);
        p.addons = addons.filter(a => a.product_id === p.id);
      }

      return { success: true, data: { categories, products } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('pos:checkout', async (_, payload: CheckoutPayload) => {
    return processCheckout(payload);
  });

  ipcMain.handle('pos:hold-order', async (_, { cart, cashierId, orderType, tableNumber, customerName, customerPhone, notes }) => {
    return holdCurrentOrder(cart, cashierId, orderType, tableNumber, customerName, customerPhone, notes);
  });

  ipcMain.handle('pos:list-held', async () => {
    return { success: true, data: listHeldOrders() };
  });

  ipcMain.handle('pos:resume-held', async (_, id: number) => {
    return resumeHeldOrder(id);
  });

  ipcMain.handle('pos:delete-held', async (_, id: number) => {
    const success = deleteHeldOrder(id);
    return { success };
  });

  // --- ORDERS ---
  ipcMain.handle('orders:list', async (_, { limit = 100, status, dateFilter } = {}) => {
    try {
      let query = `
        SELECT o.*, u.name as cashier_name, c.name as customer_name_rel
        FROM orders o
        JOIN users u ON o.cashier_id = u.id
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (status) {
        query += ' AND o.status = ?';
        params.push(status);
      }
      if (dateFilter) {
        query += " AND date(o.created_at) = date(?)";
        params.push(dateFilter);
      }
      query += ' ORDER BY o.created_at DESC LIMIT ?';
      params.push(limit);

      const orders = db.prepare(query).all(...params);
      return { success: true, data: orders };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('orders:get-details', async (_, orderId: number) => {
    try {
      const order = db.prepare(`
        SELECT o.*, u.name as cashier_name 
        FROM orders o 
        JOIN users u ON o.cashier_id = u.id 
        WHERE o.id = ?
      `).get(orderId) as any;

      if (!order) return { success: false, error: 'Order not found.' };

      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as any[];
      const getAddons = db.prepare('SELECT addon_name as name, price FROM order_item_addons WHERE order_item_id = ?');
      for (const it of items) {
        it.addons = getAddons.all(it.id);
      }

      const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(orderId);
      const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId);

      order.items = items;
      order.payments = payments;
      order.invoice = invoice;

      return { success: true, data: order };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('orders:cancel', async (_, { orderId, reason, userId }) => {
    try {
      db.prepare("UPDATE orders SET status = 'cancelled', notes = coalesce(notes || ' | ', '') || 'Cancelled: ' || ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(reason, orderId);
      db.prepare("INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, 'ORDER_CANCEL', 'ORDER', ?, ?)").run(userId, orderId.toString(), `Cancelled with reason: ${reason}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('orders:refund', async (_, { orderId, reason, userId }) => {
    try {
      db.prepare("UPDATE orders SET payment_status = 'refunded', status = 'cancelled', updated_at = datetime('now', 'localtime') WHERE id = ?").run(orderId);
      db.prepare("UPDATE payments SET status = 'refunded', notes = coalesce(notes || ' | ', '') || 'Refund reason: ' || ? WHERE order_id = ?").run(reason, orderId);
      db.prepare("INSERT INTO audit_logs (user_id, action, entity, entity_id, details) VALUES (?, 'ORDER_REFUND', 'PAYMENTS', ?, ?)").run(userId, orderId.toString(), `Refunded with reason: ${reason}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- KDS ---
  ipcMain.handle('kds:get-tickets', async (_, stationFilter) => {
    try {
      const tickets = getActiveKDSTickets(stationFilter);
      return { success: true, data: tickets };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('kds:update-item-status', async (_, { itemId, status }) => {
    return updateOrderItemStatus(itemId, status);
  });

  ipcMain.handle('kds:update-order-status', async (_, { orderId, status }) => {
    return updateOrderStatus(orderId, status);
  });

  // --- MENU MANAGEMENT ---
  ipcMain.handle('menu:get-all', async () => {
    try {
      const categories = db.prepare('SELECT * FROM categories ORDER BY display_order ASC').all();
      const products = db.prepare('SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id ORDER BY p.name ASC').all() as any[];
      const variants = db.prepare('SELECT * FROM product_variants').all() as any[];
      const addons = db.prepare('SELECT * FROM product_addons').all() as any[];

      for (const p of products) {
        p.variants = variants.filter(v => v.product_id === p.id);
        p.addons = addons.filter(a => a.product_id === p.id);
      }

      return { success: true, data: { categories, products } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('menu:save-product', async (_, product: Product) => {
    try {
      const runTx = db.transaction(() => {
        let prodId = product.id;
        if (product.id) {
          db.prepare(`
            UPDATE products 
            SET category_id = ?, name = ?, description = ?, base_price = ?, 
                hsn_code = ?, tax_rate = ?, station = ?, is_active = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ?
          `).run(
            product.category_id,
            product.name,
            product.description || null,
            product.base_price,
            product.hsn_code || '2101',
            product.tax_rate ?? 5.0,
            product.station || 'coffee_counter',
            product.is_active ?? 1,
            product.id
          );
        } else {
          const res = db.prepare(`
            INSERT INTO products (category_id, name, description, base_price, hsn_code, tax_rate, station, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            product.category_id,
            product.name,
            product.description || null,
            product.base_price,
            product.hsn_code || '2101',
            product.tax_rate ?? 5.0,
            product.station || 'coffee_counter',
            product.is_active ?? 1
          );
          prodId = res.lastInsertRowid as number;
        }

        // Handle variants
        if (product.variants) {
          db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(prodId);
          const insVar = db.prepare('INSERT INTO product_variants (product_id, name, price_adjustment) VALUES (?, ?, ?)');
          for (const v of product.variants) {
            insVar.run(prodId, v.name, v.price_adjustment);
          }
        }

        // Handle addons
        if (product.addons) {
          db.prepare('DELETE FROM product_addons WHERE product_id = ?').run(prodId);
          const insAddon = db.prepare('INSERT INTO product_addons (product_id, name, price, max_quantity) VALUES (?, ?, ?, ?)');
          for (const a of product.addons) {
            insAddon.run(prodId, a.name, a.price, a.max_quantity || 1);
          }
        }

        return prodId;
      });

      const savedId = runTx();
      return { success: true, data: { id: savedId } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('menu:save-category', async (_, cat) => {
    try {
      if (cat.id) {
        db.prepare('UPDATE categories SET name = ?, code = ?, display_order = ?, is_active = ? WHERE id = ?').run(cat.name, cat.code, cat.display_order, cat.is_active, cat.id);
      } else {
        db.prepare('INSERT INTO categories (name, code, display_order, is_active) VALUES (?, ?, ?, 1)').run(cat.name, cat.code, cat.display_order || 0);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('menu:get-recipes', async (_, productId: number) => {
    try {
      const recipes = db.prepare(`
        SELECT r.*, i.name as ingredient_name, i.unit as unit
        FROM recipes r
        JOIN ingredients i ON r.ingredient_id = i.id
        WHERE r.product_id = ?
      `).all(productId);
      return { success: true, data: recipes };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('menu:save-recipe', async (_, { productId, variantId, items }) => {
    try {
      const runTx = db.transaction(() => {
        db.prepare('DELETE FROM recipes WHERE product_id = ? AND (variant_id IS NULL OR variant_id = ?)').run(productId, variantId || null);
        const ins = db.prepare('INSERT INTO recipes (product_id, variant_id, ingredient_id, quantity_required) VALUES (?, ?, ?, ?)');
        for (const it of items) {
          ins.run(productId, variantId || null, it.ingredient_id, it.quantity_required);
        }
      });
      runTx();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- INVENTORY ---
  ipcMain.handle('inventory:get-ingredients', async () => {
    try {
      const data = getAllIngredients();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('inventory:save-ingredient', async (_, ing) => {
    try {
      if (ing.id) {
        db.prepare(`
          UPDATE ingredients 
          SET name = ?, code = ?, min_stock = ?, unit = ?, cost_per_unit = ?, supplier_id = ?, updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `).run(ing.name, ing.code, ing.min_stock, ing.unit, ing.cost_per_unit, ing.supplier_id || null, ing.id);
      } else {
        db.prepare(`
          INSERT INTO ingredients (name, code, current_stock, min_stock, unit, cost_per_unit, supplier_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(ing.name, ing.code, ing.current_stock || 0, ing.min_stock || 0, ing.unit, ing.cost_per_unit || 0, ing.supplier_id || null);
      }
      return { success: true, data: getAllIngredients() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('inventory:adjust-stock', async (_, { ingredientId, quantityChange, reason, userId, type }) => {
    return adjustStock(ingredientId, quantityChange, reason, userId, type);
  });

  ipcMain.handle('inventory:get-movements', async (_, limit) => {
    try {
      const data = getStockMovements(limit);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- SUPPLIERS & PURCHASES ---
  ipcMain.handle('suppliers:list', async () => {
    try {
      const data = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('suppliers:save', async (_, sup) => {
    try {
      if (sup.id) {
        db.prepare(`
          UPDATE suppliers 
          SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, notes = ?
          WHERE id = ?
        `).run(sup.name, sup.contact_person, sup.phone, sup.email, sup.address, sup.notes || null, sup.id);
      } else {
        db.prepare(`
          INSERT INTO suppliers (name, contact_person, phone, email, address, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(sup.name, sup.contact_person, sup.phone, sup.email, sup.address, sup.notes || null);
      }
      return { success: true, data: db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('purchases:record', async (_, { supplierId, invoiceNumber, purchaseDate, items, notes, userId }) => {
    return recordPurchase(supplierId, invoiceNumber, purchaseDate, items, notes, userId);
  });

  ipcMain.handle('purchases:list', async (_, limit) => {
    try {
      const data = getPurchasesHistory(limit);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- CUSTOMERS ---
  ipcMain.handle('customers:list', async (_, limit = 100) => {
    try {
      const data = db.prepare('SELECT * FROM customers ORDER BY total_spent DESC LIMIT ?').all(limit);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('customers:search', async (_, term: string) => {
    try {
      const data = db.prepare(`
        SELECT * FROM customers 
        WHERE phone LIKE ? OR LOWER(name) LIKE ?
        LIMIT 10
      `).all(`%${term}%`, `%${term.toLowerCase()}%`);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('customers:save', async (_, customer: Customer) => {
    try {
      if (customer.id) {
        db.prepare(`
          UPDATE customers 
          SET name = ?, phone = ?, email = ?, notes = ?
          WHERE id = ?
        `).run(customer.name, customer.phone, customer.email || null, customer.notes || null, customer.id);
      } else {
        db.prepare(`
          INSERT INTO customers (name, phone, email, notes)
          VALUES (?, ?, ?, ?)
        `).run(customer.name, customer.phone, customer.email || null, customer.notes || null);
      }
      return { success: true, data: db.prepare('SELECT * FROM customers ORDER BY total_spent DESC').all() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- EXPENSES ---
  ipcMain.handle('expenses:list', async (_, { month, category } = {}) => {
    try {
      let query = `
        SELECT e.*, u.name as recorder_name
        FROM expenses e
        JOIN users u ON e.recorded_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (month) {
        query += " AND strftime('%Y-%m', e.expense_date) = ?";
        params.push(month);
      }
      if (category) {
        query += ' AND e.category = ?';
        params.push(category);
      }
      query += ' ORDER BY e.expense_date DESC';
      const data = db.prepare(query).all(...params);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('expenses:save', async (_, exp: Expense) => {
    try {
      if (exp.id) {
        db.prepare(`
          UPDATE expenses 
          SET category = ?, amount = ?, description = ?, payment_method = ?, expense_date = ?
          WHERE id = ?
        `).run(exp.category, exp.amount, exp.description, exp.payment_method, exp.expense_date, exp.id);
      } else {
        db.prepare(`
          INSERT INTO expenses (category, amount, description, payment_method, recorded_by, expense_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(exp.category, exp.amount, exp.description, exp.payment_method, exp.recorded_by, exp.expense_date);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('expenses:delete', async (_, id: number) => {
    try {
      db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- REPORTS ---
  ipcMain.handle('reports:get-dashboard', async (_, { rangeType, customRange }) => {
    try {
      const data = getDashboardMetrics(rangeType, customRange);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:export-sales-csv', async (_, { startDate, endDate }) => {
    try {
      const csv = exportSalesReportCSV(startDate, endDate);
      return { success: true, data: csv };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reports:export-gst-csv', async (_, { startDate, endDate }) => {
    try {
      const csv = exportGSTReportCSV(startDate, endDate);
      return { success: true, data: csv };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- PRINTER & INVOICES ---
  ipcMain.handle('printer:get-receipt-html', async (_, { orderId, width }) => {
    try {
      const invoice = getInvoiceWithDetails(orderId);
      if (!invoice) return { success: false, error: 'Invoice not found.' };
      const html = generateThermalReceiptHtml(invoice, width || '80mm');
      return { success: true, data: { html, invoice } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('printer:list-printers', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        const printers = await win.webContents.getPrintersAsync();
        return { success: true, data: printers };
      }
      return { success: true, data: [] };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('printer:print-receipt', async (event, { orderId, printerName, width }) => {
    try {
      const invoice = getInvoiceWithDetails(orderId);
      if (!invoice) return { success: false, error: 'Invoice not found.' };
      const html = generateThermalReceiptHtml(invoice, width || '80mm');

      // Create a hidden printing window
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      return new Promise((resolve) => {
        printWin.webContents.print(
          {
            silent: false,
            printBackground: true,
            deviceName: printerName || '',
          },
          (success, failureReason) => {
            printWin.close();
            if (success) {
              db.prepare('UPDATE invoices SET printed_count = printed_count + 1 WHERE id = ?').run(invoice.id);
              resolve({ success: true, message: 'Print command sent successfully.' });
            } else {
              resolve({ success: false, error: failureReason || 'Printing cancelled or failed.' });
            }
          }
        );
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- SETTINGS ---
  ipcMain.handle('settings:get', async () => {
    try {
      const data = getAppSettings();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('settings:save', async (_, newSettings) => {
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value_json) VALUES ('general', ?)").run(JSON.stringify(newSettings));
      return { success: true, data: newSettings };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- TAX CONFIG ---
  ipcMain.handle('tax:list', async () => {
    try {
      const data = db.prepare('SELECT * FROM tax_configs').all();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('tax:save', async (_, config) => {
    try {
      if (config.id) {
        db.prepare('UPDATE tax_configs SET name = ?, cgst_rate = ?, sgst_rate = ?, igst_rate = ?, is_inclusive = ?, is_active = ? WHERE id = ?').run(
          config.name, config.cgst_rate, config.sgst_rate, config.igst_rate, config.is_inclusive, config.is_active, config.id
        );
      } else {
        db.prepare('INSERT INTO tax_configs (name, cgst_rate, sgst_rate, igst_rate, is_inclusive, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(
          config.name, config.cgst_rate, config.sgst_rate, config.igst_rate, config.is_inclusive, config.is_active
        );
      }
      return { success: true, data: db.prepare('SELECT * FROM tax_configs').all() };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- BACKUP & RESTORE ---
  ipcMain.handle('backup:create', async (_, label) => {
    try {
      const backup = createDatabaseBackup(label || 'manual');
      return { success: true, data: backup };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:list', async () => {
    try {
      const list = listBackups();
      return { success: true, data: list };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:restore', async (_, filepath: string) => {
    return restoreDatabaseBackup(filepath);
  });

  // --- DEMO MODE ---
  ipcMain.handle('demo:reset', async () => {
    try {
      seedDatabase(db, true);
      return { success: true, message: 'Demo environment reset to pristine state with sample menu and stock.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- WINDOW CONTROLS ---
  ipcMain.handle('app:minimize', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.handle('app:maximize', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    }
  });

  ipcMain.handle('app:close', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  ipcMain.handle('app:get-version', async () => {
    return { version: '1.0.0', name: 'BLOCK THEORY POS' };
  });
}
