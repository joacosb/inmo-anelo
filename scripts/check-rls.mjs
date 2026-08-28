#!/usr/bin/env node
/**
 * Verifica si Row Level Security protege las tablas públicas.
 *
 *   npm run check:rls
 *
 * Por qué importa: la anon key de Supabase es pública por diseño — viaja al
 * navegador en cada visita, así que cualquiera puede leerla del código fuente
 * de la página. Lo único que impide que un tercero escriba en `properties` o
 * `homepage_cards` es RLS. Si está apagado, alguien puede editar o borrar
 * todas las propiedades del sitio con un `curl`.
 *
 * Cómo lo prueba, sin escribir nada: manda un INSERT con un payload inválido
 * (un id que no es UUID). Los dos resultados posibles fallan, así que la base
 * nunca se modifica, pero el código de error dice qué está pasando:
 *
 *   - error 42501 / "row-level security policy"  → RLS está bloqueando. Bien.
 *   - error de validación (22P02, 23502, 400…)   → la escritura fue AUTORIZADA
 *                                                   y sólo falló por el dato.
 *                                                   RLS no te está protegiendo.
 */

import { createClient } from '@supabase/supabase-js';

const URL = process.env.PUBLIC_SUPABASE_URL || 'https://qwhasgdxhvdavnofmisf.supabase.co';
const KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!KEY) {
  console.error(
    '\n✘ Falta PUBLIC_SUPABASE_ANON_KEY en el entorno.\n' +
    '  Corré:  PUBLIC_SUPABASE_ANON_KEY="<anon key>" npm run check:rls\n',
  );
  process.exit(2);
}

const TABLAS = ['properties', 'homepage_cards'];
const sb = createClient(URL, KEY);
let desprotegidas = 0;
let sinVerificar = 0;

console.log(`\nProbando RLS en ${URL}\n`);

for (const tabla of TABLAS) {
  // lectura: se espera que funcione (el sitio público la necesita)
  const { error: errLectura } = await sb.from(tabla).select('id').limit(1);

  // escritura: payload deliberadamente inválido, nunca llega a insertarse
  const { error: errEscritura } = await sb.from(tabla).insert({ id: 'no-es-un-uuid' });

  const msg = `${errEscritura?.code ?? ''} ${errEscritura?.message ?? ''}`.toLowerCase();
  const bloqueado = /42501|row-level security|permission denied|violates row-level/.test(msg);
  // Un fallo de red no dice nada sobre los permisos: no se puede concluir.
  const red = /fetch failed|network|enotfound|econnrefused|etimedout|socket|tls|certificate|not in allowlist/.test(msg)
    || (errEscritura && !errEscritura.code);

  let veredicto;
  if (red) {
    veredicto = `⚠ no se pudo verificar — fallo de red (${errEscritura.message.slice(0, 60)})`;
    sinVerificar++;
  } else if (!errEscritura) {
    veredicto = '✘ CRÍTICO — el INSERT anónimo fue aceptado';   // no debería pasar nunca
    desprotegidas++;
  } else if (bloqueado) {
    veredicto = '✔ RLS bloquea las escrituras anónimas';
  } else {
    veredicto = `✘ RLS NO bloquea — la escritura fue autorizada y sólo falló por el dato (${errEscritura.code})`;
    desprotegidas++;
  }

  console.log(`  ${tabla}`);
  const lectura = !errLectura ? 'permitida'
    : errLectura.code ? `bloqueada (${errLectura.code})`
    : 'no se pudo verificar (fallo de red)';
  console.log(`    lectura anónima:  ${lectura}`);
  console.log(`    escritura anónima: ${veredicto}\n`);
}

if (sinVerificar) {
  console.error(
    `⚠ No se pudo verificar ${sinVerificar} tabla(s): la base no respondió.\n` +
    '  Revisá la URL, la key y la conectividad, y volvé a correrlo. Un fallo de red\n' +
    '  NO significa que RLS esté bien: significa que no sabemos.\n',
  );
  process.exit(2);
}

if (desprotegidas) {
  console.error(
    `✘ ${desprotegidas} tabla(s) sin protección de escritura.\n\n` +
    '  Arreglo, en el SQL editor de Supabase:\n' +
    '    alter table public.properties enable row level security;\n' +
    '    create policy "lectura publica" on public.properties for select using (true);\n' +
    '  (y lo mismo para homepage_cards). Las escrituras quedan sólo para usuarios\n' +
    '  autenticados vía el panel /admin/, que manda el token del usuario.\n',
  );
  process.exit(1);
}
console.log('✔ Las tablas públicas rechazan escrituras anónimas.\n');
