/* ============ ЗооВики — панель модератора и админ-панель ============ */

const Mod = {

  view(){
    if(!DB.canModerate()){
      return `<div class="panel-page view"><button class="back" data-go="#/">← На главную</button><p class="empty">Доступ только для модераторов и админов.</p></div>`;
    }
    const pending = DB.data.modQueue.filter(q=>q.status==="pending");
    const resolved = DB.data.modQueue.filter(q=>q.status!=="pending").slice(-10).reverse();

    return `
    <div class="panel-page view">
      <button class="back" data-go="#/">← На главную</button>
      <h1>🛡️ Панель модератора</h1>

      <div class="mod-section">
        <h3 style="justify-content:center;text-align:center">📉 Активность за 7 дней</h3>
        ${Mod.chart()}
      </div>

      <div class="mod-section">
        <h3>⏳ На модерации <span class="num">${pending.length}</span></h3>
        ${pending.length ? pending.map(q=>`
          <div class="mod-item">
            <div class="meta">
              ${q.type==="issue"?'<b>Жалоба на текст</b>':'<b>Предложенная статья</b>'}
              · <b>${esc(q.article)}</b> · от ${esc(q.who)} · ${q.when}
            </div>
            <p style="margin:0;font-size:14px">${esc(q.text.slice(0,400))}${q.text.length>400?"…":""}</p>
            <div class="actions">
              <button class="btn primary sm" onclick="Mod.approve('${q.id}')">✓ Одобрить</button>
              <button class="btn danger sm" onclick="Mod.reject('${q.id}')">✗ Отклонить</button>
              <button class="btn sm" data-go="#/a/${q.articleId}">👁 Открыть статью</button>
            </div>
          </div>`).join("") : `<p class="empty">Очередь пуста </p>`}
      </div>

      <div class="mod-section">
        <h3>✅ Обработанные (последние 10)</h3>
        ${resolved.length ? resolved.map(q=>`
          <div class="mod-item" style="opacity:.75">
            <div class="meta">
              ${q.status==="approved"?"Одобрено":"Отклонено"}
              · ${q.type==="issue"?"жалоба":"статья"} · <b>${esc(q.article)}</b> · ${q.when} · ${esc(q.who)}
            </div>
          </div>`).join("") : `<p class="empty">Пока ничего.</p>`}
      </div>

      <div class="mod-section">
        <h3>📊 Статистика</h3>
        <p style="margin:0;color:var(--muted);font-size:14px">
          Опубликовано статей: <b>${DB.publishedArticles().length}</b> ·
          На модерации: <b>${DB.data.articles.filter(a=>a.pending).length}</b> ·
          Просмотров всего: <b>${DB.data.articles.reduce((s,a)=>s+(a.views||0),0)}</b> ·
          Пользователей: <b>${DB.data.users.length}</b> ·
          Приютов: <b>${DB.data.shelters.length}</b> ·
          Записей в логе: <b>${DB.data.activity.length}</b>
        </p>
      </div>

      ${DB.isAdmin()?`<p style="text-align:center"><button class="btn" data-go="#/admin">👑 Перейти в админ-панель</button></p>`:""}
    </div>`;
  },

  chart(){
    const days = [];
    for(let i=6;i>=0;i--){
      const d = new Date();
      d.setDate(d.getDate()-i);
      days.push(d.toISOString().slice(0,10));
    }
    const counts = days.map(d=>DB.data.activity.filter(a=>(a.ts||"").slice(0,10)===d).length);
    const max = Math.max(1,...counts);
    return `
      <div class="chart-bars">
        ${days.map((d,i)=>{
          const h = (counts[i]/max)*100;
          const lbl = new Date(d).toLocaleDateString('ru',{day:'2-digit',month:'2-digit'});
          return `<div class="chart-bar" title="${counts[i]} действий">
            <div class="chart-bar-fill" style="height:${Math.max(4,h)}%"></div>
            <div class="chart-bar-lbl">${lbl}</div>
          </div>`;
        }).join("")}
      </div>
      <div class="chart-legend">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--accent)"></span> Действия за день</span>
        <span>Всего за неделю: <b>${counts.reduce((s,x)=>s+x,0)}</b></span>
      </div>`;
  },

  approve(id){
    if(!DB.canModerate()) return;
    const q = DB.data.modQueue.find(x=>x.id===id);
    if(!q) return;
    q.status = "approved";
    if(q.type==="suggest"){
      const a = DB.article(q.articleId);
      if(a){
        a.pending = false;
        a.edits.push({who:DB.data.session.login, when:new Date().toISOString().slice(0,10), what:"Одобрено и опубликовано"});
      }
    }else{
      const a = DB.article(q.articleId);
      if(a) a.edits.push({who:DB.data.session.login, when:new Date().toISOString().slice(0,10), what:"Жалоба обработана"});
    }
    DB.log("approve",(q.type==="suggest"?"одобрил статью «":"обработал жалобу на «")+q.article+"»");
    DB.save();
    App.refresh();
    UI.toast("Одобрено");
  },

  reject(id){
    if(!DB.canModerate()) return;
    const q = DB.data.modQueue.find(x=>x.id===id);
    if(!q) return;
    q.status = "rejected";
    if(q.type==="suggest"){
      DB.data.articles = DB.data.articles.filter(x=>x.id!==q.articleId);
    }
    DB.log("reject",(q.type==="suggest"?"отклонил статью «":"отклонил жалобу на «")+q.article+"»");
    DB.save();
    App.refresh();
    UI.toast("Отклонено");
  },
};

