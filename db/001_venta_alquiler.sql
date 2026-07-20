-- ═══════════════════════════════════════════════════════════════════════════
-- Migración 001 — Secciones de Venta y Alquiler permanente
--
-- Extiende `properties` con flags de operación: una misma propiedad puede
-- aparecer simultáneamente en corporativo, alquiler permanente y venta, sin
-- duplicar el registro (fotos, encuadres, descripción y Matterport se comparten).
--
-- Ejecutar en: Supabase → proyecto qwhasgdxhvdavnofmisf → SQL Editor
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Flags de sección ───────────────────────────────────────────────────────
-- Las propiedades existentes son todas corporativas, así que for_corporate
-- arranca en true y las otras dos en false.
alter table properties add column if not exists for_corporate bool not null default true;
alter table properties add column if not exists for_rent      bool not null default false;
alter table properties add column if not exists for_sale      bool not null default false;

-- ── Clasificación (aplica a venta / alquiler permanente) ───────────────────
alter table properties add column if not exists prop_type    text;
alter table properties add column if not exists rooms        int;   -- ambientes
alter table properties add column if not exists bedrooms     int;
alter table properties add column if not exists bathrooms    int;
alter table properties add column if not exists parking      int;   -- cocheras
alter table properties add column if not exists area_covered numeric;
alter table properties add column if not exists area_total   numeric;
alter table properties add column if not exists features     text[] default '{}';

-- ── Precio de venta ────────────────────────────────────────────────────────
alter table properties add column if not exists sale_price        numeric;
alter table properties add column if not exists sale_currency     text default 'USD';
alter table properties add column if not exists sale_price_hidden bool default false;
alter table properties add column if not exists sale_status       text default 'available';

-- ── Precio de alquiler permanente ──────────────────────────────────────────
alter table properties add column if not exists rent_price    numeric;
alter table properties add column if not exists rent_currency text default 'ARS';
alter table properties add column if not exists rent_expenses numeric;
alter table properties add column if not exists rent_status   text default 'available';

-- ── Ubicación ──────────────────────────────────────────────────────────────
-- `address` es de uso interno: nunca se renderiza en el sitio público.
-- Con location_exact = false el mapa dibuja un círculo de 300 m en vez del pin.
alter table properties add column if not exists neighborhood   text;
alter table properties add column if not exists address        text;
alter table properties add column if not exists lat            numeric;
alter table properties add column if not exists lng            numeric;
alter table properties add column if not exists location_exact bool default false;

-- ── Constraints de dominio ─────────────────────────────────────────────────
do $$ begin
  alter table properties add constraint properties_prop_type_chk
    check (prop_type is null or prop_type in
      ('casa','departamento','ph','terreno','local','galpon','campo','cochera'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table properties add constraint properties_sale_status_chk
    check (sale_status in ('available','reserved','sold'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table properties add constraint properties_rent_status_chk
    check (rent_status in ('available','reserved','rented'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table properties add constraint properties_currency_chk
    check (sale_currency in ('USD','ARS') and rent_currency in ('USD','ARS'));
exception when duplicate_object then null; end $$;

-- ── Índices ────────────────────────────────────────────────────────────────
-- Parciales: las queries públicas siempre filtran por flag + active.
create index if not exists properties_for_sale_idx
  on properties (sort_order) where for_sale and active;
create index if not exists properties_for_rent_idx
  on properties (sort_order) where for_rent and active;
create index if not exists properties_for_corporate_idx
  on properties (sort_order) where for_corporate and active;

-- ═══════════════════════════════════════════════════════════════════════════
-- Vista pública — no debe exponer `address`.
--
-- Postgres no filtra columnas por RLS, así que el sitio público lee de una
-- vista que directamente no incluye la dirección. Es security definer (corre
-- con permisos del owner), para poder revocarle a `anon` el acceso a la tabla
-- sin romper la vista. El admin (rol authenticated) sigue usando la tabla.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view properties_public as
select
  id, name, slug, type, zone, status, status_text, description,
  cover_image, cover_position, images, image_positions,
  unit_count, max_guests, matterport_url, sort_order, active,
  for_corporate, for_rent, for_sale,
  prop_type, rooms, bedrooms, bathrooms, parking,
  area_covered, area_total, features,
  sale_price, sale_currency, sale_price_hidden, sale_status,
  rent_price, rent_currency, rent_expenses, rent_status,
  neighborhood, lat, lng, location_exact,
  created_at, updated_at
from properties
where active;

grant select on properties_public to anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 2 — correr SOLO después de deployar el código de esta tanda.
--
-- Cierra el acceso anónimo a la tabla cruda para que `address` quede privada.
-- Las páginas públicas (corporativo, invertir, venta, alquiler) ya leen de
-- properties_public; el admin usa el rol authenticated y no se ve afectado.
-- Si lo corrés antes del deploy, el sitio público deja de mostrar propiedades.
--
--   revoke select on properties from anon;
-- ═══════════════════════════════════════════════════════════════════════════
