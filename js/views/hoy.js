// Vista "Hoy": plan de comidas del día, macros consumidos y resumen rápido.

import {
  getState, dayPlan, isTrainingDay, setTraining, toggleMealDone, setMealOption,
  setSlot, addSlot, removeSlot, resetDay, setWeight, activeDiet, dayOf,
} from '../store.js';
import { esc, icon, fmtNum, fmtDelta, openModal, closeModal, modalHeader, toast, refreshModal } from '../ui.js';
import { chart, ring } from '../charts.js';
import {
  todayKey, dayLabelLong, addDays, greeting, weekStart, weekDays, WEEKDAYS_SHORT, isFuture, dayLabelShort, cap,
} from '../dates.js';
import { MEALS, ROLES } from '../data.js';
import {
  foodById, slotsMacros, emptyMacros, addMacros, dietTargets, equivalentGrams,
  portionLabel, roundGrams, mealById,
} from '../nutrition.js';
import { statCard, macroChips, donut, macroLegend, kcalOf, foodOptions } from './parts.js';

let dayKey = todayKey();

const mealsOfPlan = (plan) => MEALS.filter((m) => plan[m.id]);

function dayMacros(state, plan, onlyDone = false) {
  return mealsOfPlan(plan).reduce((acc, meal) => {
    const entry = plan[meal.id];
    if (onlyDone && !entry.done) return acc;
    return addMacros(acc, slotsMacros(state, entry.slots));
  }, emptyMacros());
}

// Porcentaje de comidas completadas de un día ya guardado.
export function dayCompliance(state, key) {
  const day = state.days[key];
  if (!day?.meals) return null;
  const entries = Object.values(day.meals);
  if (!entries.length) return null;
  return (entries.filter((m) => m.done).length / entries.length) * 100;
}

function streak(state) {
  let n = 0;
  let k = todayKey();
  for (let i = 0; i < 400; i += 1) {
    const c = dayCompliance(state, k);
    if (c == null || c < 80) {
      if (i === 0 && (c == null || c < 80)) { k = addDays(k, -1); continue; } // el día en curso no rompe la racha
      break;
    }
    n += 1;
    k = addDays(k, -1);
  }
  return n;
}

function mealRow(state, meal, entry) {
  const macros = slotsMacros(state, entry.slots);
  const chips = entry.slots.map((s, i) => {
    const food = foodById(state, s.food);
    return `<button class="chip food" data-slot="${meal.id}:${i}" title="Cambiar ${esc(ROLES[s.role]?.name.toLowerCase() || 'alimento')}">
      <span>${esc(food?.emoji || '🍽️')}</span>${esc(portionLabel(food, s.g))} ${esc(food?.name.toLowerCase() || 'sin alimento')}</button>`;
  }).join('');
  return `
    <div class="meal ${entry.done ? 'done' : ''}">
      <span class="meal-time">${meal.time}</span>
      <span class="meal-ico">${icon(meal.icon)}</span>
      <div class="meal-main">
        <div class="meal-name">${esc(meal.name)}${meal.note ? `<span class="meal-note">· ${esc(meal.note)}</span>` : ''}</div>
        <div class="meal-foods">${chips}<button class="chip add" data-edit="${meal.id}" title="Editar comida">${icon('sliders', 'ic-sm')}</button></div>
      </div>
      <span class="meal-kcal">${fmtNum(kcalOf(macros), 0)} kcal</span>
      ${macroChips(macros)}
      <button class="check ${entry.done ? 'on' : ''}" data-done="${meal.id}" aria-label="Marcar ${esc(meal.name)}" aria-pressed="${entry.done}">${icon('check', 'ic-sm')}</button>
    </div>`;
}

function weightSeries(state, days = 28) {
  const points = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const k = addDays(todayKey(), -i);
    points.push({ label: dayLabelShort(k), full: dayLabelLong(k), value: state.days[k]?.weight ?? null });
  }
  return points;
}

function adherenceWeek(state) {
  const start = weekStart(todayKey());
  return weekDays(start).map((k, i) => ({ key: k, label: WEEKDAYS_SHORT[i], pct: dayCompliance(state, k), future: isFuture(k) }));
}

