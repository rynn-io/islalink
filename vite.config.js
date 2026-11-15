import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `allowedHosts` lets the demo be served through the Cloudflare tunnel
// (Vite blocks unknown Host headers by default).
export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 4180, allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'] },
  preview: { host: '0.0.0.0', port: 4180, allowedHosts: ['.trycloudflare.com', 'localhost', '127.0.0.1'] },
})
