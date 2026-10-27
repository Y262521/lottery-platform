import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiClient, token } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, if we have an access token, try to hydrate the user.
  const hydrate = useCallback(async () => {
    if (!token.access) {
      setLoading(false);
      return;
    }
    try {
      const me = await apiClient.me();
      setUser(me);
    } catch {
      token.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = async (email, password) => {
    const { access_token, refresh_token } = await apiClient.login({ email, password });
    token.set(access_token, refresh_token);
    const me = await apiClient.me();
    setUser(me);
    return me;
  };

  const logout = () => {
    token.clear();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await apiClient.me();
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUser, isAdmin: user?.role === "ADMIN" }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
