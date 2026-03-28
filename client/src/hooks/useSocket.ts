// ============================================================================
// useSocket Hook
// ============================================================================
// Extracted to its own file for React Fast Refresh compatibility.
// Fast Refresh requires files to export only components OR only hooks.
// ============================================================================

import { useContext } from 'react';
import { SocketContext } from '../context/definitions';
import type { SocketContextType } from '../types';

/**
 * Custom hook to access the Socket.IO connection and online users list.
 * Must be used inside a SocketProvider (which must be inside AuthProvider).
 */
export const useSocket = (): SocketContextType => {
  return useContext(SocketContext);
};