export default {
  title: 'Hoy',
  render() {
    const state = getState();
    const plan = dayPlan(dayKey);
    const diet = activeDiet();
    const training = isTrainingDay(dayKey);
    const targets = dietTargets(state, diet, training);
    const done = dayMacros(state, plan, true);
    const total = dayMacros(state, plan);
    const isToday = dayKey === todayKey();
    const weight = dayOf(dayKey)?.weight;
    const points = weightSeries(state);
    const withWeight = points.filter((p) => p.value != null);
    const delta = withWeight.length > 1 ? withWeight[withWeight.length - 1].value - withWeight[0].value : null;
    const comp = dayCompliance(state, dayKey) ?? 0;
    const adh = adherenceWeek(state);

    return `
      <div class="page-head">
        <div>
          <h1 class="page-title">${isToday ? `${greeting()}, ${esc(state.settings.name || 'Álvaro')}` : cap(dayLabelLong(dayKey))}</h1>
          <div class="page-sub">${isToday ? cap(dayLabelLong(dayKey)) : 'Plan de ese día'} · Dieta ${esc(diet.name.toLowerCase())}</div>
        </div>
        <div class="page-actions">
          <div class="month-nav">
            <button class="icon-btn" data-day="-1" aria-label="Día anterior">${icon('chevron-left')}</button>
            <button class="btn btn-sm" data-day="0"${isToday ? ' disabled' : ''}>Hoy</button>
            <button class="icon-btn" data-day="1" aria-label="Día siguiente">${icon('chevron-right')}</button>
          </div>
          <div class="switch">
            <button class="${training ? 'on' : ''}" data-train="1">${icon('dumbbell', 'ic-sm')} Entrenamiento</button>
            <button class="${training ? '' : 'on'}" data-train="0">Descanso</button>
          </div>
        </div>
      </div>

      <div class="grid cols-4" style="margin-bottom:16px">
        ${statCard({ key: 'kcal', value: kcalOf(done), target: targets.kcal, unit: 'kcal' })}
        ${statCard({ key: 'p', value: done.p, target: targets.p, unit: 'g' })}
        ${statCard({ key: 'c', value: done.c, target: targets.c, unit: 'g' })}
        ${statCard({ key: 'f', value: done.f, target: targets.f, unit: 'g' })}
      </div>

      <div class="grid cols-main">
        <div>
          <section class="card">
            <div class="card-head">
              <h2 class="card-title">${icon('utensils')}Comidas del día</h2>
              <div class="right row">
                <button class="btn btn-sm" data-reset>${icon('swap', 'ic-sm')} Reiniciar al plan</button>
              </div>
            </div>
            <div class="meals">${mealsOfPlan(plan).map((m) => mealRow(state, m, plan[m.id])).join('')}</div>
            <div class="totals">
              <button class="btn btn-primary" data-all>${icon('check', 'ic-sm')} Marcar todo como hecho</button>
              <div class="right" style="text-align:right">
                <div class="label">Total del día (estimado)</div>
                <div class="value">${fmtNum(kcalOf(total), 0)} kcal</div>
              </div>
              ${macroChips(total)}
            </div>
          </section>

          <section class="card">
            <div class="card-head">
              <h2 class="card-title">${icon('scale')}Peso de hoy</h2>
              <div class="right row">
                <button class="btn btn-sm" data-weight>${weight != null ? 'Cambiar' : 'Registrar'}</button>
              </div>
            </div>
            <div class="row wrap" style="gap:20px">
              <div><div class="stat-value">${weight != null ? `${fmtNum(weight, 1)} <small>kg</small>` : '—'}</div>
                <div class="stat-sub">${delta != null ? `${fmtDelta(delta, 'kg')} en 4 semanas` : 'Sin datos suficientes'}</div></div>
              <div style="flex:1;min-width:220px">${chart('line', {
                points, unit: 'kg', decimals: 1, height: 150,
                goal: state.settings.weightGoal ?? undefined,
                goalLabel: 'Objetivo',
                empty: 'Registra tu peso para ver la evolución',
              })}</div>
            </div>
          </section>
        </div>

        <div>
          <section class="card">
            <div class="card-head"><h2 class="card-title">${icon('target')}Macros de hoy</h2></div>
            <div class="donut-wrap">
              ${donut(total)}
              <div style="flex:1;min-width:150px">${macroLegend(total)}</div>
            </div>
          </section>

          <section class="card">
            <div class="card-head"><h2 class="card-title">${icon('trophy')}Cumplimiento</h2></div>
            <div class="donut-wrap">
              ${ring({ pct: comp, size: 104, stroke: 11, sub: 'del día' })}
              <div style="flex:1;min-width:140px">
                <div class="row" style="gap:7px;margin-bottom:10px">${icon('flame')}<b>${streak(state)} días</b> <span class="muted small">seguidos</span></div>
                <div class="adherence">
                  ${adh.map((d) => `<div class="adh" title="${esc(d.label)}">
                    <span class="adh-cell ${d.pct == null ? (d.future ? 'future' : '') : d.pct >= 80 ? 'full' : d.pct > 0 ? 'part' : ''}"></span>
                    <span class="adh-lbl">${esc(d.label)}</span></div>`).join('')}
                </div>
                <div class="small muted" style="margin-top:8px">Adherencia de esta semana</div>
              </div>
            </div>
          </section>

          <section class="card motiv">
            <div class="row" style="gap:12px">
              <span class="stat-ico" style="--tint:var(--primary-soft);--tone:var(--primary)">${icon('trophy')}</span>
              <div>
                <div style="font-weight:650">${comp >= 80 ? '¡Vas por buen camino!' : 'Aún estás a tiempo'}</div>
                <div class="small muted">${comp >= 80 ? 'Pequeños hábitos, grandes resultados.' : 'Marca las comidas conforme las hagas.'}</div>
              </div>
            </div>
          </section>
        </div>
      </div>`;
  },

  mount(root) {
    root.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.day);
      dayKey = n === 0 ? todayKey() : addDays(dayKey, n);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }));

    root.querySelectorAll('[data-train]').forEach((b) => b.addEventListener('click', () => setTraining(dayKey, b.dataset.train === '1')));

    root.querySelectorAll('[data-done]').forEach((b) => b.addEventListener('click', () => toggleMealDone(dayKey, b.dataset.done)));

    root.querySelector('[data-all]')?.addEventListener('click', () => {
      const plan = dayPlan(dayKey);
      mealsOfPlan(plan).forEach((m) => { if (!plan[m.id].done) toggleMealDone(dayKey, m.id); });
      toast('Día completado');
    });

    root.querySelector('[data-reset]')?.addEventListener('click', () => {
      resetDay(dayKey);
      toast('Comidas restauradas desde la dieta');
    });

    root.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => {
      const [mealId, idx] = b.dataset.slot.split(':');
      openFoodPicker(mealId, Number(idx));
    }));

    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openMealEditor(b.dataset.edit)));

    root.querySelector('[data-weight]')?.addEventListener('click', openWeight);
  },
};

