import { useColorScheme } from "react-native";

const light = {
  bg: "#f6f7f9",
  surface: "#ffffff",
  text: "#1f2328",
  muted: "#59636e",
  border: "#d8dee4",
  accent: "#0f766e",
  accentText: "#ffffff",
  accentSoft: "#e6f4f1",
  danger: "#cf222e",
  dangerSoft: "#ffebe9",
  warn: "#9a6700",
  warnSoft: "#fff8c5",
};

const dark: typeof light = {
  bg: "#0d1117",
  surface: "#161b22",
  text: "#e6edf3",
  muted: "#9198a1",
  border: "#30363d",
  accent: "#2dd4bf",
  accentText: "#04201d",
  accentSoft: "#0f2e2b",
  danger: "#ff7b72",
  dangerSoft: "#3a1a1a",
  warn: "#d29922",
  warnSoft: "#332a10",
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}
