#!/usr/bin/env node
/**
 * Auditoría visual del sitio contra un servidor levantado.
 *
 *   npm run dev                 # en otra terminal
 *   npm run audit:ui            # por defecto http://localhost:4321
 *   npm run audit:ui -- https://inmobiliariaanelo.com.ar
 *
 * Verifica las cuatro cosas que `npm run build` NO detecta y que ya rompieron
 * el sitio (ver docs/GUIA-DE-ESTILOS.md):
 *
 *   1. ESPACIADO  — que las utilidades de Tailwind (p-*, px-*, gap-*) realmente
 *                   apliquen. Si el CSS propio queda fuera de @layer, todas
 *                   computan 0 y el texto queda pegado a los bordes.
 *   2. ALINEACIÓN — que el contenido de cada bloque arranque en la misma x.
 *   3. CONTRASTE  — que ningún texto quede por debajo de AA.
 *   4. DESBORDE   — que nada se salga del viewport. `body` tiene
 *                   `overflow-x: hidden`, así que un desborde no da scroll:
 *                   recorta en silencio.
 *
 * Requiere Playwright. Si no está instalado:  npm i -D playwright
 */

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('\n✘ Falta Playwright.  Instalalo con:  npm i -D playwright && npx playwright install chromium\n');
  process.exit(2);
}

const BASE = process.argv[2] || process.env.AUDIT_BASE || 'http://localhost:4321';
const PAGES = ['/', '/corporativo/', '/venta/', '/alquiler/', '/invertir/', '/nosotros/', '/contacto/'];
const WIDTHS = [390, 768, 1024];   // 1440 ya se cubre arriba

const problems = [];
const add = (seccion, msg) => problems.push({ seccion, msg });

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {},
);

async function open(url, width) {
  const pg = await browser.newPage({ viewport: { width, height: 1000 } });
  await pg.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await pg.waitForLoadState('load', { timeout: 15000 }).catch(() => {});   // sin networkidle: una API caída lo colgaría
  await pg.evaluate(() => {
    document.querySelectorAll('.services-popup-overlay,.prop-modal-overlay,.dm-overlay').forEach((e) => e.classList.remove('open'));
    document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
  });
  await pg.waitForTimeout(800);
  return pg;
}