// ---------- Cambiar el alimento de un hueco ----------
function openFoodPicker(mealId, idx) {
  openModal({
    size: 'sm',
    render: () => {
      const state = getState();
      const slot = dayPlan(dayKey)[mealId].slots[idx];
      const current = foodById(state, slot.food);
      const list = state.foods.filter((f) => f.roles.includes(slot.role) || f.id === slot.food);
      return `
        ${modalHeader(`Cambiar ${ROLES[slot.role]?.name.toLowerCase() || 'alimento'}`, `${esc(mealById(mealId).name)} · las cantidades se ajustan solas`)}
        <div class="modal-body">
          <div class="list">
            ${list.map((f) => {
              const g = f.id === slot.food ? slot.g : equivalentGrams(current, f, slot.g, slot.role);
              const m = slotsMacros(state, [{ food: f.id, g }]);
              return `<button class="list-row" data-pick="${f.id}" data-g="${g}" style="width:100%;text-align:left;background:${f.id === slot.food ? 'var(--primary-soft)' : 'none'};border:0;border-radius:10px;cursor:pointer;font:inherit;color:inherit">
                <span class="list-emoji">${esc(f.emoji)}</span>
                <span class="list-main"><span class="list-name">${esc(f.name)}</span>
                  <span class="list-sub">${esc(portionLabel(f, g))} · ${fmtNum(kcalOf(m), 0)} kcal</span></span>
                ${f.id === slot.food ? icon('check') : ''}
              </button>`;
            }).join('')}
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" data-modal-close>Cancelar</button>
          <button class="btn" data-open-editor>${icon('sliders', 'ic-sm')} Editar comida</button>
        </div>`;
    },
    mount: (panel) => {
      panel.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
        setSlot(dayKey, mealId, idx, { food: b.dataset.pick, g: roundGrams(Number(b.dataset.g)) });
        closeModal();
        toast('Alimento cambiado');
      }));
      panel.querySelector('[data-open-editor]').addEventListener('click', () => { closeModal(); openMealEditor(mealId); });
    },
  });
}

