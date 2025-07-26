import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.',
        }
      ],
    }),
  ],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        main: './index.html',
        'content-script': './src/content-script.ts',
        'background': './src/background.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return (chunkInfo.name === 'content-script' || chunkInfo.name === 'background') 
            ? '[name].js' 
            : 'assets/[name]-[hash].js';
        },
      },
    },
  },
});