import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  target: "node22",
  clean: true,
  // The shared package ships TypeScript source, so bundle it into the output.
  noExternal: ["@patireminder/shared"],
});
