// Cálculos nutricionales: macros de un alimento según gramos, totales de comida y día,
// escalado de la dieta por macro y resolución de objetivos.

import { MEALS } from './data.js';

export const KCAL = { p: 4, c: 4, f: 9 };

export const emptyMacros = () => ({ kcal: 0, p: 0, c: 0, f: 0 });

export const addMacros = (a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f });

export const mealById = (id) => MEALS.find((m) => m.id === id);

export const foodById = (state, id) => state.foods.find((f) => f.id === id);

// Macros de `grams` gramos de un alimento (sus valores están por 100 g).
export function macrosOf(food, grams) {
  if (!food) return emptyMacros();
  const k = (Number(grams) || 0) / 100;
  return {
    kcal: food.kcal * k,
    p: food.p * k,
    c: food.c * k,
    f: food.f * k,
  };
}

// Las kcal calculadas desde los macros (más coherente al sumar que el valor declarado).
export const kcalFromMacros = (m) => m.p * KCAL.p + m.c * KCAL.c + m.f * KCAL.f;

export function slotsMacros(state, slots) {
  return (slots || []).reduce((acc, s) => addMacros(acc, macrosOf(foodById(state, s.food), s.g)), emptyMacros());
}

// Redondeo de cantidades: gramos "de báscula" (5 en 5 por encima de 100 g).
export function roundGrams(g) {
  if (g == null) return 0;
  if (g < 20) return Math.round(g);
  if (g < 100) return Math.round(g / 5) * 5;
  return Math.round(g / 5) * 5;
}

// ---------- Plan de un día ----------
// Genera las comidas de la dieta activa aplicando el escalado por macro.
export function dietPlan(diet, { training = true } = {}) {
  const out = {};
  for (const meal of MEALS) {
    if (meal.trainingOnly && !training) continue;
    const idx = Math.min(diet.picks?.[meal.id] ?? 0, meal.options.length - 1);
    const option = meal.options[idx];
    out[meal.id] = {
      option: idx,
      done: false,
      slots: option.slots.map((s) => ({
        ...s,
        role: s.role,
        food: s.food,
        g: roundGrams(s.g * (diet.scale?.[scaleKey(s.role)] ?? 1)),
      })),
    };
  }
  return out;
}

// Qué multiplicador le toca a cada rol.
export const scaleKey = (role) => (role === 'carb' || role === 'fruit' ? 'carb' : role === 'fat' ? 'fat' : role === 'veg' ? 'carb' : 'protein');

export function planMacros(state, plan) {
  return Object.values(plan || {}).reduce((acc, m) => addMacros(acc, slotsMacros(state, m.slots)), emptyMacros());
}

// Objetivos diarios de la dieta: los del plan tal y como está escalado.
export function dietTargets(state, diet, training = true) {
  if (diet.targets) return diet.targets;
  const m = planMacros(state, dietPlan(diet, { training }));
  return { kcal: Math.round(kcalFromMacros(m)), p: Math.round(m.p), c: Math.round(m.c), f: Math.round(m.f) };
}

// Busca los multiplicadores por macro que acercan la dieta al objetivo pedido.
export function solveScale(state, diet, target) {
  const scale = { carb: 1, protein: 1, fat: 1 };
  for (let i = 0; i < 14; i += 1) {
    const m = planMacros(state, dietPlan({ ...diet, scale }, { training: true }));
    if (!m.p || !m.c || !m.f) break;
    scale.protein = clampScale(scale.protein * (target.p / m.p));
    scale.carb = clampScale(scale.carb * (target.c / m.c));
    scale.fat = clampScale(scale.fat * (target.f / m.f));
  }
  return { carb: round2(scale.carb), protein: round2(scale.protein), fat: round2(scale.fat) };
}

const clampScale = (v) => Math.max(0.3, Math.min(3, v));
const round2 = (v) => Math.round(v * 100) / 100;

// Cantidad equivalente al cambiar de alimento dentro de un hueco:
// mantiene el macro principal del rol (carbos, proteína o grasa).
export function equivalentGrams(from, to, grams, role) {
  if (!from || !to) return grams;
  const key = role === 'fat' ? 'f' : role === 'protein' ? 'p' : 'c';
  const source = from[key] > 0 ? from[key] : from.kcal / 4;
  const dest = to[key] > 0 ? to[key] : to.kcal / 4;
  if (!dest) return grams;
  return roundGrams((grams * source) / dest);
}

// Porciones: devuelve "2 huevos" o "60 g" según el alimento.
export function portionLabel(food, grams) {
  if (food?.portion?.g) {
    const n = grams / food.portion.g;
    const rounded = Math.round(n * 2) / 2;
    if (Math.abs(n - rounded) < 0.26 && rounded > 0) {
      const label = rounded === 1 ? food.portion.label : `${food.portion.label}s`;
      return `${rounded % 1 === 0 ? rounded : rounded.toFixed(1)} ${label}`;
    }
  }
  return `${Math.round(grams)} g`;
}

export const pct = (value, target) => (target > 0 ? Math.min(999, (value / target) * 100) : 0);

// Peso cocinado / peso crudo. Aproximaciones de la tabla Nutriolift.
const COOKING = {arroz:2.5,pasta:2.5,patata:0.9,boniato:0.85,pollo:0.75,pavo:0.75,ternera:0.7,dorada:0.8,merluza:0.8,lubina:0.8,salmon:0.75,huevo:0.9,brocoli:0.8};
export const cookingFactor = food => { const factor = food?.cookingFactor ?? COOKING[food?.id]; return Number.isFinite(factor) && factor > 0 ? factor : null; };
export const shownGrams = (food, slot) => slot.g * (slot.preparation === 'cooked' ? cookingFactor(food) || 1 : 1);
export const rawGrams = (food, grams, preparation) => grams / (preparation === 'cooked' ? cookingFactor(food) || 1 : 1);
export function allowedSlots(type, role, entry) {
 const meal = mealById(type);
 const choices = meal.options.flatMap(o => o.slots).filter(s => s.role === role);
 if (entry?.slots.some(s => s.food === 'harina-avena')) choices.push(...(meal.extras || []).filter(s => s.role === role));
 return choices.filter((s,i,a) => a.findIndex(v => v.food === s.food) === i);
}
export function consumedMacros(state, entry) {
 return slotsMacros(state, (entry.slots || []).filter(s => s.checkable ? s.eaten : entry.done));
}
export function orderedMeals(plan) {
 return Object.entries(plan).map(([id,e]) => ({...mealById(e.type || id),id,time:e.time || mealById(e.type || id).time})).sort((a,b)=>a.time.localeCompare(b.time));
}
