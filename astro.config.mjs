import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://inmobiliariaanelo.com.ar',
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
