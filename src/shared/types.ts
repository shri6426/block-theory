export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'KITCHEN_STAFF';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  OWNER: [
    'pos:access', 'pos:discount_any', 'pos:cancel_order', 'pos:refund',
    'orders:view', 'orders:manage',
    'kds:view', 'kds:manage',
    'menu:view', 'menu:manage', 'menu:pricing',
    'inventory:view', 'inventory:manage', 'inventory:adjust',
    'suppliers:view', 'suppliers:manage',
    'customers:view', 'customers:manage',
    'staff:view', 'staff:manage',
    'expenses:view', 'expenses:manage',
    'reports:view', 'reports:export',
    'settings:view', 'settings:manage',
    'backup:manage', 'demo:reset'
  ],
  MANAGER: [
    'pos:access', 'pos:discount_any', 'pos:cancel_order', 'pos:refund',
    'orders:view', 'orders:manage',
    'kds:view', 'kds:manage',
    'menu:view', 'menu:manage',
    'inventory:view', 'inventory:manage', 'inventory:adjust',
    'suppliers:view', 'suppliers:manage',
    'customers:view', 'customers:manage',
    'staff:view',
    'expenses:view', 'expenses:manage',
    'reports:view', 'reports:export',
    'settings:view'
  ],
  CASHIER: [
    'pos:access',
    'orders:view',
    'customers:view', 'customers:manage',
    'kds:view'
  ],
  KITCHEN_STAFF: [
    'kds:view', 'kds:manage'
  ],
};

export function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface CheckoutPayload {
  items: CartItem[];
  orderType: OrderType;
  tableNumber?: string;
  customerId?: number | null;
  customerName?: string;
  customerPhone?: string;
  cashierId: number;
  discountAmount: number;
  discountReason?: string;
  payments: {
    paymentMethod: PaymentMethod;
    amount: number;
    referenceNumber?: string;
    notes?: string;
  }[];
  notes?: string;
  isInterstate?: boolean;
}

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  is_active: number;
  has_pin: number;
  created_at: string;
  last_login?: string;
}

export interface UserSession {
  user: User;
  token: string;
}

export interface Category {
  id: number;
  name: string;
  code: string;
  display_order: number;
  is_active: number;
  icon?: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  price_adjustment: number;
  sku?: string;
}

export interface ProductAddon {
  id: number;
  product_id: number;
  name: string;
  price: number;
  max_quantity: number;
}

export interface Product {
  id: number;
  category_id: number;
  category_name?: string;
  name: string;
  description?: string;
  base_price: number;
  hsn_code: string;
  tax_rate: number;
  is_active: number;
  image_url?: string;
  station: 'coffee_counter' | 'food_counter';
  variants?: ProductVariant[];
  addons?: ProductAddon[];
  created_at: string;
  updated_at: string;
}

export type UnitType = 'g' | 'kg' | 'ml' | 'l' | 'pcs';

export interface Ingredient {
  id: number;
  name: string;
  code: string;
  current_stock: number;
  min_stock: number;
  unit: UnitType;
  cost_per_unit: number;
  supplier_id?: number;
  supplier_name?: string;
  updated_at: string;
}

export interface RecipeItem {
  id: number;
  product_id: number;
  variant_id?: number | null;
  ingredient_id: number;
  ingredient_name?: string;
  quantity_required: number;
  unit?: UnitType;
}

export type MovementType = 'purchase' | 'sale_deduction' | 'manual_adjustment' | 'wastage' | 'return';

export interface StockMovement {
  id: number;
  ingredient_id: number;
  ingredient_name?: string;
  movement_type: MovementType;
  quantity: number;
  unit: UnitType;
  reason: string;
  reference_id?: string;
  user_id: number;
  user_name?: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  created_at: string;
}

export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  invoice_number: string;
  total_amount: number;
  purchase_date: string;
  notes?: string;
  items?: PurchaseItem[];
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  notes?: string;
  created_at: string;
  last_visit?: string;
}

export type OrderType = 'dine_in' | 'takeaway' | 'pickup';
export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'partially_paid' | 'refunded';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split';
export type PrepStatus = 'pending' | 'preparing' | 'ready';

export interface CartItemAddon {
  id: number;
  addon_id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  tempId: string;
  product_id: number;
  name: string;
  variant_id?: number | null;
  variant_name?: string;
  base_price: number;
  variant_price: number;
  unit_price: number; // base + variant
  quantity: number;
  addons: CartItemAddon[];
  notes?: string;
  station: 'coffee_counter' | 'food_counter';
  hsn_code: string;
  tax_rate: number;
  item_subtotal: number;
  item_tax: number;
  item_total: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
  notes?: string;
  station: 'coffee_counter' | 'food_counter';
  prep_status: PrepStatus;
  addons?: {
    id: number;
    addon_name: string;
    price: number;
  }[];
}

export interface PaymentRecord {
  id: number;
  order_id: number;
  payment_method: PaymentMethod;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  order_type: OrderType;
  table_number?: string;
  customer_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  cashier_id: number;
  cashier_name?: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  discount_reason?: string;
  tax_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  notes?: string;
  items?: OrderItem[];
  payments?: PaymentRecord[];
  created_at: string;
  updated_at: string;
}

export interface HeldOrder {
  id: number;
  order_number: string;
  cart_json: string;
  cashier_id: number;
  cashier_name?: string;
  customer_name?: string;
  customer_phone?: string;
  table_number?: string;
  order_type: OrderType;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  order_id: number;
  order_number: string;
  order_type: OrderType;
  table_number?: string;
  gstin: string;
  business_name: string;
  business_address: string;
  customer_name?: string;
  customer_phone?: string;
  customer_gstin?: string;
  subtotal: number;
  discount_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_amount: number;
  payment_method: PaymentMethod;
  printed_count: number;
  created_at: string;
  items?: OrderItem[];
}

export type ExpenseCategory = 
  | 'Rent' 
  | 'Electricity' 
  | 'Ingredients' 
  | 'Salaries' 
  | 'Maintenance' 
  | 'Packaging' 
  | 'Marketing' 
  | 'Miscellaneous';

export interface Expense {
  id: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  payment_method: string;
  recorded_by: number;
  recorder_name?: string;
  expense_date: string;
  receipt_url?: string;
  created_at: string;
}

export interface TaxConfig {
  id: number;
  name: string;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  is_inclusive: number;
  is_active: number;
}

export interface AppSettings {
  cafe_name: string;
  outlet_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  fssai: string;
  currency_symbol: string;
  is_gst_registered: boolean;
  is_tax_inclusive: boolean;
  default_tax_rate: number; // e.g. 5 for 5% GST
  thermal_printer_width: '58mm' | '80mm';
  printer_name: string;
  auto_print_receipt: boolean;
  receipt_footer_msg: string;
  table_count: number;
  is_demo_mode: boolean;
  auto_launch_with_windows: boolean;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name?: string;
  action: string;
  entity: string;
  entity_id?: string;
  details: string;
  created_at: string;
}

export interface DashboardMetrics {
  gross_sales: number;
  net_sales: number;
  order_count: number;
  average_order_value: number;
  total_discounts: number;
  gst_collected: number;
  estimated_gross_profit: number;
  total_expenses: number;
  best_selling_products: {
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }[];
  sales_by_category: {
    category_name: string;
    total_amount: number;
    order_count: number;
  }[];
  hourly_sales: {
    hour: string;
    sales: number;
    orders: number;
  }[];
  recent_orders: Order[];
  low_stock_alerts: {
    ingredient_name: string;
    current_stock: number;
    min_stock: number;
    unit: UnitType;
  }[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
