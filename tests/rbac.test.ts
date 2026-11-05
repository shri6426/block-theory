import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS } from '../src/shared/types';
import { checkPermission } from '../src/main/services/auth';

describe('Role-Based Access Control (RBAC)', () => {
  it('should grant OWNER full administrative and destructive capabilities', () => {
    expect(checkPermission('OWNER', 'pos:access')).toBe(true);
    expect(checkPermission('OWNER', 'reports:view')).toBe(true);
    expect(checkPermission('OWNER', 'settings:manage')).toBe(true);
    expect(checkPermission('OWNER', 'demo:reset')).toBe(true);
    expect(checkPermission('OWNER', 'backup:manage')).toBe(true);
  });

  it('should prevent CASHIER from viewing reports, managing settings or resetting demo', () => {
    expect(checkPermission('CASHIER', 'pos:access')).toBe(true);
    expect(checkPermission('CASHIER', 'orders:view')).toBe(true);
    expect(checkPermission('CASHIER', 'reports:view')).toBe(false);
    expect(checkPermission('CASHIER', 'settings:manage')).toBe(false);
    expect(checkPermission('CASHIER', 'demo:reset')).toBe(false);
    expect(checkPermission('CASHIER', 'staff:manage')).toBe(false);
  });

  it('should restrict KITCHEN_STAFF strictly to KDS tickets', () => {
    expect(checkPermission('KITCHEN_STAFF', 'kds:view')).toBe(true);
    expect(checkPermission('KITCHEN_STAFF', 'kds:manage')).toBe(true);
    expect(checkPermission('KITCHEN_STAFF', 'pos:access')).toBe(false);
    expect(checkPermission('KITCHEN_STAFF', 'reports:view')).toBe(false);
    expect(checkPermission('KITCHEN_STAFF', 'inventory:view')).toBe(false);
  });

  it('should allow MANAGER order cancellations, inventory adjustments and reports', () => {
    expect(checkPermission('MANAGER', 'pos:cancel_order')).toBe(true);
    expect(checkPermission('MANAGER', 'pos:refund')).toBe(true);
    expect(checkPermission('MANAGER', 'inventory:adjust')).toBe(true);
    expect(checkPermission('MANAGER', 'reports:view')).toBe(true);
    // Manager cannot perform full demo reset or backup deletion
    expect(checkPermission('MANAGER', 'demo:reset')).toBe(false);
  });
});

