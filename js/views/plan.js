// Vista "Plan semanal": organiza las comidas por semana o por mes.

import { getState, dayPlan, isTrainingDay, setTraining, copyDay, resetDay, activeDiet } from '../store.js';
import { esc, icon, fmtNum, openModal, closeModal, modalHeader, toast } from '../ui.js';
import {
  todayKey, weekStart, weekDays, addWeeks, weekLabel, addDays, addMonths, currentMonth, monthLabel,
  monthDays, monthOf, dayNum, weekdayIdx, WEEKDAYS, WEEKDAYS_SHORT, dayLabelLong, isToday, cap, parseKey, keyOf,
} from '../dates.js';
import { MEALS } from '../data.js';
import { foodById, slotsMacros, emptyMacros, addMacros, dietTargets, portionLabel } from '../nutrition.js';
import { kcalOf, macroChips, slotsText, sectionCard } from './parts.js';
import { setDayKey, dayCompliance } from './hoy.js';

let mode = 'semana';
let anchor = todayKey();

const planMacrosOf = (state, key) => Object.values(dayPlan(key)).reduce((a, m) => addMacros(a, slotsMacros(state, m.slots)), emptyMacros());

function shoppingList(state, keys) {
  const acc = new Map();
  keys.forEach((k) => Object.values(dayPlan(k)).forEach((m) => (m.slots || []).forEach((s) => {
    acc.set(s.food, (acc.get(s.food) || 0) + Number(s.g || 0));
  })));
  return [...acc.entries()]
    .map(([id, g]) => ({ food: foodById(state, id), g }))
    .filter((r) => r.food)
    .sort((a, b) => b.g - a.g);
}

function weekView(state, keys) {
  return `<div class="week-scroll"><div class="week">${keys.map((k, i) => {
    const plan = dayPlan(k);
    const macros = planMacrosOf(state, k);
    const comp = dayCompliance(state, k);
    return `
      <button class="week-day ${isToday(k) ? 'today' : ''}" data-open="${k}">
        <h4>${esc(WEEKDAYS[i])} ${dayNum(k)}${isTrainingDay(k) ? ' <span class="train-dot" title="Entrenamiento"></span>' : ''}</h4>
        <div class="small muted">${fmtNum(kcalOf(macros), 0)} kcal${comp != null ? ` · ${Math.round(comp)}%` : ''}</div>
        ${MEALS.filter((m) => plan[m.id]).map((m) => `
          <div class="week-meal"><b>${esc(m.name.slice(0, 3))}</b><span>${esc(slotsText(state, plan[m.id].slots, { max: 1 }))}</span></div>`).join('')}
      </button>`;
  }).join('')}</div></div>`;
}

function monthView(state, ym) {
  const days = monthDays(ym);
  const lead = weekdayIdx(days[0]);
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(`<div class="cal-cell out" aria-hidden="true"></div>`);
  days.forEach((k) => {
    const macros = planMacrosOf(state, k);
    const comp = dayCompliance(state, k);
    const plan = dayPlan(k);
    cells.push(`
      <button class="cal-cell ${isToday(k) ? 'today' : ''}" data-open="${k}">
        <span class="cal-num">${dayNum(k)}${isTrainingDay(k) ? '<span class="train-dot"></span>' : ''}</span>
        <span class="cal-kcal">${fmtNum(kcalOf(macros), 0)} kcal</span>
        <span class="cal-dots">${Object.keys(plan).map((id) => `<span class="dot ${plan[id].done ? 'on' : ''}"></span>`).join('')}</span>
        ${comp != null ? `<span class="cal-kcal">${Math.round(comp)}%</span>` : ''}
      </button>`);
  });
  return `<div class="cal">${WEEKDAYS_SHORT.map((d) => `<div class="cal-dow">${d}</div>`).join('')}${cells.join('')}</div>`;
}

