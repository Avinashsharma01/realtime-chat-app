// ============================================================================
// App — Root Component
// ============================================================================
// Sets up routing and wraps the entire app with context providers:
//   1. BrowserRouter — Enables URL-based routing
//   2. AuthProvider  — Provides authentication state everywhere
//   3. SocketProvider — Manages the Socket.IO connection
//
// Routes:
//   /login    → Login page (public)
//   /register → Register page (public)
//   /         → Chat page (protected — requires authentication)
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Chat } from './pages/Chat';

function App() {
  return (
    <BrowserRouter>
      {/* AuthProvider must wrap SocketProvider (socket needs auth token) */}
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected route — redirects to /login if not authenticated */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all: redirect unknown routes to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
