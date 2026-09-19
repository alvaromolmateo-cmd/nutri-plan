import { getState, setSettings, exportData, importData, resetAll, APP_VERSION, safetyCopies, discardSafetyCopy } from '../store.js';
import { esc, icon, toast, confirmDialog } from '../ui.js';
import { MEALS } from '../data.js';
import { WEEKDAYS_SHORT, todayKey } from '../dates.js';

let installPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); installPrompt = e;
  window.dispatchEvent(new CustomEvent('nutriplan:render'));
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  window.dispatchEvent(new CustomEvent('nutriplan:render'));
});

// Descarga un texto como archivo .json.
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileDate = (iso) => (iso || new Date().toISOString()).slice(0, 10);
const longDate = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

// Copias automáticas de la red de seguridad del almacenamiento (ver store.js).
function safetyBlock() {
  const { backup, rescues, readOnly } = safetyCopies();
  if (!backup && !rescues.length && !readOnly) return '';
  return `
    ${readOnly ? '<p class="small"><b>Los datos guardados no se pudieron abrir y no hay sitio para apartarlos</b>, así que la app no guarda nada para no pisarlos. Libera espacio antes de seguir.</p>' : ''}
    ${rescues.length ? `
      <p class="small"><b>Hay datos antiguos que la app no pudo abrir.</b> No se han borrado: están apartados aquí. Descárgalos y guárdalos; se podrán importar cuando se corrija el fallo.</p>
      <div class="row wrap" style="margin-bottom:12px"><button class="btn btn-sm" id="set-rescue-get">${icon('download','ic-sm')} Descargar datos apartados</button><button class="btn btn-sm btn-danger" id="set-rescue-drop">${icon('trash','ic-sm')} Descartar</button></div>` : ''}
    ${backup ? `
      <p class="small muted">Copia automática de antes de la última actualización de la app (${esc(longDate(backup.savedAt))}). Solo hace falta si algo se ve raro tras actualizar.</p>
      <div class="row wrap" style="margin-bottom:12px"><button class="btn btn-sm" id="set-backup-get">${icon('download','ic-sm')} Descargar copia automática</button></div>` : ''}`;
}

