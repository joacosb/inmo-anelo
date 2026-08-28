#!/usr/bin/env node
/**
 * Guardia estática de las reglas de docs/GUIA-DE-ESTILOS.md.
 *
 * Corre sin dependencias ni navegador, y se engancha a `prebuild`: si alguien
 * reintroduce uno de estos antipatrones, el build falla antes de desplegar.
 *
 * Lo que verifica en src/styles/global.css:
 *   1. Nada de CSS fuera de @layer. El CSS sin capa le gana a TODAS las
 *      utilidades de Tailwind sin importar la especificidad; un reseteo suelto
 *      `* { padding: 0 }` ya anuló una vez todo el espaciado del sitio.
 *   2. Nada de reglas por etiqueta HTML (section, footer, nav…), que le pegan a
 *      componentes que no las esperan.
 *   3. Nada de altos de navbar hardcodeados: se usa --nav-h.
 *   4. Nada de verdes de WhatsApp sueltos: se usan los tokens --color-wa*.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = 'src/styles/global.css';
const src = readFileSync(resolve(root, CSS), 'utf8');

const GUIA = 'docs/GUIA-DE-ESTILOS.md';
const errors = [];
const lineOf = (index) => src.slice(0, index).split('\n').length;

/** Quita comentarios conservando las posiciones (para que los números de línea sigan siendo válidos). */
const code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

// ── 1. todo dentro de @layer ────────────────────────────────────────────────
// Recorre el nivel superior del archivo y exige que cada bloque sea @layer,
// @theme, @import o @charset.
{
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    if (ch === '@') {
      const at = /^@([a-zA-Z-]+)/.exec(code.slice(i))?.[1];
      const braceAt = code.indexOf('{', i);
      const semiAt = code.indexOf(';', i);
      const isStatement = semiAt !== -1 && (braceAt === -1 || semiAt < braceAt);
      if (isStatement) { i = semiAt + 1; continue; }          // @import, @layer a, b;
      if (!['layer', 'theme'].includes(at)) {
        errors.push(`${CSS}:${lineOf(i)}  @${at} en el nivel superior. Movelo dentro de @layer base o @layer components.`);
      }
      i = skipBlock(code, braceAt);
      continue;
    }
    if (/\s/.test(ch)) { i++; continue; }
    // cualquier otra cosa en el nivel superior es un selector suelto
    const braceAt = code.indexOf('{', i);
    if (braceAt === -1) break;
    const selector = code.slice(i, braceAt).trim().replace(/\s+/g, ' ');
    errors.push(
      `${CSS}:${lineOf(i)}  regla fuera de @layer: "${selector.slice(0, 60)}"\n` +
      `      El CSS sin capa le gana a TODAS las utilidades de Tailwind. Movela a @layer base o @layer components.`,
    );
    i = skipBlock(code, braceAt);
  }
}

function skipBlock(text, open) {
  if (open === -1) return text.length;
  let depth = 0;
  for (let j = open; j < text.length; j++) {
    if (text[j] === '{') depth++;
    else if (text[j] === '}' && --depth === 0) return j + 1;
  }
  return text.length;
}

// ── 2. reglas por etiqueta HTML ─────────────────────────────────────────────
const TAGS = ['section', 'footer', 'nav', 'header', 'main', 'article', 'aside', 'form', 'table', 'ul', 'ol'];
for (const tag of TAGS) {
  // un selector que arranca con la etiqueta y no la usa como parte de algo más
  const re = new RegExp(`(^|[{}])\\s*(${tag}(?:#[\\w-]+)?)\\s*\\{`, 'g');
  let m;
  while ((m = re.exec(code))) {
    errors.push(
      `${CSS}:${lineOf(m.index)}  regla por etiqueta HTML: "${m[2]}"\n` +
      `      Le pega a componentes que no la esperan. Usá una clase (.section-pad, .container-site…).`,
    );
  }
}

// ── 3. alto del navbar hardcodeado ──────────────────────────────────────────
// Sólo en declaraciones de layout: 70px como blur de un box-shadow no es un
// navbar, y la propia definición de --nav-h necesita el literal.
const LAYOUT_PROPS = /^(min-|max-)?(height|top|inset)$|^(padding|margin|scroll-margin|scroll-padding)-top$/;
for (const m of code.matchAll(/(^|[;{])\s*([a-z-]+)\s*:\s*([^;{}]*)/gi)) {
  const [prop, value] = [m[2].toLowerCase(), m[3]];
  if (prop.startsWith('--')) continue;
  if (!/\b(70px|88px)\b/.test(value)) continue;
  if (!LAYOUT_PROPS.test(prop) && !value.includes('100vh')) continue;
  errors.push(
    `${CSS}:${lineOf(m.index)}  alto de navbar hardcodeado en "${prop}: ${value.trim().slice(0, 40)}". Usá var(--nav-h).`,
  );
}

// ── 4. verdes de WhatsApp sueltos ───────────────────────────────────────────
const themeEnd = code.indexOf('}', code.indexOf('@theme'));
for (const m of code.matchAll(/#(25d366|1dba5a|128c7e)\b/gi)) {
  if (m.index < themeEnd) continue;   // la definición del token sí puede tener el hex
  errors.push(`${CSS}:${lineOf(m.index)}  verde de WhatsApp suelto (#${m[1]}). Usá var(--color-wa) / var(--color-wa-hover).`);
}

// ── salida ──────────────────────────────────────────────────────────────────
if (errors.length) {
  console.error(`\n✘ ${errors.length} violación(es) de ${GUIA}:\n`);
  for (const e of errors) console.error('  ' + e);
  console.error(`\n  Ver ${GUIA} para el porqué de cada regla.\n`);
  process.exit(1);
}
console.log(`✔ ${CSS} cumple las reglas de ${GUIA}`);
