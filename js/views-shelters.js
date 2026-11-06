/* ============ ЗооВики — приюты: список + интерактивная карта (Leaflet) ============ */

const Shelters = {
  map: null,
  markers: [],

  view(){
    const canMod = DB.canModerate();
    const list = DB.data.shelters;
    const withCoords = list.filter(s=>s.lat && s.lng);

    return `
    <div class="shelters-page view">
      <button class="back" data-go="#/">← На главную</button>
      <h1>🗺️ Приюты</h1>
      <p class="subtitle">Приюты, с которыми работают волонтёры. Кликните на маркер карты, чтобы увидеть контакты.</p>
      ${canMod?`<button class="btn primary" onclick="Shelters.edit()" style="margin-bottom:16px">➕ Добавить приют</button>`:""}
      ${withCoords.length?`<div id="shelterMap"></div>`:""}
      ${list.length?list.map(s=>`
        <div class="shelter-card" id="sh-${s.id}">
          ${s.photo?`<div class="shelter-photo"><img src="${s.photo}" alt="${esc(s.name)}" loading="lazy"></div>`:""}
          <div class="shelter-head">
            <div>
              <h3>${esc(s.name)}</h3>
              <div class="city">${esc(s.city)}${s.address?` · ${esc(s.address)}`:""}</div>
            </div>
            ${canMod?`<button class="btn sm" onclick="Shelters.edit('${s.id}')">✏️</button>`:""}
          </div>
          ${s.desc?`<p class="shelter-desc">${esc(s.desc)}</p>`:""}
          <div class="shelter-info">
            ${s.phone?`<div class="row-item"><span class="lbl">📞</span><span>${esc(s.phone)}</span></div>`:""}
            ${s.email?`<div class="row-item"><span class="lbl">✉️</span><span>${esc(s.email)}</span></div>`:""}
            ${s.site?`<div class="row-item"><span class="lbl">🌐</span><span>${esc(s.site)}</span></div>`:""}
            ${s.hours?`<div class="row-item"><span class="lbl">🕐</span><span>${esc(s.hours)}</span></div>`:""}
            ${s.animals?`<div class="row-item"><span class="lbl">🐾</span><span>${s.animals} животных</span></div>`:""}
          </div>
          <div class="card-btns">
            ${s.lat&&s.lng?`<button class="btn sm" onclick="Shelters.focus('${s.id}')">📍 Показать на карте</button>`:""}
            ${s.phone?`<a class="btn sm" href="tel:${s.phone.replace(/[^+0-9]/g,'')}">📞 Позвонить</a>`:""}
          </div>
        </div>`).join(""):`<p class="empty">Пока приютов нет.</p>`}
    </div>`;
  },

  /** Вызывается после вставки view в DOM */
  initMap(){
    const el = $("#shelterMap");
    if(!el || typeof L==="undefined") return;
    if(Shelters.map){ Shelters.map.remove(); Shelters.map = null; }
    const list = DB.data.shelters.filter(s=>s.lat && s.lng);
    if(!list.length) return;

    const center = list.length===1
      ? [list[0].lat, list[0].lng]
      : [55.75, 37.62];
    // scrollWheelZoom выключен, чтобы страница скроллилась; зум колесом включается по клику на карте
    Shelters.map = L.map("shelterMap", {scrollWheelZoom:false}).setView(center, list.length===1?10:4);
    Shelters.map.on("click", ()=>Shelters.map.scrollWheelZoom.enable());
    Shelters.map.on("mouseout", ()=>Shelters.map.scrollWheelZoom.disable());
    Shelters.map.on("focus", ()=>Shelters.map.scrollWheelZoom.enable());
    Shelters.map.on("blur", ()=>Shelters.map.scrollWheelZoom.disable());

    // CartoDB — работает и с file://, и с GitHub Pages (OSM-публичный сервер блокирует такие запросы)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>',
    }).addTo(Shelters.map);

    // векторные маркеры — чёткие на любом экране, не зависят от шрифтов
    Shelters.markers = list.map(s=>{
      const m = L.circleMarker([s.lat, s.lng], {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: "#d33",
        fillOpacity: .95,
      }).addTo(Shelters.map);
      m.bindPopup(`
        <div style="min-width:190px">
          <b style="font-size:14px">${esc(s.name)}</b><br>
          <span style="color:var(--muted);font-size:12px">${esc(s.city)}${s.address?", "+esc(s.address):""}</span>
          ${s.phone?`<br>${esc(s.phone)}`:""}
          ${s.hours?`<br>${esc(s.hours)}`:""}
          ${s.animals?`<br>${s.animals} животных`:""}
        </div>`);
      m._shelterId = s.id;
      return m;
    });

    if(list.length>1){
      Shelters.map.fitBounds(L.latLngBounds(list.map(s=>[s.lat,s.lng])).pad(0.3));
    }
  },

  focus(id){
    const el = $("#sh-"+id);
    if(el) el.scrollIntoView({behavior:"smooth", block:"center"});
    const marker = Shelters.markers.find(m=>m._shelterId===id);
    if(marker){
      Shelters.map.invalidateSize();
      Shelters.map.setView(marker.getLatLng(), 13);
      marker.openPopup();
    }
  },

  edit(id){
    if(!DB.canModerate()) return;
    const s = id
      ? DB.data.shelters.find(x=>x.id===id)
      : {id:"sh"+Date.now(),name:"",city:"",address:"",phone:"",email:"",site:"",desc:"",animals:0,hours:"",lat:"",lng:"",photo:""};
    Shelters._img = null;
    UI.openModal(`
      <h2>${id?"Редактировать":"Добавить"} приют</h2>
      <label>Название *</label><input id="sh_name" value="${esc(s.name||"")}">
      <label>Город *</label><input id="sh_city" value="${esc(s.city||"")}">
      <label>Адрес</label><input id="sh_addr" value="${esc(s.address||"")}">
      <label>Фото приюта</label>
      <label class="file-input">Загрузить с устройства
        <input type="file" accept="image/*" onchange="Shelters.preview(event)">
      </label>
      <div id="sh_preview" class="file-preview" style="display:${s.photo?"block":"none"}">${s.photo?`<img src="${s.photo}">`:""}</div>
      <label>Телефон</label><input id="sh_phone" value="${esc(s.phone||"")}">
      <label>Email</label><input id="sh_email" value="${esc(s.email||"")}">
      <label>Сайт</label><input id="sh_site" value="${esc(s.site||"")}" placeholder="example.ru">
      <label>Часы работы</label><input id="sh_hours" value="${esc(s.hours||"")}" placeholder="Пн-Вс 10:00–19:00">
      <label>Кол-во животных</label><input id="sh_animals" type="number" min="0" value="${s.animals||""}">
      <label>Описание</label><textarea id="sh_desc">${esc(s.desc||"")}</textarea>
      <label>Координаты для карты</label>
      <div style="display:flex;gap:8px">
        <input id="sh_lat" placeholder="Широта, напр. 55.7558" value="${s.lat||""}">
        <input id="sh_lng" placeholder="Долгота, напр. 37.6173" value="${s.lng||""}">
      </div>
      <p style="font-size:12px;color:var(--muted);margin:8px 0 0">
        Координаты можно взять из Google Maps: правый клик по точке на карте.
      </p>
      <div class="row">
        ${id?`<button class="btn danger" onclick="Shelters.remove('${id}')">Удалить</button>`:""}
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Shelters.save('${s.id}')">Сохранить</button>
      </div>`, 'wide');
  },

  preview(ev){
    const file = ev.target.files[0]; if(!file) return;
    if(file.size > 2*1024*1024){ UI.toast("Фото больше 2 МБ"); return; }
    const reader = new FileReader();
    reader.onload = e=>{
      Shelters._img = e.target.result;
      const box = $("#sh_preview");
      box.innerHTML = `<img src="${e.target.result}">`;
      box.style.display = "block";
    };
    reader.readAsDataURL(file);
  },

  save(id){
    const data = {
      name: $("#sh_name").value.trim(),
      city: $("#sh_city").value.trim(),
      address: $("#sh_addr").value.trim(),
      phone: $("#sh_phone").value.trim(),
      email: $("#sh_email").value.trim(),
      site: $("#sh_site").value.trim(),
      hours: $("#sh_hours").value.trim(),
      animals: parseInt($("#sh_animals").value)||0,
      desc: $("#sh_desc").value.trim(),
      lat: parseFloat($("#sh_lat").value)||0,
      lng: parseFloat($("#sh_lng").value)||0,
    };
    if(!data.name || !data.city){ UI.toast("Название и город обязательны"); return; }
    let s = DB.data.shelters.find(x=>x.id===id);
    if(s){
      Object.assign(s, data);
      if(Shelters._img) s.photo = Shelters._img;
      DB.log("shelter","обновил приют «"+data.name+"»");
    }
    else{
      DB.data.shelters.push({id, ...data, photo: Shelters._img || ""});
      DB.log("shelter","добавил приют «"+data.name+"»");
    }
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Сохранено");
  },

  remove(id){
    if(!confirm("Удалить приют?")) return;
    const s = DB.data.shelters.find(x=>x.id===id);
    DB.data.shelters = DB.data.shelters.filter(x=>x.id!==id);
    DB.log("shelter","удалил приют «"+(s?s.name:id)+"»");
    DB.save();
    UI.closeModal();
    App.refresh();
    UI.toast("Приют удалён");
  },
};

window.Shelters = Shelters;
