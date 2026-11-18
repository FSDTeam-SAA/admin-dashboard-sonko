// The server address comes from VITE_API_BASE_URL at build time. A real
// build refuses to start without an https address (see vite.config.ts).
const raw = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const API_BASE = raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
