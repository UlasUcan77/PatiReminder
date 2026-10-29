import { createApiClient } from "@patireminder/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const TOKEN_KEY = "patireminder.token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Private mode: the session simply won't survive a reload.
    }
  },
};

export const api = createApiClient({
  baseUrl: API_URL,
  getToken: tokenStore.get,
  onUnauthorized: () => {
    tokenStore.set(null);
    window.location.assign("/giris");
  },
});
