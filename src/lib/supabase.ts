import { createClient } from '@supabase/supabase-js';

export type PropertyStatus = 'available' | 'occupied' | 'partial';
export type PropertyType   = 'complejo' | 'edificio' | 'uf';
export type PropertyZone   = 'centro' | 'forestada';

export interface Property {
  id:             string;
  name:           string;
  slug:           string;
  type:           PropertyType;
  zone:           PropertyZone;
  status:         PropertyStatus;
  status_text:    string;
  description:    string | null;
  cover_image:    string;
  cover_position:   string | null;
  images:           string[];
  image_positions:  string[] | null;
  unit_count:     number | null;
  max_guests:     number | null;
  matterport_url: string | null;
  sort_order:     number;
  active:         boolean;
}

const SUPABASE_URL  = 'https://qwhasgdxhvdavnofmisf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aGFzZ2R4aHZkYXZub2ZtaXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTI3MTgsImV4cCI6MjA5NDgyODcxOH0.Mj_lqGEtMhipASfO3YuBfVoCJ-f6fybOqLRw8OywCnw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export function statusClass(status: PropertyStatus): string {
  if (status === 'available') return 'disponible';
  if (status === 'occupied')  return 'ocupado';
  return 'parcialmente-ocupado';
}

export function zoneLabel(zone: PropertyZone, type: PropertyType): string {
  if (zone === 'forestada') return 'La Forestada';
  return type === 'edificio' ? 'Centro Añelo' : 'Añelo';
}

/* ──────────────────────────────────────────────────────────────────────────
 * Optimización de imágenes
 *
 * Las fotos viven en Supabase Storage y se sirven full-res, lo que pesa mucho.
 * El plan free de Supabase NO tiene habilitadas las transformaciones de imagen
 * (/render/image/ devuelve 403 FeatureNotEnabled), así que usamos la
 * optimización de imágenes de Vercel: /_vercel/image redimensiona y convierte
 * a webp en runtime, cacheado en el edge. Configurado en astro.config.mjs.
 *
 * - Sólo se transforman URLs de Supabase Storage; legacy /public y externas
 *   pasan sin tocar.
 * - En `astro dev`/`astro preview` el endpoint /_vercel/image no existe, así que
 *   devolvemos la URL original (la optimización aplica sólo en deploys de Vercel).
 * ──────────────────────────────────────────────────────────────────────────── */

const STORAGE_HOST = 'qwhasgdxhvdavnofmisf.supabase.co';

// Debe coincidir con `imagesConfig.sizes` en astro.config.mjs.
const ALLOWED_WIDTHS = [256, 384, 640, 750, 828, 1080, 1200, 1920];

function isStorageUrl(url: string): boolean {
  return url.includes(`${STORAGE_HOST}/storage/v1/object/public/`);
}

/** Ajusta el ancho pedido al valor permitido más chico que lo cubra. */
function snapWidth(width: number): number {
  for (const w of ALLOWED_WIDTHS) if (w >= width) return w;
  return ALLOWED_WIDTHS[ALLOWED_WIDTHS.length - 1];
}

/**
 * Devuelve la URL de una imagen redimensionada/optimizada por Vercel.
 * Para imágenes de Supabase Storage genera una URL /_vercel/image (webp);
 * para legacy /public u otras URLs las devuelve sin cambios.
 */
export function getImageUrl(
  url: string | null | undefined,
  opts: { width?: number; quality?: number } = {},
): string {
  if (!url) return '';
  if (!isStorageUrl(url)) return url;            // legacy /public, externas → sin tocar
  if (import.meta.env.DEV) return url;           // dev: /_vercel/image no existe
  const w = snapWidth(opts.width ?? 1080);
  const q = opts.quality ?? 70;
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`;
}

/**
 * Genera un srcset responsivo (varias anchuras) para una imagen de Storage.
 * Devuelve `undefined` para legacy/dev, donde el `src` plano alcanza.
 */
export function getSrcSet(
  url: string | null | undefined,
  widths: number[] = [640, 1080, 1920],
  quality = 70,
): string | undefined {
  if (!url || !isStorageUrl(url) || import.meta.env.DEV) return undefined;
  return widths
    .map((w) => `${getImageUrl(url, { width: w, quality })} ${snapWidth(w)}w`)
    .join(', ');
}
