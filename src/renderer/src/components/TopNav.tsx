import React, { useState, useEffect } from 'react';
import { 
  Database, 
  ShieldCheck, 
  HelpCircle, 
  LogOut, 
  MapPin, 
  Clock, 
  User as UserIcon,
  Minus,
  Square,
  X
} from 'lucide-react';
import { BlockTheoryLogo } from './BlockTheoryLogo';
import { useAuth } from '../context/AuthContext';

interface TopNavProps {
  onOpenShortcuts: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenShortcuts }) => {
  const { user, logout } = useAuth();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' • ' + now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => window.api.minimizeWindow();
  const handleMaximize = () => window.api.maximizeWindow();
  const handleClose = () => window.api.closeWindow();

  const roleColors = {
    OWNER: 'bg-bt-brick text-white',
    MANAGER: 'bg-bt-charcoal text-white',
    CASHIER: 'bg-bt-beige text-bt-charcoal font-bold',
    KITCHEN_STAFF: 'bg-bt-concrete text-bt-charcoal font-bold',
  };

  return (
    <header className="h-14 bg-white border-b border-bt-border px-4 flex items-center justify-between select-none flex-shrink-0 z-20">
      {/* Left: Branding & Outlet */}
      <div className="flex items-center gap-6">
        <BlockTheoryLogo size="sm" showSubtitle={false} />

        <div className="h-6 w-px bg-bt-border" />

        <div className="flex items-center gap-1.5 text-xs font-mono text-bt-charcoal">
          <MapPin className="w-3.5 h-3.5 text-bt-brick" />
          <span className="font-semibold">Alwarpet Flagship Store</span>
          <span className="text-bt-muted text-[11px]">(Chennai, TN)</span>
        </div>
      </div>

      {/* Middle: Live Clock & System Health */}
      <div className="flex items-center gap-5 text-xs font-mono">
        <div className="flex items-center gap-2 text-bt-charcoal bg-bt-bg px-2.5 py-1 border border-bt-border">
          <Clock className="w-3.5 h-3.5 text-bt-muted" />
          <span>{time}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-1 border border-emerald-200" title="Local SQLite WAL Database Connected">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-[11px]">SQLITE ACTIVE</span>
        </div>

        <div className="flex items-center gap-1.5 bg-bt-bg text-bt-muted px-2 py-1 border border-bt-border" title="Automatic Database Snapshot Enabled">
          <ShieldCheck className="w-3.5 h-3.5 text-bt-brick" />
          <span className="text-[11px]">BACKUP SAFE</span>
        </div>
      </div>

      {/* Right: User Profile, Shortcuts, Window controls */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 pl-2">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-bt-charcoal font-mono leading-tight">
                {user.name}
              </span>
              <span className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded-none tracking-widest mt-0.5 inline-block ${roleColors[user.role]}`}>
                {user.role.replace('_', ' ')}
              </span>
            </div>
            <div className="w-8 h-8 rounded-none bg-bt-charcoal text-white flex items-center justify-center font-bold text-xs font-mono border border-bt-charcoal">
              {user.name.charAt(0)}
            </div>
          </div>
        )}

        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (F1 or ?)"
          className="p-1.5 hover:bg-bt-bg text-bt-muted hover:text-bt-charcoal transition-colors border border-transparent hover:border-bt-border ml-1"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={logout}
          title="Log Out"
          className="p-1.5 hover:bg-red-50 text-bt-muted hover:text-bt-brick transition-colors border border-transparent hover:border-bt-border"
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* Minimal Window Controls */}
        <div className="flex items-center ml-2 border-l border-bt-border pl-2 gap-1">
          <button
            onClick={handleMinimize}
            className="p-1 hover:bg-bt-bg text-bt-muted hover:text-bt-charcoal"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="p-1 hover:bg-bt-bg text-bt-muted hover:text-bt-charcoal"
            title="Maximize"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-red-600 hover:text-white text-bt-muted transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

