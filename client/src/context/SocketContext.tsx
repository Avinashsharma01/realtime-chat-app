// ============================================================================
// Socket.IO Context
// ============================================================================
// Manages the WebSocket connection for real-time communication.
//
// HOW IT WORKS:
//   1. When a user is authenticated (has a token), connect to Socket.IO
//   2. Send the JWT token during the handshake for server-side auth
//   3. Listen for online/offline events to track active users
//   4. Provide the socket instance and online users list to all components
//
// WHY A SEPARATE CONTEXT?
//   The socket connection depends on authentication state. By putting it
//   in its own context (nested inside AuthProvider), it automatically
//   connects/disconnects when the user logs in/out.
// ============================================================================

import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { SocketContext } from './definitions';

// Socket.IO server URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Provider is available through this export, context object through ./definitions

// ── Provider Component ──────────────────────────────────────────────────────

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    // Only connect if the user is authenticated
    if (!token || !user) return;

    // Create a new socket connection
    const newSocket = io(SOCKET_URL, {
      auth: { token }, // Send JWT for server-side authentication
    });

    // ── Socket Event Handlers ─────────────────────────────────────────────

    newSocket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO server');
    });

    // Receive the full list of online users (sent on initial connect)
    newSocket.on('users:online', (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    // A user came online — add to the list
    newSocket.on('user:online', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      });
    });

    // A user went offline — remove from the list
    newSocket.on('user:offline', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    setSocket(newSocket);

    // Cleanup: disconnect when component unmounts or dependencies change
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
    };
  }, [token, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
