import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AuthResponse, PublicUser } from "@patireminder/shared";
import { api, tokenStore } from "./api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(tokenStore.get);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && setToken(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const signIn = useCallback((auth: AuthResponse) => {
    tokenStore.set(auth.token);
    setToken(auth.token);
    setUser(auth.user);
    setLoading(false);
  }, []);

  const signOut = useCallback(() => {
    tokenStore.set(null);
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}
