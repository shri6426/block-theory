import { getDatabase } from '../db/client';
import type { OrderStatus, PrepStatus } from '../../shared/types';

export interface KDSTicketItem {
  id: number;
  product_id: number;
  product_name: string;
  variant_name?: string;
  quantity: number;
  notes?: string;
  station: 'coffee_counter' | 'food_counter';
  prep_status: PrepStatus;
  addons?: {
    name: string;
    quantity: number;
  }[];
}

export interface KDSTicket {
  order_id: number;
  order_number: string;
  order_type: 'dine_in' | 'takeaway' | 'pickup';
  table_number?: string;
  customer_name?: string;
  status: OrderStatus;
  created_at: string;
  notes?: string;
  items: KDSTicketItem[];
  elapsed_minutes: number;
}

export function getActiveKDSTickets(stationFilter?: 'coffee_counter' | 'food_counter' | 'all'): KDSTicket[] {
  const db = getDatabase();

  const orders = db.prepare(`
    SELECT id, order_number, order_type, table_number, status, created_at, notes,
           (strftime('%s', 'now') - strftime('%s', created_at)) / 60 as elapsed_minutes
    FROM orders
    WHERE status IN ('new', 'accepted', 'preparing', 'ready')
    ORDER BY created_at ASC
  `).all() as any[];

  const itemQuery = db.prepare(`
    SELECT oi.id, oi.product_id, oi.product_name, oi.variant_name, oi.quantity, oi.notes, oi.station, oi.prep_status
    FROM order_items oi
    WHERE oi.order_id = ?
    ${stationFilter && stationFilter !== 'all' ? 'AND oi.station = ?' : ''}
    ORDER BY oi.id ASC
  `);

  const addonQuery = db.prepare(`
    SELECT addon_name as name, quantity
    FROM order_item_addons
    WHERE order_item_id = ?
  `);

  const tickets: KDSTicket[] = [];

  for (const o of orders) {
    const items = (stationFilter && stationFilter !== 'all' 
      ? itemQuery.all(o.id, stationFilter)
      : itemQuery.all(o.id)) as any[];

    if (items.length === 0) continue; // No items for this station in this order

    for (const it of items) {
      it.addons = addonQuery.all(it.id);
    }

    tickets.push({
      order_id: o.id,
      order_number: o.order_number,
      order_type: o.order_type,
      table_number: o.table_number,
      customer_name: o.customer_name,
      status: o.status,
      created_at: o.created_at,
      notes: o.notes,
      items,
      elapsed_minutes: Math.max(0, Math.floor(o.elapsed_minutes || 0)),
    });
  }

  return tickets;
}

export function updateOrderItemStatus(itemId: number, newStatus: PrepStatus): { success: boolean; allItemsReady?: boolean; error?: string } {
  const db = getDatabase();

  const item = db.prepare('SELECT order_id FROM order_items WHERE id = ?').get(itemId) as { order_id: number } | undefined;
  if (!item) {
    return { success: false, error: 'Order item not found.' };
  }

  const runTx = db.transaction(() => {
    db.prepare('UPDATE order_items SET prep_status = ? WHERE id = ?').run(newStatus, itemId);

    // Check if all items in this order are ready
    const pendingCount = db.prepare(`
      SELECT COUNT(*) as count 
      FROM order_items 
      WHERE order_id = ? AND prep_status != 'ready'
    `).get(item.order_id) as { count: number };

    const allReady = pendingCount.count === 0;

    if (allReady) {
      db.prepare("UPDATE orders SET status = 'ready', updated_at = datetime('now', 'localtime') WHERE id = ?").run(item.order_id);
    } else {
      // If at least one is preparing or ready, mark order as preparing
      const preparingCount = db.prepare(`
        SELECT COUNT(*) as count 
        FROM order_items 
        WHERE order_id = ? AND prep_status IN ('preparing', 'ready')
      `).get(item.order_id) as { count: number };

      if (preparingCount.count > 0) {
        db.prepare("UPDATE orders SET status = 'preparing', updated_at = datetime('now', 'localtime') WHERE id = ?").run(item.order_id);
      }
    }

    return allReady;
  });

  try {
    const allReady = runTx();
    return { success: true, allItemsReady: allReady };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function updateOrderStatus(orderId: number, newStatus: OrderStatus): { success: boolean; error?: string } {
  const db = getDatabase();
  try {
    const runTx = db.transaction(() => {
      db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(newStatus, orderId);

      if (newStatus === 'ready') {
        db.prepare("UPDATE order_items SET prep_status = 'ready' WHERE order_id = ?").run(orderId);
      } else if (newStatus === 'preparing') {
        db.prepare("UPDATE order_items SET prep_status = 'preparing' WHERE order_id = ? AND prep_status = 'pending'").run(orderId);
      }
    });

    runTx();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

