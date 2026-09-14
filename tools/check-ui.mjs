// Run with NODE_PATH pointing to a test-only jsdom installation; no app dependency.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { JSDOM } = createRequire(import.meta.url)('jsdom');
const dom = new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'), {url:'http://localhost/#/hoy',pretendToBeVisual:true});
const { window } = dom;
for (const name of ['window','document','localStorage','location','navigator','CustomEvent','HashChangeEvent']) {
  Object.defineProperty(globalThis,name,{value:window[name],configurable:true});
}
window.matchMedia=globalThis.matchMedia=()=>({matches:false,addEventListener(){}});
globalThis.ResizeObserver=class{observe(){} disconnect(){}};
window.HTMLElement.prototype.scrollIntoView=function(){};
const errors=[];
window.addEventListener('error',e=>errors.push(e.error));
const app=await import('../js/app.js');
const store=await import('../js/store.js');
const {getDayKey,setDayKey}=await import('../js/views/hoy.js');
const $=selector=>{const el=document.querySelector(selector);assert.ok(el,selector);return el;};
const click=selector=>$(selector).click();
const change=(selector,value,type='change')=>{const el=$(selector);el.value=value;el.dispatchEvent(new window.Event(type,{bubbles:true}));};
const navigate=view=>{location.hash='#/'+view;app.render();};

assert.equal(document.querySelectorAll('.diary-meal').length,5);
assert.equal(document.querySelectorAll('.diary-food').length,0);
const key=getDayKey();
click('[data-add-food="desayuno"]');
assert.equal(document.querySelectorAll('[data-library-tab]').length,3);
change('#food-search','arroz','input');
assert.ok(document.querySelectorAll('[data-pick]').length>=1);
click('[data-pick="arroz"]');
change('#food-grams','75','input');
click('#food-preparation');
change('#food-preparation','cooked');
assert.equal(Number($('#food-grams').value),187.5);
click('[data-save]');
assert.equal(document.querySelectorAll('.diary-food').length,1);
assert.equal(store.diaryMeals(key).desayuno.slots[0].g,75);
assert.equal($('#modal').textContent,'');
click('[data-eaten="desayuno:0"]');
assert.equal(store.diaryMeals(key).desayuno.slots[0].eaten,false);
click('[data-eaten="desayuno:0"]');
click('[data-edit-food="desayuno:0"]');
change('#food-grams','125','input');
click('[data-save]');
assert.equal(store.diaryMeals(key).desayuno.slots[0].g,50);
click('[data-add-food="comida"]');
click('[data-library-tab="recent"]');
assert.equal(document.querySelectorAll('[data-pick]').length,1);
click('[data-pick="arroz"]');
click('[data-save]');
assert.equal(store.diaryMeals(key).comida.slots[0].g,50);

// Recent meal copies append to the target without mutating their source.
const yesterday='2026-09-01';
store.logFood(yesterday,'desayuno',{food:'pollo',g:160});
setDayKey('2026-09-02');app.render();
click('[data-add-food="cena"]');click('[data-library-tab="meals"]');
click('[data-repeat="0"]');
assert.equal(store.diaryMeals('2026-09-02').cena.slots[0].food,'pollo');
assert.equal(store.diaryMeals(yesterday).desayuno.slots[0].g,160);
click('[data-edit-food="cena:0"]');click('[data-remove]');
assert.equal(store.diaryMeals('2026-09-02').cena.slots.length,0);

// Compliance measures closeness to the day's kcal and macros, not the share of checked foods.
const {dayCompliance}=await import('../js/views/hoy.js');
store.logFood('2026-09-03','desayuno',{food:'arroz',g:80});
assert.ok(dayCompliance(store.getState(),'2026-09-03')<40,'A single food is far from full compliance');
for(const [id,meal] of Object.entries(store.dayPlan('2026-09-04'))) meal.slots.forEach(s=>store.logFood('2026-09-04',id,{food:s.food,g:s.g}));
assert.ok(dayCompliance(store.getState(),'2026-09-04')>97,'Eating the whole plan is full compliance');
assert.equal(dayCompliance(store.getState(),'2026-09-05'),null);

