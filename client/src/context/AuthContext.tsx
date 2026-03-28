// ============================================================================
// Authentication Context
// ============================================================================
// Provides authentication state and methods to the entire React app.
//
// HOW IT WORKS:
//   1. On app load, checks localStorage for an existing JWT token
//   2. If found, verifies it by calling GET /api/auth/me
//   3. If valid, sets the user state (user is "logged in")
//   4. Provides login(), register(), and logout() methods
//
// Any component can access auth state via the useAuth() hook:
//   const { user, login, logout } = useAuth();
//
// WHY CONTEXT?
//   Authentication state is needed everywhere (navbar, route protection,
//   socket connection, API calls). Context avoids "prop drilling" —
//   passing auth data through every intermediate component.
// ============================================================================

import {
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../types';
import { AuthContext } from './definitions';

// Provider is available through this export, context object through ./definitions

// ── Provider Component ──────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Current authenticated user (null = not logged in)
  const [user, setUser] = useState<User | null>(null);
  // JWT token stored in state (synced with localStorage)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token'),
  );
  // Loading state while verifying stored token
  const [loading, setLoading] = useState<boolean>(true);

  // ── Verify Token on Mount ───────────────────────────────────────────────
  // When the app loads, check if there's a stored token and verify it
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Call GET /api/auth/me to verify the token is still valid
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        // Token is invalid or expired — clear it
        console.warn('Stored token is invalid, clearing...');
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<void> => {
    const response = await authService.login(email, password);
    // Store token in localStorage for persistence across page reloads
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async (
    username: string,
    email: string,
    password: string,
  ): Promise<void> => {
    const response = await authService.register(username, email, password);
    // Auto-login after registration
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = (): void => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
