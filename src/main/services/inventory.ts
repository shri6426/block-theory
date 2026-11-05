import { getDatabase } from '../db/client';
import type { Ingredient, StockMovement, Purchase, PurchaseItem } from '../../shared/types';

export function getAllIngredients(): Ingredient[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT i.*, s.name as supplier_name
    FROM ingredients i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    ORDER BY i.name ASC
  `).all() as Ingredient[];
}

export function adjustStock(
  ingredientId: number,
  quantityChange: number,
  reason: string,
  userId: number,
  type: 'manual_adjustment' | 'wastage' = 'manual_adjustment'
): { success: boolean; error?: string } {
  const db = getDatabase();
  if (!reason || reason.trim() === '') {
    return { success: false, error: 'A valid reason is required for stock adjustments.' };
  }

  const ing = db.prepare('SELECT current_stock, unit, name FROM ingredients WHERE id = ?').get(ingredientId) as any;
  if (!ing) {
    return { success: false, error: 'Ingredient not found.' };
  }

  const newStock = ing.current_stock + quantityChange;
  if (newStock < 0) {
    return { success: false, error: `Insufficient stock. Current stock is ${ing.current_stock} ${ing.unit}.` };
  }

  const runTx = db.transaction(() => {
    db.prepare(`
      UPDATE ingredients 
      SET current_stock = ?, updated_at = datetime('now', 'localtime') 
      WHERE id = ?
    `).run(newStock, ingredientId);

    db.prepare(`
      INSERT INTO stock_movements (
        ingredient_id, movement_type, quantity, unit, reason, user_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      ingredientId,
      type,
      Math.abs(quantityChange),
      ing.unit,
      reason,
      userId
    );

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'STOCK_ADJUSTMENT', 'INVENTORY', ?, ?)
    `).run(
      userId,
      ingredientId.toString(),
      `${type.toUpperCase()}: ${quantityChange > 0 ? '+' : ''}${quantityChange} ${ing.unit} (${ing.name}) - Reason: ${reason}`
    );
  });

  try {
    runTx();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function recordPurchase(
  supplierId: number,
  invoiceNumber: string,
  purchaseDate: string,
  items: PurchaseItem[],
  notes: string | undefined,
  userId: number
): { success: boolean; purchaseId?: number; error?: string } {
  const db = getDatabase();
  if (!items || items.length === 0) {
    return { success: false, error: 'No items provided for purchase entry.' };
  }

  const totalAmount = items.reduce((acc, it) => acc + (it.total_cost || it.quantity * it.unit_cost), 0);

  const runTx = db.transaction(() => {
    const pRes = db.prepare(`
      INSERT INTO purchases (supplier_id, invoice_number, total_amount, purchase_date, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(supplierId, invoiceNumber, totalAmount, purchaseDate || new Date().toISOString(), notes || null);

    const purchaseId = pRes.lastInsertRowid as number;

    const insertPItem = db.prepare(`
      INSERT INTO purchase_items (purchase_id, ingredient_id, quantity, unit_cost, total_cost)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateIngStock = db.prepare(`
      UPDATE ingredients 
      SET current_stock = current_stock + ?, cost_per_unit = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);

    const insertMov = db.prepare(`
      INSERT INTO stock_movements (
        ingredient_id, movement_type, quantity, unit, reason, reference_id, user_id
      ) VALUES (?, 'purchase', ?, (SELECT unit FROM ingredients WHERE id = ?), ?, ?, ?)
    `);

    for (const item of items) {
      const itemCost = item.total_cost || item.quantity * item.unit_cost;
      insertPItem.run(purchaseId, item.ingredient_id, item.quantity, item.unit_cost, itemCost);
      updateIngStock.run(item.quantity, item.unit_cost, item.ingredient_id);
      insertMov.run(
        item.ingredient_id,
        item.quantity,
        item.ingredient_id,
        `Supplier Purchase Inv #${invoiceNumber}`,
        `PO-${purchaseId}`,
        userId
      );
    }

    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
      VALUES (?, 'PURCHASE_ENTRY', 'PURCHASES', ?, ?)
    `).run(
      userId,
      purchaseId.toString(),
      `Recorded purchase entry #${invoiceNumber} for ₹${totalAmount}`
    );

    return purchaseId;
  });

  try {
    const purchaseId = runTx();
    return { success: true, purchaseId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function getStockMovements(limit: number = 100): StockMovement[] {
  const db = getDatabase();
  return db.prepare(`
    SELECT sm.*, i.name as ingredient_name, u.name as user_name
    FROM stock_movements sm
    JOIN ingredients i ON sm.ingredient_id = i.id
    JOIN users u ON sm.user_id = u.id
    ORDER BY sm.created_at DESC
    LIMIT ?
  `).all(limit) as StockMovement[];
}

export function getPurchasesHistory(limit: number = 50): Purchase[] {
  const db = getDatabase();
  const purchases = db.prepare(`
    SELECT p.*, s.name as supplier_name
    FROM purchases p
    JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.purchase_date DESC
    LIMIT ?
  `).all(limit) as Purchase[];

  const getItemStmt = db.prepare(`
    SELECT pi.*, i.name as ingredient_name, i.unit as unit
    FROM purchase_items pi
    JOIN ingredients i ON pi.ingredient_id = i.id
    WHERE pi.purchase_id = ?
  `);

  for (const p of purchases) {
    p.items = getItemStmt.all(p.id) as any;
  }

  return purchases;
}

