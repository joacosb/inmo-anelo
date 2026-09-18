/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /**
     * Qué secciones del sitio tienen contenido publicado, memoizado por request
     * (lo define `src/middleware.ts`). Las páginas prerenderizadas no pasan por
     * el middleware, así que quien lo use debe tolerar que sea `undefined` y
     * llamar a `getSiteContent()` directamente.
     */
    siteContent?: () => Promise<import('./lib/site-content').SiteContent>;
  }
}
