// ============================================================================
// ProtectedRoute Component
// ============================================================================
// A wrapper component that protects routes requiring authentication.
// If the user is not logged in, they are redirected to the login page.
//
// Usage in App.tsx:
//   <Route path="/" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
// ============================================================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Show loading spinner while verifying the token
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render the protected content
  return <>{children}</>;
};
