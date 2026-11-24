
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],

  server: {
    host: "localhost",
    port: 5173,

    proxy: {
      "/api/scan-inquiry": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        timeout: 140000,
        proxyTimeout: 140000
      }
    }
  }
});
