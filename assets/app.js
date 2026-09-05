/* Early mobile class — antes del paint de layout fijo */
(function earlyMobile() {
  const mq = window.matchMedia("(max-width: 760px)");
  const sync = () => {
    const on = mq.matches;
    document.documentElement.classList.toggle("is-mobile", on);
    if (document.body) {
      document.body.classList.toggle("is-mobile", on);
      if (on) document.documentElement.style.zoom = "1";
    }
  };
  sync();
  mq.addEventListener("change", sync);
  document.addEventListener("DOMContentLoaded", sync);
})();
/* ============================================================
   Cat Home Veterinaria — lógica compartida del prototipo
   Header/footer, sesión simulada, acordeón FAQ y toasts.
   ============================================================ */

const CH = {
  demoPhone: "70000000",
  displayPhone: "+503 7000-0000",
  userName: "María José",
  whatsapp:
    "https://wa.me/50361060204?text=" +
    encodeURIComponent("Hola Cat Home, necesito atención al cliente 🐱"),
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- Sesión (delegada a Store cuando esté listo) ---------- */
const session = {
  get on() {
    if (window.Store) return Store.isLoggedIn();
    return localStorage.getItem("cathome_session") === "1";
  },
  start() {
    localStorage.setItem("cathome_session", "1");
  },
  end() {
    if (window.Store) Store.logout();
    else localStorage.removeItem("cathome_session");
  },
  user() {
    return window.Store ? Store.currentUser() : null;
  },
};

function loginRedirectTarget() {
  const q = new URLSearchParams(location.search).get("next");
  if (q && q.endsWith(".html") && !q.includes("://")) return q;
  return "reserva-mascota.html";
}

function requireAuth() {
  if (!document.body.hasAttribute("data-requires-auth")) return true;
  if (session.on) return true;
  const next = encodeURIComponent(
    location.pathname.split("/").pop() + location.search
  );
  toast("Inicia sesión para continuar con tu cita");
  setTimeout(() => {
    location.href = `login.html?next=${next}`;
  }, 500);
  return false;
}

/* ---------- Sprite de iconos (line-art, estilo del diseño) ---------- */
const SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c1.7-3.4 4.2-5 7.2-5s5.5 1.6 7.2 5"/></symbol>
  <symbol id="i-arrow-r" viewBox="0 0 24 24"><path d="M4.5 12h15M13 5.5l6.5 6.5L13 18.5"/></symbol>
  <symbol id="i-arrow-l" viewBox="0 0 24 24"><path d="M19.5 12h-15M11 5.5 4.5 12 11 18.5"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.6 4.6 4.6L19 6.8"/></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m6 9.5 6 6 6-6"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="4.8" y="10.5" width="14.4" height="10" rx="2.4"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20.3s-7.4-4.6-7.4-9.7A3.9 3.9 0 0 1 12 8.3a3.9 3.9 0 0 1 7.4 2.3c0 5.1-7.4 9.7-7.4 9.7Z"/></symbol>
  <symbol id="i-heart-pulse" viewBox="0 0 24 24"><path d="M12 20.3s-7.4-4.6-7.4-9.7A3.9 3.9 0 0 1 12 8.3a3.9 3.9 0 0 1 7.4 2.3c0 5.1-7.4 9.7-7.4 9.7Z"/><path d="M4.9 12.6h3l1.7-2.8 2.6 5.6 1.7-2.8h3.2"/></symbol>
  <symbol id="i-scalpel" viewBox="0 0 24 24"><path d="M14.6 3.4 20.6 9.4 10.4 19.6a3.6 3.6 0 0 1-5.1-5.1L14.6 3.4Z"/><path d="m12.3 5.8 6 6"/></symbol>
  <symbol id="i-clipboard" viewBox="0 0 24 24"><rect x="5.5" y="4.4" width="13" height="16.2" rx="2.4"/><path d="M9.3 4.6V3.4a1.4 1.4 0 0 1 1.4-1.4h2.6a1.4 1.4 0 0 1 1.4 1.4v1.2"/><path d="M9 10.4h6M9 14h6M9 17.4h3.4"/></symbol>
  <symbol id="i-paw-heart" viewBox="0 0 24 24"><path d="M12 20.6s-7.2-4.5-7.2-9.5A4 4 0 0 1 12 8.4a4 4 0 0 1 7.2 2.7c0 5-7.2 9.5-7.2 9.5Z"/><ellipse cx="12" cy="15.6" rx="2.6" ry="2.1"/><circle cx="8.5" cy="12.6" r="1.15"/><circle cx="10.7" cy="11" r="1.05"/><circle cx="13.3" cy="11" r="1.05"/><circle cx="15.5" cy="12.6" r="1.15"/></symbol>
  <symbol id="i-warning" viewBox="0 0 24 24"><path d="M12 3.4 21.6 20.4H2.4L12 3.4Z"/><path d="M12 10.2v4.2M12 17.4h.02"/></symbol>
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M3.6 11.4 12 4l8.4 7.4"/><path d="M6.4 10.2V19a1.4 1.4 0 0 0 1.4 1.4h8.4a1.4 1.4 0 0 0 1.4-1.4v-8.8"/></symbol>
  <symbol id="i-home-heart" viewBox="0 0 24 24"><path d="M3.5 11.2 12 3.8l8.5 7.4"/><path d="M6.2 10V19.2a1.2 1.2 0 0 0 1.2 1.2h9.2a1.2 1.2 0 0 0 1.2-1.2V10"/><path d="M12 18.4s-2.8-1.8-2.8-3.7A1.5 1.5 0 0 1 12 13.6a1.5 1.5 0 0 1 2.8 1.1c0 1.9-2.8 3.7-2.8 3.7Z"/></symbol>
  <symbol id="i-faq" viewBox="0 0 24 24"><path d="M8.6 15.4H6.4a2.8 2.8 0 0 1-2.8-2.8V6.8A2.8 2.8 0 0 1 6.4 4h7.2a2.8 2.8 0 0 1 2.8 2.8v1.4"/><path d="M10.4 9.6h7.2a2.8 2.8 0 0 1 2.8 2.8v4.4a2.8 2.8 0 0 1-2.8 2.8h-.8L14 22.2v-2.6h-3.6a2.8 2.8 0 0 1-2.8-2.8v-4.4a2.8 2.8 0 0 1 2.8-2.8Z"/></symbol>
  <symbol id="i-question" viewBox="0 0 24 24"><path d="M9.4 9.2a2.7 2.7 0 0 1 5.3.7c0 1.8-2.7 2.2-2.7 4"/><path d="M12 17.6h.02"/><circle cx="12" cy="12" r="9"/></symbol>
  <symbol id="i-kit" viewBox="0 0 24 24"><rect x="2.8" y="7" width="18.4" height="13.2" rx="2.4"/><path d="M8.4 7V5.4A2 2 0 0 1 10.4 3.4h3.2a2 2 0 0 1 2 2V7"/><path d="M12 11.2v5.2M9.4 13.8h5.2"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3 19.6 6v6c0 4.8-3.3 8.3-7.6 9.6C7.7 20.3 4.4 16.8 4.4 12V6L12 3Z"/><path d="m9.2 12 2.2 2.2 3.9-4"/></symbol>
  <symbol id="i-shield-paw" viewBox="0 0 24 24"><path d="M12 2.8 19.8 6v6.2c0 5-3.4 8.6-7.8 10C7.6 20.8 4.2 17.2 4.2 12.2V6L12 2.8Z"/><ellipse cx="12" cy="13.2" rx="2.3" ry="1.9"/><circle cx="9.2" cy="10.6" r="1"/><circle cx="11.1" cy="9.2" r=".9"/><circle cx="12.9" cy="9.2" r=".9"/><circle cx="14.8" cy="10.6" r="1"/></symbol>
  <symbol id="i-monitor" viewBox="0 0 24 24"><rect x="2.8" y="4.4" width="18.4" height="12.6" rx="2.2"/><path d="M8.4 20.6h7.2M12 17v3.6"/><path d="M6.2 11h2.2l1.4-2.4 1.9 4.6 1.4-2.2h4.7"/></symbol>
  <symbol id="i-stethoscope" viewBox="0 0 24 24"><path d="M6 3v5.4a4 4 0 0 0 8 0V3"/><path d="M6 4.4H4.2M14 4.4h1.8"/><path d="M10 12.4v1.8a5 5 0 0 0 9 3"/><circle cx="19.4" cy="15.4" r="2.2"/></symbol>
  <symbol id="i-cat" viewBox="0 0 24 24"><path d="m4.8 11.2 2-6.2 3.6 3.2h2.8l3.6-3.2 2 6.2"/><path d="M5.2 12c0 5.2 3 8.4 6.8 8.4S18.8 17.2 18.8 12"/><circle cx="9.4" cy="13" r="1.1"/><circle cx="14.6" cy="13" r="1.1"/><path d="M11.1 15.8h1.8"/><path d="M2.6 10.4h2.4M19 10.4h2.4M3.4 7.2l2 1.4M18.6 8.6l2-1.4M3.8 13.6l2-.4M18.2 13.2l2 .4"/></symbol>
  <symbol id="i-cat-bed" viewBox="0 0 24 24"><path d="M2.6 16.4h18.8v3.2H2.6z"/><path d="M4.6 16.4v-2.6a2 2 0 0 1 2-2h10.8a2 2 0 0 1 2 2v2.6"/><path d="m8.6 11.6.9-3 1.7 1.5h1.6l1.7-1.5.9 3"/><circle cx="10.4" cy="10.6" r=".7"/><circle cx="13.6" cy="10.6" r=".7"/></symbol>
  <symbol id="i-bowl" viewBox="0 0 24 24"><path d="M3.4 11.6h17.2c0 4.6-3.8 7.6-8.6 7.6s-8.6-3-8.6-7.6Z"/><path d="M6.4 11.6V9.4a2.4 2.4 0 0 1 2.4-2.4h6.4a2.4 2.4 0 0 1 2.4 2.4v2.2"/><circle cx="12" cy="9.4" r=".9"/></symbol>
  <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 3.2s6.2 6.8 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 10 12 3.2 12 3.2Z"/></symbol>
  <symbol id="i-collar" viewBox="0 0 24 24"><ellipse cx="12" cy="14.6" rx="7.4" ry="4.6"/><path d="M6.6 12.4c-2-3.4.4-7.6 5.4-8.6 5 1 7.4 5.2 5.4 8.6"/><path d="M12 4.2v5.6"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.4" y="5" width="17.2" height="15.4" rx="2.4"/><path d="M8 3v4M16 3v4M3.4 10h17.2"/><path d="M7.4 13.6h2.2M13.4 13.6h3.2M7.4 17h2.2M13.4 17h3.2"/></symbol>
  <symbol id="i-food" viewBox="0 0 24 24"><path d="M6.6 8.4h10.8l-1 11.2a1.4 1.4 0 0 1-1.4 1.2H9a1.4 1.4 0 0 1-1.4-1.2L6.6 8.4Z"/><path d="M9 8.4V6.2a3 3 0 0 1 6 0v2.2"/><ellipse cx="12" cy="14" rx="2" ry="1.7"/></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><circle cx="12" cy="7.2" r="2.8"/><circle cx="5.6" cy="9" r="2.2"/><circle cx="18.4" cy="9" r="2.2"/><path d="M6.8 20.4c1.2-3.2 3-4.8 5.2-4.8s4 1.6 5.2 4.8"/><path d="M2.4 19.6c1-2.4 2.4-3.5 4-3.5"/><path d="M17.6 16.1c1.6 0 3 1.1 4 3.5"/></symbol>
  <symbol id="i-cross" viewBox="0 0 24 24"><path d="M9.2 3.2h5.6v5.6h5.6v5.6h-5.6v5.6H9.2v-5.6H3.6V8.8h5.6V3.2Z"/></symbol>
  <symbol id="i-wa" viewBox="0 0 24 24"><path d="M12 3.2a8.8 8.8 0 0 0-7.5 13.4L3.4 21l4.6-1a8.8 8.8 0 1 0 4-16.8Z"/><path d="M9.2 9.4c.2-.4.4-.4.6-.4h.5c.2 0 .4.1.6.4l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.2-.1.3 0 .5.4.6 1 1.2 1.7 1.6.2.1.3.1.5 0l.4-.4c.2-.1.4-.1.5 0l1.3.7c.2.1.3.3.3.5v.5c0 .3-.1.5-.3.6-.4.4-.9.5-1.5.5A6.3 6.3 0 0 1 9 11.2c0-.6.1-1.2.2-1.8Z"/></symbol>
  <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21.4s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z"/><circle cx="12" cy="10.2" r="2.6"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><path d="M6.4 3.6h3l1.6 4-2 1.4a11 11 0 0 0 5.6 5.6l1.4-2 4 1.6v3a1.8 1.8 0 0 1-1.9 1.8C10.6 18.4 5.6 13.4 4.6 5.5a1.8 1.8 0 0 1 1.8-1.9Z"/></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5.4" width="18" height="13.2" rx="2.4"/><path d="m3.6 7 8.4 6 8.4-6"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.8"/><path d="M12 6.8V12l3.4 2.2"/></symbol>
  <symbol id="i-instagram" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4.6"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.9" cy="7.2" r=".9" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-facebook" viewBox="0 0 24 24"><path d="M14.6 8.4h2.2V5.2h-2.4c-2.2 0-3.6 1.4-3.6 3.6v2H8.6v3.2h2.2v7h3.4v-7h2.4l.4-3.2h-2.8V9.4c0-.7.2-1 .4-1Z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-tiktok" viewBox="0 0 24 24"><path d="M14.6 3.4h2.6c.3 2 1.5 3.3 3.4 3.6v2.7c-1.3.1-2.5-.3-3.6-1v5.9a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.8a2.8 2.8 0 1 0 2 2.7V3.4Z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-spark" viewBox="0 0 12 24"><path d="M1 12h6.4M2.6 4.6l6 3.6M2.6 19.4l6-3.6"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3.2 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8L6.7 19.7l1-6L3.4 9.5l6-.9L12 3.2Z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-star-o" viewBox="0 0 24 24"><path d="m12 3.2 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8L6.7 19.7l1-6L3.4 9.5l6-.9L12 3.2Z"/></symbol>
  <symbol id="i-thumb" viewBox="0 0 24 24"><path d="M8 10.4v9.2H5.2a1.6 1.6 0 0 1-1.6-1.6v-6a1.6 1.6 0 0 1 1.6-1.6H8Z"/><path d="M8 19.6h8.4a2.2 2.2 0 0 0 2.2-1.9l.8-5.2a1.8 1.8 0 0 0-1.8-2.1h-4.4l.8-3.6a1.6 1.6 0 0 0-1.6-2h-.2L8 10.4"/></symbol>
  <symbol id="i-quiet" viewBox="0 0 24 24"><path d="M4 10.4v3.2h3.2L12 18V6L7.2 10.4H4Z"/><path d="m15.2 9.2 4.6 5.6M19.8 9.2l-4.6 5.6"/></symbol>
  <symbol id="i-dots" viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="18.5" r="1.5" fill="currentColor" stroke="none"/></symbol>
</svg>`;

function injectSprite() {
  const holder = document.createElement("div");
  holder.innerHTML = SPRITE;
  document.body.prepend(holder.firstElementChild);
}

/* ---------- Marca ---------- */
const logoMark = `
<svg class="logo-mark" viewBox="0 0 64 64" aria-hidden="true">
  <path d="M5 30 32 8l27 22" fill="none" stroke="#e2603a" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M13 28.5h38V50a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3V28.5Z" fill="#fff" stroke="#e2603a" stroke-width="3"/>
  <path d="M23 41.5 24.6 34l4.7 3.4h5.4L39.4 34 41 41.5" fill="#f0a469"/>
  <path d="M23 41.5c0 5.4 4 9 9 9s9-3.6 9-9Z" fill="#f0a469"/>
  <circle cx="28.4" cy="44" r="1.5" fill="#41301f"/>
  <circle cx="35.6" cy="44" r="1.5" fill="#41301f"/>
  <path d="M30.6 47.4h2.8" stroke="#41301f" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

function brandBlock() {
  return `<a class="logo" href="index.html">
    ${logoMark}
    <span class="logo-txt">
      <span class="name">Cat Home</span>
      <span class="sub">VETERINARIA</span>
    </span>
  </a>`;
}

/* ---------- Header ---------- */
const NAV = [
  { href: "index.html", label: "Inicio", key: "inicio" },
  { href: "servicios.html", label: "Servicios", key: "servicios" },
  { href: "que-es.html", label: "Esterilización", key: "esterilizacion" },
  { href: "testimonios.html", label: "Testimonios", key: "testimonios" },
  { href: "faq.html", label: "Preguntas", key: "faq" },
  { href: "index.html#contacto", label: "Contacto", key: "contacto" },
];

function activeNavKey() {
  const nav = document.body.dataset.nav || "";
  if ((nav === "inicio" || !nav) && location.hash === "#contacto") return "contacto";
  return nav;
}

function renderHeader() {
  const host = $("[data-header]");
  if (!host) return;
  const active = activeNavKey();
  const links = NAV.map(
    (n) =>
      `<a href="${n.href}"${n.key === active ? ' class="active"' : ""}>${n.label}</a>`
  ).join("");

  const user = session.user();
  const first = user ? user.name.split(" ")[0] : CH.userName.split(" ")[0];
  const right = session.on
    ? `<span class="user-chip">¡Hola, ${first}!</span>
       <a class="btn btn-orange" href="reserva-mascota.html" data-needs-login>Reserva tu cita</a>
       <a class="btn btn-soft" href="mis-citas.html" data-needs-login>Mis citas</a>
       <button class="btn btn-soft" data-logout>Salir</button>`
    : `<a class="btn btn-orange" href="login.html">
         <svg class="ic"><use href="#i-user"/></svg> Iniciar sesión
       </a>`;

  host.innerHTML = `<div class="bar">
    ${brandBlock()}
    <nav class="main-nav desk-nav" aria-label="Principal">${links}</nav>
    <div class="header-cta">${right}</div>
    <button type="button" class="burger" aria-label="Abrir menú" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="nav-backdrop" data-nav-close hidden></div>
  <nav class="nav-drawer" aria-label="Menú">
    <div class="nav-drawer-head">
      <span>Menú</span>
      <button type="button" class="nav-close" data-nav-close aria-label="Cerrar">×</button>
    </div>
    ${links}
    <div class="nav-drawer-cta">${right}</div>
  </nav>`;

  $$("[data-logout]", host).forEach((b) =>
    b.addEventListener("click", () => {
      session.end();
      toast("Sesión cerrada");
      setTimeout(() => (location.href = "index.html"), 500);
    })
  );
}

/* ---------- Footer ---------- */
function renderFooter() {
  const host = $("[data-footer]");
  if (!host) return;
  host.innerHTML = `
  <div class="deco" style="left:-30px;bottom:0;width:170px">
    <svg viewBox="0 0 200 200" class="leaf" fill="currentColor" opacity=".5">
      <path d="M20 190C20 110 80 50 170 40c0 90-60 150-150 150Z"/>
    </svg>
  </div>
  <div class="wrap">
    <div class="cols">
      <div class="f-brand">
        ${brandBlock()}
        <p>Cuidamos su salud,<br>mejoramos su vida.</p>
        <div class="socials">
          <span><svg class="ic"><use href="#i-instagram"/></svg></span>
          <span><svg class="ic"><use href="#i-facebook"/></svg></span>
          <span><svg class="ic"><use href="#i-tiktok"/></svg></span>
        </div>
      </div>
      <div>
        <h4>Enlaces rápidos</h4>
        <ul>
          <li><a href="index.html">Inicio</a></li>
          <li><a href="servicios.html">Servicios</a></li>
          <li><a href="que-es.html">Esterilización felina</a></li>
          <li><a href="testimonios.html">Testimonios</a></li>
          <li><a href="faq.html">Preguntas frecuentes</a></li>
          <li><a href="index.html#contacto">Contacto</a></li>
        </ul>
      </div>
      <div>
        <h4>Contáctanos</h4>
        <ul class="contact-list">
          <li><svg class="ic"><use href="#i-pin"/></svg> Colonia Escalón, San Salvador</li>
          <li><svg class="ic"><use href="#i-phone"/></svg> 6106-0204</li>
          <li><svg class="ic"><use href="#i-mail"/></svg> hola@cathome.com.sv</li>
          <li><svg class="ic"><use href="#i-clock"/></svg> Lun - Sáb: 8:00 a.m. - 6:00 p.m.</li>
        </ul>
      </div>
      <div class="f-cta">
        <strong>¿Listo para cuidar<br>la salud de tu gato?</strong>
        <div class="note">Tu gato te lo agradecerá
          <svg class="ic heart-out"><use href="#i-heart"/></svg>
        </div>
        <a class="btn btn-wa btn-block" style="margin-top:14px" href="${CH.whatsapp}" target="_blank" rel="noopener">
          <svg class="ic"><use href="#i-wa"/></svg> WhatsApp
        </a>
      </div>
    </div>
    <div class="f-bottom">© 2026 Cat Home. Todos los derechos reservados.</div>
  </div>`;
}

/* ---------- Toast ---------- */
function toast(msg) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 3000);
}

