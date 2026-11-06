/* ============ ЗооВики — авторизация, регистрация, роли, бан ============ */

const Auth = {

  renderAuthArea(){
    const area = $("#authArea");
    const u = DB.currentUser();
    if(DB.data.session && u){
      area.innerHTML = `
        <button class="btn ghost" data-go="#/profile" style="padding:4px 8px">
          ${UI.avatarHTML(u,'sm')} <span style="margin-left:6px">${esc(u.login)}</span>
        </button>
        ${UI.roleBadge(u.role)}
        ${u.banned ? UI.bannedBadge() : ""}
        <button class="btn ghost" id="logoutBtn">Выйти</button>`;
      area.querySelector("#logoutBtn").onclick = ()=>Auth.logout();
    }else{
      area.innerHTML = `
        <button class="btn" id="loginBtn">Войти</button>
        <button class="btn primary" id="registerBtn">Регистрация</button>`;
      area.querySelector("#loginBtn").onclick = ()=>Auth.openLogin();
      area.querySelector("#registerBtn").onclick = ()=>Auth.openRegister();
    }
  },

  openLogin(){
    UI.openModal(`
      <h2>Вход</h2>
      <label>Логин</label><input id="l_login" autocomplete="username">
      <label>Пароль</label><input id="l_pass" type="password" autocomplete="current-password">
      <p style="font-size:12px;color:var(--muted);margin-top:12px">Тестовые аккаунты: admin/admin, mod1/mod1, Мария/maria</p>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Auth.doLogin()">Войти</button>
      </div>`);
    setTimeout(()=>{ const i=$("#l_login"); if(i) i.focus(); }, 50);
  },

  doLogin(){
    const login = $("#l_login").value.trim();
    const pass = $("#l_pass").value;
    const u = DB.data.users.find(x=>x.login===login && x.pass===pass);
    if(!u){ UI.toast("Неверный логин или пароль"); return; }
    if(u.banned){
      UI.toast(`Аккаунт заблокирован${u.bannedReason?": "+u.bannedReason:""}`);
      return;
    }
    DB.data.session = {login:u.login, role:u.role};
    DB.log("login", "вошёл в аккаунт");
    UI.closeModal();
    App.refresh();
    UI.toast("С возвращением, "+u.login+"!");
  },

  openRegister(){
    UI.openModal(`
      <h2>Регистрация</h2>
      <label>Логин</label><input id="r_login" autocomplete="username">
      <label>Пароль</label><input id="r_pass" type="password" autocomplete="new-password">
      <p style="font-size:12px;color:var(--muted);margin-top:12px">
        Роли «модератор» и «админ» назначает администратор. Новые пользователи регистрируются с ролью «пользователь».
      </p>
      <div class="row">
        <button class="btn" onclick="closeModal()">Отмена</button>
        <button class="btn primary" onclick="Auth.doRegister()">Создать аккаунт</button>
      </div>`);
  },

  doRegister(){
    const login = $("#r_login").value.trim();
    const pass = $("#r_pass").value;
    if(!login || login.length < 2){ UI.toast("Логин — минимум 2 символа"); return; }
    if(!/^[а-яА-Яa-zA-Z0-9_ -]+$/.test(login)){ UI.toast("Логин: только буквы, цифры, пробел, дефис"); return; }
    if(!pass || pass.length < 3){ UI.toast("Пароль — минимум 3 символа"); return; }
    if(DB.data.users.some(u=>u.login.toLowerCase()===login.toLowerCase())){ UI.toast("Такой логин уже занят"); return; }
    DB.data.users.push(normalizeUser({
      login, pass, role:"user",
      registered:new Date().toISOString().slice(0,10),
    }));
    DB.data.session = {login, role:"user"};
    DB.log("register", "создал аккаунт «"+login+"»");
    UI.closeModal();
    App.refresh();
    UI.toast("Аккаунт создан!");
  },

  logout(){
    DB.log("logout", "вышел из аккаунта");
    DB.data.session = null;
    DB.save();
    App.refresh();
  },

  // --- Бан (вызывается из админ-панели) ---
  ban(login){
    if(!DB.isAdmin()) return;
    if(login===DB.data.session.login){ UI.toast("Нельзя забанить самого себя"); return; }
    const u = DB.data.users.find(x=>x.login===login);
    if(!u) return;
    const reason = prompt("Причина бана (можно оставить пустой):", u.bannedReason||"");
    if(reason===null) return;
    u.banned = true;
    u.bannedReason = reason.trim();
    DB.log("ban", "забанил «"+login+"»"+(reason?" ("+reason.trim()+")":""));
    DB.save();
    App.refresh();
    UI.toast("Пользователь «"+login+"» забанен");
  },

  unban(login){
    if(!DB.isAdmin()) return;
    const u = DB.data.users.find(x=>x.login===login);
    if(!u) return;
    u.banned = false;
    u.bannedReason = "";
    DB.log("unban", "разбанил «"+login+"»");
    DB.save();
    App.refresh();
    UI.toast("Пользователь «"+login+"» разбанен");
  },

  setRole(login, role){
    if(!DB.isAdmin()) return;
    if(login===DB.data.session.login && role!=="admin"){ UI.toast("Нельзя понизить самого себя"); return; }
    const u = DB.data.users.find(x=>x.login===login);
    if(!u || u.role===role) return;
    const old = u.role;
    u.role = role;
    if(DB.data.session && DB.data.session.login===login){
      DB.data.session.role = role;
    }
    DB.log("role", "сменил роль «"+login+"»: "+old+" → "+role);
    DB.save();
    App.refresh();
    UI.toast("Роль обновлена");
  },
};

window.Auth = Auth;