// Foods can be removed straight from the diary row, with undo.
store.logFood('2026-09-02','cena',{food:'pollo',g:100});store.logFood('2026-09-02','cena',{food:'arroz',g:60});
click('[data-remove-food="cena:0"]');
assert.equal(store.diaryMeals('2026-09-02').cena.slots.map(s=>s.food).join(),'arroz');
assert.equal(document.querySelectorAll('[data-swipe^="cena:"]').length,1);
click('#toast button');
assert.equal(store.diaryMeals('2026-09-02').cena.slots.map(s=>s.food).join(),'pollo,arroz');

// Plan meals and the food catalogue render as cards.
navigate('plan');
assert.ok(document.querySelectorAll('.plan-meal .food-tile').length>=5);
assert.ok(!$('.plan-meals').textContent.includes(' + '));
navigate('alimentos');
assert.equal(document.querySelectorAll('.food-card').length,store.getState().foods.length);
assert.ok(!$('#view').textContent.includes('Tal como se consume'));
assert.equal(document.querySelectorAll('.food-card-macros div').length,store.getState().foods.length*4);

navigate('ajustes');
assert.equal(document.querySelectorAll('[data-meal-time]').length,5);
assert.equal(document.querySelector('#set-motto'),null);
assert.equal(document.querySelector('#set-theme'),null);
assert.ok(!$('#view').textContent.includes('Apariencia'));
change('[data-meal-time="cena"]','06:00');
navigate('hoy');
assert.ok($('.diary-meal h2').textContent.includes('Cena'));
assert.equal($('.diary-time').textContent,'06:00');
const theme=document.documentElement.dataset.theme;
click('#theme-btn');assert.notEqual(document.documentElement.dataset.theme,theme);
assert.equal(document.querySelector('meta[name="theme-color"]').content,'#000000');
click('#theme-btn');assert.equal(document.documentElement.dataset.theme,theme);
assert.equal(document.querySelector('meta[name="theme-color"]').content,'#ffffff');
assert.equal(document.querySelector('.tagline'),null);
// Daily targets are the plan totals: no manual targets form, sliders move them, old saved targets are dropped.
navigate('dietas');
const {dietTargets}=await import('../js/nutrition.js');
assert.equal(document.querySelector('#diet-targets-form'),null);
assert.ok(!$('#view').textContent.includes('Objetivos diarios'));
const activeId=store.activeDiet().id;
const beforeDiary=JSON.stringify(store.getState().days);
const planTargets=dietTargets(store.getState(),store.activeDiet());
assert.ok($(`[data-diet="${activeId}"]`).textContent.includes(String(planTargets.kcal)));
assert.equal($('.plan-amounts').open,false);
click('.plan-amounts summary');
assert.equal($('.plan-amounts').open,true);
change('[data-scale="carb"]','150');
assert.equal($('.plan-amounts').open,true,'Changing quantities keeps the panel open');
assert.ok(dietTargets(store.getState(),store.activeDiet()).c>planTargets.c,'Plan sliders move targets');
click('[data-reset-scale]');
assert.equal($('.plan-amounts').open,true,'Resetting quantities keeps the panel open');
assert.deepEqual(dietTargets(store.getState(),store.activeDiet()),planTargets);
click('.plan-amounts summary');
assert.equal($('.plan-amounts').open,false);
app.render();
assert.equal($('.plan-amounts').open,false,'Explicitly closed panel stays closed');
const backup=JSON.parse(store.exportData());
backup.diets.forEach(d=>{d.targets={kcal:9999,p:1,c:1,f:1};});
store.importData(JSON.stringify(backup));
assert.ok(store.getState().diets.every(d=>!('targets' in d)),'Legacy manual targets are dropped');
assert.deepEqual(dietTargets(store.getState(),store.activeDiet()),planTargets);
assert.equal(JSON.stringify(store.getState().days),beforeDiary);
navigate('hoy');
assert.ok(!$('.diary-stats').textContent.includes('9999'));
navigate('progreso');
assert.ok($('#view').textContent.includes(planTargets.kcal.toLocaleString('es-ES')) || $('#view').textContent.includes(String(planTargets.kcal)));
for(const view of ['plan','dietas','progreso','alimentos','ajustes']){navigate(view);assert.ok($('#view').textContent.length>100);}
assert.deepEqual(errors,[]);
console.log('PASS: diary flows, settings, themes, plan-derived targets, legacy target cleanup, plan isolation and all view mounts');
dom.window.close();
