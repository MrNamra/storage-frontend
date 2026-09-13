import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, Plugin } from "vite"
import { syncToLaravel } from "./sync-to-laravel.js"

function autoSyncToLaravelPlugin(): Plugin {
  return {
    name: "auto-sync-to-laravel",
    closeBundle() {
      syncToLaravel()
    },
  }
}

export default defineConfig({
  plugins: [react(), autoSyncToLaravelPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

