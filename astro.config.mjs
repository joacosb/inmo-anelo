import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://inmobiliariaanelo.com.ar',
  output: 'static',
  adapter: vercel({
    // Optimización de imágenes en runtime vía Vercel Image Optimization (/_vercel/image).
    // Resuelve resize + conversión a webp para las URLs dinámicas de Supabase Storage.
    imageService: true,
    imagesConfig: {
      // Widths permitidos — el helper getImageUrl() sólo emite valores de esta lista.
      sizes: [256, 384, 640, 750, 828, 1080, 1200, 1920],
      // El host autorizado sale de `image.domains` (abajo).
      formats: ['image/webp'],
      minimumCacheTTL: 2678400, // 31 días
    },
  }),
  // Autoriza el host de Supabase para el servicio de imágenes de Astro.
  image: {
    domains: ['qwhasgdxhvdavnofmisf.supabase.co'],
  },
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
