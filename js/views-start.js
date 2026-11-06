/* ============ ЗооВики — раздел «Новичкам» ============ */

const Start = {
  view(){
    const newbieArticles = DB.publishedArticles().filter(a=>a.level==="newbie" || a.level==="all").slice(0,6);
    return `
    <div class="start-page view">
      <button class="back" data-go="#/">${ic("arrowLeft")} На главную</button>
      <h1>🌱 Новичкам</h1>
      <p class="subtitle">С чего начать волонтёру, частые вопросы и первые статьи для чтения.</p>

      <div class="section-title">Как стать волонтёром</div>
      <div class="onboard">
        ${ONBOARD_STEPS.map(s=>`
          <div class="onboard-card">
            <div class="n">${s.n}</div>
            <h4>${esc(s.title)}</h4>
            <p>${esc(s.text)}</p>
          </div>`).join("")}
      </div>

      <div class="section-title">Первые статьи для чтения</div>
      ${newbieArticles.length?newbieArticles.map(a=>`
        <div class="mod-item" style="cursor:pointer" data-go="#/a/${a.id}">
          <b>${esc(a.term)}</b> <span class="badge">${esc(a.cat)}</span>
          ${a.level!=="all"?`<span class="badge level">${LEVELS[a.level].label}</span>`:""}
          <p style="margin:4px 0 0;font-size:13px;color:var(--muted)">${esc(a.desc.slice(0,110))}${a.desc.length>110?"…":""}</p>
        </div>`).join(""):`<p class="empty">Статей пока нет.</p>`}

      <div class="section-title">Инструменты, которые пригодятся сразу</div>
      <div class="chips" style="margin-top:0">
        <div class="chip" data-go="#/checklists">📋 Чек-листы</div>
        <div class="chip" data-go="#/sos">🆘 Экстренная помощь</div>
        <div class="chip" data-go="#/calc">💊 Калькулятор доз</div>
        <div class="chip" data-go="#/shelters">🗺️ Карта приютов</div>
        ${DB.sectionOn("pets")?`<div class="chip" data-go="#/pets">🐾 Питомцы</div>`:""}
        <div class="chip" data-go="#/duty">📅 Дежурства</div>
      </div>

      <div class="section-title">Частые вопросы</div>
      ${FAQ_ITEMS.map((f,i)=>`
        <details class="faq-item">
          <summary>${esc(f.q)}<span class="chev">›</span></summary>
          <div class="a">${esc(f.a)}</div>
        </details>`).join("")}
    </div>`;
  },
};

window.Start = Start;
