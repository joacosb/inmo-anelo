# Guía de estilos — Inmobiliaria Añelo

Reglas obligatorias para cualquier cambio visual del sitio público
(`src/pages`, `src/components`, `src/layouts`, `src/styles`).

El objetivo es que el sitio se vea **homogéneo**: mismo ancho de contenido,
mismo ritmo vertical, misma paleta y contraste legible en todas las páginas.

> El panel `/admin/` es un sistema aparte: `AdminLayout.astro` trae su propio
> CSS embebido y **no** carga `global.css` ni Tailwind. Esta guía no aplica ahí.

---

## 0. Las dos verificaciones automáticas

No hace falta acordarse de estas reglas: hay dos comandos que las verifican.

### `npm run check:css` — guardia estática, sin dependencias

Revisa `src/styles/global.css` y falla si aparece alguno de los antipatrones de
la sección 9: CSS fuera de `@layer`, reglas por etiqueta HTML, altos de navbar
hardcodeados o verdes de WhatsApp sueltos.

**Corre solo en cada `npm run build`** (está enganchado como `prebuild`), así
que también corre en el deploy de Vercel: si alguien reintroduce el bug, el
build falla antes de publicar.

### `npm run audit:ui` — auditoría visual con navegador

```bash
npm run dev                                        # en otra terminal
npm run audit:ui                                   # http://localhost:4321
npm run audit:ui -- https://inmobiliariaanelo.com.ar
```

Recorre las 7 páginas públicas y verifica lo que el build **no** puede ver:

1. **Espaciado** — que cada `p-*`, `px-*`, `py-*` y `gap-*` compute el valor que
   corresponde (contemplando las variantes `sm:`/`lg:`). Si el CSS propio se
   sale de `@layer`, todas computan 0 y el texto queda pegado a los bordes.
2. **Alineación** — que el contenido de cada bloque arranque en la misma `x`
   que el del footer.
3. **Contraste** — ningún texto por debajo de 4.5:1 (3:1 si es ≥24px, o
   ≥18.7px en negrita).
4. **Desborde** — que nada se salga del viewport a 390, 768 y 1024px.

Requiere Playwright, que no es dependencia del proyecto:
`npm i -D playwright && npx playwright install chromium`.

### `npm run check:rls` — ¿la base está protegida?

```bash
PUBLIC_SUPABASE_ANON_KEY="<anon key>" npm run check:rls
```

La anon key de Supabase es pública por diseño: viaja al navegador, así que
cualquiera la puede leer del código fuente de la página. Lo único que impide
que un tercero escriba en `properties` o `homepage_cards` es Row Level
Security. Este comando lo prueba sin escribir nada (manda un INSERT con un
payload inválido y mira si el rechazo vino de RLS o de la validación del dato).
Corrélo después de tocar el esquema.

Corrélo antes de dar por terminado cualquier cambio visual. `npm run build`
compila igual con el sitio roto: **ninguno de estos cuatro problemas rompe el
build**. Y `body` tiene `overflow-x: hidden`, así que un desborde ni siquiera
produce scroll horizontal — recorta el contenido en silencio. Por eso hay que
medirlo, no mirarlo.

---

## 1. Capas de CSS — la regla que más rompe cosas

Tailwind v4 declara, en este orden:

```css
@layer theme, base, components, utilities;
```

**El CSS sin capa le gana a todo lo que está en una capa, sin importar la
especificidad.** No es un problema de `!important` ni de selectores: una regla
suelta de un solo elemento pisa cualquier utilidad de Tailwind.

Esto ya rompió el sitio una vez: un reseteo suelto

```css
*, *::before, *::after { margin: 0; padding: 0; }   /* ✗ fuera de capa */
```

anulaba **todos** los `p-*`, `m-*`, `mx-auto` y `space-y-*` del proyecto. Las
tarjetas quedaban sin padding interno y los contenedores `max-w-7xl mx-auto`
sin centrar.

### Reglas

- **Todo el CSS propio de `global.css` va dentro de una `@layer`.** El archivo
  tiene exactamente dos bloques y no debe tener nada suelto entre ellos:
  - `@layer base { … }` — tokens de `:root`, `html`, `body`.
  - `@layer components { … }` — todos los estilos legacy por clase.
- **No reescribas el reseteo.** El preflight de Tailwind ya aplica
  `box-sizing: border-box; margin: 0; padding: 0` a todo.
- **Los `<style>` de componentes Astro también quedan fuera de capa.** Están
  acotados al componente, así que es aceptable, pero dentro de ese componente
  le van a ganar a las utilidades de Tailwind. Elegí uno u otro por elemento,
  no los mezcles.

---

## 2. Nada de reglas por etiqueta HTML

En `global.css` **no** puede haber reglas sobre etiquetas:

```css
section { padding: 7rem 8%; }    /* ✗ */
footer  { padding: 3rem 8%; }    /* ✗ */
nav#navbar { height: 70px; }     /* ✗ */
```

