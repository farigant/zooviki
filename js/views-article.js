/* ============ ЗооВики — страница статьи: текст, история, комментарии ============ */

const Article = {
  activeTab: "read",
  replyTarget: null,

  view(id){
    const a = DB.article(id);
    if(!a){
      return `<div class="article-page view"><button class="back" data-go="#/">← На главную</button><p class="empty">Статья не найдена.</p></div>`;
    }
    // счётчик просмотров — один на статью
    if(!DB.data.viewed.includes(id)){
      a.views = (a.views||0)+1;
      DB.data.viewed.push(id);
      DB.save();
    }
    const canMod = DB.canModerate();
    const logged = !!DB.data.session;
    const myVote = (logged && DB.data.votes[DB.data.session.login] && DB.data.votes[DB.data.session.login][id]) || 0;
    const fav = DB.data.favs.includes(id);
    const bm = DB.isBookmarked(id);

    let tabContent = "";
    if(Article.activeTab==="read"){
      tabContent = Article.readTab(a, myVote, canMod);
    }else if(Article.activeTab==="history"){
      tabContent = Article.historyTab(a, canMod);
    }else{
      tabContent = Article.commentsTab(a, logged);
    }

    return `
    <div class="article-page view">
      <button class="back" onclick="App.back()">← Назад</button>
      <div class="article-cat">${esc(a.cat)} · буква ${esc(a.letter)}${a.level&&a.level!=="all"?` · <span class="badge level">${LEVELS[a.level].label}</span>`:""}</div>
      <div class="article-head">
        <h1>${esc(a.term)}</h1>
        <div class="article-head-actions">
          ${logged?`
          <button class="round-btn ${bm?'active-bm':''}" title="В закладки" onclick="Bookmarks.menu(${a.id})">${ic("bookmark")}</button>
          <button class="round-btn ${fav?'active-fav':''}" title="В избранное" onclick="Home.toggleFav(${a.id})">${ic("heart")}</button>`:""}
        </div>
      </div>
      ${a.tags&&a.tags.length?`<div class="tags" style="margin-bottom:12px">${a.tags.map(t=>`<span class="tag" onclick="goTag('${t}')">#${t}</span>`).join("")}</div>`:""}
      <div class="article-meta-bar">
        <span>${ic("eye")} ${a.views||0} просмотров</span>
        <span>${ic("heart")} ${a.likes||0}</span>
        <span>${ic("msg")} ${DB.countComments(a)}</span>
        <span>${ic("pen")} ${a.edits.length} правок</span>
      </div>
      <div class="tabs">
        <button class="tab ${Article.activeTab==='read'?'active':''}" onclick="Article.setTab('read',${a.id})">Статья</button>
        <button class="tab ${Article.activeTab==='history'?'active':''}" onclick="Article.setTab('history',${a.id})">История (${a.edits.length})</button>
        <button class="tab ${Article.activeTab==='comments'?'active':''}" onclick="Article.setTab('comments',${a.id})">Комментарии (${DB.countComments(a)})</button>
      </div>
      ${tabContent}
    </div>`;
  },

  readTab(a, myVote, canMod){
    const related = (a.related||[]).map(rid=>DB.article(rid)).filter(x=>x && !x.pending);
    const similar = Article.findSimilar(a).filter(s=>!related.some(r=>r.id===s.id));
    const attach = a.attachments||[];
    const videos = a.videos||[];
    const links = a.links||[];

    return `
      ${UI.articleMedia(a,'article-img')}
      <div class="article-body">${a.body.split("\n").filter(p=>p.trim()).map(p=>`<p>${Article.linkify(p, a.id)}</p>`).join("")}</div>

      ${videos.length?`<div class="attachments-block">
        <h3>🎥 Видео</h3>
        ${videos.map(v=>`<div style="margin-bottom:12px;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#000">
          <iframe src="${UI.youtubeEmbed(v)}" style="width:100%;height:100%;border:none" allowfullscreen loading="lazy"></iframe>
        </div>`).join("")}
      </div>`:""}

      ${links.length?`<div class="attachments-block">
        <h3>🔗 Полезные ссылки</h3>
        ${links.map(l=>`<div class="attach-item">
          <span class="icon"></span>
          <div style="flex:1"><div class="name">${esc(l.title)}</div></div>
          <a href="${esc(l.url)}" target="_blank" rel="noopener">Открыть</a>
        </div>`).join("")}
      </div>`:""}

      ${attach.length?`<div class="attachments-block">
        <h3>📎 Прикреплённые файлы</h3>
        ${attach.map(f=>`<div class="attach-item">
          <span class="icon">${UI.fileIcon(f.type)}</span>
          <div style="flex:1">
            <div class="name">${esc(f.name)}</div>
            <div class="size">${UI.fmtSize(f.size)}</div>
          </div>
          <a href="${f.data}" download="${esc(f.name)}">Скачать</a>
        </div>`).join("")}
      </div>`:""}

      <div class="rating-block">
        <button class="rating-btn ${myVote===1?'active':''}" onclick="Article.vote(${a.id},1)">${ic("thumbUp")} Полезно · ${a.likes||0}</button>
        <button class="rating-btn ${myVote===-1?'active':''}" onclick="Article.vote(${a.id},-1)">${ic("thumbDown")} Не очень · ${a.dislikes||0}</button>
      </div>

      ${related.length?`<div class="related-block">
        <h3>📚 Смотри также</h3>
        <div class="related-list">
          ${related.map(r=>`<div class="related-item" data-go="#/a/${r.id}"><span>${esc(r.icon&&!r.icon.startsWith('data:')&&!r.icon.startsWith('http')?r.icon:'')}</span> ${esc(r.term)}</div>`).join("")}
        </div>
      </div>`:""}

      ${similar.length?`<div class="related-block">
        <h3>🔤 Похожие по тегам</h3>
        <div class="related-list">
          ${similar.map(s=>`<div class="related-item" data-go="#/a/${s.id}"><span>#</span> ${esc(s.term)}</div>`).join("")}
        </div>
      </div>`:""}

      <div style="margin-top:28px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" onclick="Article.report(${a.id})">${ic("flag")} Сообщить о неточности</button>
        <button class="btn" onclick="Article.share(${a.id})">${ic("share")} Поделиться</button>
        <button class="btn" onclick="Article.print(${a.id})">${ic("printer")} Печать</button>
        ${canMod?`<button class="btn" onclick="ArticleEditor.open(${a.id})">${ic("pen")} Редактировать</button>`:""}
      </div>`;
  },

  historyTab(a, canMod){
    if(!a.edits.length) return `<p class="empty">Правок пока не было.</p>`;
    return a.edits.slice().reverse().map((e, revIdx)=>{
      const editIdx = a.edits.length-1-revIdx;
      const hasDiff = e.oldBody !== undefined && e.newBody !== undefined && (e.oldBody !== e.newBody);
      return `<div class="comment">
        <div class="comment-head">
          <span class="who" style="cursor:pointer" onclick="goUser('${esc(e.who)}')">${esc(e.who)}</span>
          <span class="when">${e.when}</span>
        </div>
        <p>${esc(e.what)}</p>
        ${hasDiff?`<div class="diff-box">
          ${e.oldBody?`<div class="diff-old">− ${esc(e.oldBody.slice(0,300))}${e.oldBody.length>300?"…":""}</div>`:""}
          ${e.newBody?`<div class="diff-new">+ ${esc(e.newBody.slice(0,300))}${e.newBody.length>300?"…":""}</div>`:""}
        </div>`:""}
        ${canMod&&e.newBody?`<div style="margin-top:8px">
          <button class="btn sm" onclick="Article.rollback(${a.id}, ${editIdx})">↩ Откатить к этой версии</button>
        </div>`:""}
      </div>`;
    }).join("");
  },

  commentsTab(a, logged){
    const renderOne = (c, isReply)=>{
      const author = DB.data.users.find(u=>u.login===c.who);
      return `<div class="comment ${isReply?'reply':''}">
        <div class="comment-head">
          ${UI.avatarHTML(author||{login:c.who},'sm')}
          <span class="who" style="cursor:pointer" onclick="goUser('${esc(c.who)}')">${esc(c.who)}</span>
          ${author?UI.roleBadge(author.role):""}
          <span class="when">${c.when}</span>
        </div>
        <p>${esc(c.text)}</p>
        <div class="actions">
          ${logged?`<button onclick="Article.replyTo('${c.id}')">↩ Ответить</button>`:""}
        </div>
        ${c.replies&&c.replies.length?c.replies.map(r=>renderOne(r,true)).join(""):""}
      </div>`;
    };
    let html = a.comments.length
      ? a.comments.map(c=>renderOne(c,false)).join("")
      : `<p class="empty">Комментариев пока нет.</p>`;
    if(logged){
      html += `<div style="margin-top:16px" id="replyContext"></div>
        <textarea id="newComment" placeholder="Ваш комментарий…"></textarea>
        <div class="row"><button class="btn primary" onclick="Article.addComment(${a.id})">Отправить</button></div>`;
    }else{
      html += `<p class="empty">Войдите, чтобы комментировать.</p>`;
    }
    return html;
  },

  /** Автоссылки на известные термины внутри текста */
  linkify(text, currentId){
    const lower = text.toLowerCase();
    const candidates = [];
    DB.publishedArticles().forEach(x=>{
      if(x.id===currentId || !x.term || x.term.length<4) return;
      const root = x.term.toLowerCase().slice(0,4);
      let idx = 0;
      while(true){
        const found = lower.indexOf(root, idx);
        if(found===-1) break;
        const before = found===0 ? " " : lower[found-1];
        if(!/[a-zа-яё0-9]/i.test(before)){
          let end = found+root.length;
          while(end<lower.length && /[а-яё]/i.test(lower[end])) end++;
          candidates.push({start:found, end, id:x.id});
          idx = end;
        }else{
          idx = found+root.length;
        }
      }
    });
    candidates.sort((x,y)=>x.start-y.start);
    const clean = [];
    let lastEnd = -1;
    candidates.forEach(c=>{ if(c.start>=lastEnd){ clean.push(c); lastEnd=c.end; } });
    let out = "";
    let pos = 0;
    clean.forEach(c=>{
      out += esc(text.slice(pos,c.start));
      const word = text.slice(c.start,c.end);
      out += `<a class="link-term" data-go="#/a/${c.id}">${esc(word)}</a>`;
      pos = c.end;
    });
    out += esc(text.slice(pos));
    return out;
  },

  findSimilar(a){
    const aTags = new Set(a.tags||[]);
    if(!aTags.size) return [];
    return DB.publishedArticles()
      .filter(x=>x.id!==a.id)
      .map(x=>({a:x, score:(x.tags||[]).filter(t=>aTags.has(t)).length}))
      .filter(x=>x.score>0)
      .sort((x,y)=>y.score-x.score)
      .slice(0,4)
      .map(x=>x.a);
  },

  setTab(t, id){
    Article.activeTab = t;
    Article.replyTarget = null;
    App.refresh();
  },

  vote(id, val){
    if(!DB.data.session){ UI.toast("Войдите, чтобы оценивать"); Auth.openLogin(); return; }
    const login = DB.data.session.login;
    DB.data.votes[login] = DB.data.votes[login] || {};
    const prev = DB.data.votes[login][id] || 0;
    const a = DB.article(id);
    if(prev===val){
      if(val===1) a.likes = Math.max(0,(a.likes||0)-1);
      if(val===-1) a.dislikes = Math.max(0,(a.dislikes||0)-1);
      delete DB.data.votes[login][id];
    }else{
      if(prev===1) a.likes = Math.max(0,(a.likes||0)-1);
      if(prev===-1) a.dislikes = Math.max(0,(a.dislikes||0)-1);
      if(val===1) a.likes = (a.likes||0)+1;
      if(val===-1) a.dislikes = (a.dislikes||0)+1;
      DB.data.votes[login][id] = val;
    }
    DB.log("vote",(val===1?"положительно":"отрицательно")+" оценил «"+a.term+"»");
    DB.save();
    App.refresh();
  },

  report(id){
    const a = DB.article(id);
    UI.openModal(`
      <h2>Сообщить о неточности</h2>
      <p style="color:var(--muted);font-size:14px">Статья: <b>${esc(a.term)}</b>. Модератор получит ваше сообщение и проверит текст.</p>
      <label>Что не так?</label>
      <textarea id="issueText" placeholder="Опишите ошибку: неверная дозировка, устаревшая информация, опечатка…"></textarea>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Article.submitIssue(${id})">Отправить</button>
      </div>`);
  },

  submitIssue(id){
    const txt = $("#issueText").value.trim();
    if(!txt){ UI.toast("Опишите суть неточности"); return; }
    const a = DB.article(id);
    const who = DB.data.session ? DB.data.session.login : "аноним";
    a.edits.push({who:who+" → модератору", when:new Date().toISOString().slice(0,10), what:"Жалоба: "+txt});
    DB.data.modQueue.push({
      id:"r"+Date.now(), type:"issue",
      articleId:id, article:a.term, text:txt,
      who:who, when:new Date().toISOString().slice(0,10),
      status:"pending",
    });
    DB.log("issue","жалоба на статью «"+a.term+"»: "+txt.slice(0,120));
    DB.save();
    UI.closeModal();
    App.updateBadges();
    UI.toast("Отправлено модератору!");
  },

  rollback(id, editIdx){
    if(!DB.canModerate()) return;
    const a = DB.article(id);
    const target = a && a.edits[editIdx];
    if(!target || !target.newBody){ UI.toast("Пустая версия"); return; }
    if(!confirm("Откатить статью к версии от "+target.when+"?")) return;
    const old = a.body;
    a.body = target.newBody;
    const when = new Date().toISOString().slice(0,10);
    a.edits.push({who:DB.data.session.login, when, what:"↩ Откат правки", oldBody:old, newBody:target.newBody});
    DB.log("rollback","откатил «"+a.term+"» к версии от "+target.when);
    DB.save();
    App.refresh();
    UI.toast("Откат выполнен");
  },

  replyTo(id){
    Article.replyTarget = id;
    const ctx = $("#replyContext");
    if(ctx) ctx.innerHTML = `<div style="font-size:13px;color:var(--muted);margin-bottom:8px">Ответ на комментарий · <button class="btn ghost" style="font-size:12px;padding:0" onclick="Article.cancelReply()">отмена</button></div>`;
    const ta = $("#newComment");
    if(ta){ ta.focus(); ta.placeholder = "Ваш ответ…"; }
  },

  cancelReply(){
    Article.replyTarget = null;
    const ctx = $("#replyContext");
    if(ctx) ctx.innerHTML = "";
    const ta = $("#newComment");
    if(ta) ta.placeholder = "Ваш комментарий…";
  },

  addComment(id){
    const ta = $("#newComment");
    const txt = ta.value.trim();
    if(!txt) return;
    const a = DB.article(id);
    const login = DB.data.session.login;
    const newC = {id:"c"+Date.now(), who:login, when:new Date().toISOString().slice(0,10), text:txt, replies:[]};
    if(Article.replyTarget){
      let parent = a.comments.find(c=>c.id===Article.replyTarget);
      if(!parent){
        for(const c of a.comments){
          if(c.replies && c.replies.find(x=>x.id===Article.replyTarget)){ parent = c; break; }
        }
      }
      if(parent){ parent.replies = parent.replies||[]; parent.replies.push(newC); }
      else{ a.comments.push(newC); }
    }else{
      a.comments.push(newC);
    }
    Article.replyTarget = null;
    DB.log("comment","прокомментировал «"+a.term+"»");
    DB.save();
    Article.activeTab = "comments";
    App.refresh();
    UI.toast("Комментарий добавлен");
  },

  share(id){
    const a = DB.article(id);
    const url = location.origin==="null" || location.protocol==="file:"
      ? location.href.split("#")[0] + "#/a/" + id
      : location.href;
    if(navigator.share){
      navigator.share({title:a.term, text:a.desc, url}).catch(()=>{});
    }else{
      const copy = ()=>UI.toast("Ссылка скопирована!");
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(a.term+" — "+url).then(copy).catch(()=>prompt("Скопируйте ссылку:", url));
      }else{
        prompt("Скопируйте ссылку:", url);
      }
    }
  },

  print(id){
    const a = DB.article(id);
    const w = window.open("", "_blank");
    if(!w){ UI.toast("Разрешите всплывающие окна для печати"); return; }
    w.document.write(`<html><head><meta charset="UTF-8"><title>${esc(a.term)}</title>
    <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;color:#222;line-height:1.7}
    h1{font-size:32px;margin:0 0 8px}.cat{color:#2c8456;font-size:12px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:24px}
    .tags{margin:12px 0 20px}.tag{display:inline-block;background:#e8f3ec;color:#2c8456;padding:3px 10px;border-radius:999px;font-size:12px;margin-right:4px}
    p{margin:0 0 16px}</style></head><body>
    <h1>${esc(a.term)}</h1>
    <div class="cat">${esc(a.cat)} · буква ${esc(a.letter)}</div>
    ${a.tags.length?`<div class="tags">${a.tags.map(t=>`<span class="tag">#${t}</span>`).join("")}</div>`:""}
    ${a.body.split("\n").filter(p=>p.trim()).map(p=>`<p>${esc(p)}</p>`).join("")}
    <hr><p style="font-size:12px;color:#888">Из ЗооВики</p>
    </body></html>`);
    w.document.close();
    setTimeout(()=>w.print(), 300);
  },
};

