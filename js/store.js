/* ============ ЗооВики — состояние, хранение, расширенный лог ============ */

const DB_KEY = "zooviki_v1";
const DB_VERSION = 4;
const LOG_LIMIT = 1000;

function normalizeArticle(a){
  return {
    ...a,
    tags: Array.isArray(a.tags) ? a.tags : [],
    related: Array.isArray(a.related) ? a.related : [],
    attachments: Array.isArray(a.attachments) ? a.attachments : [],
    videos: Array.isArray(a.videos) ? a.videos : [],
    links: Array.isArray(a.links) ? a.links : [],
    views: typeof a.views === "number" ? a.views : 0,
    likes: typeof a.likes === "number" ? a.likes : 0,
    dislikes: typeof a.dislikes === "number" ? a.dislikes : 0,
    edits: Array.isArray(a.edits) ? a.edits : [],
    comments: Array.isArray(a.comments) ? a.comments.map(c=>({...c,replies:Array.isArray(c.replies)?c.replies:[]})) : [],
    pending: a.pending === true,
    level: ["newbie","pro","all"].includes(a.level) ? a.level : "all",
  };
}

function normalizeUser(u){
  return {
    login:String(u.login||""),
    pass:String(u.pass||""),
    role:["user","moderator","admin"].includes(u.role) ? u.role : "user",
    avatar:u.avatar||"",
    registered:u.registered||"",
    bio:u.bio||"",
    banned:u.banned===true,
    bannedReason:u.bannedReason||"",
  };
}

function normalizePet(p){
  return {
    id: p.id || "p"+Date.now(),
    name: String(p.name||"Без имени"),
    shelterId: p.shelterId || "",
    species: ["собака","кошка","другое"].includes(p.species) ? p.species : "собака",
    gender: ["мальчик","девочка","неизвестно"].includes(p.gender) ? p.gender : "неизвестно",
    age: String(p.age||""),
    size: ["мелкий","средний","крупный","неизвестно"].includes(p.size) ? p.size : "неизвестно",
    status: ["search","reserve","adopted"].includes(p.status) ? p.status : "search",
    sterilized: p.sterilized===true,
    desc: String(p.desc||""),
    photo: p.photo || "",
    tags: Array.isArray(p.tags) ? p.tags : [],
    who: p.who || "",
    when: p.when || "",
  };
}

function normalizeShift(s){
  return {
    id: s.id || "d"+Date.now(),
    shelterId: s.shelterId || "",
    date: String(s.date||""),
    time: String(s.time||""),
    task: String(s.task||"Выгул собак"),
    who: Array.isArray(s.who) ? s.who : [],
    max: typeof s.max==="number" ? s.max : 2,
    note: String(s.note||""),
  };
}

function normalizeHelp(h){
  return {
    id: h.id || "h"+Date.now(),
    title: String(h.title||""),
    type: ["перевозка","передержка","корм","лекарства","другое"].includes(h.type) ? h.type : "другое",
    desc: String(h.desc||""),
    who: h.who || "",
    when: h.when || "",
    status: h.status==="done" ? "done" : "open",
  };
}

function normalizeTopic(t){
  return {
    id: t.id || "t"+Date.now(),
    title: String(t.title||""),
    cat: FORUM_CATS.includes(t.cat) ? t.cat : FORUM_CATS[0],
    author: t.author || "",
    created: t.created || "",
    posts: Array.isArray(t.posts) ? t.posts.map(p=>({
      id:p.id||"m"+Date.now(), who:String(p.who||""), when:String(p.when||""), text:String(p.text||""),
    })) : [],
  };
}

function normalizeNews(n){
  return {
    id: n.id || "n"+Date.now(),
    title: String(n.title||""),
    text: String(n.text||""),
    who: n.who || "",
    when: n.when || "",
    pinned: n.pinned===true,
    photo: (n.photo && (n.photo.startsWith("data:")||n.photo.startsWith("http"))) ? n.photo : "",
  };
}

function defaultState(){
  return {
    version: DB_VERSION,
    articles: seedArticles.map(normalizeArticle),
    shelters: JSON.parse(JSON.stringify(seedShelters)),
    users: seedUsers.map(normalizeUser),
    pets: seedPets.map(normalizePet),
    shifts: seedShifts.map(normalizeShift),
    help: seedHelp.map(normalizeHelp),
    forum: seedForum.map(normalizeTopic),
    news: seedNews.map(normalizeNews),
    flags: {pets:false},   // выключенные разделы (архив)
    session: null,
    favs: [],
    folders: [],
    modQueue: [],
    votes: {},
    activity: [],
    checklistState: {},
    viewed: [],
    theme: "light",
    scheme: "green",
  };
}

