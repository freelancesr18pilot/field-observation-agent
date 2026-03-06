// In dev, VITE_API_URL is undefined — Vite's proxy forwards /api/* to localhost:3001.
// In production (Render), VITE_API_URL is injected at build time from the backend service URL.
export const API_BASE = import.meta.env.VITE_API_URL || "";
