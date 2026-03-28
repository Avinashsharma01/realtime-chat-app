// ============================================================================
// useToast Hook
// ============================================================================
// Provides access to the toast notification system.
// Must be used within a ToastProvider.
// ============================================================================

import { useContext, createContext } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
