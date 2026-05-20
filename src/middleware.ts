import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://qwhasgdxhvdavnofmisf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aGFzZ2R4aHZkYXZub2ZtaXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTI3MTgsImV4cCI6MjA5NDgyODcxOH0.Mj_lqGEtMhipASfO3YuBfVoCJ-f6fybOqLRw8OywCnw';

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
