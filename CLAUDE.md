# Inmobiliaria Añelo — Contexto del proyecto

## Stack actual

| Capa | Tecnología |
|---|---|
| Framework | Astro 5 (output: static + SSR por página con `export const prerender = false`) |
| Adapter | `@astrojs/vercel` — deploy en Vercel |
| Base de datos | Supabase (PostgreSQL) |
| Auth admin | Supabase Auth (email/password) |
| Storage imágenes | Aún no implementado — imágenes en `public/` del repo |
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
        [id].astro       — formulario de edición completa (POST server-side)
  layouts/
    Layout.astro         — navbar, footer, modal de propiedades, popup de servicios, WhatsApp float
  styles/
    global.css           — todos los estilos del sitio
public/
  *.webp                 — imágenes de propiedades (hoy están hardcodeadas en el repo)
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
cover_image    text   -- hoy: path relativo "/complejo-abedules.webp"
images         text[] -- galería adicional (aún no usada en frontend)
unit_count     int    -- cantidad de UFs
max_guests     int
matterport_url text
sort_order     int
active         bool
created_at / updated_at timestamptz
```

## Convenciones importantes

- El campo `status_text` siempre va sin el "● " — el frontend lo agrega
- Mapeo de status a clases CSS: `available` → `disponible` | `occupied` → `ocupado` | `partial` → `parcialmente-ocupado`
- Mapeo de zona: `forestada` → "La Forestada" | `centro` + tipo `edificio` → "Centro Añelo" | `centro` + tipo `complejo` → "Añelo"
- Las credenciales de Supabase están hardcodeadas en `src/lib/supabase.ts` (la anon key es pública por diseño)
- La cookie de sesión admin se llama `sb_token` (httpOnly)

---

## Plan de acción — Carrusel de múltiples fotos por propiedad

### Contexto

El campo `images text[]` ya existe en la base de datos pero aún no se usa. Hoy cada propiedad tiene solo una foto de portada (`cover_image`). El objetivo es permitir:

1. **Admin**: subir varias fotos por propiedad y elegir cuál es la portada
2. **Público**: en el card de corporativo, poder deslizar entre fotos

### Paso 1 — Supabase Storage

Crear un bucket en Supabase para almacenar las imágenes (en lugar de tenerlas en `public/`).

```sql
-- En Supabase Dashboard → Storage → New bucket
-- Nombre: property-images
-- Public: true (las fotos son públicas)
```

Política de storage:
```sql
-- Lectura pública
CREATE POLICY "Public read" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'property-images');
-- Solo admin puede subir/borrar
CREATE POLICY "Admin upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'property-images');
CREATE POLICY "Admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'property-images');
```

Las URLs de las imágenes subirán a `https://qwhasgdxhvdavnofmisf.supabase.co/storage/v1/object/public/property-images/{filename}`.

### Paso 2 — Uploader en el panel admin (`[id].astro`)

Agregar una sección de gestión de fotos al formulario de edición completa:

- Input `<input type="file" accept="image/*" multiple>` para subir nuevas fotos
- Preview de las fotos actuales con botón de eliminar por cada una
- Drag para reordenar (o simplemente botones arriba/abajo para simplicidad)
- Checkbox o clic para marcar cuál es la portada (`cover_image`)

**Flujo de subida (cliente → Supabase Storage):**
```javascript
// En el admin, con el access token del usuario autenticado
const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` }}});
const { data } = await sb.storage.from('property-images').upload(`${propertyId}/${filename}`, file);
// Luego actualizar el array images[] en la tabla properties
await sb.from('properties').update({ images: [...existingImages, publicUrl] }).eq('id', propertyId);
```

### Paso 3 — Carrusel en la página pública (`corporativo.astro`)

Modificar el template del card para que si `images.length > 1`, muestre controles de navegación:

```html
<div class="prop-img-wrap">
  <img class="prop-img" src={p.cover_image} />
  {p.images.length > 1 && (
    <div class="carousel-dots">…</div>
    <button class="carousel-prev">‹</button>
    <button class="carousel-next">›</button>
  )}
</div>
```

JS mínimo para el carrusel (sin librerías externas):
- Mantener un array de URLs de imágenes en un `data-images` attribute
- Al hacer click en prev/next, cambiar el `src` del `<img>` y actualizar los dots

### Paso 4 — Migrar imágenes actuales

Las imágenes actuales están en `public/*.webp`. Hay que:
1. Subirlas a Supabase Storage vía el dashboard o script
2. Actualizar el campo `cover_image` en cada fila de `properties` con la nueva URL pública
3. Una vez verificado que todo funciona, se pueden borrar del repo (o dejarlas como fallback)

### Orden sugerido de implementación

1. Crear el bucket en Supabase Storage (5 min, sin código)
2. Agregar uploader al admin `[id].astro` (el cambio más complejo)
3. Actualizar el template del card en `corporativo.astro` para soportar carrusel
4. Migrar imágenes existentes al bucket
5. Verificar en producción y limpiar imágenes del repo

### Consideraciones

- Las imágenes subidas desde el admin quedan en Supabase Storage con URLs permanentes — no dependen del deploy
- El bucket es público, no hace falta auth para leer las fotos
- Supabase Storage acepta hasta 50MB por archivo en el plan gratuito (más que suficiente para fotos webp)
- Para las imágenes actuales del repo, los paths `/complejo-abedules.webp` siguen funcionando hasta que se migren
