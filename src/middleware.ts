import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON } from './lib/supabase';
import { getSiteContent, type SiteContent } from './lib/site-content';


export const onRequest = defineMiddleware(async ({ url, cookies, redirect, locals }, next) => {
  const path = url.pathname.replace(/\/$/, '') || '/';

  // El navbar y la página piden lo mismo: sin este memo por request, la home
  // consultaría Supabase dos veces por render. Es perezoso, así que las páginas
  // que no lo usan no pagan ninguna consulta.
  let pedido: Promise<SiteContent> | null = null;
  locals.siteContent = () => (pedido ??= getSiteContent());

  // Solo protege /admin/* (excepto el login en /admin)
  if (!path.startsWith('/admin') || path === '/admin') return next();

  const token = cookies.get('sb_token')?.value;
  if (!token) return redirect('/admin/');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return redirect('/admin/');

  return next();
});