Le pegan a componentes que no las esperan. El caso real:
`section { padding: 7rem 8% }` le metía un 8% horizontal extra a cada sección
Tailwind que ya traía su propio `max-w-7xl px-4`, y `nav#navbar` (especificidad
id+etiqueta) forzaba 70px de alto sobre un navbar diseñado a 88px.

Usá siempre una clase explícita: `.section-pad`, `.container-site`, `.on-dark`.

---

## 3. Ancho de contenido: uno solo

Todo el contenido se alinea al mismo ancho: **`--content-max` (80rem = 1280px)**
con gutter `1rem / 1.5rem (≥640px) / 2rem (≥1024px)`.

Hay dos formas equivalentes de conseguirlo. Usá la que corresponda:

| Contexto | Cómo |
|---|---|
| Markup Tailwind | `<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">` |
| Markup legacy / CSS propio | `<div class="container-site">` |

`.container-site` está definido en `global.css` y es el equivalente exacto de
esas clases de Tailwind.

**Toda sección de ancho completo lleva un contenedor adentro.** La sección pone
el fondo y el padding vertical; el contenedor pone el ancho y el gutter
horizontal:

```astro
<section class="section-pad on-dark bg-brand-black">
  <div class="container-site">
    …
  </div>
</section>
```

Nunca uses porcentajes (`padding: 0 8%`) para el gutter: escalan distinto que
el contenedor y desalinean el bloque respecto del resto de la página.

---

## 4. Superficies claras y oscuras

El sitio es **dark luxury**. La tipografía legacy (`.section-title`,
`.section-sub`, `.section-label`) está pensada para fondo claro, así que sobre
un fondo oscuro hay que marcarlo. Si no, pasa lo que ya pasó: `.section-title`
quedaba `#1B1B18` sobre `bg-brand-black` (`#1B1B18`) — **texto negro sobre
negro, invisible**.

- Bloque con fondo oscuro → agregá **`on-dark`**.
- Bloque con fondo claro (blanco o `--light`) → agregá **`on-light`**.

```astro
<section class="section-pad on-dark bg-brand-black">   <!-- fondo oscuro -->
<section class="section-pad on-light">                 <!-- fondo claro  -->
```

`on-dark` pone el título en blanco y el subtítulo al 65%. `on-light` cambia la
etiqueta al terracota oscuro (`--terra-dk`, 7:1), porque **el dorado de marca
da 2.3:1 sobre blanco y no es legible**.

Regla general: el dorado `--gold` (`#c9a84c`) sólo se usa sobre fondo oscuro.

---

## 4bis. Foco de teclado

Nunca uses `focus:outline-none`. Deja a quien navega con Tab sin ninguna pista
de dónde está parado, y en este sitio ya había 8 usos que dejaban el navbar,
los botones y las tarjetas sin foco visible.

Hay un anillo global en `@layer base`:

```css
:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
```

Usa `:focus-visible`, así que el mouse no lo dispara — no hace falta apagarlo
"para que no se vea al clickear". Si un elemento es dorado, el anillo dorado no
se distingue: agregá el selector a la excepción que invierte el color a negro.

## 5. Alto del navbar: `--nav-h`

El navbar es `position: fixed`. Su alto vive en **un solo lugar**, el token
`--nav-h` de `:root`, y lo consumen:

| Dónde | Qué |
|---|---|
| `Navbar.astro` | `h-[var(--nav-h)]` |
| `Layout.astro` | `pt-[var(--nav-h)]` — empuja el contenido debajo de la barra |
| `global.css` | `html { scroll-padding-top: var(--nav-h) }` — offset de las anclas |
| `global.css` | `.hero`, `.build-sticky` |
| `Navbar.astro` | drawer mobile: `top-[var(--nav-h)]` |

**Nunca escribas `70px` ni `88px` a mano.** Cuando el navbar medía 70px y el
`Layout` empujaba 88px, quedaba una franja muerta de 18px en todas las páginas.

Las anclas (`/#por-que-anelo`, `/corporativo/#secEdificios`) ya funcionan solas
gracias a `scroll-padding-top`: no agregues `scroll-margin-top` por sección.

---

## 6. Navbar y Footer son 100% Tailwind

`Navbar.astro` y `Footer.astro` **no dependen de ninguna regla de
`global.css`**. No existen `.nav-links`, `.nav-logo`, `.hamburger`,
`.footer-top`, `.footer-col` ni `.social-link`. Si tocás uno de esos
componentes, hacelo con utilidades de Tailwind dentro del propio archivo.

**Breakpoint del menú: `lg` (1024px).** El menú de escritorio no entra a 768px
— el logo se superpone con "Inicio" y el botón "Contacto" queda cortado. El
`<ul>` usa `hidden lg:flex`, y la hamburguesa y el drawer usan `lg:hidden`. Si
agregás un ítem al menú, verificá de nuevo a 1024px.

---

## 7. Paleta: sólo tokens

