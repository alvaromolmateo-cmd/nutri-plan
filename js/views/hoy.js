// Diario de consumo independiente de la planificación de la dieta.
import { getState, diaryMeals, logFood, toggleLoggedFood, removeLoggedFood, restoreLoggedFood, clearLoggedMeal,
  recentFoods, recentMeals, repeatLoggedMeal, isTrainingDay, setTraining, activeDiet, dayOf, setWeight } from '../store.js';
import { esc, icon, fmtNum, openModal, closeModal, modalHeader, toast, refreshModal, confirmDialog } from '../ui.js';
import { todayKey, dayLabelLong, dayLabelShort, addDays, weekStart, weekDays, WEEKDAYS_SHORT, cap, greeting } from '../dates.js';
import { consumedMacros, orderedMeals, foodById, macrosOf, emptyMacros, addMacros, dietTargets,
  cookingFactor, shownGrams, rawGrams, mealById } from '../nutrition.js';
import { statCard, macroChips, donut, macroLegend, kcalOf } from './parts.js';
import { chart, ring } from '../charts.js';

let dayKey = todayKey();
const redraw = () => window.dispatchEvent(new CustomEvent('nutriplan:render'));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Cumplimiento = cercanía de lo consumido a los objetivos del día (kcal pesan el 40 %,
// cada macro un 20 %). Quedarse corto o pasarse resta por igual; sin consumo, null.
const COMPLIANCE_WEIGHTS = { kcal: .4, p: .2, c: .2, f: .2 };

export function complianceParts(state, key) {
  const eaten = Object.values(diaryMeals(key, state)).reduce((sum, m) => addMacros(sum, consumedMacros(state, m)), emptyMacros());
  const values = { kcal: kcalOf(eaten), p: eaten.p, c: eaten.c, f: eaten.f };
  if (!values.kcal) return null;
  const targets = dietTargets(state, activeDiet(), isTrainingDay(key));
  const parts = {};
  for (const k of Object.keys(COMPLIANCE_WEIGHTS)) {
    parts[k] = targets[k] > 0 ? Math.max(0, 1 - Math.abs(values[k] - targets[k]) / targets[k]) * 100 : 100;
  }
  return parts;
}

export function dayCompliance(state, key) {
  const parts = complianceParts(state, key);
  if (!parts) return null;
  return Object.entries(COMPLIANCE_WEIGHTS).reduce((sum, [k, w]) => sum + parts[k] * w, 0);
}

function streak(state) {
  let count = 0;
  let key = todayKey();
  if ((dayCompliance(state, key) || 0) < 80) key = addDays(key, -1);
  for (let i = 0; i < 400 && (dayCompliance(state, key) || 0) >= 80; i++, key = addDays(key, -1)) count++;
  return count;
}

function mealCard(state, meal, entry) {
  const total = consumedMacros(state, entry);
  return `<section class="card diary-meal">
    <div class="diary-meal-head"><div><span class="diary-time">${esc(meal.time)}</span><h2>${esc(meal.name)}</h2></div>
      <button class="icon-btn plain" data-menu="${meal.id}" aria-label="Opciones de ${esc(meal.name)}">${icon('sliders')}</button></div>
    <div class="diary-meal-macros">${icon('flame', 'ic-sm')} <b>${fmtNum(kcalOf(total), 0)} kcal</b><span>· P ${fmtNum(total.p, 0)} · C ${fmtNum(total.c, 0)} · G ${fmtNum(total.f, 0)}</span></div>
    <div class="diary-foods">${entry.slots.map((slot, index) => {
      const food = foodById(state, slot.food), name = esc(food?.name || 'alimento');
      return `<div class="diary-swipe" data-swipe="${meal.id}:${index}"><div class="diary-swipe-bg" aria-hidden="true">${icon('trash', 'ic-sm')}<span>Quitar</span></div>
        <div class="diary-food ${slot.eaten ? '' : 'not-eaten'}"><span class="list-emoji">${esc(food?.emoji || '🍽️')}</span>
        <button class="diary-food-edit" data-edit-food="${meal.id}:${index}"><span>${esc(food?.name || 'Alimento eliminado del catálogo')}</span><small>${slot.preparation === 'cooked' ? 'Peso cocinado' : cookingFactor(food) ? 'Peso en crudo' : 'Tal como se consume'}</small></button>
        <button class="diary-quantity" data-edit-food="${meal.id}:${index}" aria-label="Editar cantidad de ${name}">${fmtNum(shownGrams(food, slot), 1)} g<span class="prep">${slot.preparation === 'cooked' ? ' cocinado' : cookingFactor(food) ? ' crudo' : ''}</span><small>${fmtNum(kcalOf(macrosOf(food,slot.g)), 0)} kcal</small></button>
        <button class="check ${slot.eaten ? 'on' : ''}" data-eaten="${meal.id}:${index}" aria-label="Consumido: ${name}" aria-pressed="${slot.eaten}">${icon('check', 'ic-sm')}</button>
        <button class="icon-btn plain diary-remove" data-remove-food="${meal.id}:${index}" aria-label="Quitar ${name}">${icon('trash', 'ic-sm')}</button></div></div>`;
    }).join('')}</div>
    <button class="diary-add" data-add-food="${meal.id}" aria-label="Añadir alimento a ${esc(meal.name)}">${icon('plus')}<span>Añadir alimento</span></button></section>`;
}

export default {
  title: 'Hoy',
  render() {
    const state = getState(), meals = diaryMeals(dayKey), diet = activeDiet(), training = isTrainingDay(dayKey);
    const targets = dietTargets(state, diet, training);
    const eaten = Object.values(meals).reduce((sum, m) => addMacros(sum, consumedMacros(state, m)), emptyMacros());
    const keys = weekDays(weekStart(dayKey)), comp = dayCompliance(state, dayKey), weight = dayOf(dayKey)?.weight;
    const points = Array.from({length:28}, (_,i) => {const k=addDays(dayKey,i-27);return {label:dayLabelShort(k),value:state.days[k]?.weight ?? null};});
    return `<div class="page-head"><div><h1 class="page-title">${dayKey === todayKey() ? `${greeting()}, ${esc(state.settings.name || 'Álvaro')}` : cap(dayLabelLong(dayKey))}</h1><div class="page-sub">Tu registro diario · objetivos de ${esc(diet.name)}</div></div>
      <div class="page-actions"><div class="month-nav"><button class="icon-btn" data-day="-1" aria-label="Día anterior">${icon('chevron-left')}</button><button class="btn btn-sm" data-day="0">Hoy</button><button class="icon-btn" data-day="1" aria-label="Día siguiente">${icon('chevron-right')}</button></div><div class="switch"><button class="${training ? 'on' : ''}" data-train="1">${icon('dumbbell','ic-sm')} Entrenamiento</button><button class="${training ? '' : 'on'}" data-train="0">Descanso</button></div></div></div>
    <section class="diary-overview"><div class="diary-week" role="group" aria-label="Días de la semana">${keys.map((key,i)=>`<button class="${key===dayKey?'active':''}" data-date="${key}" aria-pressed="${key===dayKey}" aria-label="${esc(dayLabelLong(key))}"><span>${WEEKDAYS_SHORT[i].slice(0,1)}</span><b>${Number(key.slice(-2))}</b><i class="${Object.values(diaryMeals(key)).some(m=>m.slots.some(s=>s.eaten))?'has-food':''}"></i></button>`).join('')}</div>
      <div class="grid cols-4 diary-stats">${[['kcal',kcalOf(eaten),targets.kcal,'kcal'],['p',eaten.p,targets.p,'g'],['c',eaten.c,targets.c,'g'],['f',eaten.f,targets.f,'g']].map(([key,value,target,unit])=>`<div>${statCard({key,value,target,unit})}<p class="macro-remaining">${fmtNum(Math.abs(target-value),0)} ${unit} ${value>target?'por encima':'restantes'}</p></div>`).join('')}</div></section>
    <div class="grid cols-main today-layout"><div class="diary-main">${orderedMeals(meals).map(m=>mealCard(state,m,meals[m.id])).join('')}
      <section class="card"><div class="card-head"><h2 class="card-title">${icon('scale')}Peso del día</h2><button class="btn btn-sm right" data-weight>${weight==null?'Registrar':'Cambiar'}</button></div><div class="stat-value">${weight==null?'—':fmtNum(weight,1)+' <small>kg</small>'}</div>${chart('line',{points,unit:'kg',decimals:1,height:150,goal:state.settings.weightGoal ?? undefined,goalLabel:'Objetivo',empty:'Registra tu peso para ver la evolución'})}</section></div>
      <aside class="diary-summary"><section class="card"><div class="card-head"><h2 class="card-title">${icon('target')}Macros de hoy</h2></div><div class="donut-wrap">${donut(eaten)}<div class="diary-legend">${macroLegend(eaten)}</div></div></section>
        <section class="card"><div class="card-head"><h2 class="card-title">${icon('trophy')}Cumplimiento</h2></div><div class="donut-wrap">${ring({pct:comp,size:100,stroke:10,sub:'del objetivo'})}<div class="compliance-info"><b>${(n=>`${n} ${n===1?'día seguido':'días seguidos'}`)(streak(state))}</b><p class="small muted">Cercanía a tus kcal, proteína, carbos y grasas del día.</p></div></div></section></aside></div>`;
  },
  mount(root) {
    root.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{dayKey=Number(b.dataset.day)?addDays(dayKey,Number(b.dataset.day)):todayKey();redraw();}));
    root.querySelectorAll('[data-date]').forEach(b=>b.addEventListener('click',()=>{dayKey=b.dataset.date;redraw();}));
    root.querySelectorAll('[data-train]').forEach(b=>b.addEventListener('click',()=>setTraining(dayKey,b.dataset.train==='1')));
    root.querySelectorAll('[data-add-food]').forEach(b=>b.addEventListener('click',()=>openFoodLibrary(b.dataset.addFood)));
    root.querySelectorAll('[data-edit-food]').forEach(b=>b.addEventListener('click',()=>{const [id,index]=b.dataset.editFood.split(':');openFoodAmount(id,diaryMeals(dayKey)[id].slots[Number(index)],Number(index));}));
    root.querySelectorAll('[data-eaten]').forEach(b=>b.addEventListener('click',()=>{const [id,index]=b.dataset.eaten.split(':');toggleLoggedFood(dayKey,id,Number(index));}));
    root.querySelectorAll('[data-remove-food]').forEach(b=>b.addEventListener('click',()=>{const [id,index]=b.dataset.removeFood.split(':');removeFoodWithUndo(id,Number(index));}));
    root.querySelectorAll('[data-swipe]').forEach(row=>attachSwipe(row,()=>{const [id,index]=row.dataset.swipe.split(':');removeFoodWithUndo(id,Number(index));}));
    root.querySelectorAll('[data-menu]').forEach(b=>b.addEventListener('click',()=>openMealMenu(b.dataset.menu)));
    root.querySelector('[data-weight]').addEventListener('click',openWeight);
  },
};

