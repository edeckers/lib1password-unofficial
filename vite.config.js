import { defineConfig, loadEnv } from 'vite';
import path from "path";

import tailwindcss from '@tailwindcss/vite';

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, __dirname);

  console.log(`[vite.config.js]> ${command} --mode=${mode}`);
  console.log('Environment variables:', env);

  return {
    root: 'src',
    publicDir: '../public',
    resolve: {
      alias: {
        '~': path.resolve(__dirname, 'src/js/'),
      },
    },
    plugins: [tailwindcss()],
    build: {
      outDir: '../dist',
      emptyOutDir: true,
    },
    server: {
      host: env.VITE_SERVER_HOSTNAME,
      port: env.VITE_SERVER_PORT,
    },
  };
});
