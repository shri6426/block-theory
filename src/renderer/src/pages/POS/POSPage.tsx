import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Percent, 
  Pause, 
  Play, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Split, 
  CheckCircle, 
  AlertCircle, 
  X,
  User,
  Coffee,
  Receipt,
  Utensils,
  ArrowRight
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ReceiptModal } from '../../components/ReceiptModal';
import type { 
  Product, 
  Category, 
  ProductVariant, 
  CartItemAddon, 
  HeldOrder, 
  Customer,
  PaymentMethod 
} from '../../shared/types';

export const POSPage: React.FC = () => {
  const { 
    cart, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart,
    orderType, 
    setOrderType, 
    tableNumber, 
    setTableNumber,
    customer, 
    setCustomer,
    discountAmount, 
    setDiscount,
    subtotal, 
    taxAmount, 
    cgst, 
    sgst, 
    igst, 
    totalAmount, 
    itemCount,
    loadHeldOrder,
    isInterstate
  } = useCart();

  const { user } = useAuth();
  const { success, error, info } = useNotification();

  // Catalog State
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Customization Modal State
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddon[]>([]);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Modals & Panels
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState<boolean>(false);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  // Checkout Payment State
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [upiRef, setUpiRef] = useState<string>('');
  const [upiConfirmed, setUpiConfirmed] = useState<boolean>(false);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [processingCheckout, setProcessingCheckout] = useState<boolean>(false);

  // Completed Receipt Modal State
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Customer Search in modal
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);

  // Ref for search input (F2 shortcut)
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if inside an active typing field unless it's a function key
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsCustomerModalOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) openCheckoutModal();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldOrder();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleOpenHeldModal();
      } else if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (cart.length > 0 && !isCheckoutOpen) openCheckoutModal();
      } else if (e.key === 'Escape') {
        setIsCheckoutOpen(false);
        setCustomizingProduct(null);
        setIsCustomerModalOpen(false);
        setIsDiscountModalOpen(false);
        setIsHeldModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isCheckoutOpen, user]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const res = await window.api.getCatalog();
      if (res.success && res.data) {
        setCategories(res.data.categories);
        setProducts(res.data.products);
      }
    } catch (err: any) {
      error('Catalog Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === null || p.category_id === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleProductClick = (product: Product) => {
    const hasVariants = product.variants && product.variants.length > 0;
    const hasAddons = product.addons && product.addons.length > 0;

    if (hasVariants || hasAddons) {
      // Open customization modal
      setCustomizingProduct(product);
      setSelectedVariant(product.variants && product.variants.length > 0 ? product.variants[0] : null);
      setSelectedAddons([]);
      setItemNotes('');
    } else {
      // Add directly
      addItem(product);
    }
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    addItem(customizingProduct, selectedVariant, selectedAddons, 1, itemNotes);
    setCustomizingProduct(null);
  };

  const toggleAddon = (addon: any) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.addon_id === addon.id);
      if (exists) {
        return prev.filter(a => a.addon_id !== addon.id);
      } else {
        return [...prev, {
          id: addon.id,
          addon_id: addon.id,
          name: addon.name,
          price: addon.price,
          quantity: 1,
        }];
      }
    });
  };

  const openCheckoutModal = () => {
    if (cart.length === 0) return;
    setCashTendered(totalAmount.toString());
    setSplitCash(totalAmount);
    setSplitUpi(0);
    setSplitCard(0);
    setUpiRef('');
    setUpiConfirmed(false);
    setIsCheckoutOpen(true);
  };

  const handleHoldOrder = async () => {
    if (cart.length === 0) {
      info('Cart Empty', 'Add items to the cart before holding.');
      return;
    }
    if (!user) return;

    try {
      const res = await window.api.holdOrder({
        cart,
        cashierId: user.id,
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        notes: orderNotes,
      });

      if (res.success) {
        success('Order Held', `Held as ${res.heldOrderNumber}`);
        clearCart();
      } else {
        error('Hold Failed', res.error);
      }
    } catch (err: any) {
      error('Hold Failed', err.message);
    }
  };

  const handleOpenHeldModal = async () => {
    try {
      const res = await window.api.listHeldOrders();
      if (res.success && res.data) {
        setHeldOrders(res.data);
        setIsHeldModalOpen(true);
      }
    } catch (err: any) {
      error('Failed to list held orders', err.message);
    }
  };

  const handleResumeHeld = async (held: HeldOrder) => {
    try {
      const res = await window.api.resumeHeldOrder(held.id);
      if (res.success) {
        loadHeldOrder(held);
        setIsHeldModalOpen(false);
        success('Order Resumed', `Resumed ${held.order_number}`);
      }
    } catch (err: any) {
      error('Resume Failed', err.message);
    }
  };

  const handleSearchCustomers = async (term: string) => {
    setCustomerSearchTerm(term);
    if (!term.trim()) {
      setCustomerSearchResults([]);
      return;
    }
    try {
      const res = await window.api.searchCustomers(term);
      if (res.success && res.data) {
        setCustomerSearchResults(res.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleProcessPayment = async () => {
    if (!user) return;
    setProcessingCheckout(true);

    let paymentsPayload: any[] = [];

    if (activePaymentMethod === 'cash') {
      const tendered = parseFloat(cashTendered) || totalAmount;
      if (tendered < totalAmount) {
        error('Invalid Cash', `Tendered ₹${tendered} is less than total ₹${totalAmount}.`);
        setProcessingCheckout(false);
        return;
      }
      paymentsPayload = [{
        paymentMethod: 'cash',
        amount: totalAmount,
        notes: `Tendered: ₹${tendered}, Change: ₹${(tendered - totalAmount).toFixed(2)}`,
      }];
    } else if (activePaymentMethod === 'upi') {
      if (!upiConfirmed) {
        error('UPI Verification Required', 'Confirm receipt of UPI payment before completing the order.');
        setProcessingCheckout(false);
        return;
      }
      paymentsPayload = [{
        paymentMethod: 'upi',
        amount: totalAmount,
        referenceNumber: upiRef || 'MANUAL-CONFIRMED',
      }];
    } else if (activePaymentMethod === 'card') {
      paymentsPayload = [{
        paymentMethod: 'card',
        amount: totalAmount,
      }];
    } else if (activePaymentMethod === 'split') {
      const splitTotal = splitCash + splitUpi + splitCard;
      if (Math.abs(splitTotal - totalAmount) > 0.05) {
        error('Split Mismatch', `Split sum ₹${splitTotal} must equal ₹${totalAmount}.`);
        setProcessingCheckout(false);
        return;
      }
      if (splitCash > 0) paymentsPayload.push({ paymentMethod: 'cash', amount: splitCash });
      if (splitUpi > 0) paymentsPayload.push({ paymentMethod: 'upi', amount: splitUpi, referenceNumber: upiRef });
      if (splitCard > 0) paymentsPayload.push({ paymentMethod: 'card', amount: splitCard });
    }

    try {
      const res = await window.api.checkout({
        items: cart,
        orderType,
        tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
        customerId: customer?.id || null,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        cashierId: user.id,
        discountAmount,
        payments: paymentsPayload,
        notes: orderNotes,
        isInterstate,
      });

      if (res.success && res.orderId) {
        success('Order Settled', `Invoice created for order #${res.orderNumber}`);
        const newOrderId = res.orderId;
        clearCart();
        setIsCheckoutOpen(false);
        setCompletedOrderId(newOrderId);
        setIsReceiptModalOpen(true);
      } else {
        error('Checkout Failed', res.error);
      }
    } catch (err: any) {
      error('Checkout Exception', err.message);
    } finally {
      setProcessingCheckout(false);
    }
  };

  const cashChange = Math.max(0, (parseFloat(cashTendered) || 0) - totalAmount);

  return (
    <div className="h-full w-full flex bg-bt-bg overflow-hidden select-none">
      {/* ================= LEFT PANEL: CATALOG & MENU ================= */}
      <div className="flex-1 flex flex-col h-full border-r border-bt-border overflow-hidden">
        {/* Top Filter & Search Bar */}
        <div className="p-3 bg-white border-b border-bt-border flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-bt-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search coffee, drinks, bakery... (F2)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-bt-bg border border-bt-border font-mono text-xs text-bt-charcoal focus:outline-none focus:border-bt-brick"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bt-muted hover:text-bt-charcoal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleHoldOrder}
            title="Hold Current Order (F8)"
            className="flex items-center gap-1.5 px-3 py-2 bg-bt-bg border border-bt-border text-bt-charcoal hover:bg-bt-border text-xs font-mono uppercase font-semibold transition-colors"
          >
            <Pause className="w-3.5 h-3.5 text-amber-600" />
            <span>Hold (F8)</span>
          </button>

          <button
            onClick={handleOpenHeldModal}
            title="Resume Held Order (F9)"
            className="flex items-center gap-1.5 px-3 py-2 bg-bt-bg border border-bt-border text-bt-charcoal hover:bg-bt-border text-xs font-mono uppercase font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-emerald-600" />
            <span>Held (F9)</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="px-3 py-2 bg-bt-bg border-b border-bt-border flex gap-1.5 overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-xs font-mono uppercase font-semibold tracking-wider whitespace-nowrap transition-colors ${
              selectedCategory === null 
                ? 'bg-bt-charcoal text-white' 
                : 'bg-white border border-bt-border text-bt-charcoal hover:bg-bt-border'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-mono uppercase font-semibold tracking-wider whitespace-nowrap transition-colors ${
                selectedCategory === cat.id 
                  ? 'bg-bt-brick text-white' 
                  : 'bg-white border border-bt-border text-bt-charcoal hover:bg-bt-border'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 p-3 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-bt-muted font-mono text-xs">
              <Coffee className="w-10 h-10 text-bt-concrete mb-2 opacity-50" />
              <span>No items found matching criteria.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map(prod => {
                const hasCustomizations = (prod.variants && prod.variants.length > 0) || (prod.addons && prod.addons.length > 0);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleProductClick(prod)}
                    className="bg-white border border-bt-border hover:border-bt-brick hover:shadow-md p-3 flex flex-col justify-between cursor-pointer transition-all active:scale-[0.98] group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-bt-charcoal group-hover:text-bt-brick transition-colors leading-tight">
                          {prod.name}
                        </span>
                        <span className={`text-[9px] font-mono px-1 py-0.2 uppercase font-semibold ${
                          prod.station === 'coffee_counter' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {prod.station === 'coffee_counter' ? 'Barista' : 'Kitchen'}
                        </span>
                      </div>

                      {prod.description && (
                        <p className="text-[11px] text-bt-muted mt-1 line-clamp-2 leading-relaxed">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-bt-border/60 flex items-center justify-between font-mono">
                      <span className="font-bold text-sm text-bt-charcoal">
                        ₹{prod.base_price.toFixed(2)}
                      </span>
                      {hasCustomizations && (
                        <span className="text-[10px] text-bt-brick uppercase tracking-wider font-semibold">
                          Customise +
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= RIGHT PANEL: CART & CHECKOUT ================= */}
      <div className="w-96 lg:w-[420px] bg-white flex flex-col h-full flex-shrink-0 shadow-lg">
        {/* Order Type & Table Header */}
        <div className="p-3 bg-bt-charcoal text-white border-b border-bt-border flex flex-col gap-2.5 flex-shrink-0">
          <div className="flex border border-white/20 text-xs font-mono">
            {(['dine_in', 'takeaway', 'pickup'] as const).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-1.5 uppercase font-bold tracking-wider transition-colors ${
                  orderType === type ? 'bg-bt-brick text-white' : 'hover:bg-white/10 text-bt-concrete-light'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            {orderType === 'dine_in' ? (
              <div className="flex items-center gap-2">
                <span className="text-bt-concrete">Table:</span>
                <select
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  className="bg-white/10 text-white border border-white/20 px-2 py-0.5 font-bold focus:outline-none focus:border-bt-brick"
                >
                  {Array.from({ length: 16 }).map((_, i) => (
                    <option key={i + 1} value={(i + 1).toString()} className="bg-bt-charcoal text-white">
                      Table {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-bt-concrete uppercase">Quick Counter Dispatch</span>
            )}

            {/* Customer Badge / Button */}
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white text-[11px] border border-white/20"
            >
              <User className="w-3 h-3 text-bt-beige" />
              <span>{customer ? customer.name.slice(0, 14) : 'Add Customer (F3)'}</span>
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto divide-y divide-bt-border/60">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-bt-muted font-mono text-xs">
              <Receipt className="w-8 h-8 text-bt-concrete mb-2 opacity-40" />
              <span>Cart is empty</span>
              <span className="text-[10px] text-bt-concrete mt-1">Select items or press F2 to search</span>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.tempId} className="py-2.5 flex flex-col gap-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="font-semibold text-xs text-bt-charcoal">{item.name}</div>
                    {item.variant_name && (
                      <div className="text-[10px] text-bt-muted font-mono">Size: {item.variant_name}</div>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <div className="text-[10px] text-bt-brick font-mono mt-0.5">
                        {item.addons.map(a => `+ ${a.name}`).join(', ')}
                      </div>
                    )}
                    {item.notes && (
                      <div className="text-[10px] italic text-bt-muted mt-0.5">Note: {item.notes}</div>
                    )}
                  </div>

                  <span className="font-mono font-bold text-xs text-bt-charcoal">
                    ₹{item.item_total.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] font-mono text-bt-muted">
                    ₹{item.unit_price} each
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.tempId, -1)}
                      className="w-5 h-5 bg-bt-bg hover:bg-bt-border border border-bt-border flex items-center justify-center text-bt-charcoal font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono text-xs font-bold w-6 text-center text-bt-charcoal">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.tempId, 1)}
                      className="w-5 h-5 bg-bt-bg hover:bg-bt-border border border-bt-border flex items-center justify-center text-bt-charcoal font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.tempId)}
                      className="p-1 text-bt-concrete hover:text-bt-brick ml-2 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Billing Breakdown */}
        <div className="p-3.5 bg-bt-bg border-t border-bt-border flex flex-col gap-1.5 text-xs font-mono flex-shrink-0">
          <div className="flex justify-between text-bt-muted">
            <span>Items ({itemCount}):</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-bt-brick font-semibold">
              <span>Discount applied:</span>
              <span>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-bt-muted">
            <span>CGST (2.5%):</span>
            <span>₹{cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-bt-muted">
            <span>SGST (2.5%):</span>
            <span>₹{sgst.toFixed(2)}</span>
          </div>

          <div className="pt-2 border-t border-bt-border flex justify-between items-baseline font-bold text-sm text-bt-charcoal">
            <span className="uppercase tracking-wider">Total Payable:</span>
            <span className="text-lg text-bt-brick">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 bg-white border-t border-bt-border flex gap-2 flex-shrink-0">
          <button
            onClick={() => setIsDiscountModalOpen(true)}
            className="p-2.5 bg-bt-bg hover:bg-bt-border border border-bt-border text-bt-charcoal flex items-center justify-center transition-colors"
            title="Apply Discount"
          >
            <Percent className="w-4 h-4" />
          </button>

          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="p-2.5 bg-bt-bg hover:bg-red-50 text-bt-muted hover:text-bt-brick border border-bt-border flex items-center justify-center transition-colors disabled:opacity-40"
            title="Clear Cart"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={openCheckoutModal}
            disabled={cart.length === 0}
            className="flex-1 py-2.5 bg-bt-brick hover:bg-bt-brick-dark text-white font-mono text-xs uppercase font-bold tracking-widest shadow-md transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <span>Charge ₹{totalAmount.toFixed(2)}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= MODAL: CUSTOMIZE PRODUCT ================= */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-bt-charcoal w-full max-w-lg shadow-2xl p-6">
            <div className="flex justify-between items-start pb-3 border-b border-bt-border">
              <div>
                <h3 className="font-mono font-bold text-base text-bt-charcoal">
                  {customizingProduct.name}
                </h3>
                <span className="text-xs font-mono text-bt-muted">
                  Base Price: ₹{customizingProduct.base_price.toFixed(2)}
                </span>
              </div>
              <button onClick={() => setCustomizingProduct(null)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Variants / Size */}
              {customizingProduct.variants && customizingProduct.variants.length > 0 && (
                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-bt-charcoal mb-2">
                    Choose Size / Variant
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizingProduct.variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2.5 text-xs font-mono text-left border transition-colors ${
                          selectedVariant?.id === v.id 
                            ? 'border-bt-brick bg-bt-brick/10 font-bold text-bt-brick' 
                            : 'border-bt-border bg-bt-bg hover:bg-bt-border text-bt-charcoal'
                        }`}
                      >
                        <div>{v.name}</div>
                        <div className="text-[10px] text-bt-muted">
                          {v.price_adjustment > 0 ? `+₹${v.price_adjustment}` : 'Standard'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons / Modifiers */}
              {customizingProduct.addons && customizingProduct.addons.length > 0 && (
                <div>
                  <label className="block text-xs font-mono uppercase font-bold text-bt-charcoal mb-2">
                    Custom Add-ons & Modifiers
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {customizingProduct.addons.map(a => {
                      const isSelected = selectedAddons.some(sel => sel.addon_id === a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggleAddon(a)}
                          className={`p-2 text-xs font-mono text-left border transition-colors ${
                            isSelected 
                              ? 'border-bt-brick bg-bt-brick text-white font-bold' 
                              : 'border-bt-border bg-bt-bg hover:bg-bt-border text-bt-charcoal'
                          }`}
                        >
                          <div>{a.name}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-bt-muted'}`}>
                            {a.price > 0 ? `+₹${a.price}` : 'Free'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-mono uppercase font-bold text-bt-charcoal mb-1">
                  Preparation Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extra hot, splash of cold water, cinnamon dust"
                  value={itemNotes}
                  onChange={e => setItemNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-bt-bg border border-bt-border font-mono text-xs focus:outline-none focus:border-bt-brick"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2">
              <button
                onClick={() => setCustomizingProduct(null)}
                className="px-4 py-2 border border-bt-border font-mono text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCustomization}
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white font-mono text-xs uppercase font-bold"
              >
                Add To Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHECKOUT & PAYMENT ================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-bt-charcoal w-full max-w-xl shadow-2xl p-6">
            <div className="flex justify-between items-center pb-4 border-b border-bt-border">
              <div>
                <h3 className="font-mono font-bold text-lg text-bt-charcoal uppercase tracking-wider">
                  Settle Order
                </h3>
                <div className="text-xs font-mono text-bt-muted mt-0.5">
                  Amount Due: <span className="font-bold text-bt-brick text-sm">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Switcher */}
            <div className="grid grid-cols-4 gap-2 my-4">
              {[
                { method: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
                { method: 'upi', label: 'UPI QR', icon: <QrCode className="w-4 h-4" /> },
                { method: 'card', label: 'Card', icon: <CreditCard className="w-4 h-4" /> },
                { method: 'split', label: 'Split', icon: <Split className="w-4 h-4" /> },
              ].map(p => (
                <button
                  key={p.method}
                  onClick={() => setActivePaymentMethod(p.method as PaymentMethod)}
                  className={`p-3 flex flex-col items-center justify-center gap-1.5 border font-mono text-xs uppercase font-bold transition-all ${
                    activePaymentMethod === p.method 
                      ? 'bg-bt-brick text-white border-bt-brick shadow-sm' 
                      : 'bg-bt-bg text-bt-charcoal border-bt-border hover:bg-bt-border'
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Payment Mode Specific Body */}
            <div className="min-h-[160px] py-2">
              {activePaymentMethod === 'cash' && (
                <div className="space-y-3 font-mono">
                  <div>
                    <label className="block text-xs uppercase font-bold text-bt-charcoal mb-1">
                      Cash Tendered (₹)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={cashTendered}
                      onChange={e => setCashTendered(e.target.value)}
                      className="w-full px-3 py-2 text-lg font-bold bg-bt-bg border border-bt-border focus:outline-none focus:border-bt-brick"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Quick Cash Presets */}
                  <div className="flex gap-2">
                    {[100, 200, 500, 1000, 2000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setCashTendered(amt.toString())}
                        className="flex-1 py-1 bg-bt-bg border border-bt-border text-xs hover:bg-bt-border font-semibold"
                      >
                        ₹{amt}
                      </button>
                    ))}
                    <button
                      onClick={() => setCashTendered(totalAmount.toString())}
                      className="px-3 py-1 bg-bt-charcoal text-white text-xs font-semibold"
                    >
                      Exact
                    </button>
                  </div>

                  {/* Change Calculator */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                    <span className="text-xs uppercase text-emerald-900 font-bold">Change Due to Customer:</span>
                    <span className="text-base font-bold text-emerald-800">₹{cashChange.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {activePaymentMethod === 'upi' && (
                <div className="flex gap-4 font-mono items-center">
                  {/* Dynamic Demo QR Code Mock for Chennai UPI */}
                  <div className="w-36 h-36 bg-white border-2 border-bt-charcoal p-2 flex flex-col items-center justify-center flex-shrink-0">
                    <div className="w-full h-full bg-bt-charcoal flex flex-col items-center justify-center text-white text-center p-2">
                      <QrCode className="w-12 h-12 text-white mb-1" />
                      <span className="text-[8px] tracking-wider uppercase font-bold">Scan with GPay / PhonePe / Paytm</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="text-xs font-semibold text-bt-charcoal">
                      Merchant VPA: <span className="font-bold text-bt-brick">blocktheory@icici</span>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase font-bold text-bt-muted mb-0.5">
                        UPI Transaction / UTR Ref No:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 431200987654"
                        value={upiRef}
                        onChange={e => setUpiRef(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border text-xs focus:outline-none focus:border-bt-brick"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer mt-2 text-xs">
                      <input
                        type="checkbox"
                        checked={upiConfirmed}
                        onChange={e => setUpiConfirmed(e.target.checked)}
                        className="w-4 h-4 accent-bt-brick"
                      />
                      <span className="font-bold text-bt-charcoal">I verify UPI payment was received in bank</span>
                    </label>
                  </div>
                </div>
              )}

              {activePaymentMethod === 'card' && (
                <div className="flex flex-col items-center justify-center p-6 bg-bt-bg border border-bt-border text-center font-mono">
                  <CreditCard className="w-8 h-8 text-bt-brick mb-2" />
                  <div className="font-bold text-xs text-bt-charcoal uppercase">Swipe or Dip Card on EDC Machine</div>
                  <div className="text-[11px] text-bt-muted mt-1">
                    Charge exactly ₹{totalAmount.toFixed(2)} on POS terminal.
                  </div>
                </div>
              )}

              {activePaymentMethod === 'split' && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-bold text-bt-charcoal mb-1">Cash Part (₹)</label>
                      <input
                        type="number"
                        value={splitCash}
                        onChange={e => setSplitCash(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-bt-bg border border-bt-border"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-bt-charcoal mb-1">UPI Part (₹)</label>
                      <input
                        type="number"
                        value={splitUpi}
                        onChange={e => setSplitUpi(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-bt-bg border border-bt-border"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-bt-charcoal mb-1">Card Part (₹)</label>
                      <input
                        type="number"
                        value={splitCard}
                        onChange={e => setSplitCard(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-bt-bg border border-bt-border"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between p-2 bg-bt-bg border border-bt-border">
                    <span>Total Split: ₹{(splitCash + splitUpi + splitCard).toFixed(2)}</span>
                    <span className={Math.abs((splitCash + splitUpi + splitCard) - totalAmount) < 0.05 ? 'text-emerald-600 font-bold' : 'text-bt-brick font-bold'}>
                      {Math.abs((splitCash + splitUpi + splitCard) - totalAmount) < 0.05 ? 'Balanced ✓' : `Diff: ₹${((splitCash + splitUpi + splitCard) - totalAmount).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Action Buttons */}
            <div className="pt-4 border-t border-bt-border flex justify-end gap-2">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 border border-bt-border font-mono text-xs uppercase hover:bg-bt-bg"
              >
                Back
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={processingCheckout}
                className="px-8 py-2.5 bg-bt-brick hover:bg-bt-brick-dark text-white font-mono text-xs uppercase font-bold tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {processingCheckout ? 'Generating Invoice...' : 'Complete & Print Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CUSTOMER SELECTION (F3) ================= */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border">
              <h3 className="font-mono font-bold text-sm text-bt-charcoal uppercase tracking-wider">
                Select Customer (F3)
              </h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3">
              <input
                type="text"
                autoFocus
                placeholder="Search by phone number or name..."
                value={customerSearchTerm}
                onChange={e => handleSearchCustomers(e.target.value)}
                className="w-full px-3 py-2 bg-bt-bg border border-bt-border font-mono text-xs focus:outline-none focus:border-bt-brick"
              />
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-bt-border border border-bt-border mb-4 font-mono text-xs">
              {customerSearchResults.length === 0 ? (
                <div className="p-4 text-center text-bt-muted">
                  {customerSearchTerm ? 'No existing customer found.' : 'Type to search registered customers.'}
                </div>
              ) : (
                customerSearchResults.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { setCustomer(c); setIsCustomerModalOpen(false); }}
                    className="p-2 hover:bg-bt-bg cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-bt-charcoal">{c.name}</div>
                      <div className="text-[10px] text-bt-muted">{c.phone}</div>
                    </div>
                    <span className="text-[10px] text-bt-brick font-bold">
                      {c.loyalty_points} Points
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center">
              {customer ? (
                <button
                  onClick={() => { setCustomer(null); setIsCustomerModalOpen(false); }}
                  className="text-xs font-mono text-bt-brick hover:underline"
                >
                  Clear Customer
                </button>
              ) : <div />}
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-1.5 bg-bt-charcoal text-white font-mono text-xs uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DISCOUNT ================= */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-bt-charcoal w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-mono font-bold text-sm text-bt-charcoal uppercase tracking-wider mb-3">
              Apply Order Discount
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-bt-muted mb-1">Discount Amount (₹)</label>
                <input
                  type="number"
                  defaultValue={discountAmount}
                  id="discAmtInput"
                  className="w-full px-3 py-2 bg-bt-bg border border-bt-border text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-bt-muted mb-1">Reason for Discount</label>
                <input
                  type="text"
                  placeholder="e.g. Speciality VIP / Promotional launch"
                  id="discReasonInput"
                  className="w-full px-3 py-2 bg-bt-bg border border-bt-border text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-bt-border">
              <button
                onClick={() => { setDiscount(0, ''); setIsDiscountModalOpen(false); }}
                className="px-3 py-1.5 border border-bt-border font-mono text-xs text-bt-brick"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  const val = parseFloat((document.getElementById('discAmtInput') as HTMLInputElement).value) || 0;
                  const reason = (document.getElementById('discReasonInput') as HTMLInputElement).value || '';
                  setDiscount(val, reason);
                  setIsDiscountModalOpen(false);
                }}
                className="px-4 py-1.5 bg-bt-brick text-white font-mono text-xs font-bold uppercase"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: HELD ORDERS (F9) ================= */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-bt-charcoal w-full max-w-lg shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border">
              <h3 className="font-mono font-bold text-sm text-bt-charcoal uppercase tracking-wider">
                Held Orders (F9)
              </h3>
              <button onClick={() => setIsHeldModalOpen(false)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 max-h-64 overflow-y-auto divide-y divide-bt-border border border-bt-border font-mono text-xs">
              {heldOrders.length === 0 ? (
                <div className="p-6 text-center text-bt-muted">
                  No orders currently on hold.
                </div>
              ) : (
                heldOrders.map(h => (
                  <div key={h.id} className="p-3 hover:bg-bt-bg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-bt-charcoal">{h.order_number}</div>
                      <div className="text-[10px] text-bt-muted">
                        Held at: {h.created_at} • By: {h.cashier_name}
                      </div>
                      {h.customer_name && (
                        <div className="text-[10px] text-bt-brick font-semibold">
                          Customer: {h.customer_name}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleResumeHeld(h)}
                      className="px-3 py-1 bg-bt-brick hover:bg-bt-brick-dark text-white uppercase font-bold text-[11px]"
                    >
                      Resume
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsHeldModalOpen(false)}
                className="px-4 py-1.5 bg-bt-charcoal text-white font-mono text-xs uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview Modal */}
      <ReceiptModal
        orderId={completedOrderId}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </div>
  );
};

