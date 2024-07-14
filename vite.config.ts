import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from "fs";

const NODE_ENV = process.env.NODE_ENV ?? "development";

// https://vitejs.dev/config/
export default defineConfig({
  server:
    NODE_ENV === "development"
      ? {
          https: {
            key: fs.readFileSync("./localhost-key.pem"),
            cert: fs.readFileSync("./localhost.pem"),
          },
        }
      : {},
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1024,
  },
})
