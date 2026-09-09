// Vista "Progreso": evolución del peso, calorías, adherencia y macros.

import { diaryMeals, getState, activeDiet, isTrainingDay, setWeight } from '../store.js';
import { esc, icon, fmtNum, fmtDelta, openModal, closeModal, modalHeader, toast } from '../ui.js';
import { chart, ring, dataTable } from '../charts.js';
import {
  todayKey, addDays, dayLabelShort, dayLabelLong, weekStart, weekDays, addWeeks, monthShort, monthOf, cap, yearOf,
} from '../dates.js';
import { consumedMacros, slotsMacros, emptyMacros, addMacros, dietTargets } from '../nutrition.js';
import { kcalOf, donut, macroLegend, sectionCard, statCard } from './parts.js';
import { dayCompliance } from './hoy.js';

let range = 30;

const rangeKeys = (n) => Array.from({ length: n }, (_, i) => addDays(todayKey(), -(n - 1 - i)));

// Macros realmente consumidos ese día (solo comidas marcadas como hechas).
function eatenMacros(state, key) {
  const day = state.days[key];
  if (!day?.meals && !day?.diary) return null;
  const done = Object.values(diaryMeals(key, state)).filter((m) => m.done || m.slots.some(s => s.checkable && s.eaten));
  if (!done.length) return null;
  return done.reduce((a, m) => addMacros(a, consumedMacros(state, m)), emptyMacros());
}

export default {
  title: 'Progreso',
  render() {
    const state = getState();
    const diet = activeDiet();
    const keys = rangeKeys(range);
    const targets = dietTargets(state, diet, true);

    const weights = keys.map((k) => ({ key: k, value: state.days[k]?.weight ?? null }));
    const withWeight = weights.filter((w) => w.value != null);
    const first = withWeight[0]?.value ?? null;
    const last = withWeight[withWeight.length - 1]?.value ?? null;
    const delta = first != null && last != null ? last - first : null;

    const eaten = keys.map((k) => ({ key: k, macros: eatenMacros(state, k) }));
    const daysWithFood = eaten.filter((e) => e.macros);
    const avgKcal = daysWithFood.length ? daysWithFood.reduce((a, e) => a + kcalOf(e.macros), 0) / daysWithFood.length : 0;
    const avgMacros = daysWithFood.length
      ? (() => {
        const t = daysWithFood.reduce((a, e) => addMacros(a, e.macros), emptyMacros());
        return { p: t.p / daysWithFood.length, c: t.c / daysWithFood.length, f: t.f / daysWithFood.length, kcal: 0 };
      })()
      : emptyMacros();

    const comps = keys.map((k) => dayCompliance(state, k)).filter((c) => c != null);
    const avgComp = comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : 0;

    const step = range > 90 ? 7 : 1;
    const kcalItems = (step === 1 ? eaten : groupWeekly(state, keys)).map((e) => ({
      label: step === 1 ? dayLabelShort(e.key) : monthShort(monthOf(e.key)),
      full: step === 1 ? dayLabelLong(e.key) : `Semana del ${dayLabelShort(e.key)}`,
      value: e.macros ? kcalOf(e.macros) : null,
    }));

    const weekAdh = lastWeeks(state, range > 90 ? 12 : 8);
    const heat = {};
    Object.keys(state.days).forEach((k) => {
      const c = dayCompliance(state, k);
      if (c != null) heat[k] = c;
    });

    return `
      <div class="page-head">
        <div>
          <h1 class="page-title">Progreso</h1>
          <div class="page-sub">Cómo evolucionan tu peso, tus calorías y tu constancia</div>
        </div>
        <div class="page-actions">
          <div class="segmented">
            ${[30, 90, 365].map((n) => `<button class="${range === n ? 'active' : ''}" data-range="${n}">${n === 365 ? '1 año' : `${n} días`}</button>`).join('')}
          </div>
          <button class="btn btn-sm btn-primary" data-weight>${icon('scale', 'ic-sm')} Registrar peso</button>
        </div>
      </div>

      <div class="grid cols-4" style="margin-bottom:16px">
        <div class="stat" style="--tone:var(--c-kcal);--tint:color-mix(in srgb, var(--c-kcal) 13%, transparent)">
          <span class="stat-ico">${icon('scale')}</span>
          <div class="stat-body">
            <div class="stat-value">${last != null ? `${fmtNum(last, 1)} <small>kg</small>` : '—'}</div>
            <div class="stat-sub">Peso actual</div>
          </div>
        </div>
        <div class="stat" style="--tone:var(--c-prot);--tint:color-mix(in srgb, var(--c-prot) 13%, transparent)">
          <span class="stat-ico">${icon('chart')}</span>
          <div class="stat-body">
            <div class="stat-value">${delta != null ? fmtDelta(delta, 'kg') : '—'}</div>
            <div class="stat-sub">En ${range === 365 ? 'el último año' : `${range} días`}</div>
          </div>
        </div>
        ${statCard({ key: 'kcal', value: avgKcal, target: targets.kcal, unit: 'kcal' })}
        <div class="stat" style="--tone:var(--primary);--tint:var(--primary-soft)">
          <span class="stat-ico">${icon('trophy')}</span>
          <div class="stat-body">
            <div class="stat-value">${Math.round(avgComp)}<small>%</small></div>
            <div class="stat-sub">Adherencia media · ${comps.length} días registrados</div>
          </div>
        </div>
      </div>

      <div class="grid cols-main">
        <div>
          ${sectionCard('Evolución del peso', 'scale', `
            ${chart('line', {
              points: weights.map((w) => ({ label: dayLabelShort(w.key), full: dayLabelLong(w.key), value: w.value })),
              unit: 'kg', decimals: 1, height: 240,
              goal: state.settings.weightGoal ?? undefined,
              goalLabel: 'Objetivo',
              empty: 'Registra tu peso para ver la evolución',
            })}
            ${dataTable(withWeight.slice(-12).reverse().map((w) => [cap(dayLabelLong(w.key)), `${fmtNum(w.value, 1)} kg`]), ['Día', 'Peso'])}
          `)}

          ${sectionCard('Calorías consumidas', 'flame', `
            ${chart('bars', {
              items: kcalItems, unit: 'kcal', decimals: 0, height: 220,
              color: 'var(--c-kcal)',
              empty: 'Marca comidas como hechas para ver tus calorías',
            })}
            <p class="small muted" style="margin-top:10px">Objetivo diario: ${fmtNum(targets.kcal, 0)} kcal (día de entrenamiento).</p>
          `)}

          ${sectionCard(`Cumplimiento diario ${yearOf(todayKey())}`, 'calendar', chart('heatmap', { year: yearOf(todayKey()), data: heat }))}
        </div>

        <div>
          ${sectionCard('Adherencia semanal', 'trophy', `
            <div class="donut-wrap" style="margin-bottom:12px">
              ${ring({ pct: avgComp, size: 104, stroke: 11, sub: 'media' })}
              <div style="flex:1;min-width:130px" class="small muted">Porcentaje de comidas marcadas como hechas en cada semana.</div>
            </div>
            ${chart('bars', { items: weekAdh, unit: '%', max: 100, decimals: 0, height: 170, empty: 'Sin registros todavía' })}
          `)}

          ${sectionCard('Reparto medio de macros', 'target', `
            <div class="donut-wrap">${donut(avgMacros)}<div style="flex:1;min-width:150px">${macroLegend(avgMacros)}</div></div>
            <p class="small muted" style="margin-top:12px">Media de los ${daysWithFood.length} días con comidas registradas.</p>
          `)}

          ${sectionCard('Días de entrenamiento', 'dumbbell', `
            <div class="row" style="gap:14px">
              <div><div class="stat-value">${keys.filter((k) => isTrainingDay(k)).length}</div><div class="stat-sub">de ${keys.length} días</div></div>
              <div class="right small muted" style="text-align:right">La merienda solo se planifica los días que entrenas.</div>
            </div>
          `)}
        </div>
      </div>`;
  },

  mount(root) {
    root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
      range = Number(b.dataset.range);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }));
    root.querySelector('[data-weight]')?.addEventListener('click', openWeightDialog);
  },
};