/* ---------- Acordeón FAQ ---------- */
function initFaq() {
  $$(".faq-q").forEach((btn) =>
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const wasOpen = item.classList.contains("open");
      $$(".faq-item").forEach((i) => i.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    })
  );
}

/* ---------- Enlaces que exigen sesión ---------- */
function initGuards() {
  $$("[data-needs-login]").forEach((el) =>
    el.addEventListener("click", (e) => {
      if (session.on) return;
      e.preventDefault();
      toast("Inicia sesión para agendar o reprogramar tu cita");
      setTimeout(() => (location.href = "login.html"), 700);
    })
  );
}

/* ---------- Modo escritorio fijo ----------
   En tablet/desktop (>=761px): mismo canvas 1400 + zoom
   (no salta al navegar).
   En celular: sin zoom, layout adaptable y legible. */
const CANVAS = 1400;
const MOBILE_MQ = "(max-width: 760px)";

function initFixedWidth() {
  if (!document.body.hasAttribute("data-fixed-width")) return;

  const html = document.documentElement;
  const body = document.body;
  const design = parseInt(body.dataset.design || "", 10) || CANVAS;
  const mobile = window.matchMedia(MOBILE_MQ);

  html.style.setProperty("--canvas", CANVAS + "px");
  html.style.setProperty("--design", design + "px");
  body.dataset.fixedWidth = String(CANVAS);

  const fit = () => {
    const isMobile = mobile.matches;
    body.classList.toggle("is-mobile", isMobile);
    html.classList.toggle("is-mobile", isMobile);
    html.style.overflowY = "scroll";
    html.style.overflowX = isMobile ? "hidden" : "";

    if (isMobile) {
      html.style.zoom = "1";
      body.style.minWidth = "0";
      return;
    }

    body.style.minWidth = "";
    html.style.zoom = "1";
    const disponible = html.clientWidth;
    html.style.zoom =
      disponible < CANVAS
        ? Math.floor((disponible / CANVAS) * 1e4) / 1e4
        : "1";
  };

  fit();
  mobile.addEventListener("change", fit);
  let pendiente = false;
  window.addEventListener("resize", () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      fit();
    });
  });
}

