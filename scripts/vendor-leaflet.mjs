#!/usr/bin/env node
/**
 * Copia Leaflet desde node_modules a public/vendor/, para servirlo desde
 * nuestro propio dominio en vez de depender de unpkg.com.
 *
 * Leaflet se usa vía el global `L` en scripts `is:inline` que corren en tiempo
 * de parseo, así que tiene que seguir siendo un <script src> clásico y
 * bloqueante: bundlearlo como módulo ES lo volvería diferido y los mapas
 * quedarían sin inicializar. Auto-alojarlo saca el CDN sin tocar el orden.
 *
 * public/vendor/ está en .gitignore: se regenera en cada `prebuild`.
 */
import { cp, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/leaflet/dist');
const dest = resolve(root, 'public/vendor/leaflet');

if (!existsSync(src)) {
  console.error('✘ Falta node_modules/leaflet. Corré `npm install`.');
  process.exit(1);
}

await mkdir(dest, { recursive: true });
for (const f of ['leaflet.js', 'leaflet.css']) {
  await cp(resolve(src, f), resolve(dest, f));
}
await cp(resolve(src, 'images'), resolve(dest, 'images'), { recursive: true });

const { version } = JSON.parse(await readFile(resolve(root, 'node_modules/leaflet/package.json'), 'utf8'));
console.log(`✔ Leaflet ${version} copiado a public/vendor/leaflet/`);
