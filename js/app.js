// Arranque, navegación entre vistas y acciones globales (tema, ajustes, copia de seguridad).

import { subscribe, getState, setSettings, exportData, importData, resetAll, APP_VERSION } from './store.js';
import { isModalOpen, refreshModal, openModal, closeModal, modalHeader, toast, esc, icon } from './ui.js';
import { mountCharts } from './charts.js';
import { WEEKDAYS_SHORT } from './dates.js';

import hoy from './views/hoy.js';
import plan from './views/plan.js';
import dietas from './views/dietas.js';
import progreso from './views/progreso.js';
import alimentos from './views/alimentos.js';

const VIEWS = { hoy, plan, dietas, progreso, alimentos };

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

subscribe(() => {
  render();
  if (isModalOpen()) refreshModal();
});

// ---------- Tema ----------
function applyTheme() {
  const t = getState().settings.theme || 'auto';
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c0d11' : '#2b1116');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.querySelector('use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
}

document.getElementById('theme-btn').addEventListener('click', () => {
  const order = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(getState().settings.theme || 'auto') + 1) % 3];
  setSettings({ theme: next });
  applyTheme();
  toast(next === 'auto' ? 'Tema automático' : next === 'dark' ? 'Tema oscuro' : 'Tema claro');
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// ---------- Ajustes ----------
document.getElementById('settings-btn').addEventListener('click', openSettings);

function openSettings() {
  openModal({
    render: () => {
      const st = getState();
      const days = st.settings.trainingDays || [];
      return `
        ${modalHeader('Ajustes', `NutriPlan ${APP_VERSION}`)}
        <div class="modal-body">
          <label class="field"><span>Tu nombre</span><input type="text" id="set-name" value="${esc(st.settings.name || '')}"></label>
          <label class="field"><span>Objetivo de peso (kg)</span><input type="number" step="0.1" id="set-weight-goal" value="${st.settings.weightGoal ?? ''}" placeholder="Sin objetivo"></label>
          <div class="field">
            <span>Días de entrenamiento habituales</span>
            <div class="row wrap" id="set-days">
              ${WEEKDAYS_SHORT.map((d, i) => `<button type="button" class="tag ${days[i] ? 'on' : ''}" data-day="${i}" style="cursor:pointer;border:0;font-family:inherit">${d}</button>`).join('')}
            </div>
            <p class="small muted" style="margin-top:8px">La merienda solo aparece los días de entrenamiento. Puedes cambiarlo día a día desde "Hoy".</p>
          </div>
          <div class="field">
            <span>Copia de seguridad</span>
            <div class="row wrap">
              <button class="btn btn-sm" id="set-export">${icon('download')} Exportar datos</button>
              <button class="btn btn-sm" id="set-import">${icon('upload')} Importar datos</button>
              <input type="file" id="set-file" accept="application/json" hidden>
            </div>
          </div>
          <div class="field">
            <span>Zona peligrosa</span>
            <button class="btn btn-sm btn-danger" id="set-reset">${icon('trash')} Borrar todos los datos</button>
          </div>
        </div>
        <div class="modal-foot"><button class="btn btn-primary" data-modal-close>Listo</button></div>`;
    },
    mount: (panel) => {
      panel.querySelector('#set-name').addEventListener('change', (e) => setSettings({ name: e.target.value.trim() || 'Álvaro' }));
      panel.querySelector('#set-weight-goal').addEventListener('change', (e) => setSettings({ weightGoal: e.target.value === '' ? null : Number(e.target.value) }));
      panel.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => {
        const days = [...(getState().settings.trainingDays || [])];
        const i = Number(b.dataset.day);
        days[i] = !days[i];
        setSettings({ trainingDays: days });
      }));
      panel.querySelector('#set-export').addEventListener('click', () => {
        const blob = new Blob([exportData()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `nutriplan-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast('Datos exportados');
      });
      const file = panel.querySelector('#set-file');
      panel.querySelector('#set-import').addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        try {
          importData(await f.text());
          toast('Datos importados');
        } catch {
          toast('El archivo no es válido');
        }
      });
      panel.querySelector('#set-reset').addEventListener('click', async () => {
        const { confirmDialog } = await import('./ui.js');
        closeModal();
        if (await confirmDialog({ title: '¿Borrar todos los datos?', message: 'Se eliminarán tus registros, dietas y alimentos personalizados. Esta acción no se puede deshacer.', confirmText: 'Borrar todo' })) {
          resetAll();
          toast('Todo borrado');
        }
      });
    },
  });
}

// ---------- Service worker ----------
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

applyTheme();
if (!location.hash) location.hash = '#/hoy';
render();
