/* ============ ЗооВики — главная, страницы букв, закладки-папки ============ */

/* --- Карточка статьи (общий шаблон) --- */
function articleCardHTML(a, i){
  i = i || 0;
  const fav = DB.data.favs.includes(a.id);
  const bm = DB.isBookmarked(a.id);
  const logged = !!DB.data.session;
  return `
  <div class="card" style="animation-delay:${Math.min(i*30,300)}ms" data-go="#/a/${a.id}">
    <div class="card-actions">
      ${logged?`
      <button class="round-btn ${bm?'active-bm':''}" title="В закладки" onclick="event.stopPropagation();Bookmarks.menu(${a.id})">${ic("bookmark")}</button>
      <button class="round-btn ${fav?'active-fav':''}" title="В избранное" onclick="event.stopPropagation();Home.toggleFav(${a.id})">${fav?'':''}</button>`:""}
    </div>
    ${UI.articleMedia(a,'thumb')}
    <div class="cat">${esc(a.cat)}${a.level&&a.level!=="all"?` <span class="badge level">${LEVELS[a.level].label}</span>`:""}</div>
    <h3>${esc(a.term)}</h3>
    <p>${esc(a.desc.slice(0,80))}${a.desc.length>80?"…":""}</p>
    <div class="meta-row">
      <span>${ic("eye")} ${a.views||0}</span>
      <span>${ic("heart")} ${a.likes||0}</span>
      ${a.comments.length?`<span>${ic("msg")} ${DB.countComments(a)}</span>`:""}
      ${a.attachments.length?`<span>${ic("clip")} ${a.attachments.length}</span>`:""}
    </div>
    ${a.tags&&a.tags.length?`<div class="tags">${a.tags.map(t=>`<span class="tag" onclick="event.stopPropagation();goTag('${t}')">#${t}</span>`).join("")}</div>`:""}
  </div>`;
}