const DB = {
  data: defaultState(),

  load(){
    let raw = null;
    try{
      const v = localStorage.getItem(DB_KEY);
      if(v) raw = JSON.parse(v);
    }catch(e){ console.warn("ЗооВики: не удалось прочитать хранилище", e); }
    const fresh = defaultState();
    // слияние: новые поля из fresh, старые данные пользователя сохраняются
    this.data = raw ? {...fresh, ...raw, version: DB_VERSION} : fresh;
    // нормализация на случай частично устаревших данных
    this.data.articles = (this.data.articles||[]).map(normalizeArticle);
    this.data.users = (this.data.users||[]).map(normalizeUser);
    this.data.pets = (this.data.pets||[]).map(normalizePet);
    this.data.shifts = (this.data.shifts||[]).map(normalizeShift);
    this.data.help = (this.data.help||[]).map(normalizeHelp);
    this.data.forum = (this.data.forum||[]).map(normalizeTopic);
    this.data.news = (this.data.news||[]).map(normalizeNews);
    this.data.flags = (this.data.flags && typeof this.data.flags==="object") ? this.data.flags : {pets:false};
    this.data.folders = (this.data.folders||[]).map(f=>({id:f.id, name:f.name, articleIds:Array.isArray(f.articleIds)?f.articleIds:[]}));
    this.data.activity = Array.isArray(this.data.activity) ? this.data.activity : [];
    this.data.shelters = Array.isArray(this.data.shelters) && this.data.shelters.length ? this.data.shelters : fresh.shelters;
    if(this.data.session && !this.data.users.some(u=>u.login===this.data.session.login)){
      this.data.session = null;
    }
    this.save();
  },

  save(){
    try{
      localStorage.setItem(DB_KEY, JSON.stringify(this.data));
    }catch(e){
      console.warn("ЗооВики: не удалось сохранить", e);
      if(typeof UI!=="undefined") UI.toast("⚠️ Не удалось сохранить данные (хранилище переполнено?)");
    }
  },

  /** Расширенный лог действия */
  log(type, detail){
    const user = this.data.session ? this.data.session.login : "аноним";
    this.data.activity.push({ ts:new Date().toISOString(), type, user, detail:detail||"" });
    if(this.data.activity.length > LOG_LIMIT){
      this.data.activity = this.data.activity.slice(-LOG_LIMIT);
    }
    this.save();
  },

  // --- Пользователи ---
  currentUser(){
    if(!this.data.session) return null;
    return this.data.users.find(u=>u.login===this.data.session.login) || null;
  },
  canModerate(){
    const u = this.currentUser();
    return !!u && !u.banned && (u.role==="moderator" || u.role==="admin");
  },
  isAdmin(){
    const u = this.currentUser();
    return !!u && !u.banned && u.role==="admin";
  },

  // --- Статьи ---
  article(id){ return this.data.articles.find(a=>a.id===id); },
  publishedArticles(){ return this.data.articles.filter(a=>!a.pending); },
  nextArticleId(){ return this.data.articles.reduce((m,a)=>Math.max(m,a.id||0),0)+1; },

  // --- Прочие коллекции ---
  pet(id){ return this.data.pets.find(p=>p.id===id); },
  shelter(id){ return this.data.shelters.find(s=>s.id===id); },
  topic(id){ return this.data.forum.find(t=>t.id===id); },
  sectionOn(key){ return !!(this.data.flags && this.data.flags[key]); },
  topicLastTs(t){
    const last = t.posts.length ? t.posts[t.posts.length-1].when : t.created;
    return last;
  },

  // --- Закладки-папки ---
  folder(id){ return this.data.folders.find(f=>f.id===id); },
  isBookmarked(articleId){ return this.data.folders.some(f=>f.articleIds.includes(articleId)); },

  countComments(a){
    let n = 0;
    (a.comments||[]).forEach(c=>{ n += 1 + (c.replies ? c.replies.length : 0); });
    return n;
  },

  storageSize(){
    try{ return new Blob([localStorage.getItem(DB_KEY)||""]).size; }catch(e){ return 0; }
  },

  exportData(){
    return { ...this.data, exportedAt:new Date().toISOString(), app:"ЗооВики" };
  },

  importData(data){
    if(!data || typeof data!=="object") throw new Error("пустой файл");
    const fresh = defaultState();
    const merged = {...fresh, ...data, version: DB_VERSION};
    merged.articles = (merged.articles||[]).map(normalizeArticle);
    merged.users = (merged.users||[]).map(normalizeUser);
    merged.pets = (merged.pets||[]).map(normalizePet);
    merged.shifts = (merged.shifts||[]).map(normalizeShift);
    merged.help = (merged.help||[]).map(normalizeHelp);
    merged.forum = (merged.forum||[]).map(normalizeTopic);
    merged.news = (merged.news||[]).map(normalizeNews);
    merged.folders = (merged.folders||[]).map(f=>({id:f.id,name:f.name,articleIds:Array.isArray(f.articleIds)?f.articleIds:[]}));
    merged.activity = Array.isArray(merged.activity) ? merged.activity : [];
    this.data = merged;
    this.save();
  },
};

DB.load();
