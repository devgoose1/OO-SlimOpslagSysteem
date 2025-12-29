import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
// Optionele HTTPS config voor PWA install banners op mobiel
const keyPath = path.resolve(__dirname, 'localhost+2-key.pem')
const certPath = path.resolve(__dirname, 'localhost+2.pem')
const httpsConfig = fs.existsSync(keyPath) && fs.existsSync(certPath)
  ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
  : undefined

export default defineConfig({
  plugins: [react()],
  base: '/OO-SlimOpslagSysteem/', // <<< BELANGRIJK voor GitHub Pages
  server: {
    host: '0.0.0.0', // Luister op alle network interfaces
    port: 5173,
    strictPort: true,
    // https: httpsConfig, // Uitgeschakeld voor iPhone compatibiliteit
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  }
})
