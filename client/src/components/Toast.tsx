// ============================================================================
// Toast Notification Component
// ============================================================================
// A lightweight, auto-dismissing notification system.
// Supports success, error, warning, and info variants.
// Usage: import { useToast } from '../hooks/useToast'; const { showToast } = useToast();
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ToastContext } from '../hooks/useToast';

// ── Types ───────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// ── Single Toast ────────────────────────────────────────────────────────────

const TOAST_COLORS: Record<ToastType, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const SingleToast = ({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: number) => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  return (
    <div
      className={`${TOAST_COLORS[item.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-72 max-w-sm animate-slide-in`}
    >
      <span className="text-lg font-bold shrink-0">{TOAST_ICONS[item.type]}</span>
      <p className="text-sm flex-1">{item.message}</p>
      <button
        onClick={() => onRemove(item.id)}
        className="shrink-0 text-white/70 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
};

// ── Provider ────────────────────────────────────────────────────────────────

let nextId = 1;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container — fixed top-right */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-100 flex flex-col gap-2">
          {toasts.map((item) => (
            <SingleToast key={item.id} item={item} onRemove={removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
