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
  images:         string[];
  unit_count:     number | null;
  max_guests:     number | null;
  matterport_url: string | null;
  sort_order:     number;
  active:         boolean;
}

export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
);

export function statusClass(status: PropertyStatus): string {
  if (status === 'available') return 'disponible';
  if (status === 'occupied')  return 'ocupado';
  return 'parcialmente-ocupado';
}

export function zoneLabel(zone: PropertyZone, type: PropertyType): string {
  if (zone === 'forestada') return 'La Forestada';
  return type === 'edificio' ? 'Centro Añelo' : 'Añelo';
}
