/* ============ ЗооВики — инструменты: SOS, калькулятор, симптомы, чек-листы ============ */

const Tools = {

  sosView(){
    return `
    <div class="sos-page view">
      <button class="back" data-go="#/">← На главную</button>
      <h1>🆘 SOS — экстренная помощь</h1>
      <p class="subtitle">Что делать в опасных для жизни ситуациях. Это <b>не заменяет</b> визит к врачу — звоните в ветклинику!</p>
      <div class="sos-alert">
        <h3>Всегда сначала — звонок ветеринару</h3>
        <p>Пока едете — окажите первую помощь по инструкции. Не давайте человеческие лекарства без назначения врача.</p>
      </div>
      <div class="sos-grid">
        ${SOS_ITEMS.map(s=>`
          <div class="sos-card">
            <div class="icon">${s.icon}</div>
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.text)}</p>
            <ol class="sos-steps">${s.steps.map(st=>`<li>${esc(st)}</li>`).join("")}</ol>
          </div>`).join("")}
      </div>
    </div>`;
  },

  calcView(){
    return `
    <div class="calc-page view">
      <button class="back" data-go="#/">← На главную</button>
      <h1>💊 Калькулятор дозировок</h1>
      <p class="subtitle">Введите вес животного и выберите препарат.</p>
      <div class="calc-form">
        <label>Вес животного (кг)</label>
        <input id="calcWeight" type="number" step="0.1" min="0" placeholder="например, 12.5">
        <label>Препарат</label>
        <select id="calcMed">
          ${MEDS.map((m,i)=>`<option value="${i}">${esc(m.name)}</option>`).join("")}
        </select>
        <button class="btn primary" onclick="Tools.doCalc()" style="width:100%;margin-top:16px">Рассчитать</button>
        <div id="calcResult"></div>
      </div>
      <div class="mod-section" style="margin-top:20px">
        <h3>⚠️ Важно</h3>
        <p style="font-size:13px;color:var(--muted);margin:0">
          Калькулятор носит справочный характер. <b>Перед применением любого препарата обязательно консультируйтесь с ветеринаром.</b>
          Некоторые человеческие лекарства токсичны для животных (парацетамол, ибупрофен и др.).
        </p>
      </div>
    </div>`;
  },

  doCalc(){
    const weight = parseFloat($("#calcWeight").value);
    const med = MEDS[parseInt($("#calcMed").value)];
    const box = $("#calcResult");
    if(!weight || weight<=0){
      box.innerHTML = `<div class="calc-result danger"><div class="label">Ошибка</div><div class="value" style="font-size:18px">Укажите корректный вес</div></div>`;
      return;
    }
    if(!med || med.perKg===0){
      box.innerHTML = `<div class="calc-result danger">
        <div class="label">${esc(med.name)}</div>
        <div class="value" style="font-size:18px">Только по назначению врача</div>
        <div class="note">${esc(med.note)}</div>
      </div>`;
      return;
    }
    let dose = weight*med.perKg;
    let note = med.note;
    if(med.max && dose>med.max){ dose = med.max; note += " (достигнут максимум)"; }
    box.innerHTML = `<div class="calc-result">
      <div class="label">${esc(med.name)} — доза</div>
      <div class="value">${dose.toFixed(1)} ${med.unit}</div>
      <div class="note">${esc(note)}</div>
    </div>`;
  },

  selectedSymptoms: [],

  symptomView(){
    return `
    <div class="symptom-page view">
      <button class="back" data-go="#/">← На главную</button>
      <h1>🩺 Симптом-чекер</h1>
      <p class="subtitle">Отметьте все симптомы — покажем возможные причины и срочность.</p>
      <div class="symptom-list">
        ${SYMPTOMS.map(s=>`<button class="symptom-pick ${Tools.selectedSymptoms.includes(s.id)?'selected':''}" onclick="Tools.toggleSymptom('${s.id}')">${s.label}</button>`).join("")}
      </div>
      <div id="diagnosisBox">${Tools.diagnosisHTML()}</div>
      <div class="mod-section" style="margin-top:20px">
        <h3>⚠️ Важно</h3>
        <p style="font-size:13px;color:var(--muted);margin:0">
          Это ориентировочная оценка, а не диагноз. <b>При любом сомнении обращайтесь к ветеринару.</b>
        </p>
      </div>
    </div>`;
  },

  toggleSymptom(id){
    const i = Tools.selectedSymptoms.indexOf(id);
    if(i>=0) Tools.selectedSymptoms.splice(i,1); else Tools.selectedSymptoms.push(id);
    App.refresh();
  },

  diagnosisHTML(){
    const sel = Tools.selectedSymptoms;
    if(!sel.length) return "";
    const has = id=>sel.includes(id);
    const causes = [];
    let urgency = "low";

    if(has("vomit")&&has("diarrhea")&&has("lethargy")){
      causes.push("Инфекция (парвовирус, энтерит) — срочно к врачу!"); urgency="high";
    }
    if(has("blood")){
      causes.push("Кровь в стуле/рвоте — признак серьёзного повреждения ЖКТ, срочно к врачу"); urgency="high";
    }
    if(has("tremor")&&has("vomit")){
      causes.push("Отравление — срочно к врачу"); urgency="high";
    }
    if(has("breath")&&has("lethargy")){
      causes.push("Проблемы с сердцем/лёгкими — срочно к врачу"); urgency="high";
    }
    if(has("vomit")&&!has("diarrhea")){ causes.push("Пищевое отравление, гастрит, инородное тело"); if(urgency==="low")urgency="medium"; }
    if(has("diarrhea")&&!has("vomit")){ causes.push("Кишечная инфекция, смена корма, стресс"); if(urgency==="low")urgency="medium"; }
    if(has("cough")||has("sneeze")||has("nose")){ causes.push("Простуда, респираторная инфекция"); if(urgency==="low")urgency="medium"; }
    if(has("eyes")){ causes.push("Конъюнктивит, аллергия, инфекция"); if(urgency==="low")urgency="medium"; }
    if(has("scratch")){ causes.push("Аллергия, паразиты, дерматит"); if(urgency==="low")urgency="medium"; }
    if(has("appetite")&&!has("vomit")&&!has("diarrhea")){ causes.push("Стресс, боль, начало болезни"); if(urgency==="low")urgency="medium"; }
    if(has("fever")){ causes.push("Инфекция, воспаление — измерьте температуру"); if(urgency==="low")urgency="medium"; }
    if(has("limp")){ causes.push("Травма, растяжение, артрит"); if(urgency==="low")urgency="medium"; }
    if(has("thirst")||has("urine")){ causes.push("Возможны проблемы с почками/диабет"); if(urgency==="low")urgency="medium"; }

    if(!causes.length) causes.push("Одиночный симптом — наблюдайте 12–24 часа, если не улучшится — к врачу");

    const cls = urgency==="high"?"":urgency==="medium"?"medium":"low";
    const badge = urgency==="high"?"СРОЧНО К ВРАЧУ":urgency==="medium"?"Обратиться к врачу в ближайшие часы":"Наблюдение";
    return `<div class="diagnosis ${cls}">
      <span class="badge-urgent">${badge}</span>
      <h3>Возможные причины</h3>
      <ul>${causes.map(c=>`<li>${esc(c)}</li>`).join("")}</ul>
    </div>`;
  },

  checklistsView(){
    return `
    <div class="checklists-page view">
      <button class="back" data-go="#/">← На главную</button>
      <h1>📋 Чек-листы</h1>
      <p class="subtitle">Готовые списки для типичных задач волонтёра. Отметки сохраняются на устройстве.</p>
      ${CHECKLISTS.map(cl=>`
        <div class="checklist">
          <h3>${cl.title}</h3>
          ${cl.items.map((item,idx)=>{
            const key = cl.id+"_"+idx;
            const checked = DB.data.checklistState[key]?"checked":"";
            return `<label class="checklist-item ${checked}">
              <input type="checkbox" ${checked?"checked":""} onchange="Tools.toggleChecklist('${key}', this)">
              <span>${esc(item)}</span>
            </label>`;
          }).join("")}
        </div>`).join("")}
      <button class="btn danger" onclick="Tools.resetChecklists()" style="margin-top:8px">🗑 Сбросить все отметки</button>
    </div>`;
  },

  toggleChecklist(key, el){
    DB.data.checklistState[key] = el.checked;
    el.parentElement.classList.toggle("checked", el.checked);
    DB.save();
  },

  resetChecklists(){
    if(!confirm("Сбросить все отметки?")) return;
    DB.data.checklistState = {};
    DB.save();
    App.refresh();
    UI.toast("Отметки сброшены");
  },
};

window.Tools = Tools;
