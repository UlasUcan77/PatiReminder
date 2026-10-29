import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createApiClient } from "@patireminder/shared";

// In development the API runs on the same machine as the Expo dev server, so
// reuse the host the phone already reaches Expo on. Set EXPO_PUBLIC_API_URL
// for anything else (e.g. a deployed API).
function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:4000`;
  return Platform.OS === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000";
}

export const API_URL = resolveApiUrl();

const TOKEN_KEY = "patireminder.token";
let cached: string | null | undefined;

// The token lives in the Keychain / Keystore on devices, never in plain storage.
export const tokenStore = {
  async get() {
    if (cached !== undefined) return cached;
    cached = Platform.OS === "web" ? localStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
    return cached;
  },
  async set(token: string | null) {
    cached = token;
    if (Platform.OS === "web") {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } else if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

let handleUnauthorized = () => {};
export const onUnauthorized = (fn: () => void) => {
  handleUnauthorized = fn;
};

export const api = createApiClient({
  baseUrl: API_URL,
  getToken: () => tokenStore.get(),
  onUnauthorized: () => handleUnauthorized(),
});
