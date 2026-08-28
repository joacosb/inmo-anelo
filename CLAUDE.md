# Inmobiliaria Añelo — Contexto del proyecto

## Stack actual

| Capa | Tecnología |
|---|---|
| Framework | Astro 5 (output: static + SSR por página con `export const prerender = false`) |
| Adapter | `@astrojs/vercel` — deploy en Vercel |
| Base de datos | Supabase (PostgreSQL) |
| Auth admin | Supabase Auth (email/password) |
| Storage imágenes | Supabase Storage — bucket `property-images` (público) |
| Estilos | **Tailwind CSS v4** (`@import "tailwindcss"`) en `src/styles/global.css` con variables centralizadas en `@theme` |
| Iconos | Lucide (CDN) |
| Fuentes | Google Fonts — Cormorant Garamond (títulos display) + Montserrat (cuerpo) |
| Analytics | Google Tag Manager + Google Ads conversion tracking |

## Estructura de archivos clave

```
src/
  lib/
    supabase.ts          — cliente Supabase, tipos (Property, etc.), helpers statusClass/zoneLabel
  middleware.ts          — protege /admin/* con cookie sb_token
  pages/
    index.astro          — homepage estática (hero, portafolio directo sin modal, pasos)
    corporativo.astro    — SSR, lee propiedades de Supabase (modal de detalle propio)
    alquiler/            — grilla + mapa de alquiler permanente en bg-brand-black
      index.astro
      [slug].astro       — ficha pública con ListingDetail.astro en dark luxury
    venta/               — grilla + mapa de propiedades en venta en bg-brand-black
      index.astro
      [slug].astro       — ficha pública con ListingDetail.astro en dark luxury
    invertir.astro       — estática
    nosotros.astro       — estática
    contacto.astro       — estática
    admin/
      index.astro        — login (POST → set cookie sb_token)
      logout.astro       — borra cookie, redirige
      dashboard/         — métricas rápidas con tarjetas dark luxury (#242420)
      propiedades/
        index.astro      — lista de propiedades con toggle de estado 1-click
        [id].astro       — formulario de edición completa + gestión de fotos + preview de portada
        nueva.astro      — alta de nueva propiedad
      homepage/          — gestión del portafolio destacado
  components/
    Navbar.astro         — navbar principal fijo (selector nav#navbar), breakpoint md:flex para menú
    Footer.astro         — pie de página unificado (sin mención de marcas secundarias)
    PropertyCard.astro   — tarjeta modular dark luxury (#242420). Soporta enlaces directos y hideStatus
    ListingsBrowser.astro— buscador de /venta/ y /alquiler/ con filtros oscuros y Leaflet
    ListingDetail.astro  — vista de detalle pública en contenedor oscuro con ficha técnica y mapa
  layouts/
    Layout.astro         — layout público (navbar, footer, WhatsApp float)
    AdminLayout.astro    — layout admin dark luxury (#1B1B18 / #242420) con marca oficial
  styles/
    global.css           — Tailwind v4, tokens @theme centralizados y reseteos globales
```

## Convenciones del Sistema de Diseño y CSS (Tailwind CSS v4)

- **Fuente de Verdad**: `@theme` en `src/styles/global.css` define la paleta oficial:
  - `--color-brand-black: #1B1B18`
  - `--color-brand-gold: #c9a84c`
  - `--color-brand-gold-light: #e8c97a`
  - `--font-display: 'Cormorant Garamond'`
  - `--font-body: 'Montserrat'`
