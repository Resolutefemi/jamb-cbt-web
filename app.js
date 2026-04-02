import { dispatch } from './router.js';
import sb from './supabase.js';
import store from './store.js';

async function boot() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="screen-center"><div class="spinner"></div><p>Starting…</p></div>`;

  const { data: { session } } = await sb.auth.getSession();
  store.user = session?.user || null;

  const hash = window.location.hash;

  if (!store.user && hash !== '#/auth' && !hash.startsWith('#/auth')) {
    window.location.hash = '#/auth';
  } else if (store.user && (!hash || hash === '#/auth')) {
    window.location.hash = '#/dashboard';
  } else if (!hash) {
    window.location.hash = '#/auth';
  }

  await dispatch();
}

boot();
