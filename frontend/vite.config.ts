import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss() as any,
    // generate .gz alongside assets (JS/CSS/JSON/SVG)
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      filter: (file) => /\.(js|css|json|svg|xml|txt)$/i.test(file),
      threshold: 1024,
    }),
  ],
  // optional: base: '/',
})
