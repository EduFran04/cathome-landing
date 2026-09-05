/* ============================================================
   Cat Home — lógica del flujo de reserva (pasos 1–4 + éxito)
   ============================================================ */

const Booking = (() => {
  const STEPS = {
    mascota: { file: "reserva-mascota.html", need: [] },
    datos: { file: "reserva-datos.html", need: [] },
    fecha: { file: "reserva-fecha.html", need: ["petId"] },
    confirma: { file: "reserva-confirma.html", need: ["petId", "date", "time"] },
    pago: { file: "reserva-pago.html", need: ["petId", "date", "time"] },
    exito: { file: "reserva-exito.html", need: [] },
  };

  function redirect(url) {
    location.href = url;
  }

  function ensureDraft(stepKey) {
    const draft = Store.getDraft();
    const cfg = STEPS[stepKey];
    if (!cfg) return draft;
    if (stepKey === "datos" && !draft.petId && !draft.newPet) {
      toast("Selecciona una mascota primero");
      redirect("reserva-mascota.html");
      return null;
    }
    for (const key of cfg.need) {
      if (!draft[key]) {
        toast("Completa el paso anterior para continuar");
        redirect("reserva-mascota.html");
        return null;
      }
    }
    return draft;
  }

  function imgTag(pet, cls) {
    const src = Store.photoSrc(pet);
    const fb = pet?.photoFallback || "assets/gatos/GATO1.png";
    return `<img class="${cls || ""}" src="${src}" alt="${pet?.name || "Mascota"}" onerror="this.onerror=null;this.src='${fb}'">`;
  }

  /* ---------- Paso 1: mascota ---------- */
  function initMascota() {
    const user = Store.currentUser();
    const grid = document.getElementById("petGrid");
    if (!grid || !user) return;

    const draft = Store.getDraft();
    let pets = Store.petsOf(user.id);
    let selected = draft.petId || (pets[0] && pets[0].id);

    // Invitado sin mascotas: ir directo a cargar datos
    if (Store.isGuest() && !pets.length) {
      const svc = Store.defaultService();
      Store.setDraft({
        petId: null,
        newPet: true,
        serviceId: svc.id,
        serviceName: svc.name,
        price: svc.price,
      });
      redirect("reserva-datos.html");
      return;
    }

    function render() {
      pets = Store.petsOf(user.id);
      if (!selected && pets[0]) selected = pets[0].id;
      grid.innerHTML =
        pets
          .map(
            (p) => `
        <button type="button" class="pet-card${p.id === selected ? " on" : ""}" data-pet="${p.id}">
          <span class="chk"><svg class="ic"><use href="#i-check"/></svg></span>
          ${imgTag(p)}
          <strong>${p.name}</strong>
          <small>${Store.petMeta(p)}</small>
        </button>`
          )
          .join("") +
        `<button type="button" class="pet-card add" data-pet="add">
          <span class="plus">+</span>
          <strong>Agregar otra mascota</strong>
        </button>`;

      grid.querySelectorAll(".pet-card:not(.add)").forEach((card) => {
        card.addEventListener("click", () => {
          selected = card.dataset.pet;
          Store.setDraft({ petId: selected, newPet: false });
          render();
        });
      });

      const addBtn = grid.querySelector(".pet-card.add");
      if (addBtn) {
        addBtn.addEventListener("click", () => {
          Store.setDraft({ petId: null, newPet: true });
          redirect("reserva-datos.html");
        });
      }
    }

    render();
    if (selected) Store.setDraft({ petId: selected, newPet: false });

    document.getElementById("btn-add-profile")?.addEventListener("click", (e) => {
      e.preventDefault();
      Store.setDraft({ petId: null, newPet: true });
      redirect("reserva-datos.html");
    });

    const next = document.getElementById("btn-next");
    if (next) {
      next.addEventListener("click", (e) => {
        e.preventDefault();
        if (!selected) {
          toast("Selecciona una mascota para continuar");
          return;
        }
        Store.setDraft({
          petId: selected,
          newPet: false,
          serviceId: Store.defaultService().id,
          serviceName: Store.defaultService().name,
          price: Store.defaultService().price,
        });
        redirect("reserva-datos.html");
      });
    }
  }

  /* ---------- Paso 2: datos ---------- */
  function initDatos() {
    const draft = ensureDraft("datos");
    if (draft === null) return;
    const user = Store.currentUser();
    const isNew = !!draft.newPet;
    const pet = isNew ? null : Store.getPet(draft.petId);

    const $ = (id) => document.getElementById(id);
    if ($("petName")) $("petName").value = pet?.name || "";
    if ($("petSpecies")) $("petSpecies").value = pet?.species || "Gato";
    if ($("petAge")) $("petAge").value = pet?.age || "";
    if ($("petBreed")) $("petBreed").value = pet?.breed || "";
    if ($("petWeight")) $("petWeight").value = pet?.weight || "";
    if ($("petNotes")) $("petNotes").value = pet?.notes || "";

    const sex = pet?.sex || "Hembra";
    document.querySelectorAll('input[name="sex"]').forEach((r) => {
      r.checked = r.value === sex;
    });

    if ($("ownerName")) $("ownerName").value = user.name || "";
    if ($("ownerPhone"))
      $("ownerPhone").value = user.phone
        ? (window.Masks ? Masks.formatSvPhone(user.phone) : user.phone)
        : "";
    if ($("ownerEmail")) $("ownerEmail").value = user.email || "";
    if ($("ownerAddress")) $("ownerAddress").value = user.address || "";

    const next = $("btn-next");
    if (!next) return;
    next.addEventListener("click", (e) => {
      e.preventDefault();
      const name = ($("petName")?.value || "").trim();
      const age = ($("petAge")?.value || "").trim();
      const ownerName = ($("ownerName")?.value || "").trim();
      const ownerEmail = ($("ownerEmail")?.value || "").trim();
      const phoneRaw = ($("ownerPhone")?.value || "").replace(/\D/g, "");
      const phone = phoneRaw.startsWith("503") ? phoneRaw.slice(3) : phoneRaw;
      const err = $("form-error");

      if (!name || !age || !ownerName || !ownerEmail || phone.length < 8) {
        if (err) err.textContent = "Completa los campos obligatorios.";
        toast("Completa los campos obligatorios");
        return;
      }
      if (err) err.textContent = "";

      const sexVal =
        document.querySelector('input[name="sex"]:checked')?.value || "Hembra";
      const petData = {
        name,
        species: $("petSpecies")?.value || "Gato",
        sex: sexVal,
        age,
        breed: ($("petBreed")?.value || "").trim(),
        weight: ($("petWeight")?.value || "").trim(),
        notes: ($("petNotes")?.value || "").trim(),
      };

      let savedPet;
      if (isNew || !draft.petId) {
        savedPet = Store.createPet(user.id, petData);
      } else {
        savedPet = Store.upsertPet({ id: draft.petId, userId: user.id, ...petData });
      }

      Store.updateUser(user.id, {
        name: ownerName,
        email: ownerEmail,
        phone,
        address: ($("ownerAddress")?.value || "").trim(),
      });

      Store.setDraft({
        petId: savedPet.id,
        newPet: false,
        ownerNotes: petData.notes,
      });
      redirect("reserva-fecha.html");
    });
  }

  /* ---------- Paso 3: fecha ---------- */
  function initFecha() {
    const draft = ensureDraft("fecha");
    if (draft === null) return;

    let selectedDate = draft.date || "2026-05-16";
    let selectedTime = draft.time || "10:00";
    let selectedLabel = draft.timeLabel || "10:00 a.m.";

    const dateLabel = document.getElementById("selectedDateLabel");
    function syncLabel() {
      if (dateLabel)
        dateLabel.textContent = `Horarios disponibles para el ${Store.formatDateLong(selectedDate)}.`;
    }
    syncLabel();

    document.querySelectorAll("#calGrid .day.avail").forEach((d) => {
      if (d.dataset.date === selectedDate) d.classList.add("on");
      else if (d.classList.contains("on") && d.dataset.date !== selectedDate)
        d.classList.remove("on");
      d.addEventListener("click", () => {
        document.querySelectorAll("#calGrid .day").forEach((x) => x.classList.remove("on"));
        d.classList.add("on");
        selectedDate = d.dataset.date;
        syncLabel();
      });
    });

    document.querySelectorAll("#slots .slot-btn").forEach((s) => {
      if (s.dataset.time === selectedTime) s.classList.add("on");
      s.addEventListener("click", () => {
        document.querySelectorAll("#slots .slot-btn").forEach((x) => x.classList.remove("on"));
        s.classList.add("on");
        selectedTime = s.dataset.time;
        selectedLabel = s.textContent.trim();
      });
    });

    const next = document.getElementById("btn-next");
    if (next) {
      next.addEventListener("click", (e) => {
        e.preventDefault();
        if (!selectedDate || !selectedTime) {
          toast("Selecciona fecha y horario");
          return;
        }
        Store.setDraft({
          date: selectedDate,
          time: selectedTime,
          timeLabel: selectedLabel,
        });
        redirect("reserva-confirma.html");
      });
    }
  }

  /* ---------- Resumen compartido ---------- */
  function fillSummary(root = document) {
    const draft = Store.getDraft();
    const user = Store.currentUser();
    const pet = Store.getPet(draft.petId);
    const svc = Store.defaultService();
    if (!pet || !user) return;

    root.querySelectorAll("[data-sum='pet-img']").forEach((el) => {
      el.outerHTML = imgTag(pet, el.className);
    });
    root.querySelectorAll("[data-sum='pet-name']").forEach((el) => {
      el.textContent = pet.name;
    });
    root.querySelectorAll("[data-sum='pet-meta']").forEach((el) => {
      el.textContent = `${pet.species} · ${Store.petMeta(pet)}`;
    });
    root.querySelectorAll("[data-sum='date']").forEach((el) => {
      el.textContent = Store.formatDateLong(draft.date);
    });
    root.querySelectorAll("[data-sum='time']").forEach((el) => {
      el.textContent = draft.timeLabel || draft.time;
    });
    root.querySelectorAll("[data-sum='service']").forEach((el) => {
      el.textContent = draft.serviceName || svc.name;
    });
    root.querySelectorAll("[data-sum='price']").forEach((el) => {
      el.textContent = `$${Number(draft.price ?? svc.price).toFixed(2)}`;
    });
    root.querySelectorAll("[data-sum='owner']").forEach((el) => {
      el.textContent = user.name;
    });
    root.querySelectorAll("[data-sum='owner-meta']").forEach((el) => {
      const phone = user.phone
        ? window.Masks
          ? Masks.displaySvPhone(user.phone)
          : `+503 ${user.phone}`
        : "";
      el.textContent = [phone, user.email].filter(Boolean).join(" · ");
    });
  }

  function initConfirma() {
    const draft = ensureDraft("confirma");
    if (draft === null) return;
    fillSummary();
  }

  function initPago() {
    const draft = ensureDraft("pago");
    if (draft === null) return;
    fillSummary();

    let method = draft.paymentMethod || "card";
    const card = document.getElementById("payCard");
    const cash = document.getElementById("payCash");

    function setPay(mode) {
      method = mode;
      card?.classList.toggle("on", mode === "card");
      cash?.classList.toggle("on", mode === "cash");
      const cIn = card?.querySelector("input");
      const kIn = cash?.querySelector("input");
      if (cIn) cIn.checked = mode === "card";
      if (kIn) kIn.checked = mode === "cash";
    }
    card?.addEventListener("click", () => setPay("card"));
    cash?.addEventListener("click", () => setPay("cash"));
    setPay(method);

    function confirmPay(e) {
      e.preventDefault();
      const user = Store.currentUser();
      const d = Store.getDraft();
      if (method === "card") {
        const num = Masks.digits(document.getElementById("cardNumber")?.value || "");
        const exp = Masks.digits(document.getElementById("cardExp")?.value || "");
        const cvc = Masks.digits(document.getElementById("cardCvc")?.value || "");
        const holder = document.getElementById("cardHolder")?.value || "";
        if (num.length < 12 || exp.length < 4 || cvc.length < 3 || !holder.trim()) {
          toast("Completa los datos de la tarjeta (simulación)");
          return;
        }
      }

      const svc = Store.defaultService();
      const appt = Store.createAppointment({
        userId: user.id,
        petId: d.petId,
        serviceId: d.serviceId || svc.id,
        serviceName: d.serviceName || svc.name,
        price: d.price ?? svc.price,
        date: d.date,
        time: d.time,
        timeLabel: d.timeLabel,
        paymentMethod: method,
        notes: d.ownerNotes || "",
      });
      Store.clearDraft();
      toast("¡Pago procesado! Confirmando cita…");
      setTimeout(() => redirect(`reserva-exito.html?id=${appt.id}`), 700);
    }

    document.getElementById("btn-pay")?.addEventListener("click", confirmPay);
    document.getElementById("btn-confirm")?.addEventListener("click", confirmPay);
  }

  function initExito() {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const appt = (id && Store.getAppointment(id)) || Store.lastAppointment();
    if (!appt) {
      toast("No hay una cita reciente para mostrar");
      setTimeout(() => redirect("servicios.html"), 900);
      return;
    }
    const user = Store.currentUser();
    const pet = Store.getPet(appt.petId);
    const guest = Store.isGuest();

    const code = document.getElementById("apptCode");
    if (code) code.textContent = appt.code;

    const verifyMsg = document.getElementById("verifyCodeMsg");
    if (verifyMsg) {
      verifyMsg.hidden = false;
      verifyMsg.textContent = guest
        ? "Guarda este código: en la clínica lo validan en el local. Como invitado no puedes ver Mis citas."
        : "Guarda este código: en la clínica lo validan en el local para confirmar tu cita.";
    }

    const misCitasBtn = document.getElementById("btnMisCitas");
    if (misCitasBtn) {
      if (guest) {
        misCitasBtn.removeAttribute("data-needs-account");
        misCitasBtn.href = "login.html?next=mis-citas.html";
        misCitasBtn.innerHTML =
          'Iniciar sesión <svg class="ic"><use href="#i-arrow-r"/></svg>';
      }
    }

    const host = document.getElementById("exitoDetails");
    if (host && pet && user) {
      const draftLike = {
        petId: pet.id,
        date: appt.date,
        time: appt.time,
        timeLabel: appt.timeLabel,
        serviceName: appt.serviceName,
        price: appt.price,
      };
      Store.setDraft(draftLike);
      fillSummary(host);
      Store.clearDraft();
    }

    document.querySelectorAll("[data-sum='date']").forEach((el) => {
      el.textContent = Store.formatDateLong(appt.date);
    });
    document.querySelectorAll("[data-sum='time']").forEach((el) => {
      el.textContent = appt.timeLabel || appt.time;
    });
    document.querySelectorAll("[data-sum='service']").forEach((el) => {
      el.textContent = appt.serviceName;
    });
    document.querySelectorAll("[data-sum='price']").forEach((el) => {
      el.textContent = `$${Number(appt.price).toFixed(2)}`;
    });
    if (pet) {
      document.querySelectorAll("[data-sum='pet-name']").forEach((el) => {
        el.textContent = pet.name;
      });
      document.querySelectorAll("[data-sum='pet-meta']").forEach((el) => {
        el.textContent = `${pet.species} · ${Store.petMeta(pet)}`;
      });
      document.querySelectorAll("[data-sum='pet-img']").forEach((el) => {
        el.outerHTML = imgTag(pet, el.className || "");
      });
    }
  }

  function initMisCitas() {
    const user = Store.currentUser();
    const list = document.getElementById("citasList");
    const empty = document.getElementById("citasEmpty");
    const filteredEmpty = document.getElementById("citasFilteredEmpty");
    if (!list || !user) return;

    const all = Store.appointmentsOf(user.id);
    let filter = "all";

    function todayISO() {
      const n = new Date();
      const y = n.getFullYear();
      const m = String(n.getMonth() + 1).padStart(2, "0");
      const d = String(n.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    function isUpcoming(a) {
      const today = todayISO();
      if (a.date > today) return true;
      if (a.date < today) return false;
      return String(a.time || "00:00") >= "00:00";
    }

    function filtered() {
      if (filter === "upcoming") return all.filter(isUpcoming);
      if (filter === "past") return all.filter((a) => !isUpcoming(a));
      return all;
    }

    function statusBadge(a) {
      if (a.paymentMethod === "cash") {
        return `<span class="citas-badge cash">Pendiente de pago</span>`;
      }
      return `<span class="citas-badge ok">Confirmada</span>`;
    }

    function cardHtml(a) {
      const pet = Store.getPet(a.petId);
      const fb = pet?.photoFallback || "assets/gatos/GATO1.png";
      const src = Store.photoSrc(pet);
      const payLabel = a.paymentMethod === "cash" ? "Efectivo en clínica" : "Pagado con tarjeta";
      return `<article class="citas-card">
        <div class="top">
          <div class="code-block">
            <div class="label">
              <svg class="ic"><use href="#i-calendar"/></svg>
              Código de cita
            </div>
            <div class="code">${a.code}</div>
          </div>
          ${statusBadge(a)}
        </div>
        <div class="body">
          <div class="pet">
            <img src="${src}" alt="${pet?.name || "Mascota"}" onerror="this.onerror=null;this.src='${fb}'">
            <div>
              <strong>${pet?.name || "Mascota"}</strong>
              <small>${pet ? `${pet.species} · ${Store.petMeta(pet)}` : ""}</small>
            </div>
          </div>
          <div class="meta">
            <span><svg class="ic"><use href="#i-calendar"/></svg>${Store.formatDateLong(a.date)}</span>
            <span><svg class="ic"><use href="#i-clock"/></svg>${a.timeLabel || a.time}</span>
            <span><svg class="ic"><use href="#i-stethoscope"/></svg>${a.serviceName}</span>
          </div>
          <div class="price-col">
            <div class="price">$${Number(a.price).toFixed(2)}</div>
            <span class="pay">${payLabel}</span>
          </div>
        </div>
        <div class="foot">
          <a class="btn btn-outline-green" href="reserva-exito.html?id=${a.id}">
            Ver comprobante <svg class="ic"><use href="#i-arrow-r"/></svg>
          </a>
        </div>
      </article>`;
    }

    function render() {
      if (!all.length) {
        list.innerHTML = "";
        list.hidden = true;
        if (empty) empty.hidden = false;
        if (filteredEmpty) filteredEmpty.hidden = true;
        return;
      }
      if (empty) empty.hidden = true;
      const items = filtered();
      if (!items.length) {
        list.innerHTML = "";
        list.hidden = true;
        if (filteredEmpty) filteredEmpty.hidden = false;
        return;
      }
      if (filteredEmpty) filteredEmpty.hidden = true;
      list.hidden = false;
      list.innerHTML = items.map(cardHtml).join("");
    }

    document.querySelectorAll(".citas-tabs [data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        filter = btn.dataset.filter;
        document.querySelectorAll(".citas-tabs [data-filter]").forEach((b) => {
          const on = b === btn;
          b.classList.toggle("on", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        render();
      });
    });

    render();
  }

  async function boot() {
    await Store.init();
    if (document.body.hasAttribute("data-requires-account") && !Store.isLoggedIn()) {
      return;
    }
    if (document.body.hasAttribute("data-requires-auth") && !Store.canBook()) {
      return;
    }
    const step = document.body.dataset.booking;
    if (!step) return;
    const map = {
      mascota: initMascota,
      datos: initDatos,
      fecha: initFecha,
      confirma: initConfirma,
      pago: initPago,
      exito: initExito,
      "mis-citas": initMisCitas,
    };
    map[step]?.();
  }

  return { boot, fillSummary };
})();

document.addEventListener("DOMContentLoaded", () => {
  Booking.boot();
});
