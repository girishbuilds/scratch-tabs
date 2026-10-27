import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

const shouldAnalyzeBundle = process.env.ANALYZE === "true";

// https://vitejs.dev/config/
export default defineConfig({
  // Sharded e2e runs give each dev server its own dep cache so they don't race on node_modules/.vite
  cacheDir: process.env.VITE_CACHE_DIR || undefined,
  server: {
    // E2E reports/screenshots are written into the project; don't let them trigger page reloads mid-test
    watch: { ignored: ["**/reports/**"] },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon-gray.svg",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-icon-512.png",
      ],
      manifest: {
        name: "Scratch Tabs",
        short_name: "Scratch Tabs",
        description:
          "A privacy-first, local-first developer workspace with smart views, transformation pipelines, and utility tools.",
        theme_color: "#111827",
        background_color: "#111827",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icons/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest,woff2}"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
    shouldAnalyzeBundle &&
      visualizer({
        filename: "dist/stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Monaco Editor into its own chunk
          monaco: ["@monaco-editor/react"],
          // Separate AI libraries into their own chunk
          ai: ["@xenova/transformers", "@huggingface/transformers"],
          // Separate large UI libraries
          ui: ["framer-motion", "recharts", "roughjs"],
          // Separate math library
          math: ["mathjs"],
          // Separate utility libraries
          utils: ["lodash-es", "date-fns", "crypto-js"],
          // Separate drag and drop libraries
          dnd: [
            "@dnd-kit/core",
            "@dnd-kit/sortable",
            "@dnd-kit/modifiers",
            "@dnd-kit/utilities",
          ],
          // Separate table libraries
          table: ["@tanstack/react-table", "@tanstack/react-virtual"],
          // Separate React Router
          router: ["react-router-dom"],
          // Separate markdown libraries
          markdown: ["react-markdown", "remark-gfm"],
        },
      },
    },
    // Enable chunk size warnings
    chunkSizeWarningLimit: 1000,
    minify: "esbuild",
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: [
      // Pre-bundle frequently used dependencies
      "react",
      "react-dom",
      "zustand",
      "clsx",
      "uuid",
      "js-yaml",
      "papaparse",
      "jszip",
      "cron-parser",
      "cronstrue",
      "ics",
      "jose",
      "jwt-decode",
      "punycode",
      "string-similarity",
      "use-undo",
    ],
  },
  // Enable tree shaking
  esbuild: {
    treeShaking: true,
  },
});
