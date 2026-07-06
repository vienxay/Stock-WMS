import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // ให้เข้าถึงได้จาก LAN/tunnel (ngrok) ไม่ใช่แค่ localhost
    allowedHosts: true, // อนุญาต Host header จาก ngrok (โดเมนสุ่มเปลี่ยนทุกครั้งที่รัน)
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
