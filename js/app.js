// Arranque, navegación entre vistas y acciones globales (tema, ajustes, copia de seguridad).

import { subscribe, getState, setSettings, rescuedOnLoad } from './store.js';
import { isModalOpen, refreshModal, toast } from './ui.js';
import { mountCharts } from './charts.js';

import hoy from './views/hoy.js';
import plan from './views/plan.js';
import dietas from './views/dietas.js';
import progreso from './views/progreso.js';
import alimentos from './views/alimentos.js';

import ajustes from './views/ajustes.js';
const VIEWS = { hoy, plan, dietas, progreso, alimentos, ajustes };

const viewEl = document.getElementById('view');

function currentView() {
  const id = (location.hash.replace(/^#\/?/, '').split('/')[0] || 'hoy');
  return VIEWS[id] ? id : 'hoy';
}

export function render() {
  const id = currentView();
  const view = VIEWS[id];
  viewEl.innerHTML = view.render();
  view.mount?.(viewEl);
  mountCharts(viewEl);
  document.querySelectorAll('[data-view]').forEach((a) => a.classList.toggle('active', a.dataset.view === id));
  document.title = `${view.title || 'NutriPlan'} · NutriPlan`;
}

window.addEventListener('hashchange', () => {
  render();
  viewEl.scrollIntoView({ block: 'start' });
});

window.addEventListener('nutriplan:render', render);

subscribe(() => {
  applyTheme();
  render();
  if (isModalOpen()) refreshModal();
});

// ---------- Tema ----------
function applyTheme() {
  const t = getState().settings.theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  const dark = t === 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b131b' : '#f3f5f7');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
}

document.getElementById('theme-btn').addEventListener('click', () => {
  const next = getState().settings.theme === 'dark' ? 'light' : 'dark';
  setSettings({ theme: next });
  toast(next === 'dark' ? 'Tema oscuro' : 'Tema claro');
});



// ---------- Ajustes ----------
document.getElementById('settings-btn').addEventListener('click', () => { location.hash = '#/ajustes'; });

// ---------- Service worker ----------
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

applyTheme();
if (!location.hash) location.hash = '#/hoy';
render();

if (rescuedOnLoad) toast('No se pudieron abrir tus datos guardados. Están apartados en Ajustes, sin borrar.', 8000);
