import { createClient } from '@supabase/supabase-js';

export type PropertyStatus = 'available' | 'occupied' | 'partial';
export type PropertyType   = 'complejo' | 'edificio' | 'uf';
export type PropertyZone   = 'centro' | 'forestada';

/** Tipo de propiedad para las secciones de venta y alquiler permanente. */
export type PropKind =
  | 'casa' | 'departamento' | 'ph' | 'terreno'
  | 'local' | 'galpon' | 'campo' | 'cochera';

export type SaleStatus = 'available' | 'reserved' | 'sold';
export type RentStatus = 'available' | 'reserved' | 'rented';
export type Currency   = 'USD' | 'ARS';

/** Secciones del sitio en las que puede aparecer una propiedad. */
export type Operation = 'venta' | 'alquiler';

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

  // ── Flags de sección — una propiedad puede estar en varias a la vez ──
  for_corporate:  boolean;
  for_rent:       boolean;
  for_sale:       boolean;

  // ── Clasificación (venta / alquiler permanente) ──
  prop_type:      PropKind | null;
  rooms:          number | null;   // ambientes
  bedrooms:       number | null;
  bathrooms:      number | null;
  parking:        number | null;
  area_covered:   number | null;
  area_total:     number | null;
  features:       string[] | null;

  // ── Precio de venta ──
  sale_price:        number | null;
  sale_currency:     Currency;
  sale_price_hidden: boolean;
  sale_status:       SaleStatus;

  // ── Precio de alquiler permanente ──
  rent_price:     number | null;
  rent_currency:  Currency;
  rent_expenses:  number | null;
  rent_status:    RentStatus;

  // ── Ubicación (`address` sólo existe en la tabla, no en properties_public) ──
  neighborhood:   string | null;
  lat:            number | null;
  lng:            number | null;
  location_exact: boolean;
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
 * Venta y alquiler permanente
 * ──────────────────────────────────────────────────────────────────────── */

/** Vista pública: no expone `address`. Toda página pública lee de acá. */
export const PUBLIC_TABLE = 'properties_public';

export const PROP_KINDS: { value: PropKind; label: string; plural: string }[] = [
  { value: 'casa',         label: 'Casa',          plural: 'Casas' },
  { value: 'departamento', label: 'Departamento',  plural: 'Departamentos' },
  { value: 'ph',           label: 'PH',            plural: 'PH' },
  { value: 'terreno',      label: 'Terreno',       plural: 'Terrenos' },
  { value: 'local',        label: 'Local',         plural: 'Locales' },
  { value: 'galpon',       label: 'Galpón',        plural: 'Galpones' },
  { value: 'campo',        label: 'Campo',         plural: 'Campos' },
  { value: 'cochera',      label: 'Cochera',       plural: 'Cocheras' },
];

/**
 * Tipos que se miden en ambientes/dormitorios. El filtro de ambientes sólo
 * aparece cuando la selección de tipos cae íntegramente acá dentro — no tiene
 * sentido preguntar "cuántos ambientes" sobre un terreno o una cochera.
 */
export const KINDS_WITH_ROOMS: PropKind[] = ['casa', 'departamento', 'ph'];

export function propKindLabel(kind: PropKind | null | undefined): string {
  return PROP_KINDS.find((k) => k.value === kind)?.label ?? 'Propiedad';
}

/** Catálogo de características. El admin las tilda; los filtros las ofrecen. */
export const FEATURES: { value: string; label: string; icon: string }[] = [
  { value: 'cochera',      label: 'Cochera',            icon: 'car' },
  { value: 'pileta',       label: 'Pileta',             icon: 'waves' },
  { value: 'parrilla',     label: 'Parrilla',           icon: 'flame' },
  { value: 'gas_natural',  label: 'Gas natural',        icon: 'flame' },
  { value: 'patio',        label: 'Patio / jardín',     icon: 'trees' },
  { value: 'amoblado',     label: 'Amoblado',           icon: 'sofa' },
  { value: 'seguridad',    label: 'Seguridad 24hs',     icon: 'shield' },
  { value: 'apto_credito', label: 'Apto crédito',       icon: 'landmark' },
  { value: 'a_estrenar',   label: 'A estrenar',         icon: 'sparkles' },
];

export function featureLabel(value: string): string {
  return FEATURES.find((f) => f.value === value)?.label ?? value;
}

const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  available: 'En venta',
  reserved:  'Reservada',
  sold:      'Vendida',
};

const RENT_STATUS_LABELS: Record<RentStatus, string> = {
  available: 'Disponible',
  reserved:  'Reservada',
  rented:    'Alquilada',
};

export function operationStatusLabel(p: Property, op: Operation): string {
  return op === 'venta'
    ? SALE_STATUS_LABELS[p.sale_status] ?? 'En venta'
    : RENT_STATUS_LABELS[p.rent_status] ?? 'Disponible';
}

/** Clase CSS del badge — reusa la paleta de estados que ya existe. */
export function operationStatusClass(p: Property, op: Operation): string {
  const s = op === 'venta' ? p.sale_status : p.rent_status;
  if (s === 'available') return 'disponible';
  if (s === 'reserved')  return 'parcialmente-ocupado';
  return 'ocupado';
}

/**
 * Precio formateado para mostrar. Devuelve "Consultar precio" cuando está
 * oculto o sin cargar, así la card nunca queda con un hueco.
 */
export function formatPrice(p: Property, op: Operation): string {
  const hidden   = op === 'venta' && p.sale_price_hidden;
  const price    = op === 'venta' ? p.sale_price : p.rent_price;
  const currency = op === 'venta' ? p.sale_currency : p.rent_currency;
  if (hidden || price == null) return 'Consultar precio';
  const n = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(price);
  const suffix = op === 'alquiler' ? '/mes' : '';
  return `${currency === 'USD' ? 'USD' : '$'} ${n}${suffix}`;
}

export function formatExpenses(p: Property): string | null {
  if (!p.rent_expenses) return null;
  const n = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(p.rent_expenses);
  return `+ $ ${n} expensas`;
}

/**
 * Línea de ficha técnica de la card: "3 amb · 2 dorm · 1 baño · 120 m²".
 * Omite lo que no aplica al tipo (un terreno sólo muestra superficie).
 */
export function specLine(p: Property): string {
  const parts: string[] = [];
  if (p.rooms)     parts.push(`${p.rooms} amb`);
  if (p.bedrooms)  parts.push(`${p.bedrooms} dorm`);
  if (p.bathrooms) parts.push(`${p.bathrooms} baño${p.bathrooms > 1 ? 's' : ''}`);
  const area = p.area_covered ?? p.area_total;
  if (area)        parts.push(`${area} m²`);
  return parts.join(' · ');
}

/** Ubicación pública: barrio si está cargado, si no la zona genérica. */
export function locationLabel(p: Property): string {
  return p.neighborhood?.trim() || zoneLabel(p.zone, p.type);
}

/** Ruta de la ficha de detalle. */
export function listingUrl(p: Property, op: Operation): string {
  return `/${op}/${p.slug}/`;
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
