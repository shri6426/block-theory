import { getDatabase } from '../db/client';
import type { 
  CartItem, 
  OrderType, 
  PaymentMethod, 
  Order, 
  Invoice, 
  HeldOrder,
  PaymentRecord,
  AppSettings,
  CheckoutPayload
} from '../../shared/types';

export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getAppSettings(): AppSettings {
  const db = getDatabase();
  const row = db.prepare("SELECT value_json FROM settings WHERE key = 'general'").get() as any;
  if (row && row.value_json) {
    return JSON.parse(row.value_json);
  }
  return {
    cafe_name: 'BLOCK THEORY',
    outlet_name: 'Alwarpet Flagship Store',
    address_line1: '42 Kasturi Ranga Road, Alwarpet',
    address_line2: 'Near Music Academy',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600018',
    phone: '+91 44 2499 8877',
    email: 'hello@blocktheory.in',
    gstin: '33AAAAA0000A1Z5',
    fssai: '12423000000000',
    currency_symbol: '₹',
    is_gst_registered: true,
    is_tax_inclusive: true,
    default_tax_rate: 5.0,
    thermal_printer_width: '80mm',
    printer_name: 'Default',
    auto_print_receipt: false,
    receipt_footer_msg: 'Thank you for crafting memories with BLOCK THEORY.',
    table_count: 12,
    is_demo_mode: true,
    auto_launch_with_windows: false,
  };
}

