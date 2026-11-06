/* ============ ЗооВики — дежурства и доска «Нужна помощь» ============ */

const Duty = {
  tab: "shifts",

  view(){
    const logged = !!DB.data.session;
    return `
    <div class="duty-page view">
      <button class="back" data-go="#/">${ic("arrowLeft")} На главную</button>
      <h1>📅 Дежурства и помощь</h1>
      <p class="subtitle">Расписание смен в приютах и просьбы о помощи от волонтёров.</p>
      <div class="tabs" style="margin:0 0 20px">
        <button class="tab ${Duty.tab==='shifts'?'active':''}" onclick="Duty.setTab('shifts')">Дежурства</button>
        <button class="tab ${Duty.tab==='help'?'active':''}" onclick="Duty.setTab('help')">Нужна помощь</button>
      </div>
      ${Duty.tab==="shifts" ? Duty.shiftsView(logged) : Duty.helpView(logged)}
    </div>`;
  },

  setTab(t){ Duty.tab = t; App.refresh(); },

  fmtDate(d){
    const dt = new Date(d+"T00:00:00");
    return isNaN(dt) ? d : dt.toLocaleDateString("ru",{weekday:"short",day:"numeric",month:"long"});
  },

  shiftsView(logged){
    const shifts = DB.data.shifts.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const open = shifts.filter(s=>s.who.length<s.max && s.date>=new Date().toISOString().slice(0,10));
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px">
        <p style="margin:0;font-size:13px;color:var(--muted)">Ближайшие смены: <b>${open.length}</b> открыто</p>
        ${logged?`<button class="btn primary" onclick="Duty.openShift()">➕ Предложить смену</button>`:`<p style="margin:0;font-size:13px;color:var(--muted)">Войдите, чтобы записываться</p>`}
      </div>
      ${shifts.length?shifts.map(s=>{
        const sh = DB.shelter(s.shelterId);
        const full = s.who.length>=s.max;
        const inTeam = logged && s.who.includes(DB.data.session.login);
        const canEdit = logged && (DB.canModerate() || s.who.includes(DB.data.session.login) || DB.data.session.login);
        const isCreator = logged; // создатель не хранится отдельно — правят модераторы или запись идёт по факту
        return `<div class="shift-item">
          <div class="when">${Duty.fmtDate(s.date)}<br><span style="font-size:12.5px;color:var(--muted);font-weight:500">${esc(s.time)}</span></div>
          <div class="what">
            <div class="task">${esc(s.task)} ${full?'<span class="badge">заполнено</span>':""}</div>
            <div class="where">${sh?esc(sh.name)+" · "+esc(sh.city):""}</div>
            ${s.note?`<div class="where" style="margin-top:4px">${esc(s.note)}</div>`:""}
            <div class="team">
              ${s.who.map(w=>`<span class="badge" style="cursor:pointer" onclick="goUser('${esc(w)}')">${esc(w)}</span>`).join("")}
              ${!s.who.length?`<span style="font-size:12px;color:var(--muted)">пока никого</span>`:""}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            ${logged ? (inTeam
              ? `<button class="btn sm" onclick="Duty.leave('${s.id}')">Отписаться</button>`
              : full ? "" : `<button class="btn primary sm" onclick="Duty.join('${s.id}')">Записаться</button>`) : ""}
            ${DB.canModerate()?`<button class="btn danger xs" onclick="Duty.removeShift('${s.id}')" title="Удалить">×</button>`:""}
          </div>
        </div>`;
      }).join(""):`<p class="empty">Смен пока нет — предложите первую.</p>`}`;
  },

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
      <label>Сколько человек нужно</label>
      <input id="shf_max" type="number" min="1" max="10" value="2">
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
    DB.data.shifts.push(normalizeShift({
      id:"d"+Date.now(),
      shelterId: $("#shf_shelter").value,
      date, time, task,
      max: Math.max(1, parseInt($("#shf_max").value)||2),
      note: $("#shf_note").value.trim(),
      who: [],
    }));
    DB.log("shift","создал смену «"+task+"» "+date+" "+time);
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Смена создана");
  },

  removeShift(id){
    if(!DB.canModerate()) return;
    if(!confirm("Удалить смену?")) return;
    const s = DB.data.shifts.find(x=>x.id===id);
    DB.data.shifts = DB.data.shifts.filter(x=>x.id!==id);
    DB.log("shift","удалил смену «"+(s?s.task:id)+"»");
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
