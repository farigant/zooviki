/* ============ ЗооВики — роутер, шапка, поиск, запуск ============ */

const App = {

  currentHash: "",

  routes(hash){
    if(hash.startsWith("#/a/")){
      const id = parseInt(hash.slice(4));
      return ()=>Article.view(id);
    }
    const map = {
      "": ()=>Home.view(),
      "#/": ()=>Home.view(),
      "#/profile": ()=>Profile.view(),
      "#/mod": ()=>Mod.view(),
      "#/admin": ()=>Admin.view(),
      "#/shelters": ()=>Shelters.view(),
      "#/sos": ()=>Tools.sosView(),
      "#/calc": ()=>Tools.calcView(),
      "#/symptom": ()=>Tools.symptomView(),
      "#/checklists": ()=>Tools.checklistsView(),
      "#/pets": ()=> DB.sectionOn("pets") ? Pets.view() : Pets.disabledView(),
      "#/duty": ()=>Duty.view(),
      "#/forum": ()=>Forum.view(),
      "#/news": ()=>News.view(),
      "#/start": ()=>Start.view(),
    };
    if(map[hash] !== undefined) return map[hash];
    if(hash.startsWith("#/topic/")){
      const id = decodeURIComponent(hash.slice(8));
      return ()=>Forum.topicView(id);
    }
    if(hash.startsWith("#/letter/")){
      const l = decodeURIComponent(hash.slice(9));
      return ()=>Home.letterView(l);
    }
    if(hash.startsWith("#/user/")){
      const login = decodeURIComponent(hash.slice(7));
      return ()=>Profile.publicView(login);
    }
    return ()=>Home.view();
  },

  render(){
    const hash = location.hash || "#/";
    App.currentHash = hash;

    // Шапка, навигация и дашборд закреплены на всех страницах — включая статьи
    const nav = $("#mainnav");
    if(nav) nav.classList.remove("hidden");
    const navPets = $("#navPets");
    if(navPets) navPets.style.display = DB.sectionOn("pets") ? "" : "none";
    const navKey = hash.startsWith("#/a/")||hash.startsWith("#/letter/") ? "/"
      : hash.startsWith("#/topic/") ? "/forum"
      : (hash.replace("#","") || "/");
    document.querySelectorAll("#mainnav a[data-nav]").forEach(a=>{
      a.classList.toggle("active", a.dataset.nav===navKey);
    });

    const viewFn = App.routes(hash);
    const app = $("#app");
    app.innerHTML = viewFn();

    // карта приютов — после вставки в DOM
    if(hash.startsWith("#/shelters")){
      setTimeout(()=>Shelters.initMap(), 30);
    }

    App.updateBadges();
    Auth.renderAuthArea();
  },

  /** Перерендер текущего маршрута (без смены hash) */
  refresh(){
    App.render();
  },

  /** Назад: по истории, а если страницу открыли напрямую — на главную */
  back(){
    if(history.length > 1) history.back();
    else location.hash = "#/";
  },

  updateBadges(){
    const logged = !!DB.data.session;
    const canMod = DB.canModerate();
    const isAdmin = DB.isAdmin();

    $("#bmBtn").hidden = !logged;
    $("#favBtn").hidden = !logged;
    $("#modBtn").hidden = !canMod;
    $("#adminBtn").hidden = !isAdmin;

    if(canMod){
      const n = DB.data.modQueue.filter(q=>q.status==="pending").length;
      const cnt = $("#modCount");
      cnt.hidden = n===0;
      cnt.textContent = n;
    }
  },

  setScheme(s){
    DB.data.scheme = s;
    DB.log("theme","сменил схему на «"+s+"»");
    DB.save();
    App.applyTheme();
    App.refresh();
  },

  applyTheme(){
    document.documentElement.setAttribute("data-theme", DB.data.theme);
    document.documentElement.setAttribute("data-scheme", DB.data.scheme);
    const t1 = $("#themeBtn"); if(t1) t1.innerHTML = ic(DB.data.theme==="dark" ? "sun" : "moon");
  },

  toggleTheme(){
    DB.data.theme = DB.data.theme==="dark" ? "light" : "dark";
    DB.log("theme","сменил тему на «"+DB.data.theme+"»");
    DB.save();
    App.applyTheme();
  },

  /* --- Избранное (модалка) --- */
  openFavs(){
    if(!DB.data.session){ Auth.openLogin(); return; }
    const items = DB.data.favs.map(id=>DB.article(id)).filter(Boolean);
    UI.openModal(`
      <h2>Избранное (${items.length})</h2>
      <div style="max-height:60vh;overflow:auto">
        ${items.length?items.map(a=>`
          <div class="mod-item" style="cursor:pointer" data-go="#/a/${a.id}">
            <b>${esc(a.term)}</b> <span class="badge">${esc(a.cat)}</span>
          </div>`).join(""):`<p class="empty">Пока пусто. Добавляйте статьи сердечком на карточках.</p>`}
      </div>
      <div class="row">
        ${items.length?`<button class="btn danger" onclick="App.clearFavs()">Очистить всё</button>`:""}
        <button class="btn primary" onclick="closeModal()">Закрыть</button>
      </div>`);
  },

  clearFavs(){
    DB.data.favs = [];
    DB.log("fav","очистил избранное");
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Избранное очищено");
  },

  /* --- Поиск с подсказками --- */
  suggestIdx: -1,

  onSearchInput(v){
    // если мы не на главной — переходим на неё и продолжаем поиск там
    if(App.currentHash !== "" && App.currentHash !== "#/"){
      Home.searchQ = v;
      location.hash = "#/";
      const si = $("#globalSearch");
      if(si){ si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
      return;
    }
    Home.searchQ = v;
    const box = $("#suggestBox");
    const q = v.trim().toLowerCase();
    if(!q){
      box.classList.add("hidden");
      App.refresh();
      return;
    }
    const variants = searchVariants(q);
    const matches = DB.publishedArticles().filter(a=>{
      const hay = (a.term+" "+a.desc+" "+a.cat+" "+(a.tags||[]).join(" ")).toLowerCase();
      if(variants.some(v=>hay.includes(v))) return true;
      for(const [syn,target] of Object.entries(SYNONYMS)){
        if(variants.some(v=>syn.includes(v)) && (a.tags||[]).includes(target.toLowerCase())) return true;
      }
      return false;
    }).slice(0,6);

    if(!matches.length){
      box.classList.add("hidden");
      App.refresh();
      return;
    }
    box.innerHTML = matches.map((a,i)=>`
      <div class="suggest-item" data-id="${a.id}" data-i="${i}">
        <span class="st-term">${UI.highlight(a.term,q)}</span>
        <span class="st-cat">${esc(a.cat)} · ${esc(a.letter)}</span>
      </div>`).join("");
    box.classList.remove("hidden");
    App.suggestIdx = -1;
    box.querySelectorAll(".suggest-item").forEach(el=>{
      el.onclick = ()=>{
        box.classList.add("hidden");
        goArticle(+el.dataset.id);
      };
    });
    App.refresh();
  },

  initSearch(){
    const input = $("#globalSearch");
    const box = $("#suggestBox");
    input.addEventListener("input", e=>App.onSearchInput(e.target.value));
    input.addEventListener("focus", e=>App.onSearchInput(e.target.value));
    document.addEventListener("click", e=>{
      if(!e.target.closest(".search-wrap")) box.classList.add("hidden");
    });
    document.addEventListener("keydown", e=>{
      if(box.classList.contains("hidden")) return;
      const items = box.querySelectorAll(".suggest-item");
      if(!items.length) return;
      if(e.key==="ArrowDown"){ e.preventDefault(); App.suggestIdx=Math.min(App.suggestIdx+1,items.length-1); }
      else if(e.key==="ArrowUp"){ e.preventDefault(); App.suggestIdx=Math.max(App.suggestIdx-1,0); }
      else if(e.key==="Enter"&&App.suggestIdx>=0){ e.preventDefault(); items[App.suggestIdx].click(); return; }
      else if(e.key==="Escape"){ box.classList.add("hidden"); return; }
      else return;
      items.forEach((el,i)=>el.classList.toggle("active", i===App.suggestIdx));
    });
  },

  init(){
    App.applyTheme();
    App.initSearch();

    $("#bmBtn").innerHTML = ic("bookmark");
    $("#favBtn").innerHTML = ic("star");
    $("#adminBtn").innerHTML = ic("crown");
    $("#themeBtn").innerHTML = ic("moon");
    $("#modBtn").insertAdjacentHTML("afterbegin", ic("shield"));

    $("#themeBtn").onclick = ()=>App.toggleTheme();
    $("#bmBtn").onclick = ()=>Bookmarks.open();
    $("#favBtn").onclick = ()=>App.openFavs();
    $("#modBtn").onclick = ()=>{ location.hash = "#/mod"; };
    $("#adminBtn").onclick = ()=>{ location.hash = "#/admin"; };

    // делегированный переход по data-go
    document.addEventListener("click", e=>{
      const el = e.target.closest("[data-go]");
      if(!el) return;
      e.preventDefault();
      UI.closeModal();
      const target = el.getAttribute("data-go");
      if(target === location.hash || (target==="#/" && (location.hash===""||location.hash==="#/"))){
        App.refresh();
      }else{
        location.hash = target;
      }
    });

    window.addEventListener("hashchange", ()=>{
      Article.activeTab = "read";
      Article.replyTarget = null;
      App.suggestIdx = -1;
      $("#suggestBox").classList.add("hidden");
      UI.closeModal();
      App.render();
      window.scrollTo(0,0);
    });

    if(!location.hash) location.hash = "#/";
    App.render();
  },
};

window.App = App;
document.addEventListener("DOMContentLoaded", ()=>App.init());
