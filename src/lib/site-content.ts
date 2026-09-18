import { supabase, PUBLIC_TABLE } from './supabase';

/**
 * Qué partes del sitio tienen contenido publicado ahora mismo.
 *
 * Desde que las propiedades se pueden ocultar (`active = false`), cualquier
 * bloque o link que dependa de ellas puede quedar apuntando a la nada: el
 * encabezado de una subsección vacía, una tarjeta del portafolio o una entrada
 * del navbar. Las reglas viven acá para que el navbar, la homepage y las
 * páginas no se contradigan entre sí.
 *
 * Todo es **fail-open**: ante un error de red asumimos que hay de todo. Un link
 * que no salta al ancla es preferible a un sitio al que se le caen secciones y
 * menús enteros por un problema pasajero de Supabase.
 */

/** Propiedades que `/invertir/` destaca en su grilla. Fuente única. */
export const INVERSION_NAMES = ['Abedules', 'Hondarribia', 'Pampa II'];

/** El mismo filtro, en la sintaxis `.or()` de PostgREST. */
export const INVERSION_OR = INVERSION_NAMES.map((n) => `name.ilike.%${n}%`).join(',');

/** Tarjetas por defecto del portafolio, si `homepage_cards` no responde. */
export const DEFAULT_CARDS = [
  { id: '1', tag: 'Unidades Funcionales', name: 'Unidades Funcionales', description: 'Unidades totalmente equipadas para personal corporativo en Añelo.', cover_image: '/complejo-donostia1.webp', cover_position: '50% 50%', dest_url: '/corporativo/#secComplejos', card_type: 'Unidades Funcionales' },
  { id: '2', tag: 'Complejos',            name: 'Complejos Residenciales',    description: 'Complejos residenciales cerrados con todos los servicios incluidos.', cover_image: '/complejo-maria1.webp',    cover_position: '50% 50%', dest_url: '/corporativo/#secComplejos', card_type: 'Complejos' },
  { id: '3', tag: 'Edificios',            name: 'Edificios de Departamentos', description: 'Departamentos corporativos en el microcentro de Añelo.',            cover_image: '/edificio-pampa3.webp',    cover_position: '50% 50%', dest_url: '/corporativo/#secEdificios', card_type: 'Edificios' },
  { id: '4', tag: 'Lotes',                name: 'Lotes e Inversión',          description: 'Terrenos urbanizados para desarrollo en Vaca Muerta.',              cover_image: '/complejo-yellowstone.webp', cover_position: '50% 50%', dest_url: '/venta/?tipo=terreno',      card_type: 'Lotes' },
];

/** Destino de una tarjeta del portafolio: el de la fila, o el de su tipo. */
export function cardDest(card: any): string {
  if (card.dest_url) return card.dest_url;
  if (card.card_type === 'Edificios') return '/corporativo/#secEdificios';
  if (card.card_type === 'Lotes')     return '/venta/?tipo=terreno';
  return '/corporativo/#secComplejos';
}

export interface SiteContent {
  /** `/corporativo/#secComplejos` tiene complejos corporativos publicados. */
  complejos: boolean;
  /** `/corporativo/#secEdificios` tiene edificios corporativos publicados. */
  edificios: boolean;
  /** `/venta/?tipo=terreno` tiene terrenos en venta sin vender. */
  terrenos: boolean;
  /** `/invertir/#propiedades` tiene alguna de las propiedades destacadas. */
  inversion: boolean;
  /** Tarjetas del portafolio que sí llevan a algún lado. */
  homepageCards: any[];
  /** `true` si ese destino quedó sin contenido y conviene no enlazarlo. */
  destinoVacio: (dest: string) => boolean;
}

export async function getSiteContent(): Promise<SiteContent> {
  // Fail-open: estos arrancan en true y sólo bajan con una respuesta real.
  let complejos = true;
  let edificios = true;
  let terrenos  = true;
  let inversion = true;
  let cards: any[] = DEFAULT_CARDS;

  try {
    const [props, hc] = await Promise.all([
      supabase.from(PUBLIC_TABLE).select('name, type, for_corporate, for_sale, prop_type, sale_status'),
      supabase.from('homepage_cards').select('*').eq('active', true).order('sort_order'),
    ]);

    if (!props.error && props.data) {
      const rows = props.data as any[];
      complejos = rows.some((p) => p.for_corporate && p.type === 'complejo');
      edificios = rows.some((p) => p.for_corporate && p.type === 'edificio');
      // /venta/ saca las vendidas de la grilla, así que acá tampoco cuentan.
      terrenos  = rows.some((p) => p.for_sale && p.prop_type === 'terreno' && p.sale_status !== 'sold');
      // Equivalente en JS al .or(INVERSION_OR) de /invertir/ (ilike = sin case).
      inversion = rows.some((p) => {
        const name = (p.name ?? '').toLowerCase();
        return INVERSION_NAMES.some((n) => name.includes(n.toLowerCase()));
      });
    }

    if (!hc.error && hc.data && hc.data.length > 0) cards = hc.data;
  } catch (_) {}

  const vacioPorSeccion = (dest: string): boolean => {
    if (dest.includes('#secComplejos')) return !complejos;
    if (dest.includes('#secEdificios')) return !edificios;
    if (dest.includes('tipo=terreno'))  return !terrenos;
    if (dest.includes('#propiedades'))  return !inversion;
    return false;
  };

  const homepageCards = cards.filter((c) => !vacioPorSeccion(cardDest(c)));

  return {
    complejos,
    edificios,
    terrenos,
    inversion,
    homepageCards,
    // `#nuestros-complejos` es la sección del portafolio en la home, que sólo
    // se renderiza si le quedó alguna tarjeta.
    destinoVacio: (dest: string) =>
      dest.includes('#nuestros-complejos') ? homepageCards.length === 0 : vacioPorSeccion(dest),
  };
}
