// Piezas de interfaz compartidas por las vistas.

import { esc, icon, fmtNum, progressBar } from '../ui.js';
import { foodById, kcalFromMacros, portionLabel, cookingFactor, roundGrams, pct as pctOf } from '../nutrition.js';
import { ROLES } from '../data.js';

export const MACRO_META = {
  kcal: { label: 'kcal', icon: 'flame', tone: 'var(--c-kcal)' },
  p: { label: 'proteína', icon: 'muscle', tone: 'var(--c-prot)' },
  c: { label: 'carbohidratos', icon: 'wheat', tone: 'var(--c-carb)' },
  f: { label: 'grasas', icon: 'droplet', tone: 'var(--c-fat)' },
};

export const kcalOf = (m) => Math.round(kcalFromMacros(m));

export function statCard({ key, value, target, unit }) {
  const meta = MACRO_META[key];
  const p = pctOf(value, target);
  return `
    <div class="stat" style="--tone:${meta.tone};--tint:color-mix(in srgb, ${meta.tone} 13%, transparent)">
      <span class="stat-ico">${icon(meta.icon)}</span>
      <div class="stat-body">
        <div class="stat-value">${fmtNum(Math.round(value), 0)} <small>${unit && unit !== meta.label ? `${unit} ${meta.label}` : meta.label}</small></div>
        <div class="stat-sub">de ${fmtNum(Math.round(target), 0)}${unit ? ' ' + unit : ''}</div>
        <div class="stat-bar">${progressBar(p, p > 108 ? 'over' : '')}<span class="stat-pct">${Math.round(p)}%</span></div>
      </div>
    </div>`;
}

export const macroChips = (m, { kcal = false } = {}) => `
  <div class="macro-chips">
    ${kcal ? `<span class="chip k">${fmtNum(kcalOf(m), 0)} kcal</span>` : ''}
    <span class="chip p">P ${fmtNum(m.p, 0)} g</span>
    <span class="chip c">C ${fmtNum(m.c, 0)} g</span>
    <span class="chip f">G ${fmtNum(m.f, 0)} g</span>
  </div>`;

// Donut de macros con tres segmentos (kcal aportadas por cada macro).
export function donut(m, { size = 150, stroke = 22 } = {}) {
  const parts = [
    { key: 'p', value: m.p * 4, color: 'var(--c-prot)' },
    { key: 'c', value: m.c * 4, color: 'var(--c-carb)' },
    { key: 'f', value: m.f * 9, color: 'var(--c-fat)' },
  ];
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  const arcs = parts.map((p) => {
    const len = (p.value / total) * circ;
    const seg = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.color}" stroke-width="${stroke}"
      stroke-dasharray="${Math.max(0, len - 2).toFixed(2)} ${(circ - len + 2).toFixed(2)}"
      stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})" stroke-linecap="butt"/>`;
    acc += len;
    return seg;
  }).join('');
  return `
    <div class="ring donut" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/>
        ${arcs}
      </svg>
      <div class="ring-center"><div class="ring-value">${fmtNum(kcalOf(m), 0)}</div><div class="ring-sub">kcal</div></div>
    </div>`;
}

export function macroLegend(m) {
  const kcal = kcalOf(m) || 1;
  const rows = [
    { key: 'p', name: 'Proteína', color: 'var(--c-prot)', g: m.p, k: m.p * 4 },
    { key: 'c', name: 'Carbos', color: 'var(--c-carb)', g: m.c, k: m.c * 4 },
    { key: 'f', name: 'Grasas', color: 'var(--c-fat)', g: m.f, k: m.f * 9 },
  ];
  return `<div class="legend">${rows.map((r) => `
    <div class="legend-row">
      <span class="legend-dot" style="background:${r.color}"></span>
      <span class="legend-name">${r.name}</span>
      <span class="legend-val">${fmtNum(r.g, 0)} g · ${Math.round((r.k / kcal) * 100)}%</span>
    </div>`).join('')}</div>`;
}

// "60 g pan de masa madre + 40 g salmón ahumado"
export function slotsText(state, slots, { max = 4 } = {}) {
  const items = (slots || []).map((s) => {
    const food = foodById(state, s.food);
    return `${portionLabel(food, s.g)} ${food ? food.name.toLowerCase() : '¿?'}`;
  });
  if (!items.length) return 'Sin alimentos';
  if (items.length > max) return `${items.slice(0, max).join(' + ')} +${items.length - max}`;
  return items.join(' + ');
}

// Alimentos de una comida como fichas: emoji, nombre y cantidad (con su peso cocinado si aplica).
export function foodTiles(state, slots, { compact = false } = {}) {
  if (!slots?.length) return '<p class="small muted">Sin alimentos</p>';
  return `<ul class="food-tiles ${compact ? 'compact' : ''}">${slots.map((s) => {
    const food = foodById(state, s.food);
    const factor = cookingFactor(food);
    const cooked = factor && !compact ? `<small>≈ ${fmtNum(roundGrams(s.g * factor), 0)} g cocinado</small>` : '';
    return `<li class="food-tile ${esc(s.role || '')}"><span class="food-tile-emoji">${esc(food?.emoji || '🍽️')}</span>
      <b class="food-tile-amount">${esc(portionLabel(food, s.g))}${factor && !/crud/i.test(food.name) ? ' crudo' : ''}</b>
      <span class="food-tile-name">${esc(food?.name || '¿?')}</span>${cooked}</li>`;
  }).join('')}</ul>`;
}

// Barra apilada con el reparto de kcal entre proteína, carbos y grasas.
export function macroBar(m) {
  const parts = [['p', m.p * 4], ['c', m.c * 4], ['f', m.f * 9]];
  const total = parts.reduce((a, [, v]) => a + v, 0) || 1;
  return `<div class="macro-bar" aria-hidden="true">${parts.map(([k, v]) => `<span class="${k}" style="width:${(v / total) * 100}%"></span>`).join('')}</div>`;
}

export const roleTag =(role) => `<span class="tag ${role}">${esc(ROLES[role]?.short || role)}</span>`;

export const foodOptions = (state, role, selected) => state.foods
  .filter((f) => !role || f.roles.includes(role) || f.id === selected)
  .map((f) => `<option value="${f.id}"${f.id === selected ? ' selected' : ''}>${esc(f.emoji)} ${esc(f.name)}</option>`)
  .join('');

export const sectionCard = (title, iconName, body, actions = '') => `
  <section class="card">
    <div class="card-head"><h2 class="card-title">${icon(iconName)}${esc(title)}</h2>${actions ? `<div class="right row">${actions}</div>` : ''}</div>
    ${body}
  </section>`;