function initMobileNav() {
  const header = $("[data-header]");
  if (!header) return;
  const burger = $(".burger", header);
  if (!burger) return;

  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    const backdrop = $(".nav-backdrop", header);
    if (backdrop) backdrop.hidden = !open;
  };

  burger.addEventListener("click", () => {
    setOpen(!document.body.classList.contains("nav-open"));
  });

  header.querySelectorAll("[data-nav-close]").forEach((el) =>
    el.addEventListener("click", () => setOpen(false))
  );

  header.querySelectorAll(".nav-drawer a").forEach((a) =>
    a.addEventListener("click", () => setOpen(false))
  );

  const onScroll = () => {
    const down = window.scrollY > 40;
    document.body.classList.toggle("scrolled", down);
    if (!down && !document.body.classList.contains("is-mobile")) {
      setOpen(false);
    }
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function syncNavActive() {
  const active = activeNavKey();
  document.querySelectorAll(".desk-nav a, .nav-drawer a").forEach((a) => {
    const item = NAV.find((n) => n.href === a.getAttribute("href"));
    a.classList.toggle("active", !!(item && item.key === active));
  });
}

/* ---------- CTA del hero según la sesión ---------- */
function initHeroCta() {
  const cta = $("#hero-cta");
  if (!cta || !session.on) return;
  cta.href = "reserva-mascota.html";
  $("span", cta).textContent = "Agendar cita";
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.Store) await Store.init();
  // Migración suave: sesión vieja sin auth → limpiar
  if (localStorage.getItem("cathome_session") === "1" && window.Store && !Store.getAuth()) {
    localStorage.removeItem("cathome_session");
  }
  injectSprite();
  if (!requireAuth()) return;
  renderHeader();
  initMobileNav();
  syncNavActive();
  window.addEventListener("hashchange", syncNavActive);
  renderFooter();
  initFaq();
  initGuards();
  initHeroCta();
  initFixedWidth();
});