El sitio público y el panel `/admin/` son dos sistemas de estilos separados,
pero comparten la marca. Los valores compartidos viven en
**`src/styles/tokens.css`**, que el admin importa directamente. El sitio
público los repite en el bloque `@theme` de `src/styles/global.css`, porque
Tailwind v4 necesita literales ahí para generar las utilidades —
`npm run check:css` verifica que los dos coincidan y falla el build si se
separan.

| Token | Valor | Uso |
|---|---|---|
| `--color-brand-black` | `#1B1B18` | fondo principal |
| `--color-brand-gold` | `#c9a84c` | acento — **sólo sobre fondo oscuro** |
| `--color-brand-gold-light` | `#e8c97a` | hover del dorado |
| `--color-brand-terra-dark` | `#8a4629` | acento sobre fondo claro |
| `--color-wa` | `#25D366` | acción WhatsApp |
| `--color-wa-hover` | `#1DBA5A` | hover de WhatsApp |
| `--color-wa-ink` | `#1B1B18` | texto sobre el verde WhatsApp |
| `--font-display` | Cormorant Garamond | títulos |
| `--font-body` | Montserrat | cuerpo |

Superficies elevadas (tarjetas, paneles): `#23231F` / `#242420`.

**WhatsApp va siempre igual.** Llegó a tener cuatro verdes distintos para la
misma acción (`#25D366`, `#1dba5a`, `emerald-600`, `emerald-500`). Ahora es un
solo token, y **el texto encima es `--color-wa-ink`, no blanco**: blanco sobre
ese verde da 2:1 y no se lee. En Tailwind: `bg-wa text-wa-ink hover:bg-wa-hover`.

No agregues hex sueltos. Si necesitás un color nuevo, agregá el token a
`@theme` y usalo desde ahí.

---

## 7bis. Nada de CDNs de terceros

El sitio no baja código de `unpkg.com` ni de ningún otro CDN. Si el CDN se cae
o cambia, se cae el sitio; y todo lo que sirve queda fuera de nuestro control.

- **Lucide**: se importan sólo los iconos que se usan y se bundlean
  (`src/layouts/Layout.astro`). Si agregás un `data-lucide="..."` nuevo,
  acordate de sumar el icono a ese `import` y al objeto de `createIcons`.
- **Leaflet**: se auto-aloja. `scripts/vendor-leaflet.mjs` lo copia de
  `node_modules` a `public/vendor/leaflet/` en cada `prebuild`, y los mapas lo
  cargan desde ahí. **No lo conviertas en un `import` de módulo**: los scripts
  de mapa son `is:inline` y corren en tiempo de parseo, así que necesitan que
  `L` ya exista como global. Un módulo ES es diferido y los mapas quedarían sin
  inicializar, en silencio.

`public/vendor/` está en `.gitignore`: se regenera solo.

## 8. Componentes existentes antes que markup nuevo

Antes de escribir una tarjeta o un botón a mano, revisá:

- `PropertyCard.astro` — tarjeta de propiedad
- `ui/Button.astro` — variantes `primary`, `secondary`, `terra`, `outline`,
  `whatsapp`, `ghost`
- `ui/Badge.astro` — estados de disponibilidad
- `ui/SectionHeader.astro` — encabezado de sección
- `ListingsBrowser.astro` / `ListingDetail.astro` — grilla y ficha de venta y alquiler

Si el mismo elemento aparece con estilos distintos en dos páginas, eso es un
bug de homogeneidad, no una variante.

---

## 9. Antipatrones que ya rompieron el sitio

| Antipatrón | Qué pasó |
|---|---|
| CSS propio fuera de `@layer` | El reseteo `*` anuló todo el espaciado de Tailwind del sitio |
| `section { padding: 7rem 8% }` | 8% horizontal extra sobre secciones que ya tenían contenedor |
| `nav#navbar { height: 70px }` | Pisó `h-[88px]` del navbar Tailwind → franja muerta de 18px |
| `.nav-links { display: flex }` suelto | Pisó `hidden md:flex` → menú de escritorio visible en mobile |
| `.nav-dropdown { opacity: 0; visibility: hidden }` suelto | Pisó `group-hover:opacity-100` → los desplegables no abrían |
| `88px` / `70px` hardcodeados | El offset del contenido dejó de coincidir con el navbar |
| Sección oscura sin `on-dark` | `.section-title` `#1B1B18` sobre `#1B1B18`: título invisible |
| Reusar `.btn-inv-*` en un panel claro | Botón "Email" blanco sobre blanco: invisible |
| Cuatro verdes para WhatsApp | El mismo CTA se veía distinto en cada página |
| Menú de escritorio a partir de `md` | A 768px el CTA "Contacto" quedaba cortado |
| `focus:outline-none` | Navegar con Tab quedaba sin ninguna pista visual |
| Cargar librerías desde un CDN | Con unpkg caído, los iconos y los mapas no renderizaban |
| Bundlear Leaflet como módulo ES | El módulo es diferido: los mapas `is:inline` no encuentran `L` |
| Duplicar la paleta a mano en el admin | Dos verdades sobre los mismos colores, listas para divergir |
