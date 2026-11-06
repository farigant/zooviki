/* ============ ЗооВики — форум (классическая структура) ============ */

const Forum = {
  fCat: "",

  /** Сколько сообщений пользователь оставил на форуме */
  userPosts(login){
    let n = 0;
    DB.data.forum.forEach(t=>t.posts.forEach(p=>{ if(p.who===login) n++; }));
    return n;
  },

  view(){
    const logged = !!DB.data.session;
    const cats = Forum.fCat ? [Forum.fCat] : FORUM_CATS;
    const sections = cats.map(cat=>{
      const topics = DB.data.forum
        .filter(t=>t.cat===cat)
        .sort((a,b)=>DB.topicLastTs(b).localeCompare(DB.topicLastTs(a)));
      return {cat, topics};
    }).filter(s=>s.topics.length || Forum.fCat);

    return `
    <div class="forum-page view">
      <button class="back" data-go="#/">${ic("arrowLeft")} На главную</button>
      <h1>💬 Форум волонтёров</h1>
      <p class="subtitle">Общение волонтёров: вопросы, опыт, новости приютов. Темы с новыми ответами поднимаются выше.</p>
      <div class="filter-row">
        <select onchange="Forum.setCat(this.value)">
          <option value="">Все разделы</option>
          ${FORUM_CATS.map(c=>`<option ${Forum.fCat===c?"selected":""}>${c}</option>`).join("")}
        </select>
        <span style="flex:1"></span>
        ${logged?`<button class="btn primary" onclick="Forum.openNew()">➕ Новая тема</button>`:""}
      </div>
      ${sections.length?sections.map(s=>`
        <div class="forum-cat">${esc(s.cat)}</div>
        <div class="forum-list">
          ${s.topics.map(t=>{
            const last = t.posts.length ? t.posts[t.posts.length-1] : null;
            const lastUser = last ? DB.data.users.find(u=>u.login===last.who) : null;
            const author = DB.data.users.find(u=>u.login===t.author);
            return `
            <div class="forum-row" data-go="#/topic/${t.id}">
              <div class="fr-main">
                <div class="fr-title">${esc(t.title)}</div>
                <div class="fr-meta">автор: <b style="cursor:pointer" onclick="event.stopPropagation();goUser('${esc(t.author)}')">${esc(t.author)}</b> · ${t.created}</div>
              </div>
              <div class="fr-count">${t.posts.length}<span>сообщ.</span></div>
              <div class="fr-last">
                ${last?`
                  ${UI.avatarHTML(lastUser||{login:last.who},'sm')}
                  <div><b style="cursor:pointer" onclick="event.stopPropagation();goUser('${esc(last.who)}')">${esc(last.who)}</b><br><span style="color:var(--muted)">${last.when}</span></div>
                `:`<span style="color:var(--muted)">нет ответов</span>`}
              </div>
            </div>`;
          }).join("")}
        </div>`).join(""):`<p class="empty">Тем пока нет${Forum.fCat?" в этом разделе":""}.</p>`}
      ${!logged?`<p class="empty">Войдите, чтобы создавать темы и отвечать.</p>`:""}
    </div>`;
  },

  setCat(c){ Forum.fCat = c; App.refresh(); },

  openNew(){
    if(!DB.data.session){ UI.toast("Войдите, чтобы создать тему"); Auth.openLogin(); return; }
    UI.openModal(`
      <h2>Новая тема</h2>
      <label>Раздел</label>
      <select id="ft_cat">${FORUM_CATS.map(c=>`<option>${c}</option>`).join("")}</select>
      <label>Заголовок *</label>
      <input id="ft_title" placeholder="Коротко о чём тема">
      <label>Первое сообщение</label>
      <textarea id="ft_text" placeholder="Расскажите подробнее…"></textarea>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Forum.saveTopic()">Создать тему</button>
      </div>`);
  },

  saveTopic(){
    const title = $("#ft_title").value.trim();
    const text = $("#ft_text").value.trim();
    if(!title || !text){ UI.toast("Заполните заголовок и сообщение"); return; }
    const t = normalizeTopic({
      id:"t"+Date.now(),
      title,
      cat: $("#ft_cat").value,
      author: DB.data.session.login,
      created: new Date().toISOString().slice(0,10),
      posts:[{id:"m"+Date.now(), who:DB.data.session.login, when:new Date().toISOString().slice(0,10), text}],
    });
    DB.data.forum.push(t);
    DB.log("forum","создал тему «"+title+"»");
    DB.save();
    UI.closeModal();
    location.hash = "#/topic/"+t.id;
  },

  topicView(id){
    const t = DB.topic(id);
    if(!t) return `<div class="forum-page view"><button class="back" data-go="#/forum">${ic("arrowLeft")} К форуму</button><p class="empty">Тема не найдена.</p></div>`;
    const logged = !!DB.data.session;
    const canMod = DB.canModerate();

    const renderPost = (p, idx)=>{
      const author = DB.data.users.find(u=>u.login===p.who);
      return `
      <div class="post-row">
        <div class="pr-author">
          ${UI.avatarHTML(author||{login:p.who},'lg')}
          <b class="pr-name" onclick="goUser('${esc(p.who)}')">${esc(p.who)}</b>
          ${author?UI.roleBadge(author.role):""}
          <div class="pr-stats">
            Сообщений: <b>${Forum.userPosts(p.who)}</b><br>
            ${author?("На сайте с: "+esc(author.registered||"—")):""}
          </div>
        </div>
        <div class="pr-body">
          <div class="pr-head">
            <span>#${idx+1} · ${p.when}${idx===0?" · автор темы":""}</span>
            ${(canMod || (logged && p.who===DB.data.session.login)) && idx>0
              ? `<button class="btn ghost" style="font-size:12px;padding:2px 6px" onclick="Forum.removePost('${t.id}','${p.id}')">${ic("trash")}</button>`:""}
          </div>
          <div class="pr-text">${esc(p.text)}</div>
        </div>
      </div>`;
    };

    return `
    <div class="forum-page view" style="max-width:920px">
      <button class="back" data-go="#/forum">${ic("arrowLeft")} К форуму</button>
      <div class="forum-crumbs">
        <a data-go="#/forum">Форум</a> <span>→</span> <b>${esc(t.cat)}</b>
      </div>
      <h1 style="font-size:28px">${esc(t.title)}</h1>
      <p class="subtitle">создана ${esc(t.author)}, ${t.created} · ${t.posts.length} сообщ.</p>
      ${t.posts.map((p,i)=>renderPost(p,i)).join("")}
      ${logged?`
        <div class="section-title">Ваш ответ</div>
        <textarea id="fp_text" placeholder="Напишите ответ…"></textarea>
        <div class="row" style="justify-content:flex-start">
          <button class="btn primary" onclick="Forum.reply('${t.id}')">Отправить</button>
        </div>`:`<p class="empty">Войдите, чтобы отвечать.</p>`}
      ${(canMod || (logged && t.author===DB.data.session.login))?`
        <p style="margin-top:24px"><button class="btn danger" onclick="Forum.removeTopic('${t.id}')">Удалить тему</button></p>`:""}
    </div>`;
  },

  reply(id){
    const t = DB.topic(id);
    const text = $("#fp_text").value.trim();
    if(!t || !text) return;
    t.posts.push({id:"m"+Date.now(), who:DB.data.session.login, when:new Date().toISOString().slice(0,10), text});
    DB.log("forum","ответил в теме «"+t.title+"»");
    DB.save();
    App.refresh();
    UI.toast("Ответ добавлен");
  },

  removePost(tid, pid){
    const t = DB.topic(tid);
    if(!t) return;
    if(!confirm("Удалить сообщение?")) return;
    t.posts = t.posts.filter(x=>x.id!==pid);
    DB.log("forum","удалил сообщение в теме «"+t.title+"»");
    DB.save();
    App.refresh();
    UI.toast("Сообщение удалено");
  },

  removeTopic(id){
    const t = DB.topic(id);
    if(!t) return;
    if(!confirm("Удалить тему целиком?")) return;
    DB.data.forum = DB.data.forum.filter(x=>x.id!==id);
    DB.log("forum","удалил тему «"+t.title+"»");
    DB.save();
    location.hash = "#/forum";
    UI.toast("Тема удалена");
  },
};

window.Forum = Forum;