// ── 1-3. espaciado, alineación y contraste (una sola carga por página) ──────
for (const url of PAGES) {
  const pg = await open(url, 1440);

  // 1. ESPACIADO
  {
    const bad = await pg.evaluate(() => {
    const SCALE = 4;                                             // --spacing: .25rem
    const BP = { '': 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
    const vw = window.innerWidth;
    const out = [];

    /** Devuelve el valor del breakpoint activo más alto (p-4 sm:p-6 lg:p-8 → 8 a 1440px). */
    const activo = (cls, util) => {
      const re = new RegExp(`(?:^|\\s)(?:(sm|md|lg|xl|2xl):)?${util}-([\\d.]+)(?=\\s|$)`, 'g');
      let valor = null, mejor = -1;
      for (const m of cls.matchAll(re)) {
        const bp = BP[m[1] ?? ''];
        if (bp === undefined || bp > vw) continue;
        if (bp >= mejor) { mejor = bp; valor = parseFloat(m[2]); }
      }
      return valor;
    };

    document.querySelectorAll('[class]').forEach((el) => {
      const cls = el.className.toString();
      if (!/(^|\s)(sm:|md:|lg:|xl:|2xl:)?(p|px|py|gap)-[\d.]/.test(cls)) return;
      const cs = getComputedStyle(el);
      for (const [util, prop] of [['p', 'paddingTop'], ['px', 'paddingLeft'], ['py', 'paddingTop'], ['gap', 'columnGap']]) {
        const n = activo(cls, util);
        if (n === null || n === 0) continue;
        const esperado = n * SCALE;
        const real = parseFloat(cs[prop]);
        if (Math.abs(real - esperado) > 0.5)
          out.push(`${util}-${n} → ${prop}=${real}px (esperado ${esperado}px) en .${cls.split(' ').slice(0, 2).join('.').slice(0, 30)}`);
      }
    });
    return [...new Set(out)].slice(0, 5);
  });
    if (bad.length) add('ESPACIADO', `${url}\n      ` + bad.join('\n      '));
  }

  // 2. ALINEACIÓN
  {
    const r = await pg.evaluate(() => {
    const borde = (el) => {
      const c = el.querySelector('.container-site, .max-w-7xl, .lb, .ld');
      return c ? Math.round(c.getBoundingClientRect().left + parseFloat(getComputedStyle(c).paddingLeft)) : null;
    };
    const ref = borde(document.querySelector('footer'));
    const out = [];
    document.querySelectorAll('section, .corporate-hero, .filter-bar').forEach((el) => {
      const x = borde(el);
      if (x !== null && ref !== null && Math.abs(x - ref) > 1)
        out.push(`${el.id || el.tagName} empieza en x=${x}, el footer en x=${ref}`);
    });
    return { ref, out: [...new Set(out)].slice(0, 5) };
  });
    if (r.out.length) add('ALINEACIÓN', `${url}\n      ` + r.out.join('\n      '));
  }

  // 3. CONTRASTE
  {
    const bad = await pg.evaluate(() => {
    // Rasterizar a 1px es la única vía fiable para resolver oklch() a sRGB.
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const rgba = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
    const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const fondo = (el) => { let n = el;
      while (n && n !== document.documentElement) { const cs = getComputedStyle(n);
        if (cs.backgroundImage !== 'none') return null;      // gradiente: no se puede resolver
        const c = rgba(cs.backgroundColor); if (c[3] > 0.85) return c.slice(0, 3);
        n = n.parentElement; }
      return rgba(getComputedStyle(document.body).backgroundColor).slice(0, 3); };
    const out = [];
    document.querySelectorAll('h1,h2,h3,h4,p,span,a,li,div,button,label,strong,td,th').forEach((el) => {
      if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) return;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (!r.width || !r.height || cs.visibility === 'hidden' || +cs.opacity < 0.2) return;
      if (el.closest('[aria-hidden="true"]')) return;
      const bg = fondo(el); if (!bg) return;
      const fg = [0, 1, 2].map((i) => { const c = rgba(cs.color); return c[i] * c[3] + bg[i] * (1 - c[3]); });
      const L1 = lum(fg), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize);
      const minimo = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5;
      if (ratio < minimo)
        out.push(`${ratio.toFixed(2)}:1 (min ${minimo})  "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40)}"`);
    });
    return [...new Set(out)].slice(0, 5);
  });
    if (bad.length) add('CONTRASTE', `${url}\n      ` + bad.join('\n      '));
  }

  await pg.close();
}

// ── 4. desborde horizontal ──────────────────────────────────────────────────
for (const width of WIDTHS) {
  for (const url of PAGES) {
    const pg = await open(url, width);
    const r = await pg.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out = [];
      document.querySelectorAll('body *').forEach((el) => {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return;
        if (el.closest('.ticker-bar, .dm-overlay, .services-popup-overlay, .prop-modal-overlay, #hero-bg')) return;
        // un ancestro fixed saca al elemento del flujo: no puede desbordar la página
        for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return;
        // un ancestro que recorta ya contiene el desborde
        for (let n = el.parentElement; n; n = n.parentElement) if (getComputedStyle(n).overflow !== 'visible') return;
        const b = el.getBoundingClientRect();
        if (b.width && b.right > vw + 1)
          out.push(`${el.tagName}.${el.className.toString().split(' ').slice(0, 2).join('.').slice(0, 30)} termina en ${Math.round(b.right)} (viewport ${vw})`);
      });
      return { scrollW: document.documentElement.scrollWidth, vw, out: [...new Set(out)].slice(0, 3) };
    });
    if (r.scrollW > r.vw + 1 || r.out.length)
      add('DESBORDE', `${url} @${width}px\n      ` + (r.out.join('\n      ') || `scrollWidth=${r.scrollW} vw=${r.vw}`));
    await pg.close();
  }
}

await browser.close();

if (problems.length) {
  console.error(`\n✘ ${problems.length} hallazgo(s) — ver docs/GUIA-DE-ESTILOS.md\n`);
  for (const p of problems) console.error(`  [${p.seccion}] ${p.msg}`);
  console.error('');
  process.exit(1);
}
console.log(`\n✔ ${PAGES.length} páginas sin hallazgos de espaciado, alineación, contraste ni desborde\n`);
