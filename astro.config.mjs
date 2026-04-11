import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://craftguild.io',
  output: 'server',
  adapter: vercel({
    entrypointResolution: 'auto',
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
