/* ============ ЗооВики — профиль: свой и чужие ============ */

function computeAchievements(u){
  const myEdits = [];
  DB.data.articles.forEach(a=>a.edits.forEach(e=>{ if(e.who===u.login) myEdits.push(e); }));
  const myArticles = DB.data.articles.filter(a=>a.edits.some(e=>e.who===u.login)).length;
  const myComments = [];
  DB.data.articles.forEach(a=>{
    a.comments.forEach(c=>{ if(c.who===u.login) myComments.push(c); (c.replies||[]).forEach(r=>{ if(r.who===u.login) myComments.push(r); }); });
  });
  const myFavs = DB.data.favs.length;
  const folders = DB.data.folders.length;
  return [
    {icon:"🥚", name:"Новичок", desc:"Зарегистрировался", unlocked:true},
    {icon:"✏️", name:"Редактор", desc:"5 правок", unlocked:myEdits.length>=5},
    {icon:"📚", name:"Автор", desc:"Затронул 1 статью", unlocked:myArticles>=1},
    {icon:"🖋️", name:"Писатель", desc:"Затронул 5 статей", unlocked:myArticles>=5},
    {icon:"💬", name:"Болтун", desc:"10 комментариев", unlocked:myComments.length>=10},
    {icon:"⭐", name:"Коллекционер", desc:"10 в избранном", unlocked:myFavs>=10},
    {icon:"🔖", name:"Организатор", desc:"3 папки закладок", unlocked:folders>=3},
    {icon:"🏆", name:"Легенда", desc:"50 правок", unlocked:myEdits.length>=50},
  ];
}

