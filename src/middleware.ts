import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON } from './lib/supabase';


export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  const path = url.pathname.replace(/\/$/, '') || '/';

  // Solo protege /admin/* (excepto el login en /admin)
  if (!path.startsWith('/admin') || path === '/admin') return next();

  const token = cookies.get('sb_token')?.value;
  if (!token) return redirect('/admin/');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return redirect('/admin/');

  return next();
});
