// ── GOOGLE APPS SCRIPT BACKEND ────────────────────────────────────────────────
// Paste this entire file into: Google Sheet → Extensions → Apps Script
// Then: Deploy → Bereitstellungen verwalten → Bearbeiten → neue Version → Aktualisieren
//
// Alles wird direkt in Tab 1 (Tabelle1) geschrieben.
// Erwartete Spalten in Zeile 1:
//   Name | Transport | Meal | Allergies | Hotel | Registered | Timestamp

const SPREADSHEET_ID = "1E0QZnlPrUVmtoP2zUS-cFAwxBx_9vCc5CRphEO7y_eQ";

function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();

  let result;
  if      (action === "getnames")         result = getNames();
  else if (action === "getregistration")  result = getRegistration(e.parameter.name || "");
  else if (action === "saveregistration") result = saveRegistration(e.parameter);
  else result = { error: "Unknown action: " + action };

  return respond(result);
}

// Returns { names: [...] } — column A, row 2 onwards
function getNames() {
  const sheet = getMainSheet();
  const last  = sheet.getLastRow();
  if (last < 2) return { names: [] };
  const values = sheet.getRange(2, 1, last - 1, 1).getValues();
  return { names: values.map(r => String(r[0]).trim()).filter(Boolean) };
}

// Returns existing registration data for a guest
function getRegistration(name) {
  if (!name) return { found: false };
  const sheet   = getMainSheet();
  const cols    = getColumnMap(sheet);
  const last    = sheet.getLastRow();
  if (last < 2) return { found: false };

  const data = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  const norm = name.trim().toLowerCase();

  for (const row of data) {
    if (String(row[0]).trim().toLowerCase() === norm) {
      return {
        found:     true,
        travel:    row[cols.transport] ?? "",
        food:      row[cols.meal]      ?? "",
        allergies: row[cols.allergies] ?? "",
        hotel:     row[cols.hotel]     ?? ""
      };
    }
  }
  return { found: false };
}

// Writes all registration fields directly into Tabelle1
function saveRegistration(p) {
  const name = String(p.name || "").trim();
  if (!name) return { success: false, error: "Name missing" };

  const sheet = getMainSheet();
  const cols  = getColumnMap(sheet);
  const last  = sheet.getLastRow();
  if (last < 2) return { success: false, error: "No guests found" };

  const data = sheet.getRange(2, 1, last - 1, 1).getValues();
  const norm = name.toLowerCase();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === norm) {
      const rowNum = i + 2; // +1 for header, +1 for 1-based index
      sheet.getRange(rowNum, cols.transport + 1).setValue(p.travel    || "");
      sheet.getRange(rowNum, cols.meal      + 1).setValue(p.food      || "");
      sheet.getRange(rowNum, cols.allergies + 1).setValue(p.allergies || "");
      sheet.getRange(rowNum, cols.hotel     + 1).setValue(p.hotel     || "");
      sheet.getRange(rowNum, cols.registered + 1).setValue("Yes");
      sheet.getRange(rowNum, cols.timestamp + 1).setValue(new Date());
      return { success: true };
    }
  }

  return { success: false, error: "Name not found in guest list" };
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getMainSheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
}

// Reads header row and returns 0-based column indices for each field
function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).toLowerCase().trim());

  return {
    transport:  headers.indexOf("transport"),
    meal:       headers.indexOf("meal"),
    allergies:  headers.indexOf("allergies"),
    hotel:      headers.indexOf("hotel"),
    registered: headers.indexOf("registered"),
    timestamp:  headers.indexOf("timestamp")
  };
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
