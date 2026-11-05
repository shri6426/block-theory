import { contextBridge, ipcRenderer } from 'electron';
import type { 
  User, 
  CartItem, 
  OrderType, 
  OrderStatus, 
  PrepStatus, 
  Product, 
  Customer, 
  Expense, 
  AppSettings, 
  TaxConfig,
  CheckoutPayload
} from '../shared/types';

const api = {
  // Auth
  loginPassword: (payload: { username: string; password: string }) => 
    ipcRenderer.invoke('auth:login-password', payload),
  loginPin: (payload: { pin: string }) => 
    ipcRenderer.invoke('auth:login-pin', payload),
  getStaff: () => 
    ipcRenderer.invoke('auth:get-staff'),
  saveStaff: (staff: any) => 
    ipcRenderer.invoke('auth:save-staff', staff),

  // POS
  getCatalog: () => 
    ipcRenderer.invoke('pos:get-catalog'),
  checkout: (payload: CheckoutPayload) => 
    ipcRenderer.invoke('pos:checkout', payload),
  holdOrder: (payload: { 
    cart: CartItem[]; 
    cashierId: number; 
    orderType: OrderType; 
    tableNumber?: string; 
    customerName?: string; 
    customerPhone?: string; 
    notes?: string; 
  }) => ipcRenderer.invoke('pos:hold-order', payload),
  listHeldOrders: () => 
    ipcRenderer.invoke('pos:list-held'),
  resumeHeldOrder: (id: number) => 
    ipcRenderer.invoke('pos:resume-held', id),
  deleteHeldOrder: (id: number) => 
    ipcRenderer.invoke('pos:delete-held', id),

  // Orders
  listOrders: (filter?: { limit?: number; status?: string; dateFilter?: string }) => 
    ipcRenderer.invoke('orders:list', filter),
  getOrderDetails: (orderId: number) => 
    ipcRenderer.invoke('orders:get-details', orderId),
  cancelOrder: (payload: { orderId: number; reason: string; userId: number }) => 
    ipcRenderer.invoke('orders:cancel', payload),
  refundOrder: (payload: { orderId: number; reason: string; userId: number }) => 
    ipcRenderer.invoke('orders:refund', payload),

  // KDS
  getKDSTickets: (stationFilter?: string) => 
    ipcRenderer.invoke('kds:get-tickets', stationFilter),
  updateOrderItemStatus: (payload: { itemId: number; status: PrepStatus }) => 
    ipcRenderer.invoke('kds:update-item-status', payload),
  updateOrderStatus: (payload: { orderId: number; status: OrderStatus }) => 
    ipcRenderer.invoke('kds:update-order-status', payload),

  // Menu Management
  getAllMenu: () => 
    ipcRenderer.invoke('menu:get-all'),
  saveProduct: (product: Product) => 
    ipcRenderer.invoke('menu:save-product', product),
  saveCategory: (category: any) => 
    ipcRenderer.invoke('menu:save-category', category),
  getRecipes: (productId: number) => 
    ipcRenderer.invoke('menu:get-recipes', productId),
  saveRecipe: (payload: { productId: number; variantId?: number | null; items: any[] }) => 
    ipcRenderer.invoke('menu:save-recipe', payload),

  // Inventory
  getIngredients: () => 
    ipcRenderer.invoke('inventory:get-ingredients'),
  saveIngredient: (ingredient: any) => 
    ipcRenderer.invoke('inventory:save-ingredient', ingredient),
  adjustStock: (payload: { ingredientId: number; quantityChange: number; reason: string; userId: number; type?: string }) => 
    ipcRenderer.invoke('inventory:adjust-stock', payload),
  getStockMovements: (limit?: number) => 
    ipcRenderer.invoke('inventory:get-movements', limit),

  // Suppliers & Purchases
  listSuppliers: () => 
    ipcRenderer.invoke('suppliers:list'),
  saveSupplier: (supplier: any) => 
    ipcRenderer.invoke('suppliers:save', supplier),
  recordPurchase: (payload: { supplierId: number; invoiceNumber: string; purchaseDate: string; items: any[]; notes?: string; userId: number }) => 
    ipcRenderer.invoke('purchases:record', payload),
  listPurchases: (limit?: number) => 
    ipcRenderer.invoke('purchases:list', limit),

  // Customers
  listCustomers: (limit?: number) => 
    ipcRenderer.invoke('customers:list', limit),
  searchCustomers: (term: string) => 
    ipcRenderer.invoke('customers:search', term),
  saveCustomer: (customer: Customer) => 
    ipcRenderer.invoke('customers:save', customer),

  // Expenses
  listExpenses: (filter?: { month?: string; category?: string }) => 
    ipcRenderer.invoke('expenses:list', filter),
  saveExpense: (expense: Expense) => 
    ipcRenderer.invoke('expenses:save', expense),
  deleteExpense: (id: number) => 
    ipcRenderer.invoke('expenses:delete', id),

  // Reports
  getDashboardMetrics: (payload: { rangeType: string; customRange?: any }) => 
    ipcRenderer.invoke('reports:get-dashboard', payload),
  exportSalesReportCSV: (payload: { startDate: string; endDate: string }) => 
    ipcRenderer.invoke('reports:export-sales-csv', payload),
  exportGSTReportCSV: (payload: { startDate: string; endDate: string }) => 
    ipcRenderer.invoke('reports:export-gst-csv', payload),

  // Printer & Invoices
  getReceiptHtml: (payload: { orderId: number; width?: string }) => 
    ipcRenderer.invoke('printer:get-receipt-html', payload),
  listPrinters: () => 
    ipcRenderer.invoke('printer:list-printers'),
  printReceipt: (payload: { orderId: number; printerName?: string; width?: string }) => 
    ipcRenderer.invoke('printer:print-receipt', payload),

  // Settings & Tax
  getSettings: () => 
    ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: AppSettings) => 
    ipcRenderer.invoke('settings:save', settings),
  listTaxConfigs: () => 
    ipcRenderer.invoke('tax:list'),
  saveTaxConfig: (config: TaxConfig) => 
    ipcRenderer.invoke('tax:save', config),

  // Backups
  createBackup: (label?: string) => 
    ipcRenderer.invoke('backup:create', label),
  listBackups: () => 
    ipcRenderer.invoke('backup:list'),
  restoreBackup: (filepath: string) => 
    ipcRenderer.invoke('backup:restore', filepath),

  // Demo
  resetDemoData: () => 
    ipcRenderer.invoke('demo:reset'),

  // Window Controls
  minimizeWindow: () => 
    ipcRenderer.invoke('app:minimize'),
  maximizeWindow: () => 
    ipcRenderer.invoke('app:maximize'),
  closeWindow: () => 
    ipcRenderer.invoke('app:close'),
  getVersion: () => 
    ipcRenderer.invoke('app:get-version'),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;

