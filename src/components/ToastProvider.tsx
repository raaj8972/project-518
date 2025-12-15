import React, { createContext, useCallback, useContext, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  ttl?: number; // ms
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const ttl = toast.ttl ?? 3000;
    const full: Toast = { id, ...toast, ttl };
    setToasts(t => [...t, full]);
    if (ttl > 0) {
      setTimeout(() => remove(id), ttl);
    }
  }, [remove]);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
      <div className="fixed z-[10000] top-3 right-3 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded shadow text-sm font-medium flex items-start gap-3 border backdrop-blur bg-white/90 animate-slide-in-right ${t.type==='error' ? 'border-red-300 text-red-800 bg-red-50/80' : t.type==='success' ? 'border-green-300 text-green-800 bg-green-50/80' : 'border-blue-300 text-blue-800 bg-blue-50/80'}`}
          >
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform: translateX(0);} }
        .animate-slide-in-right { animation: slideInRight 0.35s cubic-bezier(.4,.0,.2,1); }
      `}</style>
    </ToastContext.Provider>
  );
};
