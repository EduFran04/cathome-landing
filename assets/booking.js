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
    const fb = pet?.photoFallback || Store.petPhotos()[0];
    return `<img class="${cls || ""}" src="${src}" alt="${pet?.name || "Mascota"}" onerror="this.onerror=null;this.src='${fb}'">`;
  }

  /** Círculo "Agregar foto" + modal de selección (solo assets demo). */
  function ensurePhotoModal() {
    let modal = document.getElementById("photoModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "photoModal";
    modal.className = "photo-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="photo-modal-backdrop" data-photo-close tabindex="-1"></div>
      <div class="photo-modal-card" role="dialog" aria-modal="true" aria-labelledby="photoModalTitle">
        <div class="photo-modal-head">
          <div>
            <h3 id="photoModalTitle">Elige una foto</h3>
            <p>Demo: selecciona una de las imágenes de gatos disponibles.</p>
          </div>
          <button type="button" class="photo-modal-x" data-photo-close aria-label="Cerrar">×</button>
        </div>
        <div class="photo-picker" data-photo-modal-grid></div>
        <div class="photo-modal-actions">
          <button type="button" class="btn btn-soft" data-photo-close>Cancelar</button>
          <button type="button" class="btn btn-orange" data-photo-confirm>Usar esta foto</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function bindPhotoPicker(root, selectedSrc) {
    const scope = root && root.querySelector ? root : document;
    const trigger =
      scope.querySelector("[data-photo-trigger]") ||
      document.querySelector("[data-photo-trigger]");
    if (!trigger) return Store.petPhotos()[0];

    const photos = Store.petPhotos();
    let selected =
      selectedSrc && photos.includes(selectedSrc) ? selectedSrc : "";

    const preview = trigger.querySelector("[data-photo-preview]");
    const placeholder = trigger.querySelector("[data-photo-placeholder]");
    const valueEl =
      scope.querySelector("[data-photo-value]") ||
      document.querySelector("[data-photo-value]");

    function paintCircle() {
      if (valueEl) valueEl.value = selected || "";
      if (selected && preview) {
        preview.src = selected;
        preview.hidden = false;
        if (placeholder) placeholder.hidden = true;
        trigger.classList.add("has-photo");
        preview.onerror = () => {
          preview.hidden = true;
          if (placeholder) placeholder.hidden = false;
          trigger.classList.remove("has-photo");
        };
      } else {
        if (preview) preview.hidden = true;
        if (placeholder) placeholder.hidden = false;
        trigger.classList.remove("has-photo");
      }
    }

    let pending = selected || photos[0];

    function openModal() {
      const modal = ensurePhotoModal();
      const grid = modal.querySelector("[data-photo-modal-grid]");
      pending = selected || photos[0];

      function paintGrid() {
        grid.innerHTML = photos
          .map(
            (src) => `
          <button type="button" class="photo-opt${src === pending ? " on" : ""}" data-pet-photo="${src}" aria-pressed="${src === pending}">
            <img src="${src}" alt="Foto de gato">
          </button>`
          )
          .join("");
        grid.querySelectorAll("[data-pet-photo]").forEach((btn) => {
          btn.addEventListener("click", () => {
            pending = btn.dataset.petPhoto;
            paintGrid();
          });
        });
      }
      paintGrid();
      modal.hidden = false;
      document.body.classList.add("photo-modal-open");
    }

    function closeModal() {
      const modal = document.getElementById("photoModal");
      if (!modal) return;
      modal.hidden = true;
      document.body.classList.remove("photo-modal-open");
    }

    function confirmModal() {
      selected = pending || photos[0];
      paintCircle();
      closeModal();
    }

    const modal = ensurePhotoModal();
    if (!modal.dataset.bound) {
      modal.dataset.bound = "1";
      modal.addEventListener("click", (e) => {
        if (e.target.closest("[data-photo-close]")) closeModal();
        if (e.target.closest("[data-photo-confirm]")) {
          if (typeof modal._confirm === "function") modal._confirm();
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modal.hidden) closeModal();
      });
    }
    modal._confirm = confirmModal;

    trigger.onclick = (e) => {
      e.preventDefault();
      openModal();
    };

    paintCircle();
    trigger._getSelected = () => selected || photos[0];
    if (valueEl) valueEl._getSelected = () => selected || photos[0];
    return selected || photos[0];
  }

  function selectedPetPhoto(root) {
    const scope = root && root.querySelector ? root : document;
    const trigger =
      scope.querySelector("[data-photo-trigger]") ||
      document.querySelector("[data-photo-trigger]");
    if (trigger && typeof trigger._getSelected === "function") {
      return trigger._getSelected();
    }
    const valueEl =
      scope.querySelector("[data-photo-value]") ||
      document.querySelector("[data-photo-value]");
    if (valueEl?.value) return valueEl.value;
    return Store.petPhotos()[0];
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

    bindPhotoPicker(document, pet?.photo);

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
      const photo = selectedPetPhoto();
      const petData = {
        name,
        species: $("petSpecies")?.value || "Gato",
        sex: sexVal,
        age,
        breed: ($("petBreed")?.value || "").trim(),
        weight: ($("petWeight")?.value || "").trim(),
        notes: ($("petNotes")?.value || "").trim(),
        photo,
        photoFallback: Store.petPhotos()[0],
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

  function initPerfil() {
    const user = Store.currentUser();
    if (!user) return;

    const $id = (id) => document.getElementById(id);
    let editingPetId = null;

    const providerLabel = {
      phone: "Teléfono",
      email: "Correo",
      google: "Google",
      facebook: "Facebook",
      guest: "Invitado",
    };

    function fillOwner() {
      const u = Store.currentUser();
      if (!u) return;
      if ($id("perfilName")) $id("perfilName").textContent = u.name || "—";
      if ($id("perfilProvider")) {
        $id("perfilProvider").textContent = providerLabel[u.provider] || u.provider || "Cuenta";
      }
      if ($id("ownerName")) $id("ownerName").value = u.name || "";
      if ($id("ownerPhone")) {
        $id("ownerPhone").value = u.phone
          ? window.Masks
            ? Masks.formatSvPhone(u.phone)
            : u.phone
          : "";
      }
      if ($id("ownerEmail")) $id("ownerEmail").value = u.email || "";
      if ($id("ownerAddress")) $id("ownerAddress").value = u.address || "";
    }

    function closePetForm() {
      editingPetId = null;
      const panel = $id("petFormPanel");
      if (panel) panel.hidden = true;
      if ($id("pet-error")) $id("pet-error").textContent = "";
    }

    function openPetForm(pet) {
      editingPetId = pet?.id || null;
      const panel = $id("petFormPanel");
      if (!panel) return;
      panel.hidden = false;
      if ($id("petFormTitle")) {
        $id("petFormTitle").textContent = pet ? `Editar a ${pet.name}` : "Nueva mascota";
      }
      if ($id("petName")) $id("petName").value = pet?.name || "";
      if ($id("petSpecies")) $id("petSpecies").value = pet?.species || "Gato";
      if ($id("petAge")) $id("petAge").value = pet?.age || "";
      if ($id("petBreed")) $id("petBreed").value = pet?.breed || "";
      if ($id("petWeight")) $id("petWeight").value = pet?.weight || "";
      if ($id("petNotes")) $id("petNotes").value = pet?.notes || "";
      const sex = pet?.sex || "Hembra";
      document.querySelectorAll('input[name="sex"]').forEach((r) => {
        r.checked = r.value === sex;
      });
      bindPhotoPicker(panel, pet?.photo);
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderPets() {
      const u = Store.currentUser();
      const grid = $id("perfilPetGrid");
      const empty = $id("petsEmpty");
      if (!grid || !u) return;
      const pets = Store.petsOf(u.id);

      if (!pets.length) {
        grid.innerHTML = "";
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;
      grid.innerHTML = pets
        .map((p) => {
          const src = Store.photoSrc(p);
          const fb = p.photoFallback || "assets/gatos/GATO1.png";
          return `<article class="perfil-pet-card">
            <img src="${src}" alt="${p.name}" onerror="this.onerror=null;this.src='${fb}'">
            <div class="info">
              <strong>${p.name}</strong>
              <small>${p.species || "Gato"} · ${Store.petMeta(p)}</small>
              ${p.breed ? `<span class="tag">${p.breed}</span>` : ""}
              ${p.notes ? `<p class="note">${p.notes}</p>` : ""}
            </div>
            <div class="actions">
              <button type="button" class="btn btn-soft" data-edit-pet="${p.id}">Editar</button>
              <a class="btn btn-orange" href="reserva-mascota.html" data-book-pet="${p.id}">Agendar</a>
            </div>
          </article>`;
        })
        .join("");

      grid.querySelectorAll("[data-edit-pet]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const pet = Store.getPet(btn.dataset.editPet);
          if (pet) openPetForm(pet);
        });
      });
      grid.querySelectorAll("[data-book-pet]").forEach((a) => {
        a.addEventListener("click", () => {
          const svc = Store.defaultService();
          Store.setDraft({
            petId: a.dataset.bookPet,
            newPet: false,
            serviceId: svc.id,
            serviceName: svc.name,
            price: svc.price,
          });
        });
      });
    }

    fillOwner();
    renderPets();
    if (window.initMasks) initMasks();

    $id("ownerForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = ($id("ownerName")?.value || "").trim();
      const email = ($id("ownerEmail")?.value || "").trim();
      const phoneRaw = ($id("ownerPhone")?.value || "").replace(/\D/g, "");
      const phone = phoneRaw.startsWith("503") ? phoneRaw.slice(3) : phoneRaw;
      const err = $id("owner-error");
      if (!name || !email || phone.length < 8) {
        if (err) err.textContent = "Completa nombre, teléfono y correo.";
        toast("Completa los campos obligatorios");
        return;
      }
      if (err) err.textContent = "";
      Store.updateUser(user.id, {
        name,
        email,
        phone,
        address: ($id("ownerAddress")?.value || "").trim(),
      });
      fillOwner();
      toast("Datos del perfil guardados");
    });

    const openAdd = () => openPetForm(null);
    $id("btn-add-pet")?.addEventListener("click", openAdd);
    $id("btn-add-pet-empty")?.addEventListener("click", openAdd);
    $id("btn-cancel-pet")?.addEventListener("click", closePetForm);

    $id("btn-save-pet")?.addEventListener("click", () => {
      const name = ($id("petName")?.value || "").trim();
      const age = ($id("petAge")?.value || "").trim();
      const err = $id("pet-error");
      if (!name || !age) {
        if (err) err.textContent = "Nombre y edad son obligatorios.";
        toast("Completa nombre y edad");
        return;
      }
      if (err) err.textContent = "";
      const sexVal =
        document.querySelector('input[name="sex"]:checked')?.value || "Hembra";
      const photo = selectedPetPhoto($id("petFormPanel"));
      const petData = {
        name,
        species: $id("petSpecies")?.value || "Gato",
        sex: sexVal,
        age,
        breed: ($id("petBreed")?.value || "").trim(),
        weight: ($id("petWeight")?.value || "").trim(),
        notes: ($id("petNotes")?.value || "").trim(),
        photo,
        photoFallback: Store.petPhotos()[0],
      };
      if (editingPetId) {
        Store.upsertPet({ id: editingPetId, userId: user.id, ...petData });
        toast(`Datos de ${name} actualizados`);
      } else {
        Store.createPet(user.id, petData);
        toast(`${name} se agregó a tu perfil`);
      }
      closePetForm();
      renderPets();
    });
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
      perfil: initPerfil,
    };
    map[step]?.();
  }

  return { boot, fillSummary };
})();

document.addEventListener("DOMContentLoaded", () => {
  Booking.boot();
});
