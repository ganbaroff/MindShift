import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      manifest: {
        name: 'MindShift',
        short_name: 'MindShift',
        description: 'ADHD-aware AI productivity co-pilot',
        theme_color: '#6C63FF',
        background_color: '#0F1117',
        display: 'standalone',
        scope: '/',
        start_url: '/?source=pwa',
        orientation: 'portrait',
        categories: ['productivity', 'health'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // maskable: Android adaptive icon — content sits within the 80% safe zone
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
      },
    }),
    // Bundle analyzer — active only when ANALYZE=true env var is set
    // Usage: ANALYZE=true npm run build → open dist/bundle-report.html
    // Install once: npm install -D rollup-plugin-visualizer
    ...(process.env.ANALYZE === 'true' ? [
      visualizer({
        filename: 'dist/bundle-report.html',
        open: false,
        gzipSize: true,
        template: 'treemap',
      }),
    ] : []),
  ],
  preview: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion':   ['motion/react'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query':    ['@tanstack/react-query'],
          'vendor-ui':       ['zustand', 'sonner', 'lucide-react'],
          // dnd-kit only used in BentoGrid (HomeScreen) — split to prevent
          // polluting the main bundle for users who never visit HomeScreen.
          // BentoGrid is lazy-loaded, so this chunk defers until HomeScreen renders.
          'vendor-dnd':      ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
  },
})
