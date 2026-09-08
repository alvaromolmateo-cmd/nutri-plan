// Estado de la aplicación: se guarda entero en localStorage y se avisa a las vistas al cambiar.

import { FOODS, DEFAULT_DIETS, MEALS } from './data.js';
import { dietPlan, roundGrams } from './nutrition.js';
import { todayKey } from './dates.js';

const KEY = 'plataforma-dietas:data';
export const DATA_VERSION = 1;
export const APP_VERSION = '1.0.0';

const clone = (v) => JSON.parse(JSON.stringify(v));

function initialState() {
  return {
    version: DATA_VERSION,
    settings: {
      name: 'Álvaro',
      activeDiet: 'definicion',
      theme: 'auto',
      weightGoal: null,
      trainingDays: [true, true, true, true, true, false, false], // L a D
    },
    foods: clone(FOODS),
    diets: clone(DEFAULT_DIETS),
    days: {},
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const data = JSON.parse(raw);
    return migrate(data);
  } catch {
    return initialState();
  }
}

function migrate(data) {
  const base = initialState();
  const out = { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
  // Alimentos nuevos del catálogo que el usuario todavía no tiene.
  const ids = new Set((out.foods || []).map((f) => f.id));
  out.foods = (out.foods || []).concat(FOODS.filter((f) => !ids.has(f.id)).map(clone));
  if (!out.diets?.length) out.diets = clone(DEFAULT_DIETS);
  out.days = out.days || {};
  out.version = DATA_VERSION;
  return out;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('No se pudo guardar', e);
  }
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit() {
  save();
  listeners.forEach((fn) => fn(state));
}

// ---------- Lecturas ----------
export const activeDiet = () => state.diets.find((d) => d.id === state.settings.activeDiet) || state.diets[0];

export const dietById = (id) => state.diets.find((d) => d.id === id);

export const isTrainingDay = (key) => {
  const day = state.days[key];
  if (day && typeof day.training === 'boolean') return day.training;
  const idx = (new Date(`${key}T00:00:00`).getDay() + 6) % 7;
  return !!state.settings.trainingDays?.[idx];
};

// Comidas de un día: las guardadas, o el plan de la dieta activa si aún no se ha tocado.
export function dayPlan(key) {
  const day = state.days[key];
  if (day?.meals && Object.keys(day.meals).length) {
    const plan = clone(day.meals);
    // La merienda solo aparece en días de entrenamiento.
    if (!isTrainingDay(key)) delete plan.merienda;
    else if (!plan.merienda) plan.merienda = dietPlan(activeDiet(), { training: true }).merienda;
    return plan;
  }
  return dietPlan(activeDiet(), { training: isTrainingDay(key) });
}

export const dayOf = (key) => state.days[key] || null;

export const hasLog = (key) => {
  const d = state.days[key];
  if (!d) return false;
  return !!(d.weight != null || d.note || d.meals || typeof d.training === 'boolean');
};

// ---------- Escrituras ----------
function ensureDay(key) {
  if (!state.days[key]) state.days[key] = {};
  return state.days[key];
}

function ensureMeals(key) {
  const day = ensureDay(key);
  if (!day.meals) day.meals = clone(dayPlan(key));
  return day.meals;
}

export function setTraining(key, training) {
  const day = ensureDay(key);
  day.training = training;
  if (day.meals) {
    if (training && !day.meals.merienda) day.meals.merienda = dietPlan(activeDiet(), { training: true }).merienda;
    if (!training) delete day.meals.merienda;
  }
  commit();
}

export function setMealOption(key, mealId, optionIdx) {
  const meals = ensureMeals(key);
  const meal = MEALS.find((m) => m.id === mealId);
  const option = meal.options[optionIdx];
  const diet = activeDiet();
  meals[mealId] = {
    ...(meals[mealId] || {}),
    option: optionIdx,
    slots: option.slots.map((s) => ({
      role: s.role,
      food: s.food,
      g: roundGrams(s.g * (diet.scale?.[s.role === 'carb' || s.role === 'fruit' || s.role === 'veg' ? 'carb' : s.role === 'fat' ? 'fat' : 'protein'] ?? 1)),
    })),
  };
  commit();
}

export function setSlot(key, mealId, slotIdx, patch) {
  const meals = ensureMeals(key);
  const meal = meals[mealId];
  if (!meal?.slots?.[slotIdx]) return;
  meal.slots[slotIdx] = { ...meal.slots[slotIdx], ...patch };
  meal.option = null;
  commit();
}

export function addSlot(key, mealId, slot) {
  const meals = ensureMeals(key);
  const meal = meals[mealId];
  if (!meal) return;
  meal.slots.push(slot);
  meal.option = null;
  commit();
}

export function removeSlot(key, mealId, slotIdx) {
  const meals = ensureMeals(key);
  const meal = meals[mealId];
  if (!meal?.slots) return;
  meal.slots.splice(slotIdx, 1);
  meal.option = null;
  commit();
}

export function toggleMealDone(key, mealId) {
  const meals = ensureMeals(key);
  if (!meals[mealId]) return;
  meals[mealId].done = !meals[mealId].done;
  commit();
}

export function resetDay(key) {
  const day = state.days[key];
  if (!day) return;
  delete day.meals;
  if (!hasLog(key)) delete state.days[key];
  commit();
}

export function copyDay(fromKey, toKey) {
  const plan = clone(dayPlan(fromKey));
  Object.values(plan).forEach((m) => { m.done = false; });
  const day = ensureDay(toKey);
  day.meals = plan;
  commit();
}

export function setWeight(key, weight) {
  const day = ensureDay(key);
  if (weight == null || weight === '') delete day.weight;
  else day.weight = Number(weight);
  if (!hasLog(key)) delete state.days[key];
  commit();
}

export function setNote(key, note) {
  const day = ensureDay(key);
  if (note) day.note = note;
  else delete day.note;
  commit();
}

export function setSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  commit();
}

// ---------- Alimentos ----------
export function upsertFood(food) {
  const i = state.foods.findIndex((f) => f.id === food.id);
  if (i >= 0) state.foods[i] = { ...state.foods[i], ...food };
  else state.foods.push(food);
  commit();
}

export function deleteFood(id) {
  state.foods = state.foods.filter((f) => f.id !== id);
  commit();
}

export const foodInUse = (id) => {
  if (Object.values(state.days).some((d) => Object.values(d.meals || {}).some((m) => (m.slots || []).some((s) => s.food === id)))) return true;
  return MEALS.some((m) => m.options.some((o) => o.slots.some((s) => s.food === id)));
};

// ---------- Dietas ----------
export function updateDiet(id, patch) {
  const i = state.diets.findIndex((d) => d.id === id);
  if (i < 0) return;
  state.diets[i] = { ...state.diets[i], ...patch };
  commit();
}

export function addDiet(diet) {
  state.diets.push(diet);
  commit();
}

export function deleteDiet(id) {
  if (state.diets.length <= 1) return;
  state.diets = state.diets.filter((d) => d.id !== id);
  if (state.settings.activeDiet === id) state.settings.activeDiet = state.diets[0].id;
  commit();
}

export function setActiveDiet(id) {
  state.settings.activeDiet = id;
  commit();
}

// ---------- Copia de seguridad ----------
export function exportData() {
  return JSON.stringify(state, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object') throw new Error('Archivo no válido');
  state = migrate(data);
  commit();
  return true;
}

export function resetAll() {
  state = initialState();
  commit();
}

export { todayKey };
