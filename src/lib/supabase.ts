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
