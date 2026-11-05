import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F2', desc: 'Focus Product Search input' },
    { key: 'F3', desc: 'Search / Select Customer' },
    { key: 'F4', desc: 'Jump to Payment selection' },
    { key: 'F8', desc: 'Hold Current Order in Cart' },
    { key: 'F9', desc: 'View and Resume Held Orders' },
    { key: 'Ctrl + Enter', desc: 'Proceed directly to Checkout' },
    { key: 'Escape', desc: 'Close any active modal or dialog' },
    { key: 'Delete', desc: 'Remove highlighted item from Cart' },
    { key: 'F1 / ?', desc: 'Show this keyboard shortcuts guide' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-bt-charcoal w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-bt-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-bt-bg border border-bt-border">
              <Keyboard className="w-5 h-5 text-bt-brick" />
            </div>
            <div>
              <h3 className="font-mono font-bold text-base text-bt-charcoal uppercase tracking-wider">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-bt-muted">High-speed cashier workflow operations</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-bt-bg text-bt-muted hover:text-bt-charcoal transition-colors border border-transparent hover:border-bt-border"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 divide-y divide-bt-border">
          {shortcuts.map(s => (
            <div key={s.key} className="py-2.5 flex items-center justify-between text-xs font-mono">
              <span className="text-bt-charcoal">{s.desc}</span>
              <kbd className="px-2 py-1 bg-bt-bg border border-bt-border font-bold text-bt-brick shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-bt-border text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-bt-charcoal hover:bg-bt-brick text-white font-mono text-xs uppercase font-bold tracking-wider transition-colors"
          >
            Close Guide (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};

