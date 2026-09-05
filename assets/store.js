/* ============================================================
   Cat Home — capa de datos (JSON + localStorage)
   Seed: assets/data/db.json  |  Persistencia: localStorage
   ============================================================ */

const Store = (() => {
  const DB_KEY = "cathome_db_v1";
  const AUTH_KEY = "cathome_auth_v1";
  const DRAFT_KEY = "cathome_draft_v1";
  const LAST_APPT_KEY = "cathome_last_appointment";

  const SEED = {
    users: [
      {
        id: "u_demo",
        name: "María José",
        phone: "70000000",
        email: "maria@cathome.demo",
        password: "demo123",
        address: "Colonia Escalón, San Salvador",
        provider: "phone",
        createdAt: "2026-01-10T10:00:00.000Z",
      },
      {
        id: "u_google",
        name: "Ana Gómez",
        phone: "71000000",
        email: "ana.gomez@gmail.com",
        password: "",
        address: "",
        provider: "google",
        createdAt: "2026-02-01T10:00:00.000Z",
      },
      {
        id: "u_facebook",
        name: "Carlos Rivera",
        phone: "72000000",
        email: "carlos.rivera@facebook.com",
        password: "",
        address: "",
        provider: "facebook",
        createdAt: "2026-02-15T10:00:00.000Z",
      },
    ],
    pets: [
      {
        id: "p_misu",
        userId: "u_demo",
        name: "Misu",
        species: "Gato",
        sex: "Hembra",
        age: "2 años",
        breed: "Mestizo",
        weight: "4 kg",
        photo: "assets/gatos/GATO7.png",
        photoFallback: "assets/gatos/GATO1.png",
        notes: "",
      },
      {
        id: "p_luna",
        userId: "u_demo",
        name: "Luna",
        species: "Gato",
        sex: "Hembra",
        age: "3 años",
        breed: "Siamés",
        weight: "3.5 kg",
        photo: "assets/gatos/GATO8.png",
        photoFallback: "assets/gatos/GATO2.png",
        notes: "",
      },
      {
        id: "p_simba",
        userId: "u_demo",
        name: "Simba",
        species: "Gato",
        sex: "Macho",
        age: "1 año",
        breed: "Mestizo",
        weight: "4.2 kg",
        photo: "assets/gatos/GATO9.png",
        photoFallback: "assets/gatos/GATO3.png",
        notes: "",
      },
      {
        id: "p_nube",
        userId: "u_google",
        name: "Nube",
        species: "Gato",
        sex: "Hembra",
        age: "4 años",
        breed: "Persa",
        weight: "3.8 kg",
        photo: "assets/gatos/GATO10.png",
        photoFallback: "assets/gatos/GATO4.png",
        notes: "",
      },
    ],
    appointments: [],
    services: [
      { id: "svc_esterilizacion", name: "Esterilización felina", price: 55 },
    ],
  };

  let ready = null;

  function uid(prefix) {
    return (
      prefix +
      "_" +
      Math.random().toString(36).slice(2, 8) +
      Date.now().toString(36).slice(-4)
    );
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function readDb() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function writeDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  }

  function getDb() {
    return readDb() || clone(SEED);
  }

  function saveDb(db) {
    return writeDb(db);
  }

  async function init() {
    if (ready) return ready;
    ready = (async () => {
      let db = readDb();
      if (!db) {
        try {
          const res = await fetch("assets/data/db.json", { cache: "no-store" });
          if (res.ok) db = await res.json();
        } catch (_) {}
        if (!db) db = clone(SEED);
        writeDb(db);
      }
      return db;
    })();
    return ready;
  }

  function resetDemo() {
    writeDb(clone(SEED));
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(LAST_APPT_KEY);
    localStorage.removeItem("cathome_session");
  }

  function getAuth() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function setAuth(auth) {
    if (!auth) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem("cathome_session");
      return;
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    localStorage.setItem("cathome_session", "1");
  }

  function currentUser() {
    const auth = getAuth();
    if (!auth?.userId) return null;
    return getDb().users.find((u) => u.id === auth.userId) || null;
  }

  function isLoggedIn() {
    return !!currentUser();
  }

  function loginAs(userId, provider) {
    const db = getDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error("Usuario no encontrado");
    if (provider) {
      user.provider = provider;
      saveDb(db);
    }
    setAuth({
      userId: user.id,
      provider: provider || user.provider || "phone",
      at: new Date().toISOString(),
    });
    return user;
  }

  function logout() {
    setAuth(null);
    clearDraft();
  }

  function findUserByPhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    return getDb().users.find((u) => u.phone === digits) || null;
  }

  function findUserByEmail(email) {
    const e = String(email || "").trim().toLowerCase();
    return getDb().users.find((u) => (u.email || "").toLowerCase() === e) || null;
  }

  function registerUser(data) {
    const db = getDb();
    const user = {
      id: uid("u"),
      name: data.name || "Cliente Cat Home",
      phone: String(data.phone || "").replace(/\D/g, ""),
      email: (data.email || "").trim().toLowerCase(),
      password: data.password || "",
      address: data.address || "",
      provider: data.provider || "email",
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    saveDb(db);
    return user;
  }

  function updateUser(userId, patch) {
    const db = getDb();
    const i = db.users.findIndex((u) => u.id === userId);
    if (i < 0) return null;
    db.users[i] = { ...db.users[i], ...patch, id: userId };
    saveDb(db);
    return db.users[i];
  }

  function petsOf(userId) {
    return getDb().pets.filter((p) => p.userId === userId);
  }

  function getPet(petId) {
    return getDb().pets.find((p) => p.id === petId) || null;
  }

  function upsertPet(pet) {
    const db = getDb();
    const i = db.pets.findIndex((p) => p.id === pet.id);
    if (i >= 0) db.pets[i] = { ...db.pets[i], ...pet };
    else {
      pet.id = pet.id || uid("p");
      db.pets.push(pet);
    }
    saveDb(db);
    return getPet(pet.id);
  }

  function createPet(userId, data) {
    return upsertPet({
      id: uid("p"),
      userId,
      name: data.name || "Nueva mascota",
      species: data.species || "Gato",
      sex: data.sex || "Hembra",
      age: data.age || "",
      breed: data.breed || "",
      weight: data.weight || "",
      photo: data.photo || "assets/gatos/GATO7.png",
      photoFallback: data.photoFallback || "assets/gatos/GATO1.png",
      notes: data.notes || "",
    });
  }

  function appointmentsOf(userId) {
    return getDb()
      .appointments.filter((a) => a.userId === userId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function getAppointment(id) {
    return getDb().appointments.find((a) => a.id === id) || null;
  }

  function makeCode(dateStr) {
    const d = String(dateStr || "").replace(/-/g, "");
    const n = String(getDb().appointments.length + 1).padStart(3, "0");
    const y = d.slice(0, 4) || "2026";
    const md = d.slice(4, 8) || "0101";
    return `CH-${y}-${md}-${n}`;
  }

  function createAppointment(payload) {
    const db = getDb();
    const appt = {
      id: uid("a"),
      code: makeCode(payload.date),
      userId: payload.userId,
      petId: payload.petId,
      serviceId: payload.serviceId || "svc_esterilizacion",
      serviceName: payload.serviceName || "Esterilización felina",
      price: Number(payload.price ?? 55),
      date: payload.date,
      time: payload.time,
      timeLabel: payload.timeLabel || payload.time,
      paymentMethod: payload.paymentMethod || "card",
      status: "confirmed",
      notes: payload.notes || "",
      createdAt: new Date().toISOString(),
    };
    db.appointments.push(appt);
    saveDb(db);
    localStorage.setItem(LAST_APPT_KEY, appt.id);
    return appt;
  }

  function lastAppointment() {
    const id = localStorage.getItem(LAST_APPT_KEY);
    return id ? getAppointment(id) : null;
  }

  function defaultService() {
    return (
      getDb().services[0] || {
        id: "svc_esterilizacion",
        name: "Esterilización felina",
        price: 55,
      }
    );
  }

  function getDraft() {
    try {
      return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null") || {};
    } catch (_) {
      return {};
    }
  }

  function setDraft(patch) {
    const next = { ...getDraft(), ...patch, updatedAt: new Date().toISOString() };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    return next;
  }

  function clearDraft() {
    sessionStorage.removeItem(DRAFT_KEY);
  }

  function petMeta(pet) {
    if (!pet) return "";
    return [pet.sex, pet.age, pet.weight].filter(Boolean).join(" · ");
  }

  function formatDateLong(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const label = dt.toLocaleDateString("es-SV", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function photoSrc(pet) {
    return pet?.photo || "assets/gatos/GATO1.png";
  }

  return {
    init,
    resetDemo,
    getDb,
    saveDb,
    uid,
    getAuth,
    currentUser,
    isLoggedIn,
    loginAs,
    logout,
    findUserByPhone,
    findUserByEmail,
    registerUser,
    updateUser,
    petsOf,
    getPet,
    upsertPet,
    createPet,
    appointmentsOf,
    getAppointment,
    createAppointment,
    lastAppointment,
    defaultService,
    getDraft,
    setDraft,
    clearDraft,
    petMeta,
    formatDateLong,
    photoSrc,
    SEED,
  };
})();

window.Store = Store;
