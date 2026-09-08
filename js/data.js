// Catálogo de alimentos de la dieta y plantillas de dieta.
// Los macros de los alimentos están expresados SIEMPRE por 100 g (o 100 ml).
// `portion` describe la medida casera de los alimentos que se cuentan por unidades.

export const ROLES = {
  carb: { name: 'Carbohidrato', short: 'Carbo' },
  protein: { name: 'Proteína', short: 'Prote' },
  fat: { name: 'Grasa', short: 'Grasa' },
  fruit: { name: 'Fruta', short: 'Fruta' },
  veg: { name: 'Verdura', short: 'Verdura' },
  extra: { name: 'Extra', short: 'Extra' },
};

export const ROLE_ORDER = ['carb', 'protein', 'fat', 'fruit', 'veg', 'extra'];

// id, nombre, emoji, roles, kcal/p/c/f por 100 g
export const FOODS = [
  { id: 'pan-md', name: 'Pan de masa madre', emoji: '🍞', roles: ['carb'], kcal: 260, p: 8.5, c: 49, f: 1.5 },
  { id: 'corn-flakes', name: 'Corn flakes', emoji: '🥣', roles: ['carb'], kcal: 378, p: 7.5, c: 84, f: 0.9 },
  { id: 'crema-arroz', name: 'Crema de arroz', emoji: '🥣', roles: ['carb'], kcal: 366, p: 7, c: 80, f: 1 },
  { id: 'harina-avena', name: 'Harina de avena', emoji: '🌾', roles: ['carb'], kcal: 380, p: 13.5, c: 60, f: 7 },
  { id: 'tortitas-arroz', name: 'Tortitas de arroz', emoji: '🍘', roles: ['carb'], kcal: 387, p: 8, c: 81, f: 3, portion: { label: 'paquete', g: 100 } },
  { id: 'arroz', name: 'Arroz (crudo)', emoji: '🍚', roles: ['carb'], kcal: 355, p: 7, c: 78, f: 0.8 },
  { id: 'pasta', name: 'Pasta (cruda)', emoji: '🍝', roles: ['carb'], kcal: 360, p: 12.5, c: 71, f: 1.5 },
  { id: 'patata', name: 'Patata', emoji: '🥔', roles: ['carb'], kcal: 77, p: 2, c: 17, f: 0.1 },
  { id: 'boniato', name: 'Boniato', emoji: '🍠', roles: ['carb'], kcal: 86, p: 1.6, c: 20, f: 0.1 },
  { id: 'gnocchis', name: 'Ñoquis', emoji: '🥟', roles: ['carb'], kcal: 160, p: 4, c: 33, f: 0.8 },
  { id: 'maltodextrina', name: 'Maltodextrina', emoji: '⚡', roles: ['carb'], kcal: 380, p: 0, c: 95, f: 0 },
  { id: 'zumo-manzana', name: 'Zumo de manzana', emoji: '🧃', roles: ['carb'], kcal: 46, p: 0.1, c: 11.2, f: 0.1 },

  { id: 'salmon-ahumado', name: 'Salmón ahumado', emoji: '🐟', roles: ['protein'], kcal: 180, p: 22, c: 0.5, f: 10 },
  { id: 'pavo-lonchas', name: 'Lonchas de pavo', emoji: '🍗', roles: ['protein'], kcal: 105, p: 18, c: 1.5, f: 2.5 },
  { id: 'proteina-polvo', name: 'Proteína en polvo', emoji: '🥛', roles: ['protein'], kcal: 380, p: 78, c: 7, f: 5.5 },
  { id: 'leche-prote', name: 'Leche proteica', emoji: '🥛', roles: ['protein'], kcal: 45, p: 6, c: 4.7, f: 0.5 },
  { id: 'huevo', name: 'Huevo', emoji: '🥚', roles: ['protein'], kcal: 143, p: 12.6, c: 0.7, f: 9.9, portion: { label: 'huevo', g: 60 } },
  { id: 'claras', name: 'Claras de huevo', emoji: '🥚', roles: ['protein'], kcal: 48, p: 11, c: 0.7, f: 0.2 },
  { id: 'pollo', name: 'Pechuga de pollo', emoji: '🍗', roles: ['protein'], kcal: 110, p: 23, c: 0, f: 1.8 },
  { id: 'ternera', name: 'Ternera magra', emoji: '🥩', roles: ['protein'], kcal: 130, p: 21, c: 0, f: 5 },
  { id: 'dorada', name: 'Dorada', emoji: '🐟', roles: ['protein'], kcal: 100, p: 19.8, c: 0, f: 2.2 },
  { id: 'merluza', name: 'Merluza', emoji: '🐟', roles: ['protein'], kcal: 72, p: 16, c: 0, f: 0.9 },
  { id: 'lubina', name: 'Lubina', emoji: '🐟', roles: ['protein'], kcal: 97, p: 18.4, c: 0, f: 2.5 },
  { id: 'salmon', name: 'Salmón', emoji: '🐟', roles: ['protein', 'fat'], kcal: 208, p: 20, c: 0, f: 13 },

  { id: 'aove', name: 'Aceite de oliva virgen extra', emoji: '🫒', roles: ['fat'], kcal: 900, p: 0, c: 0, f: 100 },
  { id: 'aguacate', name: 'Aguacate', emoji: '🥑', roles: ['fat'], kcal: 160, p: 2, c: 8.5, f: 15 },
  { id: 'mozzarella', name: 'Queso mozzarella', emoji: '🧀', roles: ['fat', 'protein'], kcal: 254, p: 24, c: 3, f: 16 },
  { id: 'cacao', name: 'Cacao desgrasado', emoji: '🍫', roles: ['extra'], kcal: 300, p: 25, c: 22, f: 10 },

  { id: 'fruta', name: 'Pieza de fruta', emoji: '🍎', roles: ['fruit'], kcal: 52, p: 0.3, c: 14, f: 0.2, portion: { label: 'pieza', g: 150 } },
  { id: 'arandanos', name: 'Arándanos', emoji: '🫐', roles: ['fruit'], kcal: 57, p: 0.7, c: 12, f: 0.3 },
  { id: 'verduras', name: 'Verduras', emoji: '🥦', roles: ['veg'], kcal: 35, p: 2, c: 5, f: 0.3 },
];

