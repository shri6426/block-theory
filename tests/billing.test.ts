import { describe, it, expect } from 'vitest';
import { round } from '../src/shared/types';
import { calculateBillingDetails } from '../src/main/services/billing';
import type { CartItem } from '../src/shared/types';

describe('Billing & Indian GST Calculations', () => {
  it('should round decimal numbers with 2 digits precision accurately', () => {
    expect(round(10.254)).toBe(10.25);
    expect(round(10.256)).toBe(10.26);
    expect(round(10.255)).toBe(10.26);
    expect(round(100)).toBe(100);
  });

  it('should calculate 5% tax-inclusive GST breakdown correctly for single item', () => {
    const items: CartItem[] = [
      {
        tempId: 'item-1',
        product_id: 1,
        name: 'Espresso',
        base_price: 100,
        variant_price: 0,
        unit_price: 100,
        quantity: 1,
        addons: [],
        station: 'coffee_counter',
        hsn_code: '2101',
        tax_rate: 5.0,
        item_subtotal: 95.24,
        item_tax: 4.76,
        item_total: 100,
      },
    ];

    const result = calculateBillingDetails(items, 0, true, false);

    expect(result.totalAmount).toBe(100.0);
    expect(result.subtotal).toBe(95.24);
    expect(result.taxAmount).toBe(4.76);
    expect(result.cgst + result.sgst).toBe(4.76);
    expect(result.cgst).toBe(2.38);
    expect(result.sgst).toBe(2.38);
    expect(result.igst).toBe(0);
  });

  it('should calculate 5% tax-exclusive GST breakdown correctly', () => {
    const items: CartItem[] = [
      {
        tempId: 'item-1',
        product_id: 1,
        name: 'Espresso',
        base_price: 100,
        variant_price: 0,
        unit_price: 100,
        quantity: 1,
        addons: [],
        station: 'coffee_counter',
        hsn_code: '2101',
        tax_rate: 5.0,
        item_subtotal: 100,
        item_tax: 5,
        item_total: 105,
      },
    ];

    const result = calculateBillingDetails(items, 0, false, false);

    expect(result.totalAmount).toBe(105.0);
    expect(result.subtotal).toBe(100.0);
    expect(result.taxAmount).toBe(5.0);
    expect(result.cgst).toBe(2.5);
    expect(result.sgst).toBe(2.5);
  });

  it('should calculate interstate IGST supply correctly', () => {
    const items: CartItem[] = [
      {
        tempId: 'item-1',
        product_id: 1,
        name: 'Speciality Beans Pack',
        base_price: 500,
        variant_price: 0,
        unit_price: 500,
        quantity: 1,
        addons: [],
        station: 'coffee_counter',
        hsn_code: '2101',
        tax_rate: 5.0,
        item_subtotal: 476.19,
        item_tax: 23.81,
        item_total: 500,
      },
    ];

    const result = calculateBillingDetails(items, 0, true, true);

    expect(result.totalAmount).toBe(500.0);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
    expect(result.igst).toBe(23.81);
  });

  it('should apply order-level discount and cap at total bill', () => {
    const items: CartItem[] = [
      {
        tempId: 'item-1',
        product_id: 1,
        name: 'Croissant',
        base_price: 120,
        variant_price: 0,
        unit_price: 120,
        quantity: 2,
        addons: [],
        station: 'food_counter',
        hsn_code: '1905',
        tax_rate: 5.0,
        item_subtotal: 228.57,
        item_tax: 11.43,
        item_total: 240,
      },
    ];

    // Bill is ₹240, apply ₹40 discount
    const withDisc = calculateBillingDetails(items, 40, true, false);
    expect(withDisc.totalAmount).toBe(200.0);
    expect(withDisc.discountAmount).toBe(40.0);

    // Excess discount (e.g. ₹300) should be capped so total does not become negative
    const cappedDisc = calculateBillingDetails(items, 300, true, false);
    expect(cappedDisc.totalAmount).toBe(0.0);
  });
});