/* --- Редактор статьи (модераторы/админы) --- */
const ArticleEditor = {
  sel: null,

  open(id){
    if(!DB.canModerate()) return;
    const a = DB.article(id);
    ArticleEditor.sel = {
      id,
      tags: [...(a.tags||[])],
      related: [...(a.related||[])],
      attachments: [...(a.attachments||[])],
      videos: [...(a.videos||[])],
      links: [...(a.links||[])],
      imgData: null,
    };
    const imgIsUrl = a.icon && (a.icon.startsWith("http")||a.icon.startsWith("data:"));
    const others = DB.publishedArticles().filter(x=>x.id!==id);
    UI.openModal(`
      <h2>Редактировать: ${esc(a.term)}</h2>
      <label>Картинка</label>
      <label class="file-input">Загрузить с устройства
        <input type="file" accept="image/*" onchange="ArticleEditor.preview(event)">
      </label>
      <div id="ePreview" class="file-preview" style="display:${imgIsUrl?'block':'none'}">${imgIsUrl?`<img src="${a.icon}">`:""}</div>
      <label>Или ссылка (URL)</label>
      <input id="e_icon" value="${imgIsUrl&&a.icon.startsWith('http')?esc(a.icon):''}" placeholder="https://…">
      <label>Или эмодзи</label>
      <input id="e_emoji" value="${a.icon&&!imgIsUrl?esc(a.icon):''}" placeholder="">
      <label>Краткое описание</label><textarea id="e_desc">${esc(a.desc)}</textarea>
      <label>Текст статьи</label><textarea id="e_body" style="min-height:140px">${esc(a.body)}</textarea>
      <label>Категория</label>
      <select id="e_cat">${CATS.map(c=>`<option ${c===a.cat?"selected":""}>${c}</option>`).join("")}</select>
      <label>Уровень сложности</label>
      <select id="e_level">${Object.entries(LEVELS).map(([k,v])=>`<option value="${k}" ${(a.level||"all")===k?"selected":""}>${v.label}</option>`).join("")}</select>
      <label>Теги</label>
      <div class="tag-picker" id="e_tags">${ALL_TAGS.map(t=>`<button type="button" class="tag-pick ${ArticleEditor.sel.tags.includes(t)?'selected':''}" onclick="ArticleEditor.toggleTag('${t}')">#${t}</button>`).join("")}</div>
      <label>Связанные статьи</label>
      <div class="tag-picker">${others.map(o=>`<button type="button" class="tag-pick ${ArticleEditor.sel.related.includes(o.id)?'selected':''}" onclick="ArticleEditor.toggleRelated(${o.id})">${esc(o.term)}</button>`).join("")}</div>
      <label>Видео (ссылки YouTube)</label>
      <input id="e_video" placeholder="https://youtube.com/watch?v=...">
      <button class="btn sm" type="button" onclick="ArticleEditor.addVideo()" style="margin-top:6px">${ic("plus")} Добавить видео</button>
      <div id="e_videos" style="margin-top:8px">${ArticleEditor.videoList()}</div>
      <label>Внешние ссылки</label>
      <input id="e_linkTitle" placeholder="Название">
      <input id="e_linkUrl" placeholder="https://…" style="margin-top:6px">
      <button class="btn sm" type="button" onclick="ArticleEditor.addLink()" style="margin-top:6px">${ic("plus")} Добавить ссылку</button>
      <div id="e_links" style="margin-top:8px">${ArticleEditor.linkList()}</div>
      <label>Прикреплённые файлы</label>
      <label class="file-input">Прикрепить файл
        <input type="file" onchange="ArticleEditor.addAttachment(event)">
      </label>
      <div id="e_files">${ArticleEditor.attachList()}</div>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="ArticleEditor.save()">Сохранить</button>
      </div>`, 'wide');
  },

  preview(ev){
    const file = ev.target.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ UI.toast("Картинка больше 2 МБ"); return; }
    const reader = new FileReader();
    reader.onload = e=>{
      ArticleEditor.sel.imgData = e.target.result;
      const box = $("#ePreview");
      box.innerHTML = `<img src="${e.target.result}">`;
      box.style.display = "block";
    };
    reader.readAsDataURL(file);
  },

  toggleTag(t){
    const s = ArticleEditor.sel;
    const i = s.tags.indexOf(t);
    if(i>=0) s.tags.splice(i,1); else s.tags.push(t);
    $("#e_tags").innerHTML = ALL_TAGS.map(x=>`<button type="button" class="tag-pick ${s.tags.includes(x)?'selected':''}" onclick="ArticleEditor.toggleTag('${x}')">#${x}</button>`).join("");
  },

  toggleRelated(id){
    const s = ArticleEditor.sel;
    const i = s.related.indexOf(id);
    if(i>=0) s.related.splice(i,1); else s.related.push(id);
    // перерисуем выбранные состояния через пересоздание модалки — проще: переключаем класс у кнопки
    event.target.classList.toggle("selected", s.related.includes(id));
  },

  videoList(){
    return ArticleEditor.sel.videos.map((v,i)=>`<div class="attach-item">
      <span class="icon"></span>
      <div style="flex:1;font-size:13px;word-break:break-all">${esc(v)}</div>
      <button class="btn danger sm" onclick="ArticleEditor.removeVideo(${i})"></button>
    </div>`).join("");
  },
  addVideo(){
    const url = $("#e_video").value.trim();
    if(!url) return;
    ArticleEditor.sel.videos.push(url);
    $("#e_video").value = "";
    $("#e_videos").innerHTML = ArticleEditor.videoList();
  },
  removeVideo(i){ ArticleEditor.sel.videos.splice(i,1); $("#e_videos").innerHTML = ArticleEditor.videoList(); },

  linkList(){
    return ArticleEditor.sel.links.map((l,i)=>`<div class="attach-item">
      <span class="icon"></span>
      <div style="flex:1"><div class="name">${esc(l.title)}</div><div class="size">${esc(l.url)}</div></div>
      <button class="btn danger sm" onclick="ArticleEditor.removeLink(${i})"></button>
    </div>`).join("");
  },
  addLink(){
    const t = $("#e_linkTitle").value.trim();
    const u = $("#e_linkUrl").value.trim();
    if(!t||!u){ UI.toast("Заполните название и ссылку"); return; }
    ArticleEditor.sel.links.push({title:t,url:u});
    $("#e_linkTitle").value=""; $("#e_linkUrl").value="";
    $("#e_links").innerHTML = ArticleEditor.linkList();
  },
  removeLink(i){ ArticleEditor.sel.links.splice(i,1); $("#e_links").innerHTML = ArticleEditor.linkList(); },

  attachList(){
    if(!ArticleEditor.sel.attachments.length) return `<p style="font-size:12px;color:var(--muted);margin-top:6px">Нет файлов</p>`;
    return ArticleEditor.sel.attachments.map((f,i)=>`<div class="attach-item">
      <span class="icon">${UI.fileIcon(f.type)}</span>
      <div style="flex:1"><div class="name">${esc(f.name)}</div><div class="size">${UI.fmtSize(f.size)}</div></div>
      <button class="btn danger sm" onclick="ArticleEditor.removeAttachment(${i})"></button>
    </div>`).join("");
  },
  addAttachment(ev){
    const file = ev.target.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ if(!confirm("Файл "+UI.fmtSize(file.size)+" — больше 2 МБ. Продолжить?")) return; }
    const reader = new FileReader();
    reader.onload = e=>{
      ArticleEditor.sel.attachments.push({name:file.name,size:file.size,type:file.type,data:e.target.result});
      $("#e_files").innerHTML = ArticleEditor.attachList();
    };
    reader.readAsDataURL(file);
  },
  removeAttachment(i){ ArticleEditor.sel.attachments.splice(i,1); $("#e_files").innerHTML = ArticleEditor.attachList(); },

  save(){
    const s = ArticleEditor.sel;
    const a = DB.article(s.id);
    const d = $("#e_desc").value.trim();
    const b = $("#e_body").value.trim();
    const c = $("#e_cat").value;
    const iconUrl = $("#e_icon").value.trim();
    const emoji = $("#e_emoji").value.trim();
    if(!d || !b){ UI.toast("Описание и текст не должны быть пустыми"); return; }
    const oldBody = a.body;
    a.edits.push({who:DB.data.session.login, when:new Date().toISOString().slice(0,10), what:"Изменены поля ("+a.cat+"→"+c+")", oldBody:oldBody, newBody:b});
    a.desc = d;
    a.body = b;
    a.cat = c;
    a.level = $("#e_level").value;
    a.icon = s.imgData || iconUrl || emoji || a.icon;
    a.tags = [...s.tags];
    a.related = [...s.related];
    a.attachments = [...s.attachments];
    a.videos = [...s.videos];
    a.links = [...s.links];
    DB.log("edit","отредактировал «"+a.term+"»");
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Статья сохранена");
  },
};

window.Article = Article;
window.ArticleEditor = ArticleEditor;
