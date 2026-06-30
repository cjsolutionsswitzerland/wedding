document.addEventListener("DOMContentLoaded", () => {
  const form        = document.getElementById("rsvp-form");
  const nameSelect  = document.getElementById("name-select");
  const submitBtn   = document.getElementById("submit-btn");
  const msgBox      = document.getElementById("msg-box");
  const deadlineEl  = document.getElementById("deadline-info");
  const formWrap    = document.getElementById("form-wrap");

  // Show deadline date
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

  nameSelect.addEventListener("change", () => {
    const name = nameSelect.value;
    if (!name) return;
    checkExisting(name);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameSelect.value;
    if (!name) { showMsg(t("register.name_required"), "error"); return; }

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
      const res = await fetch(CONFIG.scriptUrl + "?" + new URLSearchParams(data));
      const json = await res.json();
      if (json.success) {
        const wasUpdate = submitBtn.dataset.mode === "update";
        showMsg(wasUpdate ? t("register.updated") : t("register.success"), "success");
        submitBtn.textContent = t("register.update");
        submitBtn.dataset.mode = "update";
      } else {
        showMsg(t("register.error"), "error");
      }
    } catch {
      showMsg(t("register.error"), "error");
    } finally {
      submitBtn.disabled = false;
      if (submitBtn.dataset.mode !== "update") submitBtn.textContent = t("register.submit");
    }
  });

  async function loadNames() {
    nameSelect.innerHTML = `<option value="">${t("register.loading")}</option>`;
    try {
      const res  = await fetch(CONFIG.scriptUrl + "?action=getNames");
      const json = await res.json();
      nameSelect.innerHTML = `<option value="" data-i18n="register.select_prompt">${t("register.select_prompt")}</option>`;
      (json.names || []).sort().forEach(n => {
        const opt = document.createElement("option");
        opt.value = opt.textContent = n;
        nameSelect.appendChild(opt);
      });
    } catch {
      nameSelect.innerHTML = `<option value="">${t("register.error")}</option>`;
    }
  }

  async function checkExisting(name) {
    try {
      const res  = await fetch(CONFIG.scriptUrl + "?action=getRegistration&name=" + encodeURIComponent(name));
      const json = await res.json();
      if (json.found) {
        showMsg(t("register.already_registered"), "info");
        fill(json);
        submitBtn.textContent = t("register.update");
        submitBtn.dataset.mode = "update";
      } else {
        clearMsg();
        form.reset();
        nameSelect.value = name;
        submitBtn.textContent = t("register.submit");
        delete submitBtn.dataset.mode;
      }
    } catch { /* silent */ }
  }

  function fill(data) {
    const setRadio = (name, val) => {
      const el = form.querySelector(`input[name="${name}"][value="${val}"]`);
      if (el) el.checked = true;
    };
    setRadio("travel", data.travel);
    setRadio("food",   data.food);
    setRadio("hotel",  data.hotel);
    form.querySelector("#allergies").value = data.allergies || "";
  }

  function showMsg(text, type) {
    msgBox.textContent = text;
    msgBox.className   = "msg-box " + type;
    msgBox.style.display = "block";
  }

  function clearMsg() {
    msgBox.style.display = "none";
    msgBox.className = "msg-box";
  }
});
