import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
  return {
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true,
    watch: { ignored: ['**/.qa/**', '**/.tmp/**'] },
  },
  };
});