- **Modularidad por Componente**: Los componentes Astro deben mantenerse aislados en sus archivos usando clases de Tailwind (ej. `bg-[#242420]`, `text-brand-gold`, `font-display`, `border-stone-800`, `rounded-2xl`) o bloques `<style>` específicos del archivo.
- **Sin Colisiones Globales**: En `global.css` NUNCA deben ponerse reglas genéricas a etiquetas HTML (ej. `nav { ... }`, `section { padding: … }` o `footer { … }`) que puedan colisionar con componentes específicos. Si un grupo de secciones legacy necesita el padding clásico, se usa la clase explícita `.section-pad`.
- **Todo el CSS propio va en una `@layer`**: Tailwind v4 declara `@layer theme, base, components, utilities`. El CSS **sin capa siempre le gana a las utilidades de Tailwind**, sin importar la especificidad. Por eso `global.css` tiene exactamente dos bloques:
  - `@layer base { … }` — tokens `:root`, `html`, `body`. El reseteo `* { margin: 0; padding: 0 }` NO se reescribe: ya lo aplica el preflight de Tailwind. Escribirlo fuera de capa anula todos los `p-*`, `m-*`, `mx-auto` y `space-y-*` del sitio.
  - `@layer components { … }` — todos los estilos legacy por clase (`.hero`, `.prop-card`, `.build-*`, etc.), de modo que las utilidades de Tailwind siempre puedan sobrescribirlos.
- **Alto del navbar**: única fuente de verdad en `--nav-h` (`:root`). Lo consumen `Navbar.astro` (`h-[var(--nav-h)]`), el offset del contenido en `Layout.astro` (`pt-[var(--nav-h)]`), `html { scroll-padding-top }` para los anclas, `.hero` y `.build-sticky`. Nunca hardcodear `70px` / `88px`.
- **Navbar y Footer son 100% Tailwind**: `Navbar.astro` y `Footer.astro` no dependen de ninguna regla en `global.css` (no existen `.nav-links`, `.nav-logo`, `.footer-top`, etc.).

## Portafolio y Navegación Directa (Homepage `index.astro`)

- Las tarjetas del portafolio en `index.astro` no muestran badges de ocupación (`hideStatus={true}`).
- Cada tarjeta navega directamente a la sección correspondiente mediante hipervínculos nativos (`<a>`), sin abrir modales genéricos intermedios (`noModal={true}`):
  - **Unidades Funcionales**: `/corporativo/#secComplejos`
  - **Complejos Residenciales**: `/corporativo/#secComplejos`
  - **Edificios de Departamentos**: `/corporativo/#secEdificios`
  - **Lotes e Inversión**: `/venta/?tipo=terreno`

## Venta y Alquiler Permanente (`/venta/`, `/alquiler/`)

- Ambas páginas están envueltas en el contenedor oscuro `bg-brand-black` para continuidad visual con el hero y la navbar.
- **`ListingsBrowser.astro`**: Filtros en panel elevado `#242420` con bordes dorados y tarjetas dark luxury.
- **`ListingDetail.astro`**: Ficha `/venta/[slug]` y `/alquiler/[slug]` sobre fondo oscuro `bg-brand-black`, panel de ficha técnica `#242420` en blanco/dorado de alto contraste y breadcrumbs con links claros.

## Panel Administrador (`/admin/`)

- Toda la interfaz administrativa (`AdminLayout.astro`, `dashboard`, `propiedades`, `homepage`) está unificada bajo la misma línea estética **dark luxury** (`#1B1B18` / `#242420`), marcas en dorado y fuentes `Cormorant Garamond` / `Montserrat`.

---

## Modelo de datos — tabla `properties` en Supabase

```sql
id             uuid PK
name           text
slug           text UNIQUE
type           enum (complejo | edificio | uf)
zone           enum (centro | forestada)
status         enum (available | occupied | partial)
status_text    text   -- badge custom: "Ocupado", "¡Quedan 2!", etc.
description    text
cover_image    text   -- URL pública en Supabase Storage (o path legacy /xxx.webp)
cover_position text   -- object-position CSS para el encuadre del card, ej: "42% 30%". DEFAULT '50% 50%'
images         text[] -- todas las fotos de la propiedad (URLs de Supabase Storage)
unit_count     int    -- cantidad de UFs
max_guests     int
matterport_url text
sort_order     int
active         bool
created_at / updated_at timestamptz
```