function removeFoodWithUndo(mealId, index) {
  const key = dayKey, slot = diaryMeals(key)[mealId]?.slots[index];
  if (!slot) return;
  const name = foodById(getState(), slot.food)?.name || 'Alimento';
  removeLoggedFood(key, mealId, index);
  toast(`${name} quitado`, 4500, { label: 'Deshacer', run: () => restoreLoggedFood(key, mealId, index, slot) });
}

// Deslizar un alimento hacia un lado (en pantallas táctiles) lo quita del registro.
function attachSwipe(row, onDismiss) {
  const card = row.querySelector('.diary-food');
  let pointer = null, startX = 0, startY = 0, dx = 0, axis = null;
  const reset = () => { card.style.transform = ''; row.classList.remove('swiping', 'armed'); pointer = null; axis = null; };
  row.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || pointer != null) return;
    pointer = e.pointerId; startX = e.clientX; startY = e.clientY; dx = 0; axis = null;
  });
  row.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer) return;
    const x = e.clientX - startX, y = e.clientY - startY;
    if (!axis && Math.hypot(x, y) > 10) {
      axis = Math.abs(x) > Math.abs(y) * 1.3 ? 'x' : 'y';
      if (axis === 'x') { row.classList.add('swiping'); try { row.setPointerCapture(pointer); } catch {} }
    }
    if (axis !== 'x') return;
    dx = x;
    card.style.transform = `translateX(${dx}px)`;
    row.dataset.dir = dx > 0 ? 'right' : 'left';
    row.classList.toggle('armed', Math.abs(dx) > row.offsetWidth * .35);
  });
  const end = e => {
    if (e.pointerId !== pointer) return;
    if (axis !== 'x') { reset(); return; }
    // Evita que el gesto se interprete también como toque sobre el alimento.
    const swallow = ev => { ev.preventDefault(); ev.stopPropagation(); };
    row.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => row.removeEventListener('click', swallow, { capture: true }), 350);
    if (e.type === 'pointerup' && Math.abs(dx) > row.offsetWidth * .35) {
      row.classList.remove('swiping');
      row.classList.add('dismissed');
      card.style.transform = `translateX(${dx > 0 ? '' : '-'}110%)`;
      setTimeout(onDismiss, 200);
      pointer = null;
    } else reset();
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
}

