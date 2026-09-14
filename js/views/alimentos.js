// Vista "Alimentos": catálogo con la información nutricional y su calculadora de cantidades.

import { getState, upsertFood, deleteFood, foodInUse } from '../store.js';
import { esc, icon, fmtNum, uid, openModal, closeModal, modalHeader, toast, confirmDialog } from '../ui.js';
import { ROLES, ROLE_ORDER } from '../data.js';
import { cookingFactor, macrosOf, kcalFromMacros } from '../nutrition.js';
import { kcalOf, macroChips, sectionCard } from './parts.js';

let query = '';
let filter = 'todos';
let preparation = 'raw';
let ref = 100; // cantidad de referencia con la que se muestran los macros

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default {
  title: 'Alimentos',
  render() {
    const state = getState();
    const list = state.foods
      .filter((f) => (filter === 'todos' ? true : f.roles.includes(filter)))
      .filter((f) => (query ? norm(f.name).includes(norm(query)) : true))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return `
      <div class="page-head">
        <div>
          <h1 class="page-title">Alimentos</h1>
          <div class="page-sub">Los alimentos de tu dieta con sus macros. Cambia la cantidad de referencia y se recalcula todo.</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm btn-primary" data-new>${icon('plus', 'ic-sm')} Nuevo alimento</button>
        </div>
      </div>

      <section class="card">
        <div class="foods-toolbar">
          <div class="search-box">${icon('search')}<input type="search" id="q" placeholder="Buscar alimento" value="${esc(query)}" aria-label="Buscar alimento"></div>
          <div class="foods-ref">
            <span class="small muted">Valores por</span>
            <span class="slot-grams"><input type="number" id="ref" min="1" step="5" value="${ref}" inputmode="decimal" aria-label="Cantidad de referencia"><span class="unit">g</span></span>
            <select id="preparation" aria-label="Estado del alimento"><option value="raw" ${preparation === 'raw' ? 'selected' : ''}>en crudo</option><option value="cooked" ${preparation === 'cooked' ? 'selected' : ''}>cocinado</option></select>
          </div>
        </div>
        <div class="filter-tags" role="group" aria-label="Filtrar por tipo">
          <button class="tag ${filter === 'todos' ? 'on' : ''}" data-filter="todos" aria-pressed="${filter === 'todos'}">Todos</button>
          ${ROLE_ORDER.map((r) => `<button class="tag ${filter === r ? 'on' : r}" data-filter="${r}" aria-pressed="${filter === r}">${esc(ROLES[r].name)}</button>`).join('')}
        </div>

        ${list.length ? `<div class="food-grid">${list.map((f) => {
            const factor = cookingFactor(f);
            // Con factor de cocción, la referencia se interpreta en el estado elegido y se pasa a crudo.
            const m = macrosOf(f, ref / (preparation === 'cooked' ? factor || 1 : 1));
            const other = preparation === 'raw' ? ref * (factor || 1) : ref / (factor || 1);
            return `
              <article class="food-card">
                <div class="food-card-head">
                  <span class="food-card-emoji">${esc(f.emoji || '🍽️')}</span>
                  <div class="food-card-title">
                    <h3>${esc(f.name)}</h3>
                    ${factor ? `<span class="food-card-sub">${fmtNum(ref, 0)} g ${preparation === 'raw' ? 'crudo' : 'cocinado'} ≈ ${fmtNum(other, 0)} g ${preparation === 'raw' ? 'cocinado' : 'crudo'}</span>` : ''}
                  </div>
                  <div class="food-card-actions">
                    <button class="icon-btn plain" data-edit="${f.id}" aria-label="Editar ${esc(f.name)}">${icon('edit', 'ic-sm')}</button>
                    <button class="icon-btn plain" data-del="${f.id}" aria-label="Eliminar ${esc(f.name)}">${icon('trash', 'ic-sm')}</button>
                  </div>
                </div>
                <dl class="food-card-macros">
                  <div class="k"><dt>kcal</dt><dd>${fmtNum(kcalOf(m), 0)}</dd></div>
                  <div class="p"><dt>Prot.</dt><dd>${fmtNum(m.p, 1)}<small> g</small></dd></div>
                  <div class="c"><dt>Carbos</dt><dd>${fmtNum(m.c, 1)}<small> g</small></dd></div>
                  <div class="f"><dt>Grasas</dt><dd>${fmtNum(m.f, 1)}<small> g</small></dd></div>
                </dl>
              </article>`;
          }).join('')}</div>` : '<div class="empty">No hay alimentos con ese filtro</div>'}
      <p class="small muted">Equivalencias aproximadas: cambian según el método y tiempo de cocción. Puedes ajustar el factor de cada alimento al editarlo. <a href="https://nutriolift.com/calculadora/equivalencia-alimentos-crudos-cocidos" target="_blank" rel="noopener">Referencia: Nutriolift</a>.</p></section>`;
  },

  mount(root) {
    root.querySelector('#preparation').addEventListener('change', e => { preparation = e.target.value; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    const q = root.querySelector('#q');
    q.addEventListener('input', () => {
      query = q.value;
      const pos = q.selectionStart;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      const el = document.querySelector('#q');
      el.focus();
      el.setSelectionRange(pos, pos);
    });

    root.querySelector('#ref').addEventListener('change', (e) => {
      ref = Math.max(1, Number(e.target.value) || 100);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    root.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
      filter = b.dataset.filter;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }));

    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openFood(b.dataset.edit)));

    root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
      const food = getState().foods.find((f) => f.id === b.dataset.del);
      if (!food) return;
      const used = foodInUse(food.id);
      if (await confirmDialog({
        title: `¿Eliminar ${food.name}?`,
        message: used ? 'Este alimento se usa en alguna comida de la dieta: esas comidas quedarán incompletas.' : 'Se quitará del catálogo.',
        confirmText: 'Eliminar',
      })) {
        deleteFood(food.id);
        toast('Alimento eliminado');
      }
    }));

    root.querySelector('[data-new]').addEventListener('click', () => openFood(null));
  },
};

