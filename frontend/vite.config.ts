import path from "node:path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"

import {
  defineConfig,
} from "vite"

export default defineConfig({
  base: "./",

  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      "@": path.resolve(
        import.meta.dirname,
        "./src",
      ),
    },
  },

  build: {
    outDir:
      "dist",

    emptyOutDir:
      true,

    manifest:
      true,
  },

  server: {
    allowedHosts: [
      ".trycloudflare.com",
      ".ngrok-free.app",
    ],

    proxy: {
      "/api": {
        target:
          "http://localhost:3000",

        changeOrigin:
          true,

        rewrite: (
          requestPath,
        ) =>
          requestPath.replace(
            /^\/api/,
            "",
          ),
      },
    },
  },
})