function groupWeekly(state, keys) {
  const out = [];
  const startKey = weekStart(keys[0]);
  for (let s = startKey; s <= keys[keys.length - 1]; s = addWeeks(s, 1)) {
    const days = weekDays(s).map((k) => eatenMacros(state, k)).filter(Boolean);
    out.push({
      key: s,
      macros: days.length
        ? (() => { const t = days.reduce((a, m) => addMacros(a, m), emptyMacros()); return { p: t.p / days.length, c: t.c / days.length, f: t.f / days.length, kcal: 0 }; })()
        : null,
    });
  }
  return out;
}

function lastWeeks(state, n) {
  const out = [];
  let s = weekStart(todayKey());
  for (let i = 0; i < n; i += 1) {
    const days = weekDays(s).map((k) => dayCompliance(state, k)).filter((c) => c != null);
    out.unshift({
      label: dayLabelShort(s),
      full: `Semana del ${dayLabelShort(s)}`,
      value: days.length ? days.reduce((a, b) => a + b, 0) / days.length : null,
    });
    s = addWeeks(s, -1);
  }
  return out;
}

function openWeightDialog() {
  const key = todayKey();
  openModal({
    size: 'sm',
    render: () => `
      ${modalHeader('Registrar peso', cap(dayLabelLong(key)))}
      <div class="modal-body">
        <label class="field"><span>Peso (kg)</span><input type="number" step="0.1" inputmode="decimal" id="w" value="${getState().days[key]?.weight ?? ''}"></label>
        <label class="field"><span>Objetivo de peso (kg)</span><input type="number" step="0.1" inputmode="decimal" id="wg" value="${getState().settings.weightGoal ?? ''}" placeholder="Opcional"></label>
      </div>
      <div class="modal-foot"><button class="btn" data-modal-close>Cancelar</button><button class="btn btn-primary" data-save>Guardar</button></div>`,
    mount: (panel) => {
      panel.querySelector('#w').focus();
      panel.querySelector('[data-save]').addEventListener('click', async () => {
        const w = panel.querySelector('#w').value;
        const g = panel.querySelector('#wg').value;
        const { setSettings } = await import('../store.js');
        setSettings({ weightGoal: g === '' ? null : Number(g) });
        setWeight(key, w === '' ? null : Number(w));
        closeModal();
        toast('Peso guardado');
      });
    },
  });
}