export default {
  title: 'Ajustes',
  render() {
    const state = getState(), s = state.settings;
    const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    return `<div class="page-head"><div><h1 class="page-title">Ajustes</h1><div class="page-sub">Tu perfil, tus horarios y tus datos.</div></div></div>
      <div class="settings-grid">
        <section class="card settings-profile"><div class="card-head"><h2 class="card-title">${icon('target')}Perfil y objetivos</h2></div>
          <div class="field-row"><label class="field"><span>Tu nombre</span><input id="set-name" type="text" maxlength="40" value="${esc(s.name)}"></label><label class="field"><span>Objetivo de peso (kg)</span><input id="set-weight-goal" type="number" min="1" step="0.1" value="${s.weightGoal??''}" placeholder="Sin objetivo"></label></div>
          <div class="field"><span>Entrenamiento habitual</span><div class="training-days">${WEEKDAYS_SHORT.map((d,i)=>`<button class="tag ${s.trainingDays[i]?'on':''}" data-training-day="${i}" aria-pressed="${!!s.trainingDays[i]}">${d}</button>`).join('')}</div></div>
          <p class="small muted">Los objetivos de kcal y macros se ajustan desde Mis dietas. Puedes cambiar entrenamiento o descanso en Hoy.</p>
        </section>
        <section class="card settings-times"><div class="card-head"><h2 class="card-title">${icon('calendar')}Horarios de comidas</h2></div>
          <div class="meal-times">${MEALS.map(m=>`<label class="time-field"><span>${icon(m.icon,'ic-sm')}${esc(m.name)}</span><input type="time" data-meal-time="${m.id}" aria-label="Hora de ${esc(m.name)}" value="${esc(s.mealTimes?.[m.id]||m.time)}" required></label>`).join('')}</div>
          <p class="small muted">En Hoy las comidas se ordenan por estas horas.</p>
        </section>
        <section class="card settings-data"><div class="card-head"><h2 class="card-title">${icon('download')}Datos</h2><span class="small muted right">${Object.keys(state.days).length} días</span></div>
          <div class="row wrap"><button class="btn btn-sm" id="set-export">${icon('download','ic-sm')} Exportar copia</button><button class="btn btn-sm" id="set-import">${icon('upload','ic-sm')} Importar copia</button><input type="file" id="set-file" accept="application/json,.json" hidden></div>
          <p class="small muted">Tus datos se guardan en este dispositivo. Importar una copia sustituye los datos actuales.</p>${safetyBlock()}<button class="btn btn-sm btn-danger" id="set-reset">${icon('trash','ic-sm')} Borrar todos los datos</button>
        </section>
        <section class="card settings-app"><div class="card-head"><h2 class="card-title">${icon('download')}Aplicación</h2><span class="small muted right">v${APP_VERSION}</span></div>
          ${installed?'<p class="small">Instalada en este dispositivo.</p>':installPrompt?'<button class="btn btn-sm" id="set-install">Instalar aplicación</button>':'<p class="small muted">En el menú del navegador: <b>Instalar aplicación</b>. En iPhone o iPad: Compartir → Añadir a pantalla de inicio.</p>'}
          <p class="small muted">Disponible sin conexión después de la primera visita.</p>
        </section>
        <section class="card settings-about"><div class="card-head"><h2 class="card-title">${icon('leaf')}Acerca de</h2></div><p class="small muted">NutriPlan es tu espacio para seguir la dieta, registrar lo que comes y consultar tus macros, progreso y lista de la compra.</p></section>
      </div>`;
  },
  mount(root) {
    root.querySelector('#set-name').addEventListener('change',e=>setSettings({name:e.target.value.trim()}));
    root.querySelector('#set-weight-goal').addEventListener('change',e=>{
      const n=Number(e.target.value);
      if(e.target.value && (!Number.isFinite(n)||n<=0)){toast('Introduce un peso válido');return;}
      setSettings({weightGoal:e.target.value===''?null:n});
    });
    root.querySelectorAll('[data-training-day]').forEach(b=>b.addEventListener('click',()=>{const days=[...getState().settings.trainingDays];days[Number(b.dataset.trainingDay)]=!days[Number(b.dataset.trainingDay)];setSettings({trainingDays:days});}));
    root.querySelectorAll('[data-meal-time]').forEach(input=>input.addEventListener('change',()=>{
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.value)){toast('Introduce una hora válida');return;}
      setSettings({mealTimes:{...getState().settings.mealTimes,[input.dataset.mealTime]:input.value}});
    }));
    root.querySelector('#set-export').addEventListener('click',()=>{
      download(exportData(),`nutriplan-${todayKey()}.json`);toast('Copia exportada');
    });
    root.querySelector('#set-backup-get')?.addEventListener('click',()=>{
      const {backup}=safetyCopies();
      if(backup)download(backup.raw,`nutriplan-copia-${fileDate(backup.savedAt)}.json`);
    });
    root.querySelector('#set-rescue-get')?.addEventListener('click',()=>{
      safetyCopies().rescues.forEach((r,i)=>download(r.raw,`nutriplan-apartados-${fileDate(r.savedAt)}-${i+1}.json`));
    });
    root.querySelector('#set-rescue-drop')?.addEventListener('click',async()=>{
      if(!await confirmDialog({title:'Descartar datos apartados',message:'Se borran para siempre los datos que la app no pudo abrir. Descárgalos antes si hay algo que quieras conservar.',confirmText:'Descartar'}))return;
      discardSafetyCopy('rescue');
      window.dispatchEvent(new CustomEvent('nutriplan:render'));
      toast('Datos apartados descartados');
    });
    const file=root.querySelector('#set-file');
    root.querySelector('#set-import').addEventListener('click',()=>file.click());
    file.addEventListener('change',async()=>{
      const selected=file.files?.[0];if(!selected)return;
      const json=await selected.text();
      if(!await confirmDialog({title:'Importar copia',message:'La copia sustituirá los datos actuales de este navegador.',confirmText:'Importar',danger:false}))return;
      try{importData(json);toast('Datos importados');}catch{toast('El archivo no es válido');}
    });
    root.querySelector('#set-reset').addEventListener('click',async()=>{
      if(await confirmDialog({title:'¿Borrar todos los datos?',message:'Se eliminarán los registros, dietas y alimentos de este navegador. Esta acción no se puede deshacer.',confirmText:'Borrar todo'})){resetAll();toast('Datos borrados');}
    });
    root.querySelector('#set-install')?.addEventListener('click',async()=>{
      if(!installPrompt)return;
      const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;
      window.dispatchEvent(new CustomEvent('nutriplan:render'));
    });
  },
};
