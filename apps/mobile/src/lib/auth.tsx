import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthResponse, PublicUser } from "@patireminder/shared";
import { api, onUnauthorized, tokenStore } from "./api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    await tokenStore.set(null);
    queryClient.clear();
    setToken(null);
    setUser(null);
  }, [queryClient]);

  // Restore the session saved on the device, if it is still valid.
  useEffect(() => {
    onUnauthorized(() => void signOut());
    (async () => {
      const saved = await tokenStore.get();
      if (saved) {
        try {
          setUser(await api.me());
          setToken(saved);
        } catch {
          await tokenStore.set(null);
        }
      }
      setLoading(false);
    })();
  }, [signOut]);

  const signIn = useCallback(async (auth: AuthResponse) => {
    await tokenStore.set(auth.token);
    setToken(auth.token);
    setUser(auth.user);
  }, []);

  return <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}
