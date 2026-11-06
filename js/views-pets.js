/* ============ ЗооВики — база питомцев приютов ============ */

const Pets = {
  fShelter: "", fSpecies: "", fStatus: "", fSize: "",

  /** Страница-заглушка для архивного раздела */
  disabledView(){
    const isAdmin = DB.isAdmin();
    return `
    <div class="pets-page view">
      <button class="back" data-go="#/">${ic("arrowLeft")} На главную</button>
      <h1>Питомцы</h1>
      <p class="subtitle">Раздел временно отключен администрацией. Все карточки животных сохранены и будут доступны при повторном включении.</p>
      ${isAdmin?`<div class="mod-section" style="max-width:520px">
        <h3>Включить раздел</h3>
        <p style="font-size:13px;color:var(--muted);margin:0 0 10px">Раздел в архиве: страница скрыта из меню, данные не удалены.</p>
        <button class="btn primary" onclick="Admin.toggleSection('pets')">Включить раздел «Питомцы»</button>
      </div>`:""}
    </div>`;
  },

  view(){
    const list = DB.data.pets.filter(p=>
      (!Pets.fShelter || p.shelterId===Pets.fShelter) &&
      (!Pets.fSpecies || p.species===Pets.fSpecies) &&
      (!Pets.fStatus || p.status===Pets.fStatus) &&
      (!Pets.fSize || p.size===Pets.fSize)
    );
    const logged = !!DB.data.session;
    const shelters = DB.data.shelters;

    return `
    <div class="pets-page view">
      <button class="back" data-go="#/">${ic("arrowLeft")} На главную</button>
      <h1>Питомцы приютов</h1>
      <p class="subtitle">Животные, которым нужен дом или помощь. Карточки ведут волонтёры приютов.</p>
      <div class="filter-row">
        <select onchange="Pets.setF('fShelter',this.value)">
          <option value="">Все приюты</option>
          ${shelters.map(s=>`<option value="${s.id}" ${Pets.fShelter===s.id?"selected":""}>${esc(s.name)}</option>`).join("")}
        </select>
        <select onchange="Pets.setF('fSpecies',this.value)">
          <option value="">Все виды</option>
          <option value="собака" ${Pets.fSpecies==="собака"?"selected":""}>Собаки</option>
          <option value="кошка" ${Pets.fSpecies==="кошка"?"selected":""}>Кошки</option>
          <option value="другое" ${Pets.fSpecies==="другое"?"selected":""}>Другие</option>
        </select>
        <select onchange="Pets.setF('fStatus',this.value)">
          <option value="">Любой статус</option>
          <option value="search" ${Pets.fStatus==="search"?"selected":""}>Ищут дом</option>
          <option value="reserve" ${Pets.fStatus==="reserve"?"selected":""}>Резерв</option>
          <option value="adopted" ${Pets.fStatus==="adopted"?"selected":""}>Пристроены</option>
        </select>
        <select onchange="Pets.setF('fSize',this.value)">
          <option value="">Любой размер</option>
          <option value="мелкий" ${Pets.fSize==="мелкий"?"selected":""}>Мелкие</option>
          <option value="средний" ${Pets.fSize==="средний"?"selected":""}>Средние</option>
          <option value="крупный" ${Pets.fSize==="крупный"?"selected":""}>Крупные</option>
        </select>
        <span style="flex:1"></span>
        ${logged?`<button class="btn primary" onclick="Pets.openEdit()">➕ Добавить питомца</button>`:""}
      </div>
      ${list.length?`<div class="pet-grid">${list.map(Pets.card).join("")}</div>`:`<p class="empty">Питомцев не найдено.</p>`}
    </div>`;
  },

  setF(k, v){ Pets[k] = v; App.refresh(); },

  card(p){
    const sh = DB.shelter(p.shelterId);
    const st = PET_STATUSES[p.status];
    const photo = (p.photo && (p.photo.startsWith("data:")||p.photo.startsWith("http")))
      ? `<img src="${p.photo}" alt="${esc(p.name)}" loading="lazy">`
      : (p.species==="кошка" ? "🐈" : p.species==="собака" ? "🐕" : "🐾");
    return `
    <div class="pet-card" onclick="Pets.detail('${p.id}')">
      <div class="ph">${photo}</div>
      <div class="body">
        <div class="name"><span>${esc(p.name)}</span><span class="status-badge ${st.cls||p.status} ${p.status}">${st.label}</span></div>
        <div class="info">${esc(p.species)}, ${esc(p.gender)}${p.age?`, ${esc(p.age)}`:""}${p.size&&p.size!=="неизвестно"?`, ${esc(p.size)}`:""}</div>
        ${p.desc?`<div class="desc">${esc(p.desc.slice(0,90))}${p.desc.length>90?"…":""}</div>`:""}
        <div class="info" style="margin-top:8px">${sh?esc(sh.name):""}</div>
      </div>
    </div>`;
  },

  detail(id){
    const p = DB.pet(id);
    if(!p) return;
    const sh = DB.shelter(p.shelterId);
    const st = PET_STATUSES[p.status];
    const canEdit = DB.canModerate() || (DB.data.session && DB.data.session.login===p.who);
    const photo = (p.photo && (p.photo.startsWith("data:")||p.photo.startsWith("http")))
      ? `<div class="file-preview" style="max-width:100%;margin:0 0 14px"><img src="${p.photo}"></div>`
      : "";
    UI.openModal(`
      <h2 style="display:flex;justify-content:space-between;align-items:center;gap:10px">${esc(p.name)}
        <span class="status-badge ${p.status}">${st.label}</span></h2>
      ${photo}
      <p style="margin:0 0 6px;font-size:14px"><b>${esc(p.species)}</b>, ${esc(p.gender)}${p.age?`, возраст: ${esc(p.age)}`:""}${p.size&&p.size!=="неизвестно"?`, размер: ${esc(p.size)}`:""}</p>
      <p style="margin:0 0 6px;font-size:14px">Стерилизован(а): <b>${p.sterilized?"да":"нет/неизвестно"}</b></p>
      ${sh?`<p style="margin:0 0 6px;font-size:14px">Приют: <b>${esc(sh.name)}</b>, ${esc(sh.city)}</p>`:""}
      ${p.desc?`<p style="margin:12px 0 0;font-size:14px;line-height:1.65">${esc(p.desc)}</p>`:""}
      ${p.tags&&p.tags.length?`<div class="tags" style="margin-top:12px">${p.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join("")}</div>`:""}
      <p style="margin:14px 0 0;font-size:12px;color:var(--muted)">Карточку добавил(а): ${esc(p.who)} · ${p.when}</p>
      <div class="row">
        ${canEdit?`<button class="btn danger" onclick="Pets.remove('${p.id}')">Удалить</button>
        <button class="btn" onclick="Pets.openEdit('${p.id}')">Редактировать</button>`:""}
        <button class="btn primary" onclick="closeModal()">Закрыть</button>
      </div>`);
  },

  _img: null,

  openEdit(id){
    if(!DB.data.session){ UI.toast("Войдите, чтобы добавлять питомцев"); Auth.openLogin(); return; }
    const p = id ? DB.pet(id) : {name:"",shelterId:DB.data.shelters[0]?DB.data.shelters[0].id:"",species:"собака",gender:"неизвестно",age:"",size:"неизвестно",status:"search",sterilized:false,desc:"",photo:"",tags:[]};
    Pets._img = null;
    const hasPhoto = p.photo && (p.photo.startsWith("data:")||p.photo.startsWith("http"));
    UI.openModal(`
      <h2>${id?"Редактировать":"Добавить"} питомца</h2>
      <label>Кличка *</label><input id="pt_name" value="${esc(p.name)}">
      <label>Приют</label>
      <select id="pt_shelter">${DB.data.shelters.map(s=>`<option value="${s.id}" ${p.shelterId===s.id?"selected":""}>${esc(s.name)} (${esc(s.city)})</option>`).join("")}</select>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label>Вид</label>
          <select id="pt_species">${["собака","кошка","другое"].map(x=>`<option ${p.species===x?"selected":""}>${x}</option>`).join("")}</select></div>
        <div style="flex:1"><label>Пол</label>
          <select id="pt_gender">${["мальчик","девочка","неизвестно"].map(x=>`<option ${p.gender===x?"selected":""}>${x}</option>`).join("")}</select></div>
      </div>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label>Возраст</label><input id="pt_age" value="${esc(p.age)}" placeholder="например, 2 года"></div>
        <div style="flex:1"><label>Размер</label>
          <select id="pt_size">${["мелкий","средний","крупный","неизвестно"].map(x=>`<option ${p.size===x?"selected":""}>${x}</option>`).join("")}</select></div>
      </div>
      <div style="display:flex;gap:8px">
        <div style="flex:1"><label>Статус</label>
          <select id="pt_status">${Object.entries(PET_STATUSES).map(([k,v])=>`<option value="${k}" ${p.status===k?"selected":""}>${v.label}</option>`).join("")}</select></div>
        <div style="flex:1"><label>Стерилизация</label>
          <select id="pt_ster">${p.sterilized?`<option value="1" selected>да</option><option value="0">нет</option>`:`<option value="0" selected>нет</option><option value="1">да</option>`}</select></div>
      </div>
      <label>Фото</label>
      <label class="file-input">Загрузить с устройства
        <input type="file" accept="image/*" onchange="Pets.preview(event)">
      </label>
      <div id="pt_preview" class="file-preview" style="display:${hasPhoto?"block":"none"}">${hasPhoto?`<img src="${p.photo}">`:""}</div>
      <label>Описание и характер</label>
      <textarea id="pt_desc" placeholder="Отношение к людям, к другим животным, особенности ухода…">${esc(p.desc)}</textarea>
      <label>Теги (через запятую)</label>
      <input id="pt_tags" value="${esc((p.tags||[]).join(", "))}" placeholder="спокойный, к квартире и дому">
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Pets.save('${id||""}')">Сохранить</button>
      </div>`, 'wide');
  },

  preview(ev){
    const file = ev.target.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ UI.toast("Фото больше 2 МБ"); return; }
    const reader = new FileReader();
    reader.onload = e=>{
      Pets._img = e.target.result;
      const box = $("#pt_preview");
      box.innerHTML = `<img src="${e.target.result}">`;
      box.style.display = "block";
    };
    reader.readAsDataURL(file);
  },

  save(id){
    const name = $("#pt_name").value.trim();
    if(!name){ UI.toast("Укажите кличку"); return; }
    const fields = {
      name,
      shelterId: $("#pt_shelter").value,
      species: $("#pt_species").value,
      gender: $("#pt_gender").value,
      age: $("#pt_age").value.trim(),
      size: $("#pt_size").value,
      status: $("#pt_status").value,
      sterilized: $("#pt_ster").value==="1",
      desc: $("#pt_desc").value.trim(),
      tags: $("#pt_tags").value.split(",").map(t=>t.trim()).filter(Boolean),
    };
    if(id){
      const p = DB.pet(id);
      Object.assign(p, fields);
      if(Pets._img) p.photo = Pets._img;
      DB.log("pet","обновил карточку питомца «"+name+"»");
    }else{
      DB.data.pets.push(normalizePet({
        id:"p"+Date.now(),
        ...fields,
        photo: Pets._img || "",
        who: DB.data.session.login,
        when: new Date().toISOString().slice(0,10),
      }));
      DB.log("pet","добавил питомца «"+name+"»");
    }
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Сохранено");
  },

  remove(id){
    if(!DB.canModerate() && (!DB.data.session || DB.pet(id).who!==DB.data.session.login)) return;
    if(!confirm("Удалить карточку питомца?")) return;
    const p = DB.pet(id);
    DB.data.pets = DB.data.pets.filter(x=>x.id!==id);
    DB.log("pet","удалил питомца «"+(p?p.name:id)+"»");
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Удалено");
  },
};

window.Pets = Pets;
