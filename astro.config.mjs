import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://craftguild.io',
  adapter: vercel({
    entrypointResolution: 'auto',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
