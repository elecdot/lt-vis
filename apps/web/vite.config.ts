import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ltvis/shared': path.resolve(__dirname, '../..', 'packages/shared/src'),
      '@ltvis/model': path.resolve(__dirname, '../..', 'packages/model-ts/src')
    }
  },
  server: {
    port: 5173
  }
});
