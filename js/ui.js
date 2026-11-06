/* ============ ЗооВики — UI-хелперы: модалки, тосты, утилиты ============ */

const $ = s => document.querySelector(s);
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const UI = {
  openModal(html, size){
    const box = $("#modalBox");
    box.className = "modal-box" + (size==="wide" ? " wide" : "");
    box.innerHTML = html;
    $("#modal").classList.remove("hidden");
  },
  closeModal(){ $("#modal").classList.add("hidden"); },

  toast(msg, ms){
    const root = $("#toastRoot");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(()=>{
      el.classList.add("out");
      setTimeout(()=>el.remove(), 350);
    }, ms || 2200);
  },

  avatarHTML(user, size){
    const cls = size==="lg" ? "avatar lg" : size==="sm" ? "avatar sm" : "avatar";
    if(!user) return `<div class="${cls}">👤</div>`;
    if(user.avatar && (user.avatar.startsWith("data:") || user.avatar.startsWith("http"))){
      return `<div class="${cls}"><img src="${user.avatar}" alt=""></div>`;
    }
    const initial = (user.login||"?").charAt(0).toUpperCase();
    return `<div class="${cls}">${esc(initial)}</div>`;
  },

  roleBadge(role){
    return role==="admin" ? '<span class="badge admin">admin</span>'
      : role==="moderator" ? '<span class="badge mod">модератор</span>'
      : '<span class="badge">пользователь</span>';
  },

  bannedBadge(){
    return '<span class="badge banned">забанен</span>';
  },

  fmtSize(bytes){
    if(bytes < 1024) return bytes+" Б";
    if(bytes < 1024*1024) return (bytes/1024).toFixed(1)+" КБ";
    return (bytes/1024/1024).toFixed(2)+" МБ";
  },

  fileIcon(type){
    if(!type) return "📄";
    if(type.startsWith("image/")) return "🖼️";
    if(type === "application/pdf") return "📕";
    if(type.includes("word")||type.includes("document")) return "📘";
    if(type.includes("text")) return "📝";
    if(type.includes("zip")||type.includes("archive")) return "🗜️";
    return "📄";
  },

  youtubeEmbed(url){
    let id = "";
    const m1 = url.match(/[?&]v=([^&]+)/);
    const m2 = url.match(/youtu\.be\/([^?]+)/);
    const m3 = url.match(/youtube\.com\/(?:embed|shorts)\/([^?]+)/);
    if(m1) id = m1[1];
    else if(m2) id = m2[1];
    else if(m3) id = m3[1];
    return "https://www.youtube.com/embed/"+id;
  },

  highlight(text, q){
    const i = text.toLowerCase().indexOf(q);
    if(i<0) return esc(text);
    return esc(text.slice(0,i)) + `<mark>${esc(text.slice(i,i+q.length))}</mark>` + esc(text.slice(i+q.length));
  },

  /** Картинка/эмодзи статьи (для карточек и шапки) */
  articleMedia(a, cls){
    if(a.icon && (a.icon.startsWith("http") || a.icon.startsWith("data:"))){
      return `<div class="${cls}"><img src="${a.icon}" alt="${esc(a.term)}" loading="lazy"></div>`;
    }
    return `<div class="${cls}">${esc(a.icon||"📖")}</div>`;
  },

  logTypeLabel(type){
    return LOG_TYPES[type] || type;
  },
};

window.openModal = (h,s)=>UI.openModal(h,s);
window.closeModal = ()=>UI.closeModal();
window.toast = (m,ms)=>UI.toast(m,ms);

$("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") UI.closeModal(); });
document.addEventListener("keydown", e=>{
  if(e.key==="Escape" && !$("#modal").classList.contains("hidden")) UI.closeModal();
});


/* ============ SVG-иконки в стиле Lucide (чёткие, stroke 2) ============ */
const Icons = (()=>{
  const s = (inner)=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  return {
    paw:      s(`<circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.8" r="2"/><circle cx="14.5" cy="5.8" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 11.5c-3 0-5.5 2.2-5.5 4.9 0 1.8 1.4 3.1 3 3.1 1 0 1.7-.5 2.5-.5s1.5.5 2.5.5c1.6 0 3-1.3 3-3.1 0-2.7-2.5-4.9-5.5-4.9Z"/>`),
    capsule:  s(`<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>`),
    pulse:    s(`<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`),
    list:     s(`<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>`),
    pin:      s(`<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`),
    calendar: s(`<rect width="18" height="17" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>`),
    chat:     s(`<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>`),
    star:     s(`<path d="M12 2.5l2.9 5.9 6.5 1-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-1Z"/>`),
    bookmark: s(`<path d="M19 21l-7-4.5L5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>`),
    shield:   s(`<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/>`),
    crown:    s(`<path d="M3 7l4.7 3.4a1 1 0 0 0 1.5-.4L12 4l2.8 6a1 1 0 0 0 1.5.4L21 7l-1.8 10.2a1 1 0 0 1-1 .8H5.8a1 1 0 0 1-1-.8z"/>`),
    moon:     s(`<path d="M12 3a6.4 6.4 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`),
    sun:      s(`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`),
    folder:   s(`<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>`),
    pen:      s(`<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>`),
    plus:     s(`<path d="M5 12h14M12 5v14"/>`),
    trash:    s(`<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>`),
    arrowLeft:s(`<path d="M19 12H5M12 19l-7-7 7-7"/>`),
    check:    s(`<path d="M20 6 9 17l-5-5"/>`),
    eye:      s(`<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`),
    heart:    s(`<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>`),
    msg:      s(`<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`),
    logout:   s(`<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>`),
    user:     s(`<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`),
    search:   s(`<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`),
    flag:     s(`<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>`),
    share:    s(`<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>`),
    printer:  s(`<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>`),
    thumbUp:  s(`<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>`),
    thumbDown:s(`<path d="M17 14V2M9 20.12 10 16H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>`),
    clip:     s(`<path d="m21.4 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>`),
  };
})();
window.ic = n => Icons[n] || "";

/* --- Раскладка клавиатуры: варианты запроса en<->ru --- */
const LAYOUT_MAP = (()=>{
  const en = "qwertyuiop[]asdfghjkl;'zxcvbnm,./`";
  const ru = "йцукенгшщзхъфывапролджэячсмитьбю.ё";
  const en2ru = {}, ru2en = {};
  for(let i=0;i<en.length;i++){ en2ru[en[i]] = ru[i]; ru2en[ru[i]] = en[i]; }
  return {en2ru, ru2en};
})();
function switchLayout(q, map){
  let out = "";
  for(const ch of q.toLowerCase()){
    out += map[ch] || ch;
  }
  return out;
}
/** Возвращает варианты запроса: как набрано + в другой раскладке */
function searchVariants(q){
  const variants = [q];
  if(/[a-z]/.test(q)){
    const ru = switchLayout(q, LAYOUT_MAP.en2ru);
    if(ru !== q) variants.push(ru);
  }
  if(/[а-яё]/.test(q)){
    const en = switchLayout(q, LAYOUT_MAP.ru2en);
    if(en !== q) variants.push(en);
  }
  return variants;
}
window.searchVariants = searchVariants;
