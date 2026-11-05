import React, { createContext, useContext, useState, useMemo } from 'react';
import type { 
  CartItem, 
  CartItemAddon, 
  OrderType, 
  Customer, 
  Product, 
  ProductVariant, 
  ProductAddon,
  HeldOrder 
} from '../../../shared/types';
import { round } from '../../../shared/types';

interface CartContextType {
  cart: CartItem[];
  orderType: OrderType;
  tableNumber: string;
  customer: Customer | null;
  discountAmount: number;
  discountReason: string;
  notes: string;
  isInterstate: boolean;

  addItem: (product: Product, variant?: ProductVariant | null, addons?: CartItemAddon[], quantity?: number, notes?: string) => void;
  removeItem: (tempId: string) => void;
  updateQuantity: (tempId: string, delta: number) => void;
  clearCart: () => void;
  setOrderType: (type: OrderType, table?: string) => void;
  setTableNumber: (table: string) => void;
  setCustomer: (cust: Customer | null) => void;
  setDiscount: (amount: number, reason?: string) => void;
  setNotes: (notes: string) => void;
  setIsInterstate: (interstate: boolean) => void;
  loadHeldOrder: (held: HeldOrder) => void;

  subtotal: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderTypeState] = useState<OrderType>('dine_in');
  const [tableNumber, setTableNumber] = useState<string>('1');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isInterstate, setIsInterstate] = useState<boolean>(false);

  const addItem = (
    product: Product, 
    variant?: ProductVariant | null, 
    addons: CartItemAddon[] = [], 
    quantity: number = 1, 
    itemNotes?: string
  ) => {
    const variantPrice = variant ? variant.price_adjustment : 0;
    const baseUnit = product.base_price;
    const unitPrice = baseUnit + variantPrice;
    const addonsTotal = addons.reduce((sum, a) => sum + (a.price * a.quantity), 0);
    const grossTotal = round((unitPrice + addonsTotal) * quantity);
    const taxRate = product.tax_rate ?? 5.0;

    // Default assume tax-inclusive for display
    const itemSubtotal = round(grossTotal / (1 + taxRate / 100));
    const itemTax = round(grossTotal - itemSubtotal);

    const tempId = `${product.id}-${variant?.id || 'base'}-${addons.map(a => `${a.addon_id}x${a.quantity}`).join('_')}-${itemNotes || ''}`;

    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.tempId === tempId);
      if (existingIdx > -1) {
        const copy = [...prev];
        const updatedQty = copy[existingIdx].quantity + quantity;
        const newGross = round((unitPrice + addonsTotal) * updatedQty);
        const newSub = round(newGross / (1 + taxRate / 100));
        const newTax = round(newGross - newSub);

        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: updatedQty,
          item_subtotal: newSub,
          item_tax: newTax,
          item_total: newGross,
        };
        return copy;
      }

      const newItem: CartItem = {
        tempId,
        product_id: product.id,
        name: product.name,
        variant_id: variant?.id || null,
        variant_name: variant?.name,
        base_price: baseUnit,
        variant_price: variantPrice,
        unit_price: unitPrice,
        quantity,
        addons,
        notes: itemNotes,
        station: product.station || 'coffee_counter',
        hsn_code: product.hsn_code || '2101',
        tax_rate: taxRate,
        item_subtotal: itemSubtotal,
        item_tax: itemTax,
        item_total: grossTotal,
      };

      return [...prev, newItem];
    });
  };

  const removeItem = (tempId: string) => {
    setCart(prev => prev.filter(it => it.tempId !== tempId));
  };

  const updateQuantity = (tempId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.tempId !== tempId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;

        const addonsTotal = (item.addons || []).reduce((sum, a) => sum + (a.price * a.quantity), 0);
        const gross = round((item.unit_price + addonsTotal) * newQty);
        const sub = round(gross / (1 + item.tax_rate / 100));
        const tax = round(gross - sub);

        return {
          ...item,
          quantity: newQty,
          item_subtotal: sub,
          item_tax: tax,
          item_total: gross,
        };
      }).filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setDiscountReason('');
    setNotes('');
  };

  const setOrderType = (type: OrderType, table?: string) => {
    setOrderTypeState(type);
    if (table) setTableNumber(table);
  };

  const setDiscount = (amount: number, reason: string = '') => {
    setDiscountAmount(amount);
    setDiscountReason(reason);
  };

  const loadHeldOrder = (held: HeldOrder) => {
    try {
      const items = JSON.parse(held.cart_json) as CartItem[];
      setCart(items);
      setOrderTypeState(held.order_type);
      if (held.table_number) setTableNumber(held.table_number);
      if (held.customer_name || held.customer_phone) {
        setCustomer({
          id: 0,
          name: held.customer_name || '',
          phone: held.customer_phone || '',
          loyalty_points: 0,
          total_spent: 0,
          visit_count: 0,
          created_at: new Date().toISOString(),
        });
      }
      if (held.notes) setNotes(held.notes);
    } catch (err) {
      console.error('Failed to parse held order cart:', err);
    }
  };

  // Aggregated totals
  const { subtotal, taxAmount, cgst, sgst, igst, totalAmount, itemCount } = useMemo(() => {
    let rawGross = 0;
    let sub = 0;
    let tax = 0;
    let count = 0;

    for (const item of cart) {
      const addonsTotal = (item.addons || []).reduce((sum, a) => sum + (a.price * a.quantity), 0);
      const grossItem = round((item.unit_price + addonsTotal) * item.quantity);
      rawGross += grossItem;
      count += item.quantity;

      const base = round(grossItem / (1 + item.tax_rate / 100));
      const t = round(grossItem - base);
      sub += base;
      tax += t;
    }

    const discount = Math.min(discountAmount, rawGross);
    const final = Math.max(0, round(rawGross - discount));

    let cg = 0;
    let sg = 0;
    let ig = 0;

    if (isInterstate) {
      ig = round(tax);
    } else {
      cg = round(tax / 2);
      sg = round(tax - cg);
    }

    return {
      subtotal: round(sub),
      taxAmount: round(tax),
      cgst: cg,
      sgst: sg,
      igst: ig,
      totalAmount: final,
      itemCount: count,
    };
  }, [cart, discountAmount, isInterstate]);

  return (
    <CartContext.Provider
      value={{
        cart,
        orderType,
        tableNumber,
        customer,
        discountAmount,
        discountReason,
        notes,
        isInterstate,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setOrderType,
        setTableNumber,
        setCustomer,
        setDiscount,
        setNotes,
        setIsInterstate,
        loadHeldOrder,
        subtotal,
        taxAmount,
        cgst,
        sgst,
        igst,
        totalAmount,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
