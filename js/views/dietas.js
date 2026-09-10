// Vista "Mis dietas": elegir la dieta activa y reajustar sus macros y cantidades.

import { getState, activeDiet, setActiveDiet, updateDiet, setDietTargets, addDiet, deleteDiet } from '../store.js';
import { esc, icon, fmtNum, uid, openModal, closeModal, modalHeader, toast, confirmDialog } from '../ui.js';
import { MEALS } from '../data.js';
import { dietPlan, dietTargets, planMacros, slotsMacros, foodById, portionLabel, kcalFromMacros } from '../nutrition.js';
import { kcalOf, macroChips, donut, macroLegend, slotsText, sectionCard } from './parts.js';

// Estado de interfaz: se conserva cuando guardar cantidades vuelve a renderizar la vista.
let planAmountsOpen = false;

const MACROS = [
  { key: 'protein', name: 'Proteína', field: 'p', color: 'var(--c-prot)' },
  { key: 'carb', name: 'Carbos', field: 'c', color: 'var(--c-carb)' },
  { key: 'fat', name: 'Grasas', field: 'f', color: 'var(--c-fat)' },
];

const macrosFor = (state, diet, training = true) => planMacros(state, dietPlan(diet, { training }));

export default {
  title: 'Mis dietas',
  render() {
    const state = getState();
    const diet = activeDiet();
    const macros = macrosFor(state, diet);
    const rest = macrosFor(state, diet, false);
    const targets = dietTargets(state, diet);

    return `
      <div class="page-head">
        <div>
          <h1 class="page-title">Mis dietas</h1>
          <div class="page-sub">Elige tu dieta y fija los objetivos que quieres alcanzar cada día</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-sm" data-new>${icon('plus', 'ic-sm')} Nueva dieta</button>
        </div>
      </div>

      <div class="grid cols-3" style="margin-bottom:16px">
        ${state.diets.map((d) => {
          const m = dietTargets(state, d);
          return `<button class="diet-card ${d.id === diet.id ? 'on' : ''}" data-diet="${d.id}">
            <span class="diet-emoji">${esc(d.emoji || '🍽️')}</span>
            <span class="diet-name">${esc(d.name)}</span>
            <span class="diet-goal">${esc(d.goal || '')}</span>
            <span class="row wrap" style="gap:8px;margin-top:4px"><b>${fmtNum(m.kcal, 0)} kcal</b>
              <span class="muted small">P ${fmtNum(m.p, 0)} · C ${fmtNum(m.c, 0)} · G ${fmtNum(m.f, 0)}</span></span>
            ${d.id === diet.id ? '<span class="tag on" style="align-self:flex-start">Activa</span>' : ''}
          </button>`;
        }).join('')}
      </div>

      <div class="grid cols-main">
        <div>
          ${sectionCard('Objetivos diarios', 'target', `
            <form id="diet-targets-form">
              <div class="diet-target-fields">
                ${[['kcal','Calorías (kcal)'],['p','Proteína (g)'],['c','Carbos (g)'],['f','Grasas (g)']].map(([key,label]) => `<label class="field"><span>${label}</span><input type="number" id="target-${key}" name="${key}" min="${key === 'kcal' ? 1 : 0}" step="${key === 'kcal' ? 1 : '0.1'}" inputmode="decimal" value="${targets[key]}" required></label>`).join('')}
              </div>
              <div class="row wrap"><button class="btn btn-primary" type="submit">${icon('check','ic-sm')} Guardar objetivos</button><span class="small muted">${diet.targets ? 'Objetivos personalizados' : 'Valores iniciales del plan'}</span></div>
            </form>
            <p class="small muted" style="margin-top:12px">Las kcal se guardan por separado de los gramos de macros. Estos objetivos se aplican en Hoy y Progreso, tanto en entrenamiento como en descanso.</p>
          `)}

          ${sectionCard('Cantidades del plan', 'sliders', `
            <details class="plan-amounts"${planAmountsOpen ? ' open' : ''}><summary>Ajustar las raciones del plan semanal</summary>
            <p class="small muted">Cada deslizador cambia las cantidades de los alimentos del plan. Los objetivos personalizados se mantienen hasta que los edites.</p>
            ${MACROS.map((m) => {
              const v = Math.round((diet.scale?.[m.key] ?? 1) * 100);
              return `<div class="macro-slider">
                <label for="sc-${m.key}" style="color:${m.color}">${m.name}</label>
                <input type="range" id="sc-${m.key}" min="40" max="220" step="5" value="${v}" data-scale="${m.key}">
                <div class="macro-out" data-out="${m.key}">${fmtNum(macros[m.field], 0)} g<small>${v}%</small></div>
              </div>`;
            }).join('')}
            <div class="totals">
              <div><div class="label">Total del plan (entrenamiento)</div><div class="value" data-kcal>${fmtNum(kcalOf(macros), 0)} kcal</div></div>
              <div class="right">${macroChips(macros)}</div>
            </div>
            <div class="row wrap" style="margin-top:14px">
              <button class="btn btn-sm" data-target>${icon('target', 'ic-sm')} Usar estos valores como objetivos</button>
              <button class="btn btn-sm" data-reset-scale>${icon('swap', 'ic-sm')} Volver a las cantidades originales</button>
            </div>
            <p class="small muted" style="margin-top:10px">El plan de descanso suma ${fmtNum(kcalOf(rest), 0)} kcal al excluir la merienda.</p>
            </details>
          `)}

          ${sectionCard('Comidas de la dieta', 'utensils', `
            <div class="list">
              ${MEALS.map((meal) => {
                const idx = Math.min(diet.picks?.[meal.id] ?? 0, meal.options.length - 1);
                const plan = dietPlan(diet, { training: true });
                const entry = plan[meal.id];
                const mm = entry ? slotsMacros(state, entry.slots) : null;
                return `<div class="list-row">
                  <span class="list-emoji">${icon(meal.icon)}</span>
                  <span class="list-main">
                    <span class="list-name">${esc(meal.name)} <span class="muted small">${meal.time}</span></span>
                    <span class="list-sub">${entry ? esc(slotsText(state, entry.slots)) : 'Solo días de entrenamiento'}</span>
                  </span>
                  <span class="list-sub">${mm ? `${fmtNum(kcalOf(mm), 0)} kcal` : ''}</span>
                  <span class="list-actions"><button class="icon-btn plain" data-pick="${meal.id}" data-idx="${idx}" aria-label="Cambiar combinación">${icon('swap', 'ic-sm')}</button></span>
                </div>`;
              }).join('')}
            </div>
            <p class="small muted" style="margin-top:12px">Los macros de cada alimento se editan en <a href="#/alimentos" style="color:var(--primary);font-weight:600">Alimentos</a>.</p>
          `)}
        </div>

        <div>
          ${sectionCard('Reparto del plan', 'target', `
            <div class="donut-wrap">${donut(macros)}<div style="flex:1;min-width:150px">${macroLegend(macros)}</div></div>
          `)}

          ${sectionCard('Detalle por alimento', 'apple', `
            <div class="list">
              ${dietFoods(state, diet).map((r) => `
                <div class="list-row">
                  <span class="list-emoji">${esc(r.food.emoji)}</span>
                  <span class="list-main"><span class="list-name">${esc(r.food.name)}</span>
                    <span class="list-sub">${esc(portionLabel(r.food, r.g))} al día · ${fmtNum(kcalOf(r.macros), 0)} kcal</span></span>
                </div>`).join('')}
            </div>
          `)}

          ${sectionCard('Esta dieta', 'settings', `
            <label class="field"><span>Nombre</span><input type="text" id="d-name" value="${esc(diet.name)}"></label>
            <label class="field"><span>Objetivo</span><input type="text" id="d-goal" value="${esc(diet.goal || '')}"></label>
            <div class="row wrap">
              <button class="btn btn-sm" data-dup>${icon('copy', 'ic-sm')} Duplicar</button>
              <button class="btn btn-sm btn-danger" data-del${getState().diets.length <= 1 ? ' disabled' : ''}>${icon('trash', 'ic-sm')} Eliminar</button>
            </div>
          `)}
        </div>
      </div>`;
  },

  mount(root) {
    const diet = activeDiet();
    const amounts = root.querySelector('.plan-amounts');
    amounts.querySelector('summary').addEventListener('click', (event) => {
      event.preventDefault();
      planAmountsOpen = !amounts.open;
      amounts.open = planAmountsOpen;
    });

    root.querySelectorAll('[data-diet]').forEach((b) => b.addEventListener('click', () => setActiveDiet(b.dataset.diet)));

    root.querySelector('#diet-targets-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const targets = Object.fromEntries(['kcal','p','c','f'].map(key => [key, Number(form.elements.namedItem(key).value)]));
      if (setDietTargets(diet.id, targets)) toast('Objetivos diarios guardados');
      else toast('Revisa las calorías y los gramos introducidos');
    });

    root.querySelectorAll('[data-scale]').forEach((input) => {
      const key = input.dataset.scale;
      const preview = () => {
        const state = getState();
        const scale = { ...diet.scale, [key]: Number(input.value) / 100 };
        const m = macrosFor(state, { ...diet, scale });
        MACROS.forEach((mm) => {
          const out = root.querySelector(`[data-out="${mm.key}"]`);
          const v = Math.round((scale[mm.key] ?? 1) * 100);
          if (out) out.innerHTML = `${fmtNum(m[mm.field], 0)} g<small>${v}%</small>`;
        });
        const k = root.querySelector('[data-kcal]');
        if (k) k.textContent = `${fmtNum(kcalOf(m), 0)} kcal`;
      };
      input.addEventListener('input', preview);
      input.addEventListener('change', () => {
        updateDiet(diet.id, { scale: { ...diet.scale, [key]: Number(input.value) / 100 } });
      });
    });

    root.querySelector('[data-reset-scale]')?.addEventListener('click', () => {
      updateDiet(diet.id, { scale: { carb: 1, protein: 1, fat: 1 } });
      toast('Cantidades originales restauradas');
    });

    root.querySelector('[data-target]')?.addEventListener('click', () => {
      const targets = dietTargets(getState(), { ...diet, targets: null });
      setDietTargets(diet.id, targets);
      toast('Objetivos actualizados con los valores del plan');
    });

    root.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => openPicker(diet, b.dataset.pick)));

    root.querySelector('#d-name')?.addEventListener('change', (e) => updateDiet(diet.id, { name: e.target.value.trim() || diet.name }));
    root.querySelector('#d-goal')?.addEventListener('change', (e) => updateDiet(diet.id, { goal: e.target.value.trim() }));

    root.querySelector('[data-dup]')?.addEventListener('click', () => {
      const copy = { ...JSON.parse(JSON.stringify(diet)), id: uid(), name: `${diet.name} (copia)` };
      addDiet(copy);
      setActiveDiet(copy.id);
      toast('Dieta duplicada');
    });

    root.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (await confirmDialog({ title: `¿Eliminar "${diet.name}"?`, message: 'Los días ya registrados no se modifican.', confirmText: 'Eliminar' })) {
        deleteDiet(diet.id);
        toast('Dieta eliminada');
      }
    });

    root.querySelector('[data-new]')?.addEventListener('click', () => {
      const nueva = {
        id: uid(), name: 'Nueva dieta', emoji: '🍽️', goal: '',
        scale: { carb: 1, protein: 1, fat: 1 },
        picks: Object.fromEntries(MEALS.map((m) => [m.id, 0])),
      };
      addDiet(nueva);
      setActiveDiet(nueva.id);
      toast('Dieta creada');
    });
  },
};

