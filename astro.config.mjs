import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.URL || "https://haidarra82066.github.io",
  base: process.env.BASE_PATH || "/",
  output: "static",
  build: {
    format: "directory"
  },
  vite: {
    optimizeDeps: {
      exclude: ["aria-query", "axobject-query"]
    },
    build: {
      sourcemap: false
    }
  }
});
