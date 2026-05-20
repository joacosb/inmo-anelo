import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://inmobiliariaanelo.com.ar',
  output: 'static',
  adapter: vercel(),
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'es', locales: { es: 'es-AR' } },
    }),
  ],
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