// Alimentos que usa la dieta en un día completo, con su cantidad total.
function dietFoods(state, diet) {
  const plan = dietPlan(diet, { training: true });
  const acc = new Map();
  Object.values(plan).forEach((m) => m.slots.forEach((s) => acc.set(s.food, (acc.get(s.food) || 0) + s.g)));
  return [...acc.entries()]
    .map(([id, g]) => ({ food: foodById(state, id), g, macros: slotsMacros(state, [{ food: id, g }]) }))
    .filter((r) => r.food)
    .sort((a, b) => kcalFromMacros(b.macros) - kcalFromMacros(a.macros));
}

function openPicker(diet, mealId) {
  const meal = MEALS.find((m) => m.id === mealId);
  openModal({
    render: () => {
      const state = getState();
      const idx = Math.min(diet.picks?.[mealId] ?? 0, meal.options.length - 1);
      return `
        ${modalHeader(`Combinación de ${meal.name.toLowerCase()}`, 'Se usará por defecto en los días nuevos')}
        <div class="modal-body">
          <div class="list">
            ${meal.options.map((o, i) => {
              const slots = o.slots.map((s) => ({ ...s, g: Math.round(s.g * (diet.scale?.[s.role === 'fat' ? 'fat' : s.role === 'protein' ? 'protein' : 'carb'] ?? 1)) }));
              const m = slotsMacros(state, slots);
              return `<button class="list-row" data-opt="${i}" style="width:100%;text-align:left;border:0;background:${i === idx ? 'var(--primary-soft)' : 'none'};border-radius:10px;cursor:pointer;font:inherit;color:inherit">
                <span class="list-main"><span class="list-name">${esc(o.name)}</span>
                  <span class="list-sub">${esc(slotsText(state, slots))}</span></span>
                <span class="list-sub">${fmtNum(kcalOf(m), 0)} kcal</span>
                ${i === idx ? icon('check') : ''}
              </button>`;
            }).join('')}
          </div>
        </div>
        <div class="modal-foot"><button class="btn" data-modal-close>Cerrar</button></div>`;
    },
    mount: (panel) => {
      panel.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => {
        updateDiet(diet.id, { picks: { ...diet.picks, [mealId]: Number(b.dataset.opt) } });
        closeModal();
        toast('Combinación actualizada');
      }));
    },
  });
}
