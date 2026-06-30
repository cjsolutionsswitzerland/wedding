document.addEventListener("DOMContentLoaded", () => {
  const form       = document.getElementById("rsvp-form");
  const nameInput  = document.getElementById("name-input");
  const nameValue  = document.getElementById("name-value");
  const dropdown   = document.getElementById("name-dropdown");
  const submitBtn  = document.getElementById("submit-btn");
  const msgBox     = document.getElementById("msg-box");
  const deadlineEl = document.getElementById("deadline-info");
  const formWrap   = document.getElementById("form-wrap");

  let allNames     = [];
  let nameSelected = false; // true only after clicking a suggestion

  // Show deadline
  if (deadlineEl) {
    deadlineEl.textContent = CONFIG.deadline.toLocaleDateString(currentLang, {
      day: "numeric", month: "long", year: "numeric"
    });
  }

  if (isDeadlinePassed()) {
    if (formWrap) formWrap.style.display = "none";
    showMsg(t("register.deadline_passed"), "error");
    return;
  }

  loadNames();

  // ── SEARCH / AUTOCOMPLETE ──────────────────────────────────────────────────

  nameInput.addEventListener("input", () => {
    nameSelected = false;
    nameValue.value = "";
    nameInput.classList.remove("has-selection");
    const q = nameInput.value.trim().toLowerCase();
    if (!q) { closeDropdown(); return; }
    const matches = allNames.filter(n => n.toLowerCase().includes(q));
    renderDropdown(matches);
  });

  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".name-search-wrap")) closeDropdown();
  });

  function renderDropdown(names) {
    dropdown.innerHTML = "";
    if (names.length === 0) {
      const div = document.createElement("div");
      div.className = "name-option no-result";
      div.textContent = t("register.no_results");
      dropdown.appendChild(div);
    } else {
      names.forEach(name => {
        const div = document.createElement("div");
        div.className = "name-option";
        div.textContent = name;
        div.addEventListener("mousedown", (e) => {
          e.preventDefault(); // prevent blur before click fires
          selectName(name);
        });
        dropdown.appendChild(div);
      });
    }
    dropdown.classList.add("open");
  }

  function selectName(name) {
    nameInput.value  = name;
    nameValue.value  = name;
    nameSelected     = true;
    nameInput.classList.add("has-selection");
    closeDropdown();
    resetForm(name);
    checkExisting(name);
  }

  function closeDropdown() {
    dropdown.classList.remove("open");
    dropdown.innerHTML = "";
  }

  // ── FORM ──────────────────────────────────────────────────────────────────

  function resetForm(keepName) {
    form.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    form.querySelector("#allergies").value = "";
    clearMsg();
    submitBtn.textContent = t("register.submit");
    delete submitBtn.dataset.mode;
    // restore name fields after form.reset would clear them
    nameInput.value = keepName || "";
    nameValue.value = keepName || "";
  }

  async function loadNames() {
    nameInput.placeholder = t("register.loading");
    try {
      const res  = await fetch(CONFIG.scriptUrl + "?action=getNames");
      const json = await res.json();
      allNames   = (json.names || []).sort();
      nameInput.placeholder = t("register.search_placeholder");
    } catch {
      nameInput.placeholder = t("register.error");
    }
  }

  async function checkExisting(name) {
    try {
      const res  = await fetch(CONFIG.scriptUrl + "?action=getRegistration&name=" + encodeURIComponent(name));
      const json = await res.json();
      if (json.found && (json.travel || json.food || json.hotel)) {
        showMsg(t("register.already_registered"), "info");
        fillForm(json);
        submitBtn.textContent = t("register.update");
        submitBtn.dataset.mode = "update";
      }
    } catch { /* silent */ }
  }

  function fillForm(data) {
    // Always clear first, then set
    form.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    form.querySelector("#allergies").value = data.allergies || "";
    setRadio("travel", data.travel);
    setRadio("food",   data.food);
    setRadio("hotel",  data.hotel);
  }

  function setRadio(name, val) {
    if (!val) return;
    const el = form.querySelector(`input[name="${name}"][value="${val}"]`);
    if (el) el.checked = true;
  }

  // ── SUBMIT ────────────────────────────────────────────────────────────────

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameValue.value.trim();
    if (!name || !nameSelected) {
      showMsg(t("register.name_required"), "error");
      nameInput.focus();
      return;
    }

    const data = {
      action:    "saveRegistration",
      name:      name,
      travel:    form.querySelector('input[name="travel"]:checked')?.value || "",
      food:      form.querySelector('input[name="food"]:checked')?.value   || "",
      allergies: form.querySelector("#allergies").value.trim(),
      hotel:     form.querySelector('input[name="hotel"]:checked')?.value  || ""
    };

    submitBtn.disabled = true;
    submitBtn.textContent = t("register.saving");

    try {
      const res  = await fetch(CONFIG.scriptUrl + "?" + new URLSearchParams(data));
      const json = await res.json();
      if (json.success) {
        const wasUpdate = submitBtn.dataset.mode === "update";
        showMsg(wasUpdate ? t("register.updated") : t("register.success"), "success");
        submitBtn.textContent = t("register.update");
        submitBtn.dataset.mode = "update";
      } else {
        showMsg(t("register.error") + (json.error ? ": " + json.error : ""), "error");
      }
    } catch {
      showMsg(t("register.error"), "error");
    } finally {
      submitBtn.disabled = false;
      if (submitBtn.dataset.mode !== "update") submitBtn.textContent = t("register.submit");
    }
  });

  // ── HELPERS ───────────────────────────────────────────────────────────────

  function showMsg(text, type) {
    msgBox.textContent  = text;
    msgBox.className    = "msg-box " + type;
    msgBox.style.display = "block";
  }

  function clearMsg() {
    msgBox.style.display = "none";
    msgBox.className = "msg-box";
  }
});
