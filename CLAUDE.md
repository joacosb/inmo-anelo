# Inmobiliaria Añelo — Contexto del proyecto

## Stack actual

| Capa | Tecnología |
|---|---|
| Framework | Astro 5 (output: static + SSR por página con `export const prerender = false`) |
| Adapter | `@astrojs/vercel` — deploy en Vercel |
| Base de datos | Supabase (PostgreSQL) |
| Auth admin | Supabase Auth (email/password) |
| Storage imágenes | Supabase Storage — bucket `property-images` (público) |
| Estilos | CSS vanilla con variables (`var(--gold)`, `var(--black)`, etc.) en `src/styles/global.css` |
| Iconos | Lucide (CDN) |
| Fuentes | Google Fonts — Cormorant Garamond (títulos) + Montserrat (cuerpo) |
| Analytics | Google Tag Manager + Google Ads conversion tracking |

## Estructura de archivos clave

```
src/
  lib/
    supabase.ts          — cliente Supabase, tipos (Property, etc.), helpers statusClass/zoneLabel
  middleware.ts          — protege /admin/* con cookie sb_token
  pages/
    index.astro          — homepage estática (hero, Pampa III featured, portafolio, pasos)
    corporativo.astro    — SSR, lee propiedades de Supabase
    invertir.astro       — estática
    nosotros.astro       — estática
    contacto.astro       — estática
    admin/
      index.astro        — login (POST → set cookie sb_token)
      logout.astro       — borra cookie, redirige
      propiedades/
        index.astro      — lista de propiedades con toggle de estado 1-click (JS + Supabase REST API)
        [id].astro       — formulario de edición completa + gestión de fotos + preview de portada
  layouts/
    Layout.astro         — navbar, footer, modal de propiedades (homepage), popup de servicios, WhatsApp float
  styles/
    global.css           — todos los estilos del sitio
public/
  *.webp                 — imágenes legacy (las nuevas van a Supabase Storage)
```

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

### Supabase Storage — bucket `property-images`

- **Bucket**: `property-images` (público)
- **Path por propiedad**: `{propertyId}/{timestamp}-{random}.{ext}`
- **URL pública**: `https://qwhasgdxhvdavnofmisf.supabase.co/storage/v1/object/public/property-images/{path}`
- **Políticas**: lectura pública para `anon`; upload/delete solo para `authenticated`
- Las llamadas directas a la Storage API REST requieren **ambos** headers: `apikey` (anon key) + `Authorization: Bearer {token}`

## Convenciones importantes

- El campo `status_text` siempre va sin el "● " — el frontend lo agrega
- Mapeo de status a clases CSS: `available` → `disponible` | `occupied` → `ocupado` | `partial` → `parcialmente-ocupado`
- Mapeo de zona: `forestada` → "La Forestada" | `centro` + tipo `edificio` → "Centro Añelo" | `centro` + tipo `complejo` → "Añelo"
- Las credenciales de Supabase están hardcodeadas en `src/lib/supabase.ts` (la anon key es pública por diseño)
- La cookie de sesión admin se llama `sb_token` (httpOnly)
- Los `<script define:vars>` en Astro quedan en scope local — las funciones llamadas desde handlers inline (`onclick`, `onchange`) deben exponerse con `window.fnName = fnName`
- Los `<style>` en Astro son scoped por defecto — usar `<style is:global>` para estilos que aplican a elementos creados dinámicamente con JS

---

## Features implementadas

### Gestión de fotos en el admin (`[id].astro`)

- **Subida**: drag & drop o click, múltiples archivos, hasta 10MB. Se suben directo a Supabase Storage y se sincronizan en `images[]` y `cover_image` via PATCH REST.
- **Portada**: click en "Portada" sobre cualquier foto la marca como cover y sincroniza la DB.
- **Eliminar**: borra del Storage y del array `images[]`.
- **Preview de card**: panel lateral que muestra en tiempo real cómo quedará el card público con la portada actual. Hacer hover sobre otra foto la previsualiza temporalmente.
- **Encuadre de portada**: el panel de preview es **arrastrable** — el drag actualiza `object-position` en tiempo real y guarda `cover_position` en la DB al soltar. Al cambiar de portada se resetea a `50% 50%`.

### Cards en `/corporativo/`

- Carrusel de fotos con flechas prev/next y dots. Las imágenes se precargan al cargar la página para transiciones fluidas sin flash.
- `object-position` se aplica desde `cover_position` de la DB para respetar el encuadre configurado en el admin.
- Al hacer click en un card (no en botones/links) se abre el **modal de detalle**.

### Modal de detalle (`corporativo.astro`)

- Layout fijo split 55/45: carrusel a la izquierda, info a la derecha. El tamaño del modal no cambia con las fotos.
- Carrusel precarga todas las imágenes al abrir para transiciones instantáneas.
- Info: nombre, estado, descripción, huéspedes, UFs, zona, botones WhatsApp y Matterport.
- Teclado: ← → navegan, Escape cierra.
- Mobile: sheet desde abajo, imagen arriba, info con scroll.

### Modal de homepage (`Layout.astro`)

- Los cards de la sección "Nuestros complejos" en `index.astro` tienen `data-dest` con la URL de destino.
- Al hacer click: modal con "Ver los complejos/edificios" (navega a `/corporativo/` o `/corporativo/#secEdificios`) + "Consultar por WhatsApp".
- Los cards de `corporativo.astro` tienen `data-no-modal` para saltear este modal genérico y usar el modal de detalle propio.

---

### Venta y alquiler permanente (`/venta/`, `/alquiler/`)

Una propiedad puede publicarse en **varias secciones a la vez** mediante flags
(`for_corporate`, `for_rent`, `for_sale`) sobre la misma fila de `properties` —
no hay tabla aparte, así las fotos y encuadres se comparten.

- **Vista `properties_public`**: las páginas públicas leen de acá, no de la tabla,
  porque la vista no expone `address` (dirección interna). Constante `PUBLIC_TABLE`.
- **`ListingsBrowser.astro`**: filtros + grilla + mapa, parametrizado por `op`
  (`venta` | `alquiler`). Filtra en el cliente sobre cards renderizadas en el
  servidor; el estado va en la query string (`?tipo=casa&amb=3&max=120000`).
  Ambientes/dormitorios sólo aparecen si hay un tipo casa/depto/PH tildado.
- **`ListingDetail.astro`**: ficha `/venta/[slug]` con carrusel, ficha técnica,
  mapa y JSON-LD `RealEstateListing`.
- **Mapa**: Leaflet + tiles CARTO (sin API key). Con `location_exact = false`
  se dibuja un círculo de 300 m en vez del pin, para no revelar la dirección.
  Clustering propio por celda de pantalla debajo de zoom 15.
- **Admin**: switches de sección arriba del form en `propiedades/[id].astro`,
  con bloques condicionales (`data-when`) y mini-mapa de pin arrastrable.
  Alta de propiedades nuevas en `propiedades/nueva.astro`.
- **Migración**: `db/001_venta_alquiler.sql` — correr en el SQL Editor de
  Supabase **antes** de deployar, porque `properties_public` es requerida por
  `/corporativo/` e `/invertir/`.

## Pendiente / próximos pasos

- Migrar imágenes legacy de `public/*.webp` a Supabase Storage y actualizar `cover_image` en la DB
- Carrusel de fotos también en la homepage (featured Pampa III)