/* --- Главная --- */
const Home = {
  activeCat: null,
  activeTag: null,
  activeLevel: null,
  searchQ: "",

  view(){
    const visible = DB.publishedArticles();
    const usedLetters = new Set(visible.map(a=>a.letter));
    const allTags = [...new Set(visible.flatMap(a=>a.tags||[]))];
    let list = visible.slice();
    if(Home.activeCat) list = list.filter(a=>a.cat===Home.activeCat);
    if(Home.activeTag) list = list.filter(a=>(a.tags||[]).includes(Home.activeTag));
    if(Home.activeLevel) list = list.filter(a=>a.level===Home.activeLevel || a.level==="all");
    if(Home.searchQ){
      const variants = searchVariants(Home.searchQ.trim().toLowerCase());
      list = list.filter(a=>variants.some(v=>(a.term+" "+a.desc+" "+a.cat).toLowerCase().includes(v)));
    }
    const top = visible.slice().sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,3);
    const noFilters = !Home.activeCat && !Home.activeTag && !Home.activeLevel && !Home.searchQ;

    return `
    <div class="home-wrap view">
      <aside class="alphabet">
        <h4>Алфавит</h4>
        <div class="letters">
          ${RU_LETTERS.map(l=>`<button ${!usedLetters.has(l)?"disabled":""} onclick="goLetter('${l}')">${l}</button>`).join("")}
        </div>
        <h4>Категории</h4>
        <div class="letters cat-list">
          <button class="${!Home.activeCat?'active':''}" onclick="Home.setCat(null)">Все категории</button>
          ${CATS.map(c=>`<button class="${Home.activeCat===c?'active':''}" onclick="Home.setCat('${c}')">${c}</button>`).join("")}
        </div>
        <h4>Уровень</h4>
        <div class="letters cat-list">
          <button class="${!Home.activeLevel?'active':''}" onclick="Home.setLevel(null)">Все</button>
          <button class="${Home.activeLevel==='newbie'?'active':''}" onclick="Home.setLevel('newbie')">Новичкам</button>
          <button class="${Home.activeLevel==='pro'?'active':''}" onclick="Home.setLevel('pro')">Опытным</button>
        </div>
        ${allTags.length?`
        <h4>Теги</h4>
        <div class="letters cat-list">
          <button class="${!Home.activeTag?'active':''}" onclick="Home.setTag(null)">Все теги</button>
          ${allTags.map(t=>`<button class="${Home.activeTag===t?'active':''}" onclick="Home.setTag('${t}')">#${t}</button>`).join("")}
        </div>`:""}
      </aside>
      <section>
        <div class="hero">
          <div class="hero-content">
            <div class="eyebrow">Энциклопедия зооволонтёра</div>
            <h1>Термины от А до Я —<br>в <span class="accent">одном месте</span></h1>
            <p>Всё, что нужно знать волонтёру приюта: амуниция, здоровье, поведение, уход и обучение животных.</p>
            <div class="chips">
              <div class="chip sos" data-go="#/sos">🆘 SOS</div>
              <div class="chip" data-go="#/calc">💊 Калькулятор</div>
              <div class="chip" data-go="#/symptom">🩺 Симптомы</div>
              <div class="chip" data-go="#/checklists">📋 Чек-листы</div>
              <div class="chip" data-go="#/shelters">🗺️ Приюты</div>
              <div class="chip" onclick="Suggest.open()">✏️ Предложить статью</div>
            </div>
          </div>
          <div class="hero-pets"><span>🐕</span><span>🐈</span><span>🐾</span></div>
        </div>

        ${News.blockHTML()}

        ${top.length && noFilters ? `
        <div class="section-title">🔥 Популярное</div>
        <div class="grid" style="margin-bottom:24px">
          ${top.map((a,i)=>articleCardHTML(a,i)).join("")}
        </div>`:""}

        <div class="section-title">📖 Все статьи${Home.searchQ?` — поиск: «${esc(Home.searchQ)}»`:""}</div>
        ${list.length
          ? `<div class="grid">${list.map((a,i)=>articleCardHTML(a,i)).join("")}</div>`
          : `<p class="empty">Ничего не найдено.</p>`}
      </section>
    </div>`;
  },

  letterView(letter){
    const visible = DB.publishedArticles();
    const usedLetters = new Set(visible.map(a=>a.letter));
    const list = visible.filter(a=>a.letter===letter);
    return `
    <div class="letter-page view">
      <button class="back" data-go="#/">← На главную</button>
      <div class="letter-hero">
        <div class="big-letter">${esc(letter)}</div>
        <div class="info">
          <h1>Термины на букву «${esc(letter)}»</h1>
          <p>${list.length} термин(ов)</p>
        </div>
      </div>
      <div class="letter-nav">
        ${RU_LETTERS.map(l=>`<button ${!usedLetters.has(l)?"disabled":""} class="${l===letter?'active':''}" onclick="goLetter('${l}')">${l}</button>`).join("")}
      </div>
      ${list.length
        ? `<div class="grid">${list.map((a,i)=>articleCardHTML(a,i)).join("")}</div>`
        : `<p class="empty">На букву «${esc(letter)}» терминов пока нет.</p>`}
    </div>`;
  },

  setCat(c){ Home.activeCat = c; Home.activeTag = null; App.refresh(); },
  setTag(t){ Home.activeTag = t; App.refresh(); },
  setLevel(l){ Home.activeLevel = l; App.refresh(); },

  toggleFav(id){
    if(!DB.data.session){ UI.toast("Войдите, чтобы добавлять в избранное"); Auth.openLogin(); return; }
    const i = DB.data.favs.indexOf(id);
    const a = DB.article(id);
    if(i>=0){ DB.data.favs.splice(i,1); DB.log("fav","убрал из избранного «"+(a?a.term:id)+"»"); }
    else{ DB.data.favs.push(id); DB.log("fav","добавил в избранное «"+(a?a.term:id)+"»"); }
    DB.save();
    App.refresh();
  },
};

