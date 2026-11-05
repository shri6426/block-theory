import type Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

export function seedDatabase(db: Database.Database, force: boolean = false): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0 && !force) {
    return;
  }

  const runTx = db.transaction(() => {
    if (force) {
      // Clear demo data without dropping schema
      db.prepare('DELETE FROM order_item_addons').run();
      db.prepare('DELETE FROM order_items').run();
      db.prepare('DELETE FROM payments').run();
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM orders').run();
      db.prepare('DELETE FROM held_orders').run();
      db.prepare('DELETE FROM purchase_items').run();
      db.prepare('DELETE FROM purchases').run();
      db.prepare('DELETE FROM stock_movements').run();
      db.prepare('DELETE FROM recipes').run();
      db.prepare('DELETE FROM product_addons').run();
      db.prepare('DELETE FROM product_variants').run();
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM ingredients').run();
      db.prepare('DELETE FROM suppliers').run();
      db.prepare('DELETE FROM customers').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM users').run();
      db.prepare('DELETE FROM tax_configs').run();
    }

    // 1. Staff Users
    const saltRounds = 10;
    const adminPass = bcrypt.hashSync('admin123', saltRounds);
    const adminPin = bcrypt.hashSync('1111', saltRounds);
    const mgrPass = bcrypt.hashSync('manager123', saltRounds);
    const mgrPin = bcrypt.hashSync('2222', saltRounds);
    const cashPass = bcrypt.hashSync('cashier123', saltRounds);
    const cashPin = bcrypt.hashSync('3333', saltRounds);
    const kitPass = bcrypt.hashSync('kitchen123', saltRounds);
    const kitPin = bcrypt.hashSync('4444', saltRounds);

    const insertUser = db.prepare(`
      INSERT INTO users (username, name, password_hash, pin_hash, role, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const ownerRes = insertUser.run('admin', 'Vignesh Raman (Owner)', adminPass, adminPin, 'OWNER', '9840123456');
    insertUser.run('manager', 'Karthik S (Store Manager)', mgrPass, mgrPin, 'MANAGER', '9840123457');
    insertUser.run('cashier', 'Divya M (Lead Cashier)', cashPass, cashPin, 'CASHIER', '9840123458');
    insertUser.run('kitchen', 'Arun Barista (Head Prep)', kitPass, kitPin, 'KITCHEN_STAFF', '9840123459');

    // 2. Default Tax Configurations
    const insertTax = db.prepare(`
      INSERT INTO tax_configs (name, cgst_rate, sgst_rate, igst_rate, is_inclusive, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    insertTax.run('GST 5% (Restaurant - Composite/Regular)', 2.5, 2.5, 5.0, 1);
    insertTax.run('GST 12% (Packaged Snacks/Syrups)', 6.0, 6.0, 12.0, 1);
    insertTax.run('GST 18% (Speciality Merchandise/Equipment)', 9.0, 9.0, 18.0, 1);

    // 3. Default Settings
    const defaultSettings = {
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
      printer_name: 'Microsoft Print to PDF',
      auto_print_receipt: false,
      receipt_footer_msg: 'Thank you for crafting memories with BLOCK THEORY.',
      table_count: 12,
      is_demo_mode: true,
      auto_launch_with_windows: false,
    };

    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)');
    insertSetting.run('general', JSON.stringify(defaultSettings));

    // 4. Categories
    const insertCategory = db.prepare('INSERT INTO categories (name, code, display_order, icon) VALUES (?, ?, ?, ?)');
    const catEspresso = insertCategory.run('Espresso', 'espresso', 1, 'Flame').lastInsertRowid;
    const catHot = insertCategory.run('Hot Coffee', 'hot_coffee', 2, 'Coffee').lastInsertRowid;
    const catCold = insertCategory.run('Cold Coffee', 'cold_coffee', 3, 'GlassWater').lastInsertRowid;
    const catTea = insertCategory.run('Tea', 'tea', 4, 'CupSoda').lastInsertRowid;
    const catNonCoffee = insertCategory.run('Non-Coffee Drinks', 'non_coffee', 5, 'Milk').lastInsertRowid;
    const catFood = insertCategory.run('Food', 'food', 6, 'Utensils').lastInsertRowid;
    const catDesserts = insertCategory.run('Desserts', 'desserts', 7, 'CakeSlice').lastInsertRowid;
    const catSpecials = insertCategory.run('Specials', 'specials', 8, 'Sparkles').lastInsertRowid;

    // 5. Suppliers
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email, address, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const sup1 = insertSupplier.run(
      'Chikmagalur Artisanal Roasters',
      'Manish Rao',
      '+91 98860 11223',
      'orders@chikbeans.in',
      'Estate No. 4, Bababudangiri Range, Karnataka',
      'Speciality AAA Grade Single Origin Arabica Beans'
    ).lastInsertRowid;

    const sup2 = insertSupplier.run(
      'Nilgiris Fresh Organics',
      'Sundar Pichai',
      '+91 94430 44556',
      'dairy@nilgirisdairy.com',
      'Ooty Valley Farms, Tamil Nadu',
      'Fresh whole milk and rich butter delivery daily'
    ).lastInsertRowid;

    const sup3 = insertSupplier.run(
      'Chennai Bakeries & Provisions',
      'Fathima Beevi',
      '+91 98410 77889',
      'supplies@chennaibakes.in',
      'Wholesale Bazaar, George Town, Chennai',
      'Artisan sourdough, French butter croissants, cocoa'
    ).lastInsertRowid;

    // 6. Ingredients
    const insertIng = db.prepare(`
      INSERT INTO ingredients (name, code, current_stock, min_stock, unit, cost_per_unit, supplier_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const ingBeans = insertIng.run('Speciality Arabica Coffee Beans', 'ING-BEAN', 15000, 2000, 'g', 1.8, sup1).lastInsertRowid;
    const ingMilk = insertIng.run('Farm Fresh Whole Milk', 'ING-MILK', 25000, 5000, 'ml', 0.08, sup2).lastInsertRowid;
    const ingOatMilk = insertIng.run('Barista Oat Milk', 'ING-OAT', 10000, 2000, 'ml', 0.28, sup3).lastInsertRowid;
    const ingMatcha = insertIng.run('Uji Ceremonial Matcha Powder', 'ING-MATCHA', 1500, 300, 'g', 4.5, sup3).lastInsertRowid;
    const ingCocoa = insertIng.run('Belgian Dark Cocoa Powder', 'ING-COCOA', 2500, 500, 'g', 1.5, sup3).lastInsertRowid;
    const ingSugar = insertIng.run('Organic Demerara Brown Sugar', 'ING-SUGAR', 20000, 3000, 'g', 0.07, sup3).lastInsertRowid;
    const ingVanilla = insertIng.run('Madagascar Vanilla Bean Syrup', 'ING-VANILLA', 4000, 1000, 'ml', 0.9, sup3).lastInsertRowid;
    const ingCroissant = insertIng.run('French Butter Croissant (Raw Par-baked)', 'ING-CRSN', 45, 10, 'pcs', 60.0, sup3).lastInsertRowid;
    const ingBrownie = insertIng.run('Fudge Brownie Base', 'ING-BRWN', 35, 10, 'pcs', 45.0, sup3).lastInsertRowid;
    const ingBread = insertIng.run('Artisan Sourdough Loaf Slices', 'ING-BREAD', 60, 15, 'pcs', 12.0, sup3).lastInsertRowid;
    const ingCheese = insertIng.run('Aged Cheddar & Mozzarella Blend', 'ING-CHEESE', 3000, 500, 'g', 0.95, sup2).lastInsertRowid;

    // Initial stock movement logs
    const insertMov = db.prepare(`
      INSERT INTO stock_movements (ingredient_id, movement_type, quantity, unit, reason, user_id)
      VALUES (?, 'purchase', ?, ?, 'Initial inventory stock intake', ?)
    `);
    insertMov.run(ingBeans, 15000, 'g', ownerRes.lastInsertRowid);
    insertMov.run(ingMilk, 25000, 'ml', ownerRes.lastInsertRowid);
    insertMov.run(ingOatMilk, 10000, 'ml', ownerRes.lastInsertRowid);
    insertMov.run(ingCroissant, 45, 'pcs', ownerRes.lastInsertRowid);

    // 7. Products (Matching prompt sample menu)
    const insertProd = db.prepare(`
      INSERT INTO products (category_id, name, description, base_price, hsn_code, tax_rate, station, is_active)
      VALUES (?, ?, ?, ?, ?, 5.0, ?, 1)
    `);

    const insertVar = db.prepare(`
      INSERT INTO product_variants (product_id, name, price_adjustment)
      VALUES (?, ?, ?)
    `);

    const insertAddon = db.prepare(`
      INSERT INTO product_addons (product_id, name, price, max_quantity)
      VALUES (?, ?, ?, 3)
    `);

    const insertRecipe = db.prepare(`
      INSERT INTO recipes (product_id, variant_id, ingredient_id, quantity_required)
      VALUES (?, ?, ?, ?)
    `);

    // Helper to add coffee variants & addons
    const setupCoffeeExtras = (prodId: number | bigint) => {
      insertVar.run(prodId, 'Regular (240ml)', 0);
      insertVar.run(prodId, 'Large (360ml)', 40);

      insertAddon.run(prodId, 'Extra Espresso Shot', 35);
      insertAddon.run(prodId, 'Oat Milk Sub', 45);
      insertAddon.run(prodId, 'Madagascar Vanilla Syrup', 25);
      insertAddon.run(prodId, 'Less Sugar', 0);
      insertAddon.run(prodId, 'No Sugar', 0);
    };

    // 1. Espresso — ₹100
    const pEspresso = insertProd.run(catEspresso, 'Espresso', 'Double ristretto extracted at 9 bars, notes of dark chocolate & orange peel.', 100, '2101', 'coffee_counter').lastInsertRowid;
    insertAddon.run(pEspresso, 'Extra Espresso Shot', 35);
    insertRecipe.run(pEspresso, null, ingBeans, 18);

    // 2. Americano — ₹120
    const pAmericano = insertProd.run(catHot, 'Americano', 'Double espresso diluted over hot filtered water, rich crema.', 120, '2101', 'coffee_counter').lastInsertRowid;
    setupCoffeeExtras(pAmericano);
    insertRecipe.run(pAmericano, null, ingBeans, 18);

    // 3. Cappuccino — ₹150
    const pCappuccino = insertProd.run(catHot, 'Cappuccino', 'Equal thirds of rich espresso, steamed whole milk and velvety microfoam.', 150, '2101', 'coffee_counter').lastInsertRowid;
    setupCoffeeExtras(pCappuccino);
    insertRecipe.run(pCappuccino, null, ingBeans, 18);
    insertRecipe.run(pCappuccino, null, ingMilk, 150);

    // 4. Café Latte — ₹160
    const pLatte = insertProd.run(catHot, 'Café Latte', 'Silky steamed milk poured over double shot espresso with subtle latte art.', 160, '2101', 'coffee_counter').lastInsertRowid;
    setupCoffeeExtras(pLatte);
    insertRecipe.run(pLatte, null, ingBeans, 18);
    insertRecipe.run(pLatte, null, ingMilk, 200);

    // 5. Cold Coffee — ₹180
    const pColdCoffee = insertProd.run(catCold, 'Cold Coffee', 'Signature Chennai style creamy blend with slow cold brew concentrate and chilled milk.', 180, '2101', 'coffee_counter').lastInsertRowid;
    setupCoffeeExtras(pColdCoffee);
    insertRecipe.run(pColdCoffee, null, ingBeans, 20);
    insertRecipe.run(pColdCoffee, null, ingMilk, 220);
    insertRecipe.run(pColdCoffee, null, ingSugar, 15);

    // 6. Iced Latte — ₹170
    const pIcedLatte = insertProd.run(catCold, 'Iced Latte', 'Chilled milk over crystalline ice blocks with float of freshly pulled espresso.', 170, '2101', 'coffee_counter').lastInsertRowid;
    setupCoffeeExtras(pIcedLatte);
    insertRecipe.run(pIcedLatte, null, ingBeans, 18);
    insertRecipe.run(pIcedLatte, null, ingMilk, 200);

    // 7. Mocha — ₹190
    const pMocha = insertProd.run(catHot, 'Mocha', 'Decadent Belgian dark chocolate ganache swirled with double espresso and steamed milk.', 190, '2101', 'coffee_counter').lastInsertRowid;
    setupCoffeeExtras(pMocha);
    insertRecipe.run(pMocha, null, ingBeans, 18);
    insertRecipe.run(pMocha, null, ingMilk, 180);
    insertRecipe.run(pMocha, null, ingCocoa, 20);

    // 8. Matcha Latte — ₹200
    const pMatcha = insertProd.run(catNonCoffee, 'Matcha Latte', 'Whisked ceremonial Uji matcha layered over velvety steamed or iced milk.', 200, '2101', 'coffee_counter').lastInsertRowid;
    insertVar.run(pMatcha, 'Hot (240ml)', 0);
    insertVar.run(pMatcha, 'Iced (350ml)', 20);
    insertAddon.run(pMatcha, 'Oat Milk Sub', 45);
    insertAddon.run(pMatcha, 'Vanilla Syrup', 25);
    insertRecipe.run(pMatcha, null, ingMatcha, 6);
    insertRecipe.run(pMatcha, null, ingMilk, 180);

    // 9. Hot Chocolate — ₹170
    const pHotChoc = insertProd.run(catNonCoffee, 'Hot Chocolate', 'Rich molten 70% dark chocolate melted into steaming full cream milk.', 170, '2101', 'coffee_counter').lastInsertRowid;
    insertVar.run(pHotChoc, 'Classic', 0);
    insertVar.run(pHotChoc, 'Sea Salt Mocha Infused', 30);
    insertAddon.run(pHotChoc, 'Marshmallow Fluff', 25);
    insertRecipe.run(pHotChoc, null, ingCocoa, 25);
    insertRecipe.run(pHotChoc, null, ingMilk, 200);

    // 10. Croissant — ₹120
    const pCroissant = insertProd.run(catDesserts, 'Croissant', 'Warm flaky 72-layer butter croissant baked fresh in-house.', 120, '1905', 'food_counter').lastInsertRowid;
    insertAddon.run(pCroissant, 'Nutella Drizzle', 35);
    insertAddon.run(pCroissant, 'Whipped Butter & Jam', 25);
    insertRecipe.run(pCroissant, null, ingCroissant, 1);

    // 11. Brownie — ₹100
    const pBrownie = insertProd.run(catDesserts, 'Brownie', 'Dense espresso-infused dark chocolate fudge brownie with crisp crackly crust.', 100, '1905', 'food_counter').lastInsertRowid;
    insertAddon.run(pBrownie, 'Vanilla Gelato Scoop', 60);
    insertRecipe.run(pBrownie, null, ingBrownie, 1);

    // 12. Grilled Sandwich — ₹180
    const pSandwich = insertProd.run(catFood, 'Grilled Sandwich', 'Panini pressed sourdough stuffed with molten aged cheddar, mozzarella and basil pesto.', 180, '2106', 'food_counter').lastInsertRowid;
    insertVar.run(pSandwich, 'Four Cheese Classic', 0);
    insertVar.run(pSandwich, 'Roasted Mushroom & Thyme', 40);
    insertAddon.run(pSandwich, 'Extra Smoked Cheddar', 45);
    insertRecipe.run(pSandwich, null, ingBread, 2);
    insertRecipe.run(pSandwich, null, ingCheese, 50);

    // 8. Sample Customers
    const insertCust = db.prepare(`
      INSERT INTO customers (name, phone, email, loyalty_points, total_spent, visit_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertCust.run('Rohan Kumar', '9840011223', 'rohan@example.com', 85, 1720.0, 9, 'Prefers Iced Latte with Oat Milk, no sugar.');
    insertCust.run('Priya Sundaram', '9840022334', 'priya.s@example.com', 140, 2850.0, 14, 'Music Academy regular, loves Cappuccino.');
    insertCust.run('Vikram Ramanathan', '9840033445', 'vikram@example.com', 30, 640.0, 3, 'Takes away Grilled Sandwich on weekdays.');

    // 9. Initial Sample Expenses
    const insertExp = db.prepare(`
      INSERT INTO expenses (category, amount, description, payment_method, recorded_by, expense_date)
      VALUES (?, ?, ?, ?, ?, date('now', 'localtime'))
    `);
    insertExp.run('Ingredients', 18500, 'Weekly bulk coffee bean and oat milk order from Chikmagalur', 'upi', ownerRes.lastInsertRowid);
    insertExp.run('Electricity', 14200, 'TNEB Commercial Power Bill - Alwarpet Outlet', 'card', ownerRes.lastInsertRowid);
    insertExp.run('Packaging', 4800, 'Custom compostable cups and embossed kraft bags', 'cash', ownerRes.lastInsertRowid);

    // 10. Audit Log
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, details)
      VALUES (?, 'SYSTEM_INIT', 'SYSTEM', 'Block Theory database successfully initialized with speciality coffee menu and demo configuration.')
    `).run(ownerRes.lastInsertRowid);
  });

  runTx();
}