// ---------- Editor completo de una comida ----------
function openMealEditor(mealId) {
  const meal = mealById(mealId);
  openModal({
    render: () => {
      const state = getState();
      const entry = dayPlan(dayKey)[mealId];
      const macros = slotsMacros(state, entry.slots);
      return `
        ${modalHeader(meal.name, `${meal.time}${meal.note ? ' · ' + esc(meal.note) : ''}`)}
        <div class="modal-body">
          <div class="field">
            <span style="display:block;font-size:13px;font-weight:600;color:var(--text-soft);margin-bottom:6px">Combinaciones de la dieta</span>
            <div class="row wrap">
              ${meal.options.map((o, i) => `<button class="tag ${entry.option === i ? 'on' : ''}" data-opt="${i}" style="cursor:pointer;border:0;font-family:inherit;font-size:12px;text-transform:none;letter-spacing:0;padding:6px 11px">${esc(o.name)}</button>`).join('')}
            </div>
          </div>
          <div class="slots">
            ${entry.slots.map((s, i) => `
              <div class="slot">
                <span class="slot-role ${s.role}">${esc(ROLES[s.role]?.short || s.role)}</span>
                <select data-food="${i}">${foodOptions(state, s.role, s.food)}</select>
                <span class="slot-grams"><input type="number" min="0" step="1" value="${Math.round(s.g)}" data-g="${i}"><span class="unit">g</span></span>
                <button class="icon-btn plain" data-del="${i}" aria-label="Quitar">${icon('trash', 'ic-sm')}</button>
              </div>`).join('')}
          </div>
          <div class="row wrap" style="margin-top:12px">
            <button class="btn btn-sm" data-add>${icon('plus', 'ic-sm')} Añadir alimento</button>
            ${(meal.extras || []).map((e, i) => `<button class="btn btn-sm" data-extra="${i}">${icon('plus', 'ic-sm')} ${esc(foodById(state, e.food)?.name || e.food)}</button>`).join('')}
          </div>
          <div class="totals" style="margin-top:16px">
            <div><div class="label">Total de la comida</div><div class="value">${fmtNum(kcalOf(macros), 0)} kcal</div></div>
            <div class="right">${macroChips(macros)}</div>
          </div>
        </div>
        <div class="modal-foot"><button class="btn btn-primary" data-modal-close>Listo</button></div>`;
    },
    mount: (panel) => {
      panel.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => setMealOption(dayKey, mealId, Number(b.dataset.opt))));
      panel.querySelectorAll('[data-food]').forEach((sel) => sel.addEventListener('change', () => {
        const i = Number(sel.dataset.food);
        const state = getState();
        const slot = dayPlan(dayKey)[mealId].slots[i];
        const g = equivalentGrams(foodById(state, slot.food), foodById(state, sel.value), slot.g, slot.role);
        setSlot(dayKey, mealId, i, { food: sel.value, g });
      }));
      panel.querySelectorAll('[data-g]').forEach((inp) => inp.addEventListener('change', () => {
        setSlot(dayKey, mealId, Number(inp.dataset.g), { g: Math.max(0, Number(inp.value) || 0) });
      }));
      panel.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => removeSlot(dayKey, mealId, Number(b.dataset.del))));
      panel.querySelectorAll('[data-extra]').forEach((b) => {
        const extra = meal.extras[Number(b.dataset.extra)];
        b.addEventListener('click', () => addSlot(dayKey, mealId, { ...extra }));
      });
      panel.querySelector('[data-add]').addEventListener('click', () => {
        const first = getState().foods.find((f) => f.roles.includes('carb'));
        addSlot(dayKey, mealId, { role: 'carb', food: first.id, g: 50 });
        refreshModal();
      });
    },
  });
}

// ---------- Registrar peso ----------
function openWeight() {
  openModal({
    size: 'sm',
    render: () => `
      ${modalHeader('Registrar peso', cap(dayLabelLong(dayKey)))}
      <div class="modal-body">
        <label class="field"><span>Peso (kg)</span>
          <input type="number" step="0.1" inputmode="decimal" id="w" value="${dayOf(dayKey)?.weight ?? ''}" placeholder="Ej. 78,9"></label>
        <p class="small muted">Pésate siempre en las mismas condiciones: en ayunas y después de ir al baño.</p>
      </div>
      <div class="modal-foot">
        <button class="btn" data-clear>Borrar</button>
        <button class="btn btn-primary" data-save>Guardar</button>
      </div>`,
    mount: (panel) => {
      const input = panel.querySelector('#w');
      input.focus();
      const save = () => {
        setWeight(dayKey, input.value === '' ? null : Number(input.value));
        closeModal();
        toast('Peso guardado');
      };
      panel.querySelector('[data-save]').addEventListener('click', save);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
      panel.querySelector('[data-clear]').addEventListener('click', () => { setWeight(dayKey, null); closeModal(); });
    },
  });
}

export const getDayKey = () => dayKey;
export const setDayKey = (k) => { dayKey = k; };
