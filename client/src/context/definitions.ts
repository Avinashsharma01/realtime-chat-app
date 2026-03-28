// Context object definitions — separated for React Fast Refresh compatibility.
// Fast Refresh requires files to export ONLY components, OR only non-components.

import { createContext } from 'react';
import type { AuthContextType, SocketContextType } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
});
