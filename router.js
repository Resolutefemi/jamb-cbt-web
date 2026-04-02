import { renderAuth }      from './auth.js';
import { renderDashboard } from './dashboard.js';
import { renderExam }      from './exam.js';

const routes = {
  '#/auth':      renderAuth,
  '#/dashboard': renderDashboard,
  '#/exam':      renderExam,
};

function getHash() {
  return window.location.hash || '#/auth';
}

async function navigate(hash) {
  window.location.hash = hash;
}

async function dispatch() {
  const hash = getHash();
  const base = hash.split('?')[0];
  const render = routes[base];
  if (render) {
    await render();
  } else {
    window.location.hash = '#/auth';
  }
}

window.addEventListener('hashchange', dispatch);

export { dispatch, navigate };