const s = (role, food, g) => ({ role, food, g });

// Las opciones son plantillas: al elegir una se rellenan los huecos de la comida.
// Cada hueco se puede cambiar después por cualquier alimento del mismo rol.
export const MEALS = [
  {
    id: 'desayuno',
    name: 'Desayuno',
    time: '07:30',
    icon: 'coffee',
    options: [
      { name: 'Pan con salmón', slots: [s('carb', 'pan-md', 60), s('protein', 'salmon-ahumado', 40)] },
      { name: 'Pan con pavo', slots: [s('carb', 'pan-md', 60), s('protein', 'pavo-lonchas', 55)] },
      { name: 'Corn flakes con proteína', slots: [s('carb', 'corn-flakes', 60), s('protein', 'proteina-polvo', 30)] },
      { name: 'Crema de arroz con leche prote', slots: [s('carb', 'crema-arroz', 55), s('protein', 'proteina-polvo', 30), s('protein', 'leche-prote', 150)] },
      { name: 'Crema de arroz con fruta', slots: [s('carb', 'crema-arroz', 55), s('protein', 'proteina-polvo', 30), s('fruit', 'fruta', 150)] },
    ],
  },
  {
    id: 'media-manana',
    name: 'Media mañana',
    time: '10:30',
    icon: 'snack',
    options: [
      { name: 'Crema de arroz con proteína', slots: [s('carb', 'crema-arroz', 60), s('protein', 'leche-prote', 150), s('protein', 'proteina-polvo', 45)] },
      { name: 'Tortitas de arroz con pavo', slots: [s('carb', 'tortitas-arroz', 100), s('protein', 'pavo-lonchas', 75)] },
      { name: 'Avena con huevo y claras', slots: [s('carb', 'harina-avena', 50), s('protein', 'huevo', 60), s('protein', 'claras', 75)] },
    ],
    extras: [
      { role: 'extra', food: 'cacao', g: 10 },
      { role: 'protein', food: 'proteina-polvo', g: 10 },
      { role: 'fruit', food: 'arandanos', g: 75 },
    ],
  },
  {
    id: 'comida',
    name: 'Comida',
    time: '14:00',
    icon: 'utensils',
    options: [
      { name: 'Arroz con pollo', slots: [s('carb', 'arroz', 75), s('protein', 'pollo', 160)] },
      { name: 'Arroz con huevos', slots: [s('carb', 'arroz', 75), s('protein', 'huevo', 120), s('protein', 'claras', 50)] },
      { name: 'Pasta con ternera', slots: [s('carb', 'pasta', 80), s('protein', 'ternera', 100)] },
      { name: 'Pasta con dorada', slots: [s('carb', 'pasta', 80), s('protein', 'dorada', 180)] },
      { name: 'Patata con merluza', slots: [s('carb', 'patata', 350), s('protein', 'merluza', 180), s('fat', 'aove', 5)] },
      { name: 'Patata con lubina', slots: [s('carb', 'patata', 350), s('protein', 'lubina', 180), s('fat', 'aove', 5)] },
      { name: 'Boniato con salmón', slots: [s('carb', 'boniato', 275), s('protein', 'salmon', 105), s('fat', 'mozzarella', 20)] },
      { name: 'Ñoquis con pavo', slots: [s('carb', 'gnocchis', 240), s('protein', 'pavo-lonchas', 120), s('fat', 'aguacate', 30), s('fruit', 'fruta', 150)] },
    ],
  },
  {
    id: 'merienda',
    name: 'Merienda',
    time: '17:30',
    icon: 'dumbbell',
    trainingOnly: true,
    note: 'Solo días de entrenamiento',
    options: [
      { name: 'Zumo de manzana', slots: [s('carb', 'zumo-manzana', 350)] },
      { name: 'Maltodextrina', slots: [s('carb', 'maltodextrina', 40)] },
    ],
  },
  {
    id: 'cena',
    name: 'Cena',
    time: '21:00',
    icon: 'moon',
    options: [
      { name: 'Arroz con pollo', slots: [s('carb', 'arroz', 75), s('protein', 'pollo', 160)] },
      { name: 'Arroz con huevos', slots: [s('carb', 'arroz', 75), s('protein', 'huevo', 120), s('protein', 'claras', 50)] },
      { name: 'Pasta con ternera', slots: [s('carb', 'pasta', 80), s('protein', 'ternera', 100)] },
      { name: 'Pasta con dorada', slots: [s('carb', 'pasta', 80), s('protein', 'dorada', 180)] },
      { name: 'Patata con merluza', slots: [s('carb', 'patata', 350), s('protein', 'merluza', 180), s('fat', 'aove', 5)] },
      { name: 'Patata con lubina', slots: [s('carb', 'patata', 350), s('protein', 'lubina', 180), s('fat', 'aove', 5)] },
      { name: 'Boniato con salmón', slots: [s('carb', 'boniato', 275), s('protein', 'salmon', 105), s('fat', 'mozzarella', 20)] },
      { name: 'Ñoquis con pavo', slots: [s('carb', 'gnocchis', 250), s('protein', 'pavo-lonchas', 120), s('fat', 'aguacate', 30), s('veg', 'verduras', 200)] },
    ],
  },
];

// Dietas de partida. `picks` es la opción por defecto de cada comida y
// `scale` el multiplicador de cantidades por macro (se ajusta desde "Mis dietas").
export const DEFAULT_DIETS = [
  {
    id: 'definicion',
    name: 'Definición',
    emoji: '🔥',
    goal: 'Bajar grasa manteniendo la masa muscular',
    scale: { carb: 1, protein: 1, fat: 1 },
    picks: { desayuno: 0, 'media-manana': 0, comida: 0, merienda: 1, cena: 6 },
  },
  {
    id: 'volumen',
    name: 'Volumen',
    emoji: '💪',
    goal: 'Ganar masa muscular con superávit controlado',
    scale: { carb: 1.35, protein: 1.1, fat: 1.15 },
    picks: { desayuno: 2, 'media-manana': 0, comida: 4, merienda: 0, cena: 2 },
  },
  {
    id: 'recomposicion',
    name: 'Recomposición corporal',
    emoji: '⚖️',
    goal: 'Perder grasa y ganar músculo a la vez',
    scale: { carb: 1.1, protein: 1.15, fat: 1 },
    picks: { desayuno: 3, 'media-manana': 2, comida: 7, merienda: 1, cena: 4 },
  },
];
