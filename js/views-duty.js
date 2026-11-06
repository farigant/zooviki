/* ============ ЗооВики — дежурства (календарь месяца + панель дня) и доска помощи ============ */

/** Палитра для приютов (цвет/мягкий фон) — по индексу приюта в списке */
const SHELTER_PALETTE = [
  ["#1f8a4c","#e8f3ec"], ["#d97706","#fef3c7"], ["#2563eb","#dbeafe"],
  ["#7c3aed","#ede9fe"], ["#0d9488","#ccfbf1"], ["#be123c","#ffe4e6"],
];
function shelterColors(shelterId){
  const idx = Math.max(0, DB.data.shelters.findIndex(s=>s.id===shelterId));
  return SHELTER_PALETTE[idx % SHELTER_PALETTE.length];
}

const Duty = {
  tab: "shifts",
  calMonth: null,   // Date — первое число отображаемого месяца
  selDay: null,     // "YYYY-MM-DD" выбранный день

  /* --- даты --- */
  pad(n){ return String(n).padStart(2,"0"); },
  fmt(d){ return d.getFullYear()+"-"+Duty.pad(d.getMonth()+1)+"-"+Duty.pad(d.getDate()); },
  month(){ if(!Duty.calMonth){ const t=new Date(); Duty.calMonth=new Date(t.getFullYear(),t.getMonth(),1); } return Duty.calMonth; },
  sel(){ if(!Duty.selDay) Duty.selDay = Duty.fmt(new Date()); return Duty.selDay; },

  shiftMonth(delta){
    const m = Duty.month();
    Duty.calMonth = new Date(m.getFullYear(), m.getMonth()+delta, 1);
    App.refresh();
  },
  goToday(){
    const t = new Date();
    Duty.calMonth = new Date(t.getFullYear(), t.getMonth(), 1);
    Duty.selDay = Duty.fmt(t);
    App.refresh();
  },
  selectDay(ds){
    Duty.selDay = ds;
    const m = Duty.month();
    const d = new Date(ds+"T00:00:00");
    if(d.getMonth()!==m.getMonth() || d.getFullYear()!==m.getFullYear()){
      Duty.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    }
    App.refresh();
  },

  fmtDate(d){
    const dt = new Date(d+"T00:00:00");
    return isNaN(dt) ? d : dt.toLocaleDateString("ru",{weekday:"short",day:"numeric",month:"long"});
  },

  /* --- страница --- */
  view(){
    const logged = !!DB.data.session;
    return `
    <div class="duty-page view">
      <button class="back" data-go="#/">${ic("arrowLeft")} На главную</button>
      <h1>📅 Дежурства и помощь</h1>
      <p class="subtitle">Расписание смен в приютах и просьбы о помощи. Кликните по дню, чтобы увидеть смены и записаться.</p>
      <div class="tabs" style="margin:0 0 20px">
        <button class="tab ${Duty.tab==='shifts'?'active':''}" onclick="Duty.setTab('shifts')">Дежурства</button>
        <button class="tab ${Duty.tab==='help'?'active':''}" onclick="Duty.setTab('help')">Нужна помощь</button>
      </div>
      ${Duty.tab==="shifts" ? Duty.calendarView(logged) : Duty.helpView(logged)}
    </div>`;
  },

  setTab(t){ Duty.tab = t; App.refresh(); },

  /* --- календарь --- */
  calendarView(logged){
    const shifts = DB.data.shifts;
    const open = shifts.filter(s=>s.who.length<s.max && s.date>=Duty.fmt(new Date()));
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <p style="margin:0;font-size:13px;color:var(--muted)">Открытых смен: <b>${open.length}</b></p>
        ${logged?`<button class="btn primary" onclick="Duty.openShift()">➕ Предложить смену</button>`:`<p style="margin:0;font-size:13px;color:var(--muted)">Войдите, чтобы записываться</p>`}
      </div>
      ${Duty.calendarHTML(shifts)}
      ${Duty.dayPanelHTML(shifts, logged)}`;
  },

  calendarHTML(shifts){
    const m = Duty.month();
    const y = m.getFullYear(), mo = m.getMonth();
    const today = Duty.fmt(new Date());
    const sel = Duty.sel();
    const monthName = m.toLocaleDateString("ru",{month:"long",year:"numeric"});
    const WD = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
    const byDate = {};
    shifts.forEach(s=>{ (byDate[s.date] = byDate[s.date]||[]).push(s); });

    const offset = (new Date(y,mo,1).getDay()+6)%7;  // понедельник — первый
    const daysIn = new Date(y,mo+1,0).getDate();
    const total = Math.ceil((offset+daysIn)/7)*7;

    let cells = "";
    for(let i=0;i<total;i++){
      const d = new Date(y,mo,1-offset+i);
      const ds = Duty.fmt(d);
      const other = d.getMonth()!==mo;
      const dayShifts = (byDate[ds]||[]).slice().sort((a,b)=>a.time.localeCompare(b.time));
      cells += `
        <div class="cal-cell ${other?'other':''} ${ds===today?'today':''} ${ds===sel?'sel':''}" onclick="Duty.selectDay('${ds}')">
          <div class="cal-date">${d.getDate()}</div>
          <div class="cal-chips">
            ${dayShifts.slice(0,3).map(s=>{
              const [c,soft] = shelterColors(s.shelterId);
              const full = s.who.length>=s.max;
              return `<div class="cal-chip ${full?'full':''}" style="background:${soft};border-left-color:${c}" title="${esc(s.task)} · ${s.time} · ${esc(DB.shelter(s.shelterId)?.name||'')}${full?" · мест нет":""}">
                <span class="cal-chip-time">${esc(s.time)}</span><span class="cal-chip-task">${esc(s.task)}</span>
              </div>`;
            }).join("")}
            ${dayShifts.length>3?`<div class="cal-more">ещё ${dayShifts.length-3}</div>`:""}
          </div>
        </div>`;
    }

    return `
      <div class="cal-wrap">
        <div class="cal-head">
          <button class="btn icon" onclick="Duty.shiftMonth(-1)" title="Предыдущий месяц">‹</button>
          <div class="cal-title">${esc(monthName)}</div>
          <button class="btn icon" onclick="Duty.shiftMonth(1)" title="Следующий месяц">›</button>
          <button class="btn sm" onclick="Duty.goToday()">Сегодня</button>
        </div>
        <div class="cal-grid">
          ${WD.map(w=>`<div class="cal-wd">${w}</div>`).join("")}
          ${cells}
        </div>
      </div>`;
  },

  dayPanelHTML(shifts, logged){
    const sel = Duty.sel();
    const dayShifts = shifts.filter(s=>s.date===sel).sort((a,b)=>a.time.localeCompare(b.time));
    const today = Duty.fmt(new Date());
    const title = new Date(sel+"T00:00:00").toLocaleDateString("ru",{weekday:"long",day:"numeric",month:"long"}) + (sel===today?" · сегодня":"");
    return `
      <div class="section-title">${esc(title)} · ${dayShifts.length} смен(ы)</div>
      ${dayShifts.length?dayShifts.map(s=>Duty.shiftHTML(s, logged)).join(""):`<p class="empty">В этот день смен нет.</p>`}`;
  },

  shiftHTML(s, logged){
    const sh = DB.shelter(s.shelterId);
    const [c] = shelterColors(s.shelterId);
    const full = s.who.length>=s.max;
    const inTeam = logged && s.who.includes(DB.data.session.login);
    return `<div class="shift-item" style="border-left:4px solid ${c}">
      <div class="when">${Duty.fmtDate(s.date)}<br><span style="font-size:12.5px;color:var(--muted);font-weight:500">${esc(s.time)}</span></div>
      <div class="what">
        <div class="task">${esc(s.task)} ${full?'<span class="badge">мест нет</span>':""}</div>
        <div class="where">${sh?esc(sh.name)+" · "+esc(sh.city):""}</div>
        ${s.note?`<div class="where" style="margin-top:4px">${esc(s.note)}</div>`:""}
        <div class="team">
          ${s.who.map(w=>`<span class="badge" style="cursor:pointer" onclick="goUser('${esc(w)}')">${esc(w)}</span>`).join("")}
          ${!s.who.length?`<span style="font-size:12px;color:var(--muted)">пока никого</span>`:""}
          <span class="slots">${s.who.length}/${s.max}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        ${logged ? (inTeam
          ? `<button class="btn sm" onclick="Duty.leave('${s.id}')">Отписаться</button>`
          : full ? "" : `<button class="btn primary sm" onclick="Duty.join('${s.id}')">Записаться</button>`) : ""}
        ${DB.canModerate()?`<button class="btn danger xs" onclick="Duty.removeShift('${s.id}')" title="Удалить">✕</button>`:""}
      </div>
    </div>`;
  },

  /* --- доска помощи (без изменений) --- */
  helpView(logged){
    const items = DB.data.help.slice().sort((a,b)=>((a.status==="done")-(b.status==="done")) || b.when.localeCompare(a.when));
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px">
        <p style="margin:0;font-size:13px;color:var(--muted)">Открытых просьб: <b>${items.filter(i=>i.status==="open").length}</b></p>
        ${logged?`<button class="btn primary" onclick="Duty.openHelp()">➕ Попросить о помощи</button>`:`<p style="margin:0;font-size:13px;color:var(--muted)">Войдите, чтобы публиковать просьбы</p>`}
      </div>
      ${items.length?items.map(h=>`
        <div class="help-item ${h.status==="done"?"done":""}">
          <div class="head">
            <span class="type-badge">${esc(h.type)}</span>
            <span class="title">${esc(h.title)}</span>
            ${h.status==="done"?'<span class="status-badge adopted">выполнено</span>':""}
          </div>
          <div class="desc">${esc(h.desc)}</div>
          <div class="meta">${esc(h.who)} · ${h.when}</div>
          <div class="actions" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
            ${logged && h.status==="open" && h.who===DB.data.session.login?`<button class="btn sm" onclick="Duty.doneHelp('${h.id}')">Отметить выполненным</button>`:""}
            ${(DB.canModerate() || (logged && h.who===DB.data.session.login))?`<button class="btn danger sm" onclick="Duty.removeHelp('${h.id}')">Удалить</button>`:""}
          </div>
        </div>`).join(""):`<p class="empty">Просьб пока нет.</p>`}`;
  },

  /* --- действия --- */
  join(id){
    if(!DB.data.session){ Auth.openLogin(); return; }
    const s = DB.data.shifts.find(x=>x.id===id);
    if(!s || s.who.length>=s.max || s.who.includes(DB.data.session.login)) return;
    s.who.push(DB.data.session.login);
    DB.log("shift","записался на смену «"+s.task+"» "+s.date+" "+s.time);
    DB.save();
    App.refresh();
    UI.toast("Вы записаны");
  },

  leave(id){
    const s = DB.data.shifts.find(x=>x.id===id);
    if(!s) return;
    s.who = s.who.filter(w=>w!==DB.data.session.login);
    DB.log("shift","отписался от смены «"+s.task+"» "+s.date);
    DB.save();
    App.refresh();
    UI.toast("Вы отписаны");
  },

  openShift(){
    if(!DB.data.session){ Auth.openLogin(); return; }
    const today = new Date().toISOString().slice(0,10);
    const until = new Date(Date.now()+28*864e5).toISOString().slice(0,10);
    UI.openModal(`
      <h2>Предложить смену</h2>
      <label>Приют</label>
      <select id="shf_shelter">${DB.data.shelters.map(s=>`<option value="${s.id}">${esc(s.name)} (${esc(s.city)})</option>`).join("")}</select>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label>Дата</label><input id="shf_date" type="date" value="${today}" min="${today}"></div>
        <div style="flex:1"><label>Время</label><input id="shf_time" type="time" value="10:00"></div>
      </div>
      <label>Задача</label>
      <input id="shf_task" value="Выгул собак">
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label>Повтор</label>
          <select id="shf_repeat" onchange="document.getElementById('shf_until_row').style.display=this.value==='weekly'?'block':'none'">
            <option value="none">не повторять</option>
            <option value="weekly">каждую неделю</option>
          </select></div>
        <div style="flex:1"><label>Сколько человек нужно</label><input id="shf_max" type="number" min="1" max="10" value="2"></div>
      </div>
      <div id="shf_until_row" style="display:none">
        <label>Повторять до</label>
        <input id="shf_until" type="date" value="${until}">
      </div>
      <label>Примечание</label>
      <textarea id="shf_note" placeholder="Встреча у входа, что взять с собой…"></textarea>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Duty.saveShift()">Создать</button>
      </div>`);
  },

  saveShift(){
    const date = $("#shf_date").value;
    const time = $("#shf_time").value;
    const task = $("#shf_task").value.trim();
    if(!date || !time || !task){ UI.toast("Заполните дату, время и задачу"); return; }
    const base = {
      shelterId: $("#shf_shelter").value,
      date, time, task,
      max: Math.max(1, parseInt($("#shf_max").value)||2),
      note: $("#shf_note").value.trim(),
      who: [],
    };
    const series = [];
    if($("#shf_repeat").value==="weekly"){
      const until = $("#shf_until").value;
      if(!until || until<date){ UI.toast("Укажите дату окончания повторов"); return; }
      let cur = new Date(date+"T00:00:00");
      const end = new Date(until+"T00:00:00");
      let guard = 0;
      while(cur<=end && guard<16){
        series.push(Duty.fmt(cur));
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()+7);
        guard++;
      }
    }else{
      series.push(date);
    }
    const seriesId = series.length>1 ? "sr"+Date.now() : "";
    series.forEach((d,i)=>{
      DB.data.shifts.push(normalizeShift({
        id:"d"+Date.now()+"_"+i,
        ...base, date:d, seriesId,
      }));
    });
    DB.log("shift","создал смену «"+task+"» "+date+" "+time+(series.length>1?" (серия из "+series.length+")":""));
    DB.save();
    UI.closeModal();
    Duty.selectDay(date);
    UI.toast(series.length>1?("Создано смен: "+series.length):"Смена создана");
  },

  removeShift(id){
    if(!DB.canModerate()) return;
    const s = DB.data.shifts.find(x=>x.id===id);
    if(!s) return;
    if(s.seriesId){
      if(confirm("Удалить всю серию повторов («"+s.task+"»)?")){
        DB.data.shifts = DB.data.shifts.filter(x=>x.seriesId!==s.seriesId);
        DB.log("shift","удалил серию смен «"+s.task+"»");
      }else if(confirm("Удалить только смену "+s.date+" "+s.time+"?")){
        DB.data.shifts = DB.data.shifts.filter(x=>x.id!==id);
        DB.log("shift","удалил смену «"+s.task+"» "+s.date);
      }else return;
    }else{
      if(!confirm("Удалить смену "+s.date+" "+s.time+"?")) return;
      DB.data.shifts = DB.data.shifts.filter(x=>x.id!==id);
      DB.log("shift","удалил смену «"+s.task+"» "+s.date);
    }
    DB.save();
    App.refresh();
  },

  openHelp(){
    if(!DB.data.session){ Auth.openLogin(); return; }
    UI.openModal(`
      <h2>Попросить о помощи</h2>
      <label>Что нужно *</label>
      <input id="hp_title" placeholder="Например: перевезти корм из зоомагазина">
      <label>Тип помощи</label>
      <select id="hp_type">${HELP_TYPES.map(t=>`<option>${t}</option>`).join("")}</select>
      <label>Описание</label>
      <textarea id="hp_desc" placeholder="Подробности: откуда/куда, сроки, контакты…"></textarea>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Duty.saveHelp()">Опубликовать</button>
      </div>`);
  },

  saveHelp(){
    const title = $("#hp_title").value.trim();
    const desc = $("#hp_desc").value.trim();
    if(!title || !desc){ UI.toast("Заполните название и описание"); return; }
    DB.data.help.push(normalizeHelp({
      id:"h"+Date.now(),
      title, desc,
      type: $("#hp_type").value,
      who: DB.data.session.login,
      when: new Date().toISOString().slice(0,10),
      status: "open",
    }));
    DB.log("help","опубликовал просьбу «"+title+"»");
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Опубликовано");
  },

  doneHelp(id){
    const h = DB.data.help.find(x=>x.id===id);
    if(!h) return;
    h.status = "done";
    DB.log("help","отметил выполненным «"+h.title+"»");
    DB.save();
    App.refresh();
    UI.toast("Отмечено выполненным");
  },

  removeHelp(id){
    const h = DB.data.help.find(x=>x.id===id);
    if(!h) return;
    if(!(DB.canModerate() || (DB.data.session && h.who===DB.data.session.login))) return;
    if(!confirm("Удалить просьбу?")) return;
    DB.data.help = DB.data.help.filter(x=>x.id!==id);
    DB.log("help","удалил просьбу «"+h.title+"»");
    DB.save();
    App.refresh();
  },
};

window.Duty = Duty;
