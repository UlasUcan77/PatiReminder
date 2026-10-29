import { createContext, useContext } from "react";
import type { AuthResponse, PublicUser } from "@patireminder/shared";

export type AuthState = {
  user: PublicUser | null;
  token: string | null;
  loading: boolean;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
