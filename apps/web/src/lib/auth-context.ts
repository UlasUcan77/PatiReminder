import { createContext, useContext } from "react";
import type { AuthResponse, PublicUser } from "@patireminder/shared";

export type AuthState = {
  user: PublicUser | null;
  token: string | null;
  loading: boolean;
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
};

// Kept apart from the provider component so React Fast Refresh can reload
// auth.tsx without losing the context.
export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
