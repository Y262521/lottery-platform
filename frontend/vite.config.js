import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy API calls to the FastAPI backend so the frontend can use same-origin
// paths like /api/... during local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
