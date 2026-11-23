// The clickable demo: the real panel with a pretend server inside the page
// (src/demo). It never talks to a real server, so it needs no address.
// Build with: npx vite build --config vite.demo.config.ts  →  dist-demo/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist-demo",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: { input: "demo.html" },
  },
});
