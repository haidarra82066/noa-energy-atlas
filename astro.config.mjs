import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.URL || "https://noa-energy-atlas.netlify.app",
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