/* --- Закладки-папки (отдельно от избранного) --- */
const Bookmarks = {
  activeFolder: null,

  menu(articleId){
    if(!DB.data.session){ UI.toast("Войдите, чтобы пользоваться закладками"); Auth.openLogin(); return; }
    const a = DB.article(articleId);
    const folders = DB.data.folders;
    UI.openModal(`
      <h2 style="display:flex;align-items:center;gap:8px">🔖 Закладки: ${esc(a?a.term:"")}</h2>
      ${folders.length ? folders.map(f=>{
        const inF = f.articleIds.includes(articleId);
        return `<div class="mod-item" style="display:flex;align-items:center;gap:10px">
          <span style="flex:1"><b>📁 ${esc(f.name)}</b> <span style="color:var(--muted);font-size:12px">(${f.articleIds.length})</span></span>
          <button class="btn sm ${inF?'primary':''}" onclick="Bookmarks.toggle(${articleId},'${f.id}')">${inF?'В папке':'+ Добавить'}</button>
        </div>`;
      }).join("") : `<p class="empty">Папок пока нет — создайте первую ниже.</p>`}
      <label>Новая папка</label>
      <div style="display:flex;gap:8px">
        <input id="newFolderName" placeholder="Например: «Для выгула»">
        <button class="btn primary" onclick="Bookmarks.create(${articleId})">Создать</button>
      </div>
      <div class="row"><button class="btn" onclick="closeModal()">Готово</button></div>`);
  },

  toggle(articleId, folderId){
    const f = DB.folder(folderId);
    if(!f) return;
    const i = f.articleIds.indexOf(articleId);
    const a = DB.article(articleId);
    if(i>=0){ f.articleIds.splice(i,1); DB.log("bookmark","убрал «"+(a?a.term:articleId)+"» из папки «"+f.name+"»"); }
    else{ f.articleIds.push(articleId); DB.log("bookmark","добавил «"+(a?a.term:articleId)+"» в папку «"+f.name+"»"); }
    DB.save();
    Bookmarks.menu(articleId);
    App.updateBadges();
  },

  create(articleId){
    const name = $("#newFolderName").value.trim();
    if(!name){ UI.toast("Введите название папки"); return; }
    if(DB.data.folders.some(f=>f.name.toLowerCase()===name.toLowerCase())){ UI.toast("Такая папка уже есть"); return; }
    const f = {id:"f"+Date.now(), name, articleIds: articleId?[articleId]:[]};
    DB.data.folders.push(f);
    DB.log("folder","создал папку закладок «"+name+"»");
    DB.save();
    UI.toast("Папка «"+name+"» создана");
    if(articleId) Bookmarks.menu(articleId);
  },

  /** Модалка «Мои закладки»: список папок → содержимое папки */
  open(){
    if(!DB.data.session){ UI.toast("Войдите, чтобы видеть закладки"); Auth.openLogin(); return; }
    const folders = DB.data.folders;
    if(!folders.length){
      UI.openModal(`<h2 style="display:flex;align-items:center;gap:8px">🔖 Закладки</h2><p class="empty">Папок пока нет.</p>
        <label>Новая папка</label>
        <div style="display:flex;gap:8px">
          <input id="newFolderName" placeholder="Название папки">
          <button class="btn primary" onclick="Bookmarks.createFromList()">Создать</button>
        </div>
        <div class="row"><button class="btn" onclick="closeModal()">Закрыть</button></div>`);
      return;
    }
    const active = Bookmarks.activeFolder && DB.folder(Bookmarks.activeFolder)
      ? DB.folder(Bookmarks.activeFolder) : folders[0];
    Bookmarks.activeFolder = active.id;
    const items = active.articleIds.map(id=>DB.article(id)).filter(Boolean);
    UI.openModal(`
      <h2 style="display:flex;align-items:center;gap:8px">🔖 Мои закладки</h2>
      <div style="margin-bottom:12px">
        ${folders.map(f=>`<span class="folder-chip ${f.id===active.id?'active':''}" onclick="Bookmarks.select('${f.id}')">📁 ${esc(f.name)} <span class="cnt">${f.articleIds.length}</span></span>`).join("")}
      </div>
      <div style="max-height:46vh;overflow:auto">
        ${items.length ? items.map(a=>`
          <div class="mod-item" style="display:flex;align-items:center;gap:10px">
            <span style="flex:1;cursor:pointer" onclick="closeModal();goArticle(${a.id})"><b>${esc(a.term)}</b> <span class="badge">${esc(a.cat)}</span></span>
            <button class="btn danger xs" onclick="Bookmarks.toggle(${a.id},'${active.id}')"></button>
          </div>`).join("") : `<p class="empty">В этой папке пусто.</p>`}
      </div>
      <label>Новая папка</label>
      <div style="display:flex;gap:8px">
        <input id="newFolderName" placeholder="Название папки">
        <button class="btn primary" onclick="Bookmarks.createFromList()">Создать</button>
      </div>
      <div class="row">
        ${folders.length>1?`<button class="btn danger" onclick="Bookmarks.removeFolder('${active.id}')">Удалить папку</button>`:""}
        <button class="btn" onclick="closeModal()">Закрыть</button>
      </div>`);
  },

  select(folderId){
    Bookmarks.activeFolder = folderId;
    Bookmarks.open();
  },

  createFromList(){
    const name = $("#newFolderName").value.trim();
    if(!name){ UI.toast("Введите название папки"); return; }
    if(DB.data.folders.some(f=>f.name.toLowerCase()===name.toLowerCase())){ UI.toast("Такая папка уже есть"); return; }
    const f = {id:"f"+Date.now(), name, articleIds:[]};
    DB.data.folders.push(f);
    DB.log("folder","создал папку закладок «"+name+"»");
    DB.save();
    Bookmarks.activeFolder = f.id;
    Bookmarks.open();
  },

  removeFolder(folderId){
    const f = DB.folder(folderId);
    if(!f) return;
    if(!confirm("Удалить папку «"+f.name+"»? Статьи останутся на месте.")) return;
    DB.data.folders = DB.data.folders.filter(x=>x.id!==folderId);
    DB.log("folder","удалил папку закладок «"+f.name+"»");
    DB.save();
    Bookmarks.activeFolder = null;
    Bookmarks.open();
    App.updateBadges();
  },
};