const Profile = {

  /** Свой профиль — настройки и статистика */
  view(){
    const u = DB.currentUser();
    if(!u){
      return `<div class="profile-page view"><button class="back" data-go="#/">← На главную</button><p class="empty">Войдите, чтобы открыть профиль.</p></div>`;
    }
    const achievements = computeAchievements(u);
    const myEdits = Profile.collectEdits(u.login);
    const touchedArticles = [...new Set(myEdits.map(e=>e.artId))];
    const favArticles = DB.data.favs.map(id=>DB.article(id)).filter(Boolean);
    const myComments = Profile.collectComments(u.login);

    return `
    <div class="profile-page view">
      <button class="back" data-go="#/">← На главную</button>
      <div class="profile-head">
        <label class="file-input" style="border:none;padding:0;background:none;cursor:pointer" title="Сменить аватар">
          ${UI.avatarHTML(u,'lg')}
          <input type="file" accept="image/*" onchange="Profile.uploadAvatar(event)">
        </label>
        <div class="info">
          <h1>${esc(u.login)}</h1>
          <div class="row-meta">
            ${UI.roleBadge(u.role)}
            ${u.banned?UI.bannedBadge():""}
            <span>📅 с ${u.registered||"—"}</span>
            <span>✏️ правок: ${myEdits.length}</span>
          </div>
          ${u.bio?`<p style="margin:8px 0 0;color:var(--muted);font-size:14px">${esc(u.bio)}</p>`:""}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="num">${touchedArticles.length}</div><div class="lbl">Статей затронуто</div></div>
        <div class="stat-card"><div class="num">${myEdits.length}</div><div class="lbl">Правок</div></div>
        <div class="stat-card"><div class="num">${myComments.length}</div><div class="lbl">Комментариев</div></div>
        <div class="stat-card"><div class="num">${favArticles.length}</div><div class="lbl">В избранном</div></div>
        <div class="stat-card"><div class="num">${DB.data.folders.length}</div><div class="lbl">Папок закладок</div></div>
        <div class="stat-card"><div class="num">${achievements.filter(a=>a.unlocked).length}/${achievements.length}</div><div class="lbl">Достижений</div></div>
      </div>

      <div class="section-title">🏆 Достижения</div>
      <div class="achieve-grid">
        ${achievements.map(a=>`
          <div class="achieve ${a.unlocked?'unlocked':'locked'}" title="${a.unlocked?'Получено':'Не получено'}">
            <div class="icon">${a.icon}</div>
            <div class="name">${a.name}</div>
            <div class="desc">${a.desc}</div>
          </div>`).join("")}
      </div>

      <div class="section-title">✏️ Последние правки</div>
      ${myEdits.length?myEdits.slice(0,10).map(e=>`
        <div class="mod-item" style="cursor:pointer" data-go="#/a/${e.artId}">
          <div class="meta"><b>${esc(e.term)}</b> · ${e.when}</div>
          <p style="margin:0;font-size:14px">${esc(e.what)}</p>
        </div>`).join(""):`<p class="empty">Пока нет</p>`}

      <div class="section-title">⭐ Избранное</div>
      ${favArticles.length?favArticles.map(a=>`
        <div class="mod-item" style="cursor:pointer" data-go="#/a/${a.id}">
          <b>${esc(a.term)}</b> <span class="badge">${esc(a.cat)}</span>
        </div>`).join(""):`<p class="empty">Пока пусто</p>`}

      <div class="section-title">🔖 Закладки</div>
      ${DB.data.folders.length?DB.data.folders.map(f=>`
        <div class="mod-item">
          <b>📁 ${esc(f.name)}</b> <span style="color:var(--muted);font-size:12px">— ${f.articleIds.length} статей</span>
        </div>`).join(""):`<p class="empty">Папок нет — добавьте из карточек статей.</p>`}

      <div class="section-title">🎨 Оформление</div>
      <div class="mod-section">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn ${DB.data.scheme==='green'?'primary':''}" onclick="App.setScheme('green')">🌿 Природная</button>
          <button class="btn ${DB.data.scheme==='warm'?'primary':''}" onclick="App.setScheme('warm')">🌅 Тёплая</button>
          <button class="btn ${DB.data.scheme==='cool'?'primary':''}" onclick="App.setScheme('cool')">🌊 Холодная</button>
        </div>
      </div>

      <div class="section-title">⚙️ Настройки</div>
      <div class="mod-section">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn" onclick="Profile.changePassword()">🔑 Сменить пароль</button>
          <button class="btn" onclick="Profile.editBio()">📝 О себе</button>
          <button class="btn" onclick="Backup.open()">💾 Экспорт/Импорт</button>
          <button class="btn danger" onclick="Profile.clearMyData()">🗑 Очистить избранное и оценки</button>
        </div>
        <p style="font-size:12px;color:var(--muted);margin:0 0 12px">
          💾 Данные занимают: <b>${UI.fmtSize(DB.storageSize())}</b>
        </p>
        <button class="btn danger" onclick="Auth.logout()" style="width:100%">Выйти из аккаунта</button>
      </div>
    </div>`;
  },

  /** Публичный профиль другого пользователя */
  publicView(login){
    const u = DB.data.users.find(x=>x.login===login);
    if(!u){
      return `<div class="profile-page view"><button class="back" data-go="#/">← На главную</button><p class="empty">Пользователь не найден.</p></div>`;
    }
    const achievements = computeAchievements(u);
    const myEdits = Profile.collectEdits(u.login);
    const touchedArticles = [...new Set(myEdits.map(e=>e.artId))].map(id=>DB.article(id)).filter(Boolean);
    const myComments = Profile.collectComments(u.login);
    const isSelf = DB.data.session && DB.data.session.login===login;

    return `
    <div class="profile-page view">
      <button class="back" onclick="App.back()">← Назад</button>
      <div class="profile-head">
        ${UI.avatarHTML(u,'lg')}
        <div class="info">
          <h1>${esc(u.login)}</h1>
          <div class="row-meta">
            ${UI.roleBadge(u.role)}
            ${u.banned?UI.bannedBadge():""}
            <span>📅 на ЗооВики с ${u.registered||"—"}</span>
          </div>
          ${u.bio?`<p style="margin:8px 0 0;color:var(--muted);font-size:14px">${esc(u.bio)}</p>`:""}
          ${u.banned&&u.bannedReason?`<p style="margin:6px 0 0;color:var(--danger);font-size:13px">Причина блокировки: ${esc(u.bannedReason)}</p>`:""}
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="num">${touchedArticles.length}</div><div class="lbl">Статей затронуто</div></div>
        <div class="stat-card"><div class="num">${myEdits.length}</div><div class="lbl">Правок</div></div>
        <div class="stat-card"><div class="num">${myComments.length}</div><div class="lbl">Комментариев</div></div>
        <div class="stat-card"><div class="num">${achievements.filter(a=>a.unlocked).length}/${achievements.length}</div><div class="lbl">Достижений</div></div>
      </div>

      <div class="section-title">🏆 Достижения</div>
      <div class="achieve-grid">
        ${achievements.map(a=>`
          <div class="achieve ${a.unlocked?'unlocked':'locked'}">
            <div class="icon">${a.icon}</div>
            <div class="name">${a.name}</div>
            <div class="desc">${a.desc}</div>
          </div>`).join("")}
      </div>

      ${touchedArticles.length?`
      <div class="section-title">📚 Участвовал в статьях</div>
      ${touchedArticles.slice(0,12).map(a=>`
        <div class="mod-item" style="cursor:pointer" data-go="#/a/${a.id}">
          <b>${esc(a.term)}</b> <span class="badge">${esc(a.cat)}</span>
        </div>`).join("")}`:""}

      ${myComments.length?`
      <div class="section-title">💬 Последние комментарии</div>
      ${myComments.slice(-5).reverse().map(c=>`
        <div class="mod-item">
          <div class="meta"><b>${esc(c.term)}</b> · ${c.when}</div>
          <p style="margin:0;font-size:14px">${esc(c.text.slice(0,140))}${c.text.length>140?"…":""}</p>
        </div>`).join("")}`:""}

      ${isSelf?`<p style="margin-top:16px"><button class="btn" data-go="#/profile">⚙️ Это вы — перейти в настройки</button></p>`:""}
    </div>`;
  },

  collectEdits(login){
    const out = [];
    DB.data.articles.forEach(a=>a.edits.forEach(e=>{
      if(e.who===login) out.push({...e, term:a.term, artId:a.id});
    }));
    out.sort((a,b)=>b.when.localeCompare(a.when));
    return out;
  },

  collectComments(login){
    const out = [];
    DB.data.articles.forEach(a=>{
      a.comments.forEach(c=>{ if(c.who===login) out.push({...c, term:a.term}); (c.replies||[]).forEach(r=>{ if(r.who===login) out.push({...r, term:a.term}); }); });
    });
    return out;
  },

  uploadAvatar(ev){
    const file = ev.target.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ UI.toast("Картинка больше 2 МБ"); return; }
    const reader = new FileReader();
    reader.onload = e=>{
      const u = DB.currentUser();
      u.avatar = e.target.result;
      DB.log("user_edit","обновил аватар");
      DB.save();
      App.refresh();
      UI.toast("Аватар обновлён");
    };
    reader.readAsDataURL(file);
  },

  changePassword(){
    UI.openModal(`
      <h2>Смена пароля</h2>
      <label>Новый пароль</label><input id="np1" type="password" autocomplete="new-password">
      <label>Повторите пароль</label><input id="np2" type="password" autocomplete="new-password">
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Profile.savePassword()">Сохранить</button>
      </div>`);
  },

  savePassword(){
    const p1 = $("#np1").value, p2 = $("#np2").value;
    if(!p1 || p1.length<3){ UI.toast("Пароль — минимум 3 символа"); return; }
    if(p1!==p2){ UI.toast("Пароли не совпадают"); return; }
    const u = DB.currentUser();
    u.pass = p1;
    DB.log("user_edit","сменил пароль");
    DB.save();
    UI.closeModal();
    UI.toast("Пароль изменён");
  },

  editBio(){
    const u = DB.currentUser();
    UI.openModal(`
      <h2>О себе</h2>
      <label>Короткая информация (видна всем на вашей странице)</label>
      <textarea id="bioText" placeholder="Например: волонтёр приюта «Верный друг», работаю с собаками крупных пород">${esc(u.bio||"")}</textarea>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Profile.saveBio()">Сохранить</button>
      </div>`);
  },

  saveBio(){
    const u = DB.currentUser();
    u.bio = $("#bioText").value.trim();
    DB.log("user_edit","обновил «О себе»");
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Сохранено");
  },

  clearMyData(){
    if(!confirm("Очистить избранное и оценки? Закладки и комментарии останутся.")) return;
    DB.data.favs = [];
    if(DB.data.session) delete DB.data.votes[DB.data.session.login];
    DB.log("user_edit","очистил избранное и оценки");
    DB.save();
    App.refresh();
    UI.toast("Данные очищены");
  },
};

window.Profile = Profile;
window.goUser = login=>{ location.hash = "#/user/"+encodeURIComponent(login); };