export default {
  title: 'Plan semanal',
  render() {
    const state = getState();
    const diet = activeDiet();
    const isWeek = mode === 'semana';
    const start = weekStart(anchor);
    const keys = isWeek ? weekDays(start) : monthDays(monthOf(anchor));
    const label = isWeek ? weekLabel(start) : monthLabel(monthOf(anchor));
    const totals = keys.reduce((a, k) => addMacros(a, planMacrosOf(state, k)), emptyMacros());
    const avgKcal = kcalOf(totals) / keys.length;
    const targets = dietTargets(state, diet, true);
    const trainDays = keys.filter((k) => isTrainingDay(k)).length;
    const shopping = shoppingList(state, keys);

    return `
      <div class="page-head">
        <div>
          <h1 class="page-title">Plan ${isWeek ? 'semanal' : 'mensual'}</h1>
          <div class="page-sub">Organiza tus comidas día a día · dieta ${esc(diet.name.toLowerCase())}</div>
        </div>
        <div class="page-actions">
          <div class="segmented">
            <button class="${isWeek ? 'active' : ''}" data-mode="semana">Semana</button>
            <button class="${isWeek ? '' : 'active'}" data-mode="mes">Mes</button>
          </div>
          <div class="month-nav">
            <button class="icon-btn" data-nav="-1" aria-label="Anterior">${icon('chevron-left')}</button>
            <h2 class="month-title">${esc(cap(label))}</h2>
            <button class="icon-btn" data-nav="1" aria-label="Siguiente">${icon('chevron-right')}</button>
          </div>
          <button class="btn btn-sm" data-nav="0">Hoy</button>
        </div>
      </div>

      ${sectionCard(isWeek ? 'Semana' : cap(label), 'calendar', isWeek ? weekView(state, keys) : monthView(state, monthOf(anchor)))}

      <div class="grid cols-2" style="margin-top:16px">
        <div>
          ${sectionCard('Resumen', 'chart', `
            <div class="row" style="justify-content:space-between;margin-bottom:10px">
              <div><div class="stat-sub">Media diaria</div><div class="stat-value">${fmtNum(avgKcal, 0)} <small>kcal</small></div></div>
              <div style="text-align:right"><div class="stat-sub">Objetivo</div><div class="stat-value">${fmtNum(targets.kcal, 0)} <small>kcal</small></div></div>
            </div>
            ${macroChips({ p: totals.p / keys.length, c: totals.c / keys.length, f: totals.f / keys.length })}
            <div class="row small muted" style="margin-top:12px;gap:8px">${icon('dumbbell', 'ic-sm')} ${trainDays} ${trainDays === 1 ? 'día' : 'días'} de entrenamiento en ${isWeek ? 'la semana' : 'el mes'}</div>
          `)}
        </div>
        <div>
          ${sectionCard('Lista de la compra', 'cart', `
            <p class="small muted">Suma de todo lo planificado ${isWeek ? 'esta semana' : 'este mes'}.</p>
            <div class="list">
              ${shopping.slice(0, 40).map((r) => `
                <div class="list-row">
                  <span class="list-emoji">${esc(r.food.emoji)}</span>
                  <span class="list-main"><span class="list-name">${esc(r.food.name)}</span></span>
                  <span class="list-sub">${r.g >= 1000 ? `${fmtNum(r.g / 1000, 2)} kg` : `${fmtNum(r.g, 0)} g`}</span>
                </div>`).join('') || '<div class="empty">Nada planificado todavía</div>'}
            </div>`, `<button class="btn btn-sm" data-copy-list>${icon('copy', 'ic-sm')} Copiar</button>`)}
        </div>
      </div>`;
  },

  mount(root) {
    root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }));

    root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.nav);
      if (n === 0) anchor = todayKey();
      else if (mode === 'semana') anchor = addWeeks(weekStart(anchor), n);
      else anchor = keyOf(parseKey(`${addMonths(monthOf(anchor), n)}-01`));
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }));

    root.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openDay(b.dataset.open)));

    root.querySelector('[data-copy-list]')?.addEventListener('click', async () => {
      const state = getState();
      const isWeek = mode === 'semana';
      const keys = isWeek ? weekDays(weekStart(anchor)) : monthDays(monthOf(anchor));
      const text = shoppingList(state, keys).map((r) => `${r.food.name}: ${r.g >= 1000 ? `${(r.g / 1000).toFixed(2)} kg` : `${Math.round(r.g)} g`}`).join('\n');
      try {
        await navigator.clipboard.writeText(text);
        toast('Lista copiada al portapapeles');
      } catch {
        toast('No se pudo copiar');
      }
    });
  },
};

function openDay(key) {
  openModal({
    render: () => {
      const state = getState();
      const plan = dayPlan(key);
      const macros = planMacrosOf(state, key);
      const training = isTrainingDay(key);
      return `
        ${modalHeader(cap(dayLabelLong(key)), `${fmtNum(kcalOf(macros), 0)} kcal planificadas`)}
        <div class="modal-body">
          <div class="row wrap" style="margin-bottom:14px">
            <div class="switch">
              <button class="${training ? 'on' : ''}" data-train="1">${icon('dumbbell', 'ic-sm')} Entrenamiento</button>
              <button class="${training ? '' : 'on'}" data-train="0">Descanso</button>
            </div>
            <div class="right">${macroChips(macros)}</div>
          </div>
          <div class="list">
            ${MEALS.filter((m) => plan[m.id]).map((m) => {
              const mm = slotsMacros(state, plan[m.id].slots);
              return `<div class="list-row">
                <span class="list-emoji">${icon(m.icon)}</span>
                <span class="list-main">
                  <span class="list-name">${esc(m.name)} <span class="muted small">${m.time}</span></span>
                  <span class="list-sub">${esc(slotsText(state, plan[m.id].slots))}</span>
                </span>
                <span class="list-sub">${fmtNum(kcalOf(mm), 0)} kcal</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn" data-copy-prev>${icon('copy', 'ic-sm')} Copiar día anterior</button>
          <button class="btn" data-reset>${icon('swap', 'ic-sm')} Plan de la dieta</button>
          <button class="btn btn-primary" data-edit>${icon('edit', 'ic-sm')} Editar comidas</button>
        </div>`;
    },
    mount: (panel) => {
      panel.querySelectorAll('[data-train]').forEach((b) => b.addEventListener('click', () => setTraining(key, b.dataset.train === '1')));
      panel.querySelector('[data-copy-prev]').addEventListener('click', () => {
        copyDay(addDays(key, -1), key);
        toast('Comidas copiadas del día anterior');
      });
      panel.querySelector('[data-reset]').addEventListener('click', () => {
        resetDay(key);
        toast('Día restaurado al plan de la dieta');
      });
      panel.querySelector('[data-edit]').addEventListener('click', () => {
        setDayKey(key);
        closeModal();
        location.hash = '#/hoy';
      });
    },
  });
}
