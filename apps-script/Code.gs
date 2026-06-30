// ── GOOGLE APPS SCRIPT BACKEND ────────────────────────────────────────────────
// Paste this entire file into: Google Sheet → Extensions → Apps Script
// Then deploy: Deploy → New Deployment → Web App
//   Execute as: Me  |  Who has access: Anyone
// Copy the deployment URL and paste it into js/app.js → CONFIG.scriptUrl

const SPREADSHEET_ID    = "1E0QZnlPrUVmtoP2zUS-cFAwxBx_9vCc5CRphEO7y_eQ";
const SHEET_NAMES       = "Gaeste";        // Sheet tab with the guest list (column A = names)
const SHEET_RSVP        = "Anmeldungen";  // Sheet tab where responses are written

function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();

  let result;
  if      (action === "getnames")         result = getNames();
  else if (action === "getregistration")  result = getRegistration(e.parameter.name || "");
  else if (action === "saveregistration") result = saveRegistration(e.parameter);
  else result = { error: "Unknown action: " + action };

  return respond(result);
}

// Returns { names: ["Name1", "Name2", ...] }
function getNames() {
  const sheet  = getSheet(SHEET_NAMES);
  const values = sheet.getRange("A2:A").getValues();
  const names  = values.map(r => String(r[0]).trim()).filter(Boolean);
  return { names };
}

// Returns { found: true/false, travel, food, allergies, hotel }
function getRegistration(name) {
  if (!name) return { found: false };
  const sheet = getSheet(SHEET_RSVP);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === name.trim().toLowerCase()) {
      return {
        found:     true,
        travel:    data[i][1],
        food:      data[i][2],
        allergies: data[i][3],
        hotel:     data[i][4]
      };
    }
  }
  return { found: false };
}

// Inserts or updates a row for the given name
function saveRegistration(p) {
  const name = String(p.name || "").trim();
  if (!name) return { success: false, error: "Name missing" };

  const sheet = getSheet(SHEET_RSVP);
  ensureHeaders(sheet);

  const data = sheet.getDataRange().getValues();
  const row  = [name, p.travel || "", p.food || "", p.allergies || "", p.hotel || "", new Date()];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === name.toLowerCase()) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true, updated: true };
    }
  }

  sheet.appendRow(row);
  return { success: true, updated: false };
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getSheet(name) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Name", "Anreise", "Essen", "Allergien", "Hotel", "Zeitstempel"]);
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
