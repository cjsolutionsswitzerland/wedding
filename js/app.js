// ── CONFIGURATION ────────────────────────────────────────────────────────────
const CONFIG = {
  coupleName:  "Chiara & Yago",
  weddingDate: "1. Januar 2027",
  location:    "Mailand, Italien",
  scriptUrl:   "https://script.google.com/macros/s/AKfycbw7kWnvEgfNCOIpFdEkoMp65eYWlTESqDDjLPNtSrloHhZy1_e5YrE2iEfxetLgPSkQ/exec",
  deadline:    new Date("2026-08-30T23:59:59")
};

// ── LANGUAGE ──────────────────────────────────────────────────────────────────
const SUPPORTED = ["it", "es", "en"];
const DEFAULT   = "en";

function detectLang() {
  const stored = localStorage.getItem("lang");
  if (stored && SUPPORTED.includes(stored)) return stored;
  const browser = (navigator.language || navigator.userLanguage || "").slice(0, 2).toLowerCase();
  return SUPPORTED.includes(browser) ? browser : DEFAULT;
}

let currentLang = detectLang();

function t(key) {
  const keys = key.split(".");
  let obj = T[currentLang] || T[DEFAULT];
  for (const k of keys) obj = obj?.[k];
  return obj ?? key;
}

function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem("lang", lang);
  applyTranslations();
  updateLangButtons();
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.title = CONFIG.coupleName + " — " + t("nav." + currentPage());
}

function updateLangButtons() {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}

function currentPage() {
  const p = location.pathname.split("/").pop().replace(".html", "");
  if (p === "wishlist") return "wishlist";
  if (p === "register") return "rsvp";
  return "info";
}

// ── DEADLINE ──────────────────────────────────────────────────────────────────
function isDeadlinePassed() {
  return new Date() > CONFIG.deadline;
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Insert couple name wherever needed
  document.querySelectorAll(".couple-name").forEach(el => el.textContent = CONFIG.coupleName);
  document.querySelectorAll(".wedding-date").forEach(el => el.textContent = CONFIG.weddingDate);
  document.querySelectorAll(".wedding-location").forEach(el => el.textContent = CONFIG.location);

  // Lang buttons
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  // Highlight active nav link
  const links = document.querySelectorAll(".nav-link");
  const page = currentPage();
  links.forEach(l => {
    if (l.dataset.page === page) l.classList.add("active");
  });

  applyTranslations();
  updateLangButtons();

  // Mobile hamburger
  const hamburger = document.getElementById("hamburger");
  const navMenu   = document.getElementById("nav-menu");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => navMenu.classList.toggle("open"));
  }
});
