/**
 * AdminProtectedRoute  (SC-STAFF version)
 *  - checking login: spinner
 *  - not logged in: go to /admin/login
 *  - logged in but this role may not use the page: back to /admin
 *  - otherwise: show the page
 *
 * <AdminProtectedRoute perm="stock.use"> ... </AdminProtectedRoute>
 * No perm = any signed-in person. perm="owner" = owner only.
 */
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: ReactNode;
  perm?: string;
}

export function AdminProtectedRoute({ children, perm }: Props) {
  const { user, isLoading, can } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (perm && !can(perm)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
