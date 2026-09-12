# NutriPlan · Plataforma de Dietas

Aplicación web (PWA) para llevar mi dieta: plan diario de comidas con sus macros, planificación semanal
y mensual, dietas intercambiables, seguimiento del progreso y catálogo de alimentos.

**En vivo:** https://alvaromolmateo-cmd.github.io/plataforma-de-dietas/

## Qué hace

- **Hoy** — diario con desayuno, almuerzo, comida, merienda y cena vacíos por defecto. El botón «+» permite
  registrar cualquier alimento del catálogo, elegir cantidades en crudo o cocinado y reutilizar alimentos
  o comidas recientes. Los checks indican lo consumido; los macros se comparan con los objetivos de la dieta.
  Los horarios habituales se cambian en Ajustes. También permite registrar el peso del día.
- **Plan semanal** — calendario por semana o por mes con las kcal y el cumplimiento de cada día, copiar el día
  anterior, marcar días de entrenamiento y **lista de la compra** con la suma de todo lo planificado.
- **Mis dietas** — definición, volumen, recomposición o las que crees. Los totales de kcal y macros del plan
  son los objetivos diarios que se usan en Hoy y Progreso; las cantidades se ajustan con los deslizadores del
  apartado desplegable «Cantidades del plan».
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
| `js/views/ajustes.js` | Perfil, horarios de comida, aplicación y copias de seguridad |
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

## Cambios 1.1.0

- Ajustes como pagina, tema claro/oscuro y frase personalizable.
- Horas y tipos de comida editables; orden por hora.
- Seleccion limitada a la pauta de cada comida y extras condicionados a la avena.
- Fruta, verdura y leche del desayuno con consumo independiente.
- Selector de dia semanal y resumen de consumo por semana, mes o anio.
- Conversion crudo/cocinado con factores orientativos editables (tabla Nutriolift).
- Verificacion de logica y renderizado de vistas: `node tools/check.mjs`.

El paquete de tortitas conserva 100 g como referencia inicial: ajustar el peso del paquete real desde Alimentos. Los factores de coccion son aproximaciones; los macros se conservan para la racion equivalente. En el resumen anual cada barra indica la media diaria del mes; la linea usa los dias con consumo registrado.

## Cambios 1.2.0

- Diario de alimentos libre en Hoy, independiente del plan semanal. Los consumos anteriores se conservan;
  las comidas de la dieta que no estaban marcadas como consumidas no se añaden automáticamente al diario.
- Catálogo con búsqueda, alimentos recientes y comidas anteriores para añadir al registro actual.
- Horarios habituales en Ajustes, tarjetas compactas y retirada del lema y del panel de Apariencia.
- Tema oscuro con fondo negro y detalles burdeos; tema claro con barra lateral blanca.
- `days[fecha].diary` guarda el consumo; `days[fecha].meals` conserva la planificación anterior.

Comprobaciones: `node tools/check.mjs`. Para las pruebas de interacción DOM, instala `jsdom` en un directorio
temporal, apunta `NODE_PATH` a su `node_modules` y ejecuta `node tools/check-ui.mjs`. La aplicación sigue sin
dependencias de ejecución. Estas pruebas no sustituyen la revisión visual en un navegador.

## Cambios 1.2.1

- Campos de nombre y hora con el mismo estilo de los demás controles de Ajustes.
- Ajustes en dos columnas alineadas en portátil y una columna en móvil.
- Cuatro objetivos diarios independientes por dieta, guardados en `diet.targets`. Se conservan al cambiar
  las raciones del plan, la dieta activa y al exportar/importar copias. Una dieta sin objetivos personalizados
  continúa usando el cálculo del plan hasta que se guarden sus objetivos.

## Cambios 1.2.3

- Se retira el apartado «Objetivos diarios» de Mis dietas: se solapaba con el reparto y las cantidades del plan.
  Los objetivos vuelven a ser los totales del plan y los `diet.targets` guardados se descartan al cargar o importar.