/* --- Админ-панель --- */
const Admin = {
  logFilterType: "",
  logFilterUser: "",
  logShown: 100,

  view(){
    if(!DB.isAdmin()){
      return `<div class="panel-page view"><button class="back" data-go="#/">← На главную</button><p class="empty">Доступ только для администраторов.</p></div>`;
    }
    const users = DB.data.users.slice().sort((a,b)=>a.registered.localeCompare(b.registered));
    const bannedCount = users.filter(u=>u.banned).length;

    return `
    <div class="panel-page view">
      <button class="back" data-go="#/mod">← К панели модератора</button>
      <h1>👑 Админ-панель</h1>

      <div class="mod-section">
        <h3>👥 Пользователи <span class="num">${users.length}</span>
          ${bannedCount?`<span class="num" style="background:#ffe0e0;color:#a02a2a">забанено: ${bannedCount}</span>`:""}
        </h3>
        ${users.map(u=>`
          <div class="user-row ${u.banned?'banned-row':''}">
            ${UI.avatarHTML(u,'sm')}
            <span class="uname" style="cursor:pointer" onclick="goUser('${esc(u.login)}')">${esc(u.login)}</span>
            <span class="umeta">${UI.roleBadge(u.role)} ${u.banned?UI.bannedBadge():""}</span>
            <span class="umeta">${u.registered||"—"}</span>
            <span class="umeta">${Mod.userEditsCount(u.login)}</span>
            <span style="display:flex;gap:6px;flex-wrap:wrap">
              <select onchange="Auth.setRole('${esc(u.login)}', this.value)" style="width:auto;padding:5px 8px;font-size:12px">
                <option value="user" ${u.role==="user"?"selected":""}>пользователь</option>
                <option value="moderator" ${u.role==="moderator"?"selected":""}>модератор</option>
                <option value="admin" ${u.role==="admin"?"selected":""}>админ</option>
              </select>
              ${u.banned
                ? `<button class="btn sm" onclick="Auth.unban('${esc(u.login)}')">✅ Разбанить</button>`
                : `<button class="btn danger sm" onclick="Auth.ban('${esc(u.login)}')">🔨 Забанить</button>`}
            </span>
          </div>`).join("")}
      </div>

      <div class="mod-section">
        <h3>🧩 Разделы сайта</h3>
        <div class="user-row">
          <span class="uname">🐾 Питомцы</span>
          <span class="umeta">${DB.sectionOn("pets")?"включён":"в архиве — страница скрыта, данные сохранены"}</span>
          <button class="btn sm ${DB.sectionOn("pets")?"danger":"primary"}" onclick="Admin.toggleSection('pets')">
            ${DB.sectionOn("pets")?"Отключить":"Включить"}
          </button>
        </div>
      </div>

      <div class="mod-section">
        <h3>📜 Полный лог действий <span class="num">${DB.data.activity.length}</span></h3>
        <div class="filter-bar">
          <select id="logType" onchange="Admin.setLogFilter()">
            <option value="">Все типы действий</option>
            ${Object.entries(LOG_TYPES).map(([k,v])=>`<option value="${k}" ${Admin.logFilterType===k?"selected":""}>${v}</option>`).join("")}
          </select>
          <input id="logUser" placeholder="Фильтр по пользователю…" value="${esc(Admin.logFilterUser)}" oninput="Admin.setLogFilter()">
        </div>
        <div id="logList">${Admin.logList()}</div>
      </div>
    </div>`;
  },

  /** Включение/отключение разделов сайта (архив) */
  toggleSection(key){
    if(!DB.isAdmin()) return;
    DB.data.flags[key] = !DB.sectionOn(key);
    DB.log("flags",(DB.sectionOn(key)?"включил":"отключил")+" раздел «"+(key==="pets"?"Питомцы":key)+"»");
    DB.save();
    App.refresh();
    UI.toast(DB.sectionOn(key)?"Раздел включён":"Раздел отправлен в архив");
  },

  setLogFilter(){
    Admin.logFilterType = $("#logType").value;
    Admin.logFilterUser = $("#logUser").value.trim().toLowerCase();
    Admin.logShown = 100;
    $("#logList").innerHTML = Admin.logList();
  },

  logList(){
    let list = DB.data.activity.slice().reverse();
    if(Admin.logFilterType) list = list.filter(a=>a.type===Admin.logFilterType);
    if(Admin.logFilterUser) list = list.filter(a=>(a.user||"").toLowerCase().includes(Admin.logFilterUser));
    if(!list.length) return `<p class="empty">Ничего не найдено.</p>`;
    const shown = list.slice(0, Admin.logShown);
    return shown.map(a=>{
      const d = new Date(a.ts);
      const ts = isNaN(d) ? (a.ts||"") : d.toLocaleString('ru',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      return `<div class="log-item">
        <span class="ts">${ts}</span>
        <span class="who">${esc(a.user)}</span>
        <span class="type-badge">${esc(UI.logTypeLabel(a.type))}</span>
        <span style="flex:1">${esc(a.detail||"")}</span>
      </div>`;
    }).join("") + (list.length > Admin.logShown
      ? `<p style="text-align:center;margin-top:10px"><button class="btn sm" onclick="Admin.moreLog()">Показать ещё (${list.length-Admin.logShown})</button></p>`
      : "");
  },

  moreLog(){
    Admin.logShown += 200;
    $("#logList").innerHTML = Admin.logList();
  },
};

// количество правок пользователя (для админ-таблицы)
Mod.userEditsCount = function(login){
  let n = 0;
  DB.data.articles.forEach(a=>a.edits.forEach(e=>{ if(e.who===login) n++; }));
  return n;
};

window.Mod = Mod;
window.Admin = Admin;