/* --- Предложить статью --- */
const Suggest = {
  imgData: null,

  open(){
    if(!DB.data.session){ UI.toast("Войдите, чтобы предложить статью"); Auth.openLogin(); return; }
    Suggest.imgData = null;
    UI.openModal(`
      <h2>Предложить статью</h2>
      <p style="color:var(--muted);font-size:13px">Статья попадёт к модератору и появится на сайте после проверки.</p>
      <label>Термин</label><input id="s_term" placeholder="Например: Намордник">
      <label>Категория</label><select id="s_cat">${CATS.map(c=>`<option>${c}</option>`).join("")}</select>
      <label>Картинка</label>
      <label class="file-input">Загрузить с устройства
        <input type="file" accept="image/*" onchange="Suggest.preview(event)">
      </label>
      <div id="sPreview" class="file-preview" style="display:none"></div>
      <label>Или ссылка (URL)</label><input id="s_icon" placeholder="https://…">
      <label>Описание</label><textarea id="s_desc"></textarea>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Suggest.submit()">Отправить на модерацию</button>
      </div>`, 'wide');
  },

  preview(ev){
    const file = ev.target.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ UI.toast("Картинка больше 2 МБ"); return; }
    const reader = new FileReader();
    reader.onload = e=>{
      Suggest.imgData = e.target.result;
      const box = $("#sPreview");
      box.innerHTML = `<img src="${e.target.result}">`;
      box.style.display = "block";
    };
    reader.readAsDataURL(file);
  },

  submit(){
    const term = $("#s_term").value.trim();
    const cat = $("#s_cat").value;
    const desc = $("#s_desc").value.trim();
    const iconUrl = $("#s_icon").value.trim();
    if(!term || !desc){ UI.toast("Заполните термин и описание"); return; }
    const id = DB.nextArticleId();
    const letter = term.charAt(0).toUpperCase();
    const login = DB.data.session.login;
    DB.data.articles.push(normalizeArticle({
      id, term, letter, cat,
      icon: Suggest.imgData || iconUrl || "",
      desc, body: desc,
      tags:[],related:[],attachments:[],videos:[],links:[],
      views:0,likes:0,dislikes:0,
      edits:[{who:login,when:new Date().toISOString().slice(0,10),what:"Предложена статья (на модерации)",oldBody:"",newBody:desc}],
      comments:[], pending:true,
    }));
    DB.data.modQueue.push({
      id:"s"+Date.now(), type:"suggest",
      articleId:id, article:term, text:desc,
      who:login, when:new Date().toISOString().slice(0,10),
      status:"pending",
    });
    DB.log("suggest","предложил статью «"+term+"»");
    DB.save();
    UI.closeModal();
    App.updateBadges();
    UI.toast("Отправлено на модерацию!");
  },
};

/* --- Экспорт / импорт --- */
const Backup = {
  open(){
    UI.openModal(`
      <h2>Экспорт / Импорт</h2>
      <p style="color:var(--muted);font-size:13px">Сохраните все данные ЗооВики в файл или перенесите на другое устройство.</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
        <button class="btn primary" onclick="Backup.exportData()">Скачать файл (.json)</button>
        <label class="file-input" style="justify-content:center">
          Загрузить файл (.json)
          <input type="file" accept="application/json,.json" onchange="Backup.importData(event)">
        </label>
      </div>
      <div class="row"><button class="btn" onclick="closeModal()">Закрыть</button></div>`);
  },

  exportData(){
    const blob = new Blob([JSON.stringify(DB.exportData(),null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zooviki-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    DB.log("data","экспортировал данные");
    UI.toast("Файл скачан");
  },

  importData(ev){
    const file = ev.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = e=>{
      try{
        const data = JSON.parse(e.target.result);
        if(!confirm("Заменить все текущие данные? Действие необратимо.")) return;
        DB.importData(data);
        DB.log("data","импортировал данные из файла");
        UI.closeModal();
        App.refresh();
        UI.toast("Импорт завершён");
      }catch(err){
        UI.toast("Ошибка файла: "+err.message);
      }
    };
    reader.readAsText(file);
  },
};

/* --- Глобальные хелперы навигации --- */
window.goLetter = l=>{ location.hash = "#/letter/"+encodeURIComponent(l); };
window.goTag = t=>{ Home.activeTag = t; Home.activeCat = null; if(location.hash!=="#/"&&location.hash!==""){location.hash="#/";}else{App.refresh();} };
window.goArticle = id=>{ location.hash = "#/a/"+id; };
window.Home = Home;
window.Bookmarks = Bookmarks;
window.Suggest = Suggest;
window.Backup = Backup;
