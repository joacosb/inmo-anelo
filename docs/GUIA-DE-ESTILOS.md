# Guía de estilos — Inmobiliaria Añelo

Reglas obligatorias para cualquier cambio visual del sitio público
(`src/pages`, `src/components`, `src/layouts`, `src/styles`).

El objetivo es que el sitio se vea **homogéneo**: mismo ancho de contenido,
mismo ritmo vertical, misma paleta y contraste legible en todas las páginas.

> El panel `/admin/` es un sistema aparte: `AdminLayout.astro` trae su propio
> CSS embebido y **no** carga `global.css` ni Tailwind. Esta guía no aplica ahí.

---

## 0. Antes de dar por terminado un cambio

Levantá el sitio (`npm run dev`) y comprobá las tres cosas que más se rompen:

1. **Alineación** — el contenido de cada bloque tiene que empezar en la misma
   `x` que el del footer, en todas las páginas.
2. **Contraste** — ningún texto por debajo de 4.5:1 (3:1 si es ≥24px, o ≥18.7px
   en negrita).
3. **Desborde** — `document.documentElement.scrollWidth` no puede superar el
   ancho del viewport a 390px, 768px, 1024px y 1440px.

`body` tiene `overflow-x: hidden`, así que un desborde **no** produce scroll
horizontal: recorta el contenido en silencio. Por eso hay que medirlo, no
mirarlo. Los tres chequeos se hacen con Playwright contra el sitio levantado;
`npm run build` no detecta ninguno de ellos.

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

La fuente de verdad es el bloque `@theme` de `src/styles/global.css`.

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
