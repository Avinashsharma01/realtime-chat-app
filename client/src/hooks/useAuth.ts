// ============================================================================
// useAuth Hook
// ============================================================================
// Extracted to its own file for React Fast Refresh compatibility.
// Fast Refresh requires files to export only components OR only hooks.
// ============================================================================

import { useContext } from 'react';
import { AuthContext } from '../context/definitions';
import type { AuthContextType } from '../types';

/**
 * Custom hook to access authentication state and methods.
 * Must be used inside an AuthProvider.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
};
