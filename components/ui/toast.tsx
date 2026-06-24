'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

type ToastVariant = 'default' | 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

type ToastFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const borderColor =
    toast.variant === 'success' ? 'border-l-4 border-l-success' :
    toast.variant === 'error' ? 'border-l-4 border-l-error' :
    '';

  return (
    <div
      className={`bg-white border border-ui-border rounded-md shadow-lg px-4 py-3 text-sm flex items-start gap-3 min-w-[260px] max-w-sm ${borderColor}`}
    >
      {toast.variant === 'success' && <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />}
      {toast.variant === 'error' && <AlertCircle size={16} className="text-error shrink-0 mt-0.5" />}
      <span className="flex-1 text-ui-text">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-ui-text-muted hover:text-ui-text transition-colors shrink-0"
        aria-label="Fermer la notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>((message, variant = 'default') => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