function openFood(id) {
  const existing = id ? getState().foods.find((f) => f.id === id) : null;
  const draft = existing
    ? { ...existing, roles: [...existing.roles] }
    : { id: uid(), name: '', emoji: '🍽️', roles: ['carb'], kcal: 0, p: 0, c: 0, f: 0 };
  let base = existing?.portion?.g || 100; // cantidad sobre la que se introducen los macros

  openModal({
    render: () => {
      const factor = base / 100;
      const shown = { kcal: draft.kcal * factor, p: draft.p * factor, c: draft.c * factor, f: draft.f * factor };
      return `
        ${modalHeader(existing ? 'Editar alimento' : 'Nuevo alimento', 'Introduce los macros sobre la cantidad que quieras: se guardan por 100 g')}
        <div class="modal-body">
          <div class="field-row">
            <label class="field" style="max-width:90px"><span>Emoji</span><input type="text" id="f-emoji" maxlength="4" value="${esc(draft.emoji || '')}"></label>
            <label class="field"><span>Nombre</span><input type="text" id="f-name" value="${esc(draft.name)}" placeholder="Ej. Arroz basmati"></label>
          </div>

          <div class="field">
            <span>¿Qué aporta principalmente?</span>
            <div class="row wrap" style="gap:6px">
              ${ROLE_ORDER.map((r) => `<button type="button" class="tag ${draft.roles.includes(r) ? 'on' : r}" data-role="${r}" style="cursor:pointer;border:0;font-family:inherit">${esc(ROLES[r].name)}</button>`).join('')}
            </div>
          </div>

          <div class="field">
            <span>Información nutricional sobre</span>
            <div class="row" style="gap:8px">
              <span class="slot-grams" style="width:130px"><input type="number" id="f-base" min="1" step="5" value="${base}"><span class="unit">g</span></span>
              <span class="small muted">Cambia esta cantidad si la etiqueta viene por ración.</span>
            </div>
          </div>

          <div class="field-row">
            <label class="field"><span>Calorías</span><input type="number" step="0.1" id="f-kcal" value="${round1(shown.kcal)}"></label>
            <label class="field"><span>Proteína (g)</span><input type="number" step="0.1" id="f-p" value="${round1(shown.p)}"></label>
            <label class="field"><span>Carbos (g)</span><input type="number" step="0.1" id="f-c" value="${round1(shown.c)}"></label>
            <label class="field"><span>Grasas (g)</span><input type="number" step="0.1" id="f-f" value="${round1(shown.f)}"></label>
          </div>

          <label class="field">
            <span>Medida casera (opcional)</span>
            <div class="field-row">
              <input type="text" id="f-plabel" placeholder="huevo, pieza, paquete…" value="${esc(draft.portion?.label || '')}">
              <span class="slot-grams"><input type="number" id="f-pg" min="1" placeholder="60" value="${draft.portion?.g || ''}"><span class="unit">g</span></span>
            </div>
          </label>

          <label class="field"><span>Factor de cocción (peso cocinado / crudo)</span><input id="f-cooking" type="number" min="0.01" step="0.01" value="${cookingFactor(draft) || ''}" placeholder="No aplica"><small>Ej.: arroz 2,5; pollo 0,75. Vacío si no aplica. Los macros se introducen en crudo cuando hay factor.</small></label>
          <div class="totals">
            <div><div class="label">Por 100 g quedaría</div><div class="value" id="f-preview">${fmtNum(draft.kcal, 0)} kcal</div></div>
            <div class="right">${macroChips({ p: draft.p, c: draft.c, f: draft.f })}</div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" data-modal-close>Cancelar</button>
          <button class="btn btn-primary" data-save>Guardar</button>
        </div>`;
    },
    mount: (panel) => {
      const $ = (s) => panel.querySelector(s);

      const readMacros = () => {
        const factor = 100 / Math.max(1, Number($('#f-base').value) || 100);
        return {
          kcal: (Number($('#f-kcal').value) || 0) * factor,
          p: (Number($('#f-p').value) || 0) * factor,
          c: (Number($('#f-c').value) || 0) * factor,
          f: (Number($('#f-f').value) || 0) * factor,
        };
      };

      const preview = () => {
        const m = readMacros();
        const kcal = m.kcal || kcalFromMacros(m);
        $('#f-preview').textContent = `${fmtNum(kcal, 0)} kcal · P ${fmtNum(m.p, 1)} · C ${fmtNum(m.c, 1)} · G ${fmtNum(m.f, 1)}`;
      };

      panel.querySelectorAll('#f-kcal,#f-p,#f-c,#f-f,#f-base').forEach((i) => i.addEventListener('input', preview));

      panel.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => {
        const r = b.dataset.role;
        const i = draft.roles.indexOf(r);
        if (i >= 0) { if (draft.roles.length > 1) draft.roles.splice(i, 1); } else draft.roles.push(r);
        b.className = `tag ${draft.roles.includes(r) ? 'on' : r}`;
      }));

      $('#f-base').addEventListener('change', () => { base = Math.max(1, Number($('#f-base').value) || 100); });

      $('[data-save]').addEventListener('click', () => {
        const name = $('#f-name').value.trim();
        if (!name) { toast('Ponle un nombre al alimento'); $('#f-name').focus(); return; }
        const m = readMacros();
        const plabel = $('#f-plabel').value.trim();
        const pg = Number($('#f-pg').value) || 0;
        upsertFood({
          cookingFactor: Number($('#f-cooking').value) > 0 ? Number($('#f-cooking').value) : 0,
          id: draft.id,
          name,
          emoji: $('#f-emoji').value.trim() || '🍽️',
          roles: draft.roles.length ? draft.roles : ['carb'],
          kcal: round1(m.kcal || kcalFromMacros(m)),
          p: round1(m.p),
          c: round1(m.c),
          f: round1(m.f),
          ...(plabel && pg ? { portion: { label: plabel, g: pg } } : {}),
        });
        closeModal();
        toast(existing ? 'Alimento actualizado' : 'Alimento añadido');
      });
    },
  });
}

const round1 = (v) => Math.round((Number(v) || 0) * 10) / 10;
