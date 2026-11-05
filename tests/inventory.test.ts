import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { seedDatabase } from '../src/main/db/seed';

describe('Inventory & Recipe Deductions', () => {
  let db: Database.Database;
  const testDbPath = path.join(__dirname, 'test_inventory.db');

  beforeAll(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    db = new Database(testDbPath);
    db.pragma('foreign_keys = ON');

    // Run schema
    const schemaSql = fs.readFileSync(path.join(__dirname, '../src/main/db/schema.sql'), 'utf8');
    db.exec(schemaSql);
    seedDatabase(db, false);
  });

  afterAll(() => {
    if (db) db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('should have initial seed ingredients with healthy stock', () => {
    const coffeeBeans = db.prepare("SELECT * FROM ingredients WHERE code = 'ING-BEAN'").get() as any;
    expect(coffeeBeans).toBeDefined();
    expect(coffeeBeans.current_stock).toBe(15000); // 15kg in grams
    expect(coffeeBeans.unit).toBe('g');

    const wholeMilk = db.prepare("SELECT * FROM ingredients WHERE code = 'ING-MILK'").get() as any;
    expect(wholeMilk).toBeDefined();
    expect(wholeMilk.current_stock).toBe(25000); // 25L in ml
  });

  it('should deduct exact recipe ingredients when an order is settled', () => {
    // 1. Get initial coffee beans and milk
    const initialBeans = db.prepare("SELECT current_stock FROM ingredients WHERE code = 'ING-BEAN'").get() as any;
    const initialMilk = db.prepare("SELECT current_stock FROM ingredients WHERE code = 'ING-MILK'").get() as any;

    // 2. Iced Latte recipe requires: 18g beans, 200ml milk
    // Simulate selling 2x Iced Latte
    const orderQty = 2;
    const expectedBeanDeduction = 18 * orderQty; // 36g
    const expectedMilkDeduction = 200 * orderQty; // 400ml

    const pIcedLatte = db.prepare("SELECT id FROM products WHERE name = 'Iced Latte'").get() as any;
    const recipes = db.prepare("SELECT * FROM recipes WHERE product_id = ?").all(pIcedLatte.id) as any[];

    expect(recipes.length).toBeGreaterThanOrEqual(2);

    const runSale = db.transaction(() => {
      for (const r of recipes) {
        const toDeduct = r.quantity_required * orderQty;
        db.prepare("UPDATE ingredients SET current_stock = current_stock - ? WHERE id = ?").run(toDeduct, r.ingredient_id);
        db.prepare(`
          INSERT INTO stock_movements (ingredient_id, movement_type, quantity, unit, reason, user_id)
          VALUES (?, 'sale_deduction', ?, (SELECT unit FROM ingredients WHERE id = ?), 'Sale deduction test', 1)
        `).run(r.ingredient_id, toDeduct, r.ingredient_id);
      }
    });

    runSale();

    const afterBeans = db.prepare("SELECT current_stock FROM ingredients WHERE code = 'ING-BEAN'").get() as any;
    const afterMilk = db.prepare("SELECT current_stock FROM ingredients WHERE code = 'ING-MILK'").get() as any;

    expect(afterBeans.current_stock).toBe(initialBeans.current_stock - expectedBeanDeduction);
    expect(afterMilk.current_stock).toBe(initialMilk.current_stock - expectedMilkDeduction);
  });

  it('should record an audit entry in stock_movements on manual adjustment', () => {
    const ing = db.prepare("SELECT id, current_stock, unit FROM ingredients WHERE code = 'ING-CRSN'").get() as any;
    const initialQty = ing.current_stock;
    const wastageQty = 5;

    // Record wastage
    const runWastage = db.transaction(() => {
      db.prepare("UPDATE ingredients SET current_stock = current_stock - ? WHERE id = ?").run(wastageQty, ing.id);
      db.prepare(`
        INSERT INTO stock_movements (ingredient_id, movement_type, quantity, unit, reason, user_id)
        VALUES (?, 'wastage', ?, ?, 'Burnt in convection oven during peak morning shift', 1)
      `).run(ing.id, wastageQty, ing.unit);
    });

    runWastage();

    const updated = db.prepare("SELECT current_stock FROM ingredients WHERE id = ?").get(ing.id) as any;
    expect(updated.current_stock).toBe(initialQty - wastageQty);

    const latestMovement = db.prepare("SELECT * FROM stock_movements WHERE ingredient_id = ? ORDER BY id DESC LIMIT 1").get(ing.id) as any;
    expect(latestMovement.movement_type).toBe('wastage');
    expect(latestMovement.quantity).toBe(wastageQty);
    expect(latestMovement.reason).toContain('Burnt in convection oven');
  });

  it('should detect low stock alerts when current stock falls below minimum threshold', () => {
    // Set an ingredient below its minimum threshold
    db.prepare("UPDATE ingredients SET current_stock = 100, min_stock = 500 WHERE code = 'ING-MATCHA'").run();

    const lowStock = db.prepare("SELECT * FROM ingredients WHERE current_stock <= min_stock").all() as any[];
    expect(lowStock.some(i => i.code === 'ING-MATCHA')).toBe(true);
  });
});

