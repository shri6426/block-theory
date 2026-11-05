import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { LoginPage } from './pages/Login/LoginPage';
import { TopNav } from './components/TopNav';
import { Sidebar, NavItemKey } from './components/Sidebar';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

// 12 Navigation Pages
import { OverviewPage } from './pages/Overview/OverviewPage';
import { POSPage } from './pages/POS/POSPage';
import { OrdersPage } from './pages/Orders/OrdersPage';
import { KDSPage } from './pages/KDS/KDSPage';
import { MenuPage } from './pages/Menu/MenuPage';
import { InventoryPage } from './pages/Inventory/InventoryPage';
import { SuppliersPage } from './pages/Suppliers/SuppliersPage';
import { CustomersPage } from './pages/Customers/CustomersPage';
import { StaffPage } from './pages/Staff/StaffPage';
import { ExpensesPage } from './pages/Expenses/ExpensesPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavItemKey>('pos');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);

  // Set default view based on user role upon login
  useEffect(() => {
    if (user) {
      if (user.role === 'KITCHEN_STAFF') {
        setActiveTab('kds');
      } else if (user.role === 'CASHIER') {
        setActiveTab('pos');
      }
    }
  }, [user]);

  // Global F1 or ? shortcuts modal listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F1' || (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-bt-bg font-mono">
        <div className="w-8 h-8 bg-bt-brick animate-spin mb-4" />
        <span className="text-xs uppercase font-bold tracking-widest text-bt-charcoal">
          Loading BLOCK THEORY...
        </span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewPage />;
      case 'pos':
        return <POSPage />;
      case 'orders':
        return <OrdersPage />;
      case 'kds':
        return <KDSPage />;
      case 'menu':
        return <MenuPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'customers':
        return <CustomersPage />;
      case 'staff':
        return <StaffPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <POSPage />;
    }
  };

  return (
    <CartProvider>
      <div className="h-screen w-screen flex flex-col bg-bt-bg overflow-hidden select-none">
        <TopNav onOpenShortcuts={() => setIsShortcutsOpen(true)} />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
          <main className="flex-1 overflow-hidden relative">
            {renderActivePage()}
          </main>
        </div>

        <KeyboardShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      </div>
    </CartProvider>
  );
};

export const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;

