/**
 * AuthContext — "who is logged in, and what may they do?"  (SC-STAFF version)
 *
 *   can(permission) — true if the person may use that part of the admin.
 *   The owner can do everything. Staff get a list from the server.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  type AdminUser,
} from "@/api/auth";
import { getToken } from "@/lib/auth";

interface AuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  can: (permission?: string | null) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const u = await fetchCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const can = useCallback(
    (permission?: string | null) => {
      if (!permission) return true;
      const perms = user?.permissions ?? [];
      return perms.includes("*") || perms.includes(permission);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refresh, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
