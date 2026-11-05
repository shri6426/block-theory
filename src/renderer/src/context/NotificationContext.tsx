import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface NotificationContextType {
  notify: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const notify = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, title, message };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = (title: string, message?: string) => notify('success', title, message);
  const error = (title: string, message?: string) => notify('error', title, message);
  const warning = (title: string, message?: string) => notify('warning', title, message);
  const info = (title: string, message?: string) => notify('info', title, message);

  return (
    <NotificationContext.Provider value={{ notify, success, error, warning, info }}>
      {children}

      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(t => {
          const borders = {
            success: 'border-l-4 border-l-emerald-600',
            error: 'border-l-4 border-l-bt-brick',
            warning: 'border-l-4 border-l-amber-500',
            info: 'border-l-4 border-l-bt-charcoal',
          };
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
            error: <XCircle className="w-5 h-5 text-bt-brick flex-shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
            info: <Info className="w-5 h-5 text-bt-charcoal flex-shrink-0" />,
          };

          return (
            <div
              key={t.id}
              className={`pointer-events-auto bg-white border border-bt-border shadow-lg p-3.5 flex items-start gap-3 transition-all animate-in slide-in-from-right-4 duration-200 ${borders[t.type]}`}
            >
              {icons[t.type]}
              <div className="flex-1">
                <div className="font-semibold text-sm text-bt-charcoal">{t.title}</div>
                {t.message && (
                  <div className="text-xs text-bt-muted mt-0.5 leading-snug">{t.message}</div>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-bt-concrete hover:text-bt-charcoal p-1 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

