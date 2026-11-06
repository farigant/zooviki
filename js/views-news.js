/* ============ ЗооВики — новости (публикация: только модераторы и админы) ============ */

const News = {
  sorted(){
    return DB.data.news.slice().sort((a,b)=>((b.pinned?1:0)-(a.pinned?1:0)) || b.when.localeCompare(a.when));
  },

  view(){
    const canMod = DB.canModerate();
    const list = News.sorted();
    return `
    <div class="pets-page view">
      <button class="back" data-go="#/">${ic("arrowLeft")} На главную</button>
      <h1>📰 Новости</h1>
      <p class="subtitle">Анонсы и объявления администрации. Публикуют только модераторы и администраторы${canMod?".":" — обращайтесь к ним, чтобы разместить информацию"}.</p>
      ${canMod?`<button class="btn primary" onclick="News.openEdit()" style="margin-bottom:16px">${ic("plus")} Добавить новость</button>`:""}
      ${list.length?list.map(n=>`
        <div class="mod-item" style="cursor:pointer" onclick="News.detail('${n.id}')">
          ${n.photo?`<div class="news-img" style="margin-bottom:10px"><img src="${n.photo}" alt="" loading="lazy"></div>`:""}
          <div class="meta" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <b style="font-size:15px;font-family:var(--serif)">${esc(n.title)}</b>
            ${n.pinned?'<span class="badge">закреплено</span>':""}
            <span style="margin-left:auto">${n.when} · ${esc(n.who)}</span>
          </div>
          <p style="margin:6px 0 0;font-size:14px;line-height:1.65">${esc(n.text.slice(0,220))}${n.text.length>220?"…":""}</p>
          ${canMod?`<div class="actions" style="display:flex;gap:6px;margin-top:8px">
            <button class="btn sm" onclick="event.stopPropagation();News.togglePin('${n.id}')">${n.pinned?"Открепить":"Закрепить"}</button>
            <button class="btn sm" onclick="event.stopPropagation();News.openEdit('${n.id}')">Редактировать</button>
            <button class="btn danger sm" onclick="event.stopPropagation();News.remove('${n.id}')">Удалить</button>
          </div>`:""}
        </div>`).join(""):`<p class="empty">Новостей пока нет.</p>`}
    </div>`;
  },

  openEdit(id){
    if(!DB.canModerate()){ UI.toast("Публиковать новости могут только модераторы и админы"); return; }
    const n = id ? DB.data.news.find(x=>x.id===id) : {title:"",text:"",pinned:false,photo:""};
    News._img = null;
    UI.openModal(`
      <h2>${id?"Редактировать":"Добавить"} новость</h2>
      <label>Заголовок *</label>
      <input id="nw_title" value="${esc(n.title)}">
      <label>Картинка</label>
      <label class="file-input">Загрузить с устройства
        <input type="file" accept="image/*" onchange="News.preview(event)">
      </label>
      <div id="nw_preview" class="file-preview" style="display:${n.photo?"block":"none"}">${n.photo?`<img src="${n.photo}">`:""}</div>
      <label>Текст *</label>
      <textarea id="nw_text" style="min-height:140px">${esc(n.text)}</textarea>
      <label style="display:flex;align-items:center;gap:8px;margin-top:14px;cursor:pointer">
        <input type="checkbox" id="nw_pin" ${n.pinned?"checked":""} style="width:auto">
        Закрепить вверху ленты
      </label>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="News.save('${id||""}')">Опубликовать</button>
      </div>`);
  },

  preview(ev){
    const file = ev.target.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ UI.toast("Картинка больше 2 МБ"); return; }
    const reader = new FileReader();
    reader.onload = e=>{
      News._img = e.target.result;
      const box = $("#nw_preview");
      box.innerHTML = `<img src="${e.target.result}">`;
      box.style.display = "block";
    };
    reader.readAsDataURL(file);
  },

  save(id){
    if(!DB.canModerate()) return;
    const title = $("#nw_title").value.trim();
    const text = $("#nw_text").value.trim();
    if(!title || !text){ UI.toast("Заполните заголовок и текст"); return; }
    const pinned = $("#nw_pin").checked;
    if(id){
      const n = DB.data.news.find(x=>x.id===id);
      if(!n) return;
      Object.assign(n, {title, text, pinned});
      if(News._img) n.photo = News._img;
      DB.log("news","отредактировал новость «"+title+"»");
    }else{
      DB.data.news.push(normalizeNews({
        id:"n"+Date.now(), title, text, pinned,
        photo: News._img || "",
        who: DB.data.session.login,
        when: new Date().toISOString().slice(0,10),
      }));
      DB.log("news","опубликовал новость «"+title+"»");
    }
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Опубликовано");
  },

  togglePin(id){
    if(!DB.canModerate()) return;
    const n = DB.data.news.find(x=>x.id===id);
    if(!n) return;
    n.pinned = !n.pinned;
    DB.log("news",(n.pinned?"закрепил":"открепил")+" новость «"+n.title+"»");
    DB.save();
    App.refresh();
  },

  remove(id){
    if(!DB.canModerate()) return;
    const n = DB.data.news.find(x=>x.id===id);
    if(!n) return;
    if(!confirm("Удалить новость?")) return;
    DB.data.news = DB.data.news.filter(x=>x.id!==id);
    DB.log("news","удалил новость «"+n.title+"»");
    DB.save();
    App.refresh();
    UI.toast("Новость удалена");
  },

  /** Компактный блок для главной: 3 последние новости */
  blockHTML(){
    const list = News.sorted().slice(0,3);
    if(!list.length) return "";
    return `
      <div class="section-title">📰 Новости</div>
      <div style="margin-bottom:24px">
        ${list.map(n=>`
          <div class="mod-item" style="cursor:pointer;display:flex;gap:12px;align-items:flex-start" onclick="News.detail('${n.id}')">
            ${n.photo?`<div class="news-thumb"><img src="${n.photo}" alt="" loading="lazy"></div>`:""}
            <div style="flex:1;min-width:0">
              <div class="meta" style="display:flex;gap:8px;align-items:center">
                ${n.pinned?'<span class="badge">закреплено</span>':""}
                <b>${esc(n.title)}</b>
                <span style="margin-left:auto;white-space:nowrap">${n.when}</span>
              </div>
              <p style="margin:4px 0 0;font-size:13px;color:var(--muted)">${esc(n.text.slice(0,120))}${n.text.length>120?"…":""}</p>
            </div>
          </div>`).join("")}
        <p style="margin:8px 0 0"><a href="#/news" style="font-size:13px;color:var(--accent-d);font-weight:600">Все новости →</a></p>
      </div>`;
  },

  detail(id){
    const n = DB.data.news.find(x=>x.id===id);
    if(!n) return;
    const canMod = DB.canModerate();
    UI.openModal(`
      <h2 style="font-size:20px">${esc(n.title)}</h2>
      <p style="font-size:12px;color:var(--muted);margin:0 0 14px">${n.when} · ${esc(n.who)}</p>
      ${n.photo?`<div class="news-img" style="margin:0 0 14px"><img src="${n.photo}" alt=""></div>`:""}
      <p style="font-size:14.5px;line-height:1.7;margin:0">${esc(n.text)}</p>
      <div class="row">
        ${canMod?`<button class="btn" onclick="closeModal();News.openEdit('${n.id}')">Редактировать</button>`:""}
        <button class="btn primary" onclick="closeModal();location.hash='#/news'">Все новости</button>
      </div>`);
  },
};

window.News = News;
