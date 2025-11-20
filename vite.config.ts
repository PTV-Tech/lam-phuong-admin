import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api/airtable": {
        target: "https://airtable.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/airtable/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - separate large third-party libraries
          if (id.includes('node_modules')) {
            // React and React DOM
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            // React Query
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            // Markdown and editor libraries (heavy)
            if (id.includes('react-markdown') || id.includes('react-simplemde-editor') || id.includes('easymde')) {
              return 'markdown-vendor';
            }
            // UI libraries
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            // Database/Storage libraries
            if (id.includes('idb') || id.includes('indexeddb')) {
              return 'storage-vendor';
            }
            // Utility libraries
            if (id.includes('slugify') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
              return 'utils-vendor';
            }
            // Other vendor libraries
            return 'vendor';
          }
          
          // Application chunks - group related features
          if (id.includes('/src/pages/')) {
            // Job posting related pages
            if (id.includes('JobPosting')) {
              return 'job-posting-pages';
            }
            // Other pages
            return 'pages';
          }
          
          // Components
          if (id.includes('/src/components/')) {
            // Heavy components
            if (id.includes('JobPosting') || id.includes('Markdown') || id.includes('SimpleMDE')) {
              return 'job-components';
            }
            // UI components
            if (id.includes('/ui/')) {
              return 'ui-components';
            }
            return 'components';
          }
          
          // API and utilities
          if (id.includes('/src/lib/') || id.includes('/src/hooks/')) {
            return 'utils';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