function openFoodLibrary(mealId) {
  let query='', tab='catalog';
  const matchingMeals=()=>recentMeals(dayKey).filter(m=>!query || normalize(mealById(m.type||m.id).name+' '+m.slots.map(s=>foodById(getState(),s.food)?.name).join(' ')).includes(normalize(query)));
  openModal({size:'food-library',render:()=>{
    const state=getState(), recent=recentFoods(dayKey);
    const foods=(tab==='recent'?recent.map(s=>foodById(state,s.food)):state.foods).filter(f=>!query||normalize(f.name).includes(normalize(query)));
    if(tab==='catalog') foods.sort((a,b)=>a.name.localeCompare(b.name,'es'));
    return `${modalHeader('Añadir a '+esc(mealById(mealId).name),'Elige un alimento o reutiliza una comida anterior')}<div class="modal-body"><div class="search-box">${icon('search')}<input id="food-search" type="search" value="${esc(query)}" placeholder="Buscar alimentos o comidas" aria-label="Buscar alimentos o comidas"></div>
      <div class="library-tabs" role="group" aria-label="Origen del registro">${[['catalog','Alimentos'],['recent','Alimentos recientes'],['meals','Comidas recientes']].map(([id,label])=>`<button class="${tab===id?'active':''}" data-library-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join('')}</div>
      <div class="list">${tab==='meals'?matchingMeals().map((m,i)=>`<button class="library-row" data-repeat="${i}"><span class="list-emoji">${icon(mealById(m.type||m.id).icon)}</span><span class="list-main"><span class="list-name">${esc(mealById(m.type||m.id).name)} · ${esc(dayLabelShort(m.key))}</span><span class="list-sub">${esc(m.slots.map(s=>foodById(state,s.food)?.name).join(' · '))}</span></span><span class="library-kcal">${m.slots.length} alimentos<small>${fmtNum(kcalOf(consumedMacros(state,m)),0)} kcal</small></span>${icon('plus','ic-sm')}</button>`).join('')||'<p class="empty">Aquí aparecerán tus comidas registradas de días anteriores.</p>':foods.map(food=>{
        const slot=recent.find(s=>s.food===food.id), g=tab==='recent'&&slot?slot.g:food.portion?.g||100;
        return `<button class="library-row" data-pick="${esc(food.id)}"><span class="list-emoji">${esc(food.emoji)}</span><span class="list-main"><span class="list-name">${esc(food.name)}</span><span class="list-sub">${fmtNum(g,1)} g ${cookingFactor(food)?'en crudo':''}${tab==='recent'?' · última cantidad':''}</span></span><span class="library-kcal">${fmtNum(kcalOf(macrosOf(food,g)),0)} kcal</span>${icon('plus','ic-sm')}</button>`;
      }).join('')||`<p class="empty">${tab==='recent'?'Todavía no hay alimentos recientes. Empieza desde Alimentos.':'No hay alimentos con esa búsqueda.'}</p>`}</div></div><div class="modal-foot"><a class="btn" href="#/alimentos" data-catalog>Gestionar alimentos</a><button class="btn" data-modal-close>Cerrar</button></div>`;
  },mount(panel){
    panel.querySelector('[data-catalog]').addEventListener('click',closeModal);
    panel.querySelectorAll('[data-library-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.libraryTab;refreshModal();}));
    panel.querySelector('#food-search').addEventListener('input',e=>{query=e.target.value;const cursor=e.target.selectionStart;refreshModal();const input=document.querySelector('#food-search');input.focus();input.setSelectionRange(cursor,cursor);});
    panel.querySelectorAll('[data-pick]').forEach(b=>b.addEventListener('click',()=>{const food=foodById(getState(),b.dataset.pick), recent=tab==='recent'?recentFoods(dayKey).find(s=>s.food===food.id):null;openFoodAmount(mealId,recent||{food:food.id,g:food.portion?.g||100,preparation:'raw',eaten:true});}));
    panel.querySelectorAll('[data-repeat]').forEach(b=>b.addEventListener('click',()=>{const source=matchingMeals()[Number(b.dataset.repeat)];closeModal();if(repeatLoggedMeal(dayKey,mealId,source.key,source.id))toast('Comida añadida al registro');}));
  }});
}

function openFoodAmount(mealId,slot,index=null) {
  const food=foodById(getState(),slot.food);
  if(!food){
    openModal({size:'sm',render:()=>`${modalHeader('Alimento eliminado')}<div class="modal-body"><p>Este alimento ya no está en el catálogo.</p></div><div class="modal-foot"><button class="btn" data-modal-close>Cerrar</button><button class="btn btn-danger" data-remove>Quitar del registro</button></div>`,mount(panel){panel.querySelector('[data-remove]').addEventListener('click',()=>{closeModal();removeLoggedFood(dayKey,mealId,index);});}});
    return;
  }
  const factor=cookingFactor(food);
  let preparation=factor&&slot.preparation==='cooked'?'cooked':'raw', grams=shownGrams(food,{...slot,preparation});
  openModal({size:'sm',render:()=>`${modalHeader(esc(food.name),esc(mealById(mealId).name))}<div class="modal-body"><label class="field"><span>Cantidad (g)</span><input id="food-grams" type="number" min="0.1" step="any" inputmode="decimal" value="${Math.round(grams*100)/100}"></label>
    ${factor?`<label class="field"><span>Cómo lo has pesado</span><select id="food-preparation"><option value="raw" ${preparation==='raw'?'selected':''}>En crudo</option><option value="cooked" ${preparation==='cooked'?'selected':''}>Cocinado</option></select></label><p class="small muted" id="food-equivalence"></p>`:''}<div id="food-preview" class="food-preview"></div><p class="small muted">${index==null?'Se añadirá como consumido. Puedes desmarcarlo después.':'Los cambios se aplicarán a este registro.'}</p></div>
    <div class="modal-foot">${index==null?'<button class="btn" data-back>Volver</button>':'<button class="btn btn-danger" data-remove>Quitar</button>'}<button class="btn btn-primary" data-save>${index==null?'Añadir alimento':'Guardar'}</button></div>`,mount(panel){
    const input=panel.querySelector('#food-grams');
    const preview=()=>{const raw=rawGrams(food,grams,preparation);panel.querySelector('#food-preview').innerHTML=macroChips(macrosOf(food,raw),{kcal:true});if(factor)panel.querySelector('#food-equivalence').textContent=`${fmtNum(raw,1)} g crudo ≈ ${fmtNum(raw*factor,1)} g cocinado. Equivalencia aproximada.`;};
    input.addEventListener('input',()=>{grams=Number(input.value);preview();});
    panel.querySelector('#food-preparation')?.addEventListener('change',e=>{const raw=rawGrams(food,grams,preparation);preparation=e.target.value;grams=shownGrams(food,{g:raw,preparation});input.value=String(Math.round(grams*100)/100);preview();});
    panel.querySelector('[data-back]')?.addEventListener('click',()=>openFoodLibrary(mealId));
    panel.querySelector('[data-remove]')?.addEventListener('click',()=>{closeModal();removeFoodWithUndo(mealId,index);});
    const save=()=>{if(!Number.isFinite(grams)||grams<=0){toast('Introduce una cantidad mayor que cero');input.focus();return;}closeModal();logFood(dayKey,mealId,{food:food.id,g:rawGrams(food,grams,preparation),preparation,eaten:slot.eaten!==false},index);toast(index==null?'Alimento registrado':'Registro actualizado');};
    panel.querySelector('[data-save]').addEventListener('click',save);input.addEventListener('keydown',e=>{if(e.key==='Enter')save();});preview();input.focus();input.select();
  }});
}

function openMealMenu(mealId) {
  const meal=diaryMeals(dayKey)[mealId];
  openModal({size:'sm',render:()=>`${modalHeader(esc(mealById(meal.type||mealId).name))}<div class="modal-body"><p class="small muted">Horario habitual: ${esc(meal.time)}. Puedes cambiarlo desde Ajustes.</p><div class="meal-menu"><a class="btn" href="#/ajustes" data-settings>${icon('settings')} Cambiar horarios</a><button class="btn" data-add>${icon('plus')} Añadir alimento</button><button class="btn btn-danger" data-clear ${meal.slots.length?'':'disabled'}>${icon('trash')} Vaciar esta comida</button></div></div>`,mount(panel){
    panel.querySelector('[data-settings]').addEventListener('click',closeModal);panel.querySelector('[data-add]').addEventListener('click',()=>openFoodLibrary(mealId));
    panel.querySelector('[data-clear]').addEventListener('click',async()=>{if(await confirmDialog({title:'¿Vaciar esta comida?',message:'Se quitarán los alimentos de esta comida del registro de este día.',confirmText:'Vaciar'})){clearLoggedMeal(dayKey,mealId);toast('Comida vaciada');}});
  }});
}

function openWeight() {
  openModal({size:'sm',render:()=>`${modalHeader('Registrar peso',esc(cap(dayLabelLong(dayKey))))}<div class="modal-body"><label class="field"><span>Peso (kg)</span><input type="number" step="0.1" min="1" id="weight-input" value="${dayOf(dayKey)?.weight??''}" inputmode="decimal"></label></div><div class="modal-foot"><button class="btn" data-clear>Borrar</button><button class="btn btn-primary" data-save>Guardar</button></div>`,mount(panel){
    panel.querySelector('[data-clear]').addEventListener('click',()=>{closeModal();setWeight(dayKey,null);});panel.querySelector('[data-save]').addEventListener('click',()=>{const value=Number(panel.querySelector('#weight-input').value);if(!Number.isFinite(value)||value<=0){toast('Introduce un peso válido');return;}closeModal();setWeight(dayKey,value);});
  }});
}

export const getDayKey = () => dayKey;
export const setDayKey = key => { dayKey = key; };
