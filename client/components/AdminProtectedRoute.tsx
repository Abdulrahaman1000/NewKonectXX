/**
 * AdminProtectedRoute — wraps admin pages.
 *
 * Behavior:
 *  - While checking auth (initial mount): show a spinner
 *  - If not logged in: redirect to /admin/login, remembering the intended page
 *  - If logged in: render the children
 *
 * Usage in App.tsx:
 *   <Route
 *     path="/admin"
 *     element={
 *       <AdminProtectedRoute>
 *         <AdminDashboard />
 *       </AdminProtectedRoute>
 *     }
 *   />
 */

import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: ReactNode;
}

export function AdminProtectedRoute({ children }: Props) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
