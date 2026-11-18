/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// A real build talks only to the SunuPay server over https, and the page
// carries a Content-Security-Policy that lets it load nothing else: no
// outside scripts, no inline scripts, no framing. The host (render.yaml)
// sends the same rules as headers, which also stop the panel being framed.
function securityPolicy(apiOrigin: string): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: https://res.cloudinary.com",
    `connect-src 'self' ${apiOrigin}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");
  return {
    name: "sunu-security-policy",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "<!--CSP-->",
        `<meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const base = (env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  if (command === "build" && mode !== "test" && !base.startsWith("https://")) {
    throw new Error("Set VITE_API_BASE_URL to the server's https address before building.");
  }
  const apiOrigin = base ? new URL(base).origin : "";
  return {
    plugins: [react(), securityPolicy(apiOrigin)],
    build: { sourcemap: false },
    test: { environment: "happy-dom", include: ["test/**/*.test.ts", "test/**/*.test.tsx"] },
  };
});
