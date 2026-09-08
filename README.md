# NutriPlan · Plataforma de Dietas

Aplicación web (PWA) para llevar mi dieta: plan diario de comidas con sus macros, planificación semanal
y mensual, dietas intercambiables, seguimiento del progreso y catálogo de alimentos.

**En vivo:** https://alvaromolmateo-cmd.github.io/plataforma-de-dietas/

## Qué hace

- **Hoy** — las comidas del día (desayuno, media mañana, comida, merienda de entrenamiento y cena) con sus
  calorías y macros. Cada hueco de la comida (carbohidrato, proteína, grasa…) es un alimento intercambiable:
  al elegir otro, la cantidad se recalcula sola para mantener el macro principal. Marca cada comida como hecha
  y registra el peso del día.
- **Plan semanal** — calendario por semana o por mes con las kcal y el cumplimiento de cada día, copiar el día
  anterior, marcar días de entrenamiento y **lista de la compra** con la suma de todo lo planificado.
- **Mis dietas** — definición, volumen, recomposición o las que crees. Los tres deslizadores de macros suben o
  bajan las cantidades de todos los alimentos del plan, y "ajustar a un objetivo" resuelve las cantidades para
  unos macros concretos.
- **Progreso** — evolución del peso con objetivo, calorías consumidas, adherencia semanal, reparto medio de
  macros y mapa de cumplimiento anual.
- **Alimentos** — catálogo con la información nutricional. Los macros se pueden introducir sobre 100 g o sobre
  la cantidad que indique la etiqueta, y la lista se recalcula para la cantidad de referencia que elijas.

## Cómo está hecho

Sin dependencias ni paso de compilación: HTML, CSS y módulos ES nativos.

| Archivo | Para qué |
| --- | --- |
| `js/data.js` | Catálogo de alimentos y plantillas de comidas y dietas |
| `js/nutrition.js` | Cálculo de macros, escalado por macro y equivalencias entre alimentos |
| `js/store.js` | Estado en `localStorage` (clave `plataforma-dietas:data`) y acciones |
| `js/app.js` | Navegación entre vistas, tema y ajustes |
| `js/views/` | Una vista por sección más `parts.js` con las piezas comunes |
| `js/charts.js` | Gráficas SVG hechas a mano (línea, barras, mapa de calor, anillos) |
| `sw.js` | Service worker: precarga y red con respaldo en caché |
| `tools/make-icons.js` | Genera los iconos PNG de la PWA (`node tools/make-icons.js`) |

## Probar en local

```sh
python -m http.server 5175
```

Y abrir http://localhost:5175. Los datos se guardan en el navegador; en **Ajustes** se pueden exportar e
importar en JSON.

Al cambiar archivos precargados hay que subir `VERSION` en `sw.js`.