export function generateNextOrderNumber(): string {
  const db = getDatabase();
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `BT-${yy}${mm}-`;

  const lastOrder = db.prepare(`
    SELECT order_number FROM orders 
    WHERE order_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`) as { order_number: string } | undefined;

  let seq = 1;
  if (lastOrder && lastOrder.order_number) {
    const parts = lastOrder.order_number.split('-');
    if (parts.length === 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`;
}

export function generateNextInvoiceNumber(): string {
  const db = getDatabase();
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `INV/${yy}${mm}/`;

  const lastInv = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`) as { invoice_number: string } | undefined;

  let seq = 1;
  if (lastInv && lastInv.invoice_number) {
    const parts = lastInv.invoice_number.split('/');
    if (parts.length === 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`;
}

export function calculateBillingDetails(
  items: CartItem[], 
  discountAmount: number = 0, 
  isInclusive: boolean = true,
  isInterstate: boolean = false
) {
  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const itemAddonsTotal = (item.addons || []).reduce((acc, a) => acc + (a.price * a.quantity), 0);
    const itemGrossUnit = item.unit_price + itemAddonsTotal;
    const itemGrossTotal = round(itemGrossUnit * item.quantity);
    const taxRate = item.tax_rate ?? 5.0;

    let itemBase = itemGrossTotal;
    let itemTax = 0;

    if (isInclusive) {
      itemBase = round(itemGrossTotal / (1 + taxRate / 100));
      itemTax = round(itemGrossTotal - itemBase);
    } else {
      itemBase = itemGrossTotal;
      itemTax = round(itemGrossTotal * (taxRate / 100));
    }

    subtotal = round(subtotal + itemBase);
    totalTax = round(totalTax + itemTax);
  }

  const discount = Math.min(round(discountAmount), subtotal + totalTax);
  let finalTotal = isInclusive 
    ? round(items.reduce((acc, it) => {
        const itemAddonsTotal = (it.addons || []).reduce((a, ad) => a + (ad.price * ad.quantity), 0);
        return acc + ((it.unit_price + itemAddonsTotal) * it.quantity);
      }, 0) - discount)
    : round(subtotal + totalTax - discount);

  if (finalTotal < 0) finalTotal = 0;

  // Split tax
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = totalTax;
  } else {
    cgst = round(totalTax / 2);
    sgst = round(totalTax - cgst);
  }

  return {
    subtotal,
    taxAmount: totalTax,
    cgst,
    sgst,
    igst,
    discountAmount: discount,
    totalAmount: finalTotal,
  };
}

export function processCheckout(payload: CheckoutPayload): { success: boolean; orderId?: number; orderNumber?: string; invoiceId?: number; error?: string } {
  const db = getDatabase();
  const settings = getAppSettings();

  if (!payload.items || payload.items.length === 0) {
    return { success: false, error: 'Cannot process an empty cart.' };
  }

  const totals = calculateBillingDetails(
    payload.items, 
    payload.discountAmount, 
    settings.is_tax_inclusive, 
    payload.isInterstate || false
  );

  const totalPaid = payload.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  if (totalPaid < totals.totalAmount - 0.05) { // allow 5 paisa rounding tolerance
    return { 
      success: false, 
      error: `Payment amount ₹${totalPaid} is less than total amount ₹${totals.totalAmount}.` 
    };
  }

  const orderNumber = generateNextOrderNumber();
  const invoiceNumber = generateNextInvoiceNumber();

  const checkoutTx = db.transaction(() => {
    // 1. Insert Order
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, order_type, table_number, customer_id, cashier_id,
        status, subtotal, discount_amount, discount_reason,
        tax_amount, cgst_amount, sgst_amount, igst_amount, total_amount,
        payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderRes = insertOrder.run(
      orderNumber,
      payload.orderType,
      payload.tableNumber || null,
      payload.customerId || null,
      payload.cashierId,
      'new',
      totals.subtotal,
      totals.discountAmount,
      payload.discountReason || null,
      totals.taxAmount,
      totals.cgst,
      totals.sgst,
      totals.igst,
      totals.totalAmount,
      'paid',
      payload.notes || null
    );

    const orderId = orderRes.lastInsertRowid as number;

    // 2. Insert Order Items & Addons + Recipe Deductions
    const insertItem = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, variant_id, product_name, variant_name,
        quantity, unit_price, tax_rate, tax_amount, total_price,
        notes, station, prep_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    const insertItemAddon = db.prepare(`
      INSERT INTO order_item_addons (order_item_id, addon_name, price, quantity)
      VALUES (?, ?, ?, ?)
    `);

    const getRecipes = db.prepare(`
      SELECT ingredient_id, quantity_required 
      FROM recipes 
      WHERE product_id = ? AND (variant_id IS NULL OR variant_id = ?)
    `);

    const deductStock = db.prepare(`
      UPDATE ingredients 
      SET current_stock = current_stock - ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    const insertMovement = db.prepare(`
      INSERT INTO stock_movements (
        ingredient_id, movement_type, quantity, unit, reason, reference_id, user_id
      ) VALUES (?, 'sale_deduction', ?, (SELECT unit FROM ingredients WHERE id = ?), ?, ?, ?)
    `);

    for (const item of payload.items) {
      const itemAddonsTotal = (item.addons || []).reduce((acc, a) => acc + (a.price * a.quantity), 0);
      const grossUnitPrice = item.unit_price + itemAddonsTotal;
      const grossTotalPrice = round(grossUnitPrice * item.quantity);
      const itemTax = settings.is_tax_inclusive
        ? round(grossTotalPrice - (grossTotalPrice / (1 + item.tax_rate / 100)))
        : round(grossTotalPrice * (item.tax_rate / 100));

      const itemRes = insertItem.run(
        orderId,
        item.product_id,
        item.variant_id || null,
        item.name,
        item.variant_name || null,
        item.quantity,
        grossUnitPrice,
        item.tax_rate,
        itemTax,
        grossTotalPrice,
        item.notes || null,
        item.station || 'coffee_counter'
      );

      const orderItemId = itemRes.lastInsertRowid;

      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          insertItemAddon.run(orderItemId, addon.name, addon.price, addon.quantity || 1);
        }
      }

      // Automatic Recipe Ingredient Stock Deductions
      const recipes = getRecipes.all(item.product_id, item.variant_id || null) as { ingredient_id: number; quantity_required: number }[];
      for (const recipe of recipes) {
        const totalDeduction = round(recipe.quantity_required * item.quantity);
        deductStock.run(totalDeduction, recipe.ingredient_id);
        insertMovement.run(
          recipe.ingredient_id,
          totalDeduction,
          recipe.ingredient_id,
          `Sale of ${item.quantity}x ${item.name}`,
          orderNumber,
          payload.cashierId
        );
      }
    }

    // 3. Record Payments
    const insertPayment = db.prepare(`
      INSERT INTO payments (
        order_id, payment_method, amount, status, reference_number, notes
      ) VALUES (?, ?, ?, 'completed', ?, ?)
    `);

    for (const p of payload.payments) {
      insertPayment.run(
        orderId,
        p.paymentMethod,
        p.amount,
        p.referenceNumber || null,
        p.notes || null
      );
    }

    // 4. Generate Invoice
    const primaryMethod = payload.payments.length === 1 
      ? payload.payments[0].paymentMethod 
      : 'split';

    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        invoice_number, order_id, order_number, order_type, table_number,
        gstin, business_name, business_address, customer_name, customer_phone,
        subtotal, discount_amount, cgst, sgst, igst, total_amount, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const invRes = insertInvoice.run(
      invoiceNumber,
      orderId,
      orderNumber,
      payload.orderType,
      payload.tableNumber || null,
      settings.gstin,
      settings.cafe_name,
      `${settings.address_line1}, ${settings.city}`,
      payload.customerName || null,
      payload.customerPhone || null,
      totals.subtotal,
      totals.discountAmount,
      totals.cgst,
      totals.sgst,
      totals.igst,
      totals.totalAmount,
      primaryMethod
    );

    const invoiceId = invRes.lastInsertRowid as number;

    // 5. Update Customer stats & Loyalty Points (1 point per ₹20 spent)
    if (payload.customerId) {
      const earnedPoints = Math.floor(totals.totalAmount / 20);
      db.prepare(`
        UPDATE customers 
        SET 
          loyalty_points = loyalty_points + ?,
          total_spent = total_spent + ?,
          visit_count = visit_count + 1,
          last_visit = datetime('now', 'localtime')
        WHERE id = ?
      `).run(earnedPoints, totals.totalAmount, payload.customerId);
    }

    // 6. Audit Log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'ORDER_CREATED', 'ORDER', ?, ?)
    `).run(
      payload.cashierId,
      orderNumber,
      `Completed order for ₹${totals.totalAmount} (${primaryMethod.toUpperCase()})`
    );

    return { orderId, orderNumber, invoiceId };
  });

  try {
    const result = checkoutTx();
    return {
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      invoiceId: result.invoiceId,
    };
  } catch (error: any) {
    console.error('Checkout transaction failed:', error);
    return { success: false, error: `Checkout transaction failed: ${error.message}` };
  }
}

export function holdCurrentOrder(
  cart: CartItem[], 
  cashierId: number, 
  orderType: OrderType, 
  tableNumber?: string,
  customerName?: string,
  customerPhone?: string,
  notes?: string
): { success: boolean; heldOrderNumber?: string; error?: string } {
  const db = getDatabase();
  if (!cart || cart.length === 0) {
    return { success: false, error: 'Cannot hold an empty cart.' };
  }

  const orderNumber = `HOLD-${Date.now().toString().slice(-6)}`;
  try {
    db.prepare(`
      INSERT INTO held_orders (
        order_number, cart_json, cashier_id, customer_name, customer_phone,
        table_number, order_type, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber,
      JSON.stringify(cart),
      cashierId,
      customerName || null,
      customerPhone || null,
      tableNumber || null,
      orderType,
      notes || null
    );

    return { success: true, heldOrderNumber: orderNumber };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function listHeldOrders(): HeldOrder[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT h.*, u.name as cashier_name 
    FROM held_orders h
    JOIN users u ON h.cashier_id = u.id
    ORDER BY h.id DESC
  `).all() as HeldOrder[];
}

export function resumeHeldOrder(id: number): { success: boolean; heldOrder?: HeldOrder; error?: string } {
  const db = getDatabase();
  const held = db.prepare('SELECT * FROM held_orders WHERE id = ?').get(id) as HeldOrder | undefined;
  if (!held) {
    return { success: false, error: 'Held order not found.' };
  }

  // Delete held record once resumed
  db.prepare('DELETE FROM held_orders WHERE id = ?').run(id);
  return { success: true, heldOrder: held };
}

export function deleteHeldOrder(id: number): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM held_orders WHERE id = ?').run(id);
  return res.changes > 0;
}
