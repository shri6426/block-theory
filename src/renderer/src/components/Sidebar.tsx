import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  ClipboardList, 
  UtensilsCrossed, 
  Coffee, 
  Boxes, 
  Truck, 
  Users, 
  UserCheck, 
  ReceiptText, 
  BarChart3, 
  Settings 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavItemKey = 
  | 'overview' 
  | 'pos' 
  | 'orders' 
  | 'kds' 
  | 'menu' 
  | 'inventory' 
  | 'suppliers' 
  | 'customers' 
  | 'staff' 
  | 'expenses' 
  | 'reports' 
  | 'settings';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { user, hasPermission } = useAuth();

  const navItems: { key: NavItemKey; label: string; icon: React.ReactNode; perm?: string }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, perm: 'reports:view' },
    { key: 'pos', label: 'Point of Sale', icon: <Receipt className="w-5 h-5" />, perm: 'pos:access' },
    { key: 'orders', label: 'Orders', icon: <ClipboardList className="w-5 h-5" />, perm: 'orders:view' },
    { key: 'kds', label: 'Kitchen Display', icon: <UtensilsCrossed className="w-5 h-5" />, perm: 'kds:view' },
    { key: 'menu', label: 'Menu Mgmt', icon: <Coffee className="w-5 h-5" />, perm: 'menu:view' },
    { key: 'inventory', label: 'Inventory', icon: <Boxes className="w-5 h-5" />, perm: 'inventory:view' },
    { key: 'suppliers', label: 'Suppliers', icon: <Truck className="w-5 h-5" />, perm: 'suppliers:view' },
    { key: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" />, perm: 'customers:view' },
    { key: 'staff', label: 'Staff', icon: <UserCheck className="w-5 h-5" />, perm: 'staff:view' },
    { key: 'expenses', label: 'Expenses', icon: <ReceiptText className="w-5 h-5" />, perm: 'expenses:view' },
    { key: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" />, perm: 'reports:view' },
    { key: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, perm: 'settings:view' },
  ];

  // Filter based on user role/permissions
  const visibleItems = navItems.filter(item => {
    if (!item.perm) return true;
    return hasPermission(item.perm);
  });

  return (
    <aside className="w-56 bg-bt-charcoal text-white flex flex-col h-full border-r border-bt-charcoal flex-shrink-0 select-none shadow-xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-bt-brick" />
          <span className="font-mono text-xs tracking-widest text-bt-beige uppercase font-bold">
            NAVIGATION
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/40 tracking-wider">v1.0</span>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto space-y-0.5 px-2">
        {visibleItems.map(item => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-left transition-all text-xs font-mono tracking-wider uppercase ${
                isActive 
                  ? 'bg-bt-brick text-white font-bold shadow-sm' 
                  : 'text-bt-concrete-light hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-bt-concrete'}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10 text-[10px] font-mono text-white/50 flex flex-col gap-1">
        <div className="flex justify-between">
          <span>MODE:</span>
          <span className="text-emerald-400 font-bold">OFFLINE-FIRST</span>
        </div>
        <div className="flex justify-between">
          <span>DB ENGINE:</span>
          <span className="text-bt-beige">SQLITE 3 WAL</span>
        </div>
      </div>
    </aside>
  );
};

