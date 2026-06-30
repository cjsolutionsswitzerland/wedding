// ── GOOGLE APPS SCRIPT BACKEND ────────────────────────────────────────────────
// Paste this entire file into: Google Sheet → Extensions → Apps Script
// Then: Deploy → Bereitstellungen verwalten → Bearbeiten → neue Version → Aktualisieren
//
// Tabelle1 muss folgende Spalten in Zeile 1 haben (Reihenfolge egal, Gross/Kleinschreibung egal):
//   Name | Transport | Meal | Allergies | Hotel | Registered | Timestamp

const SPREADSHEET_ID = "1E0QZnlPrUVmtoP2zUS-cFAwxBx_9vCc5CRphEO7y_eQ";

function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();

  let result;
  if      (action === "getnames")         result = getNames();
  else if (action === "getregistration")  result = getRegistration(e.parameter.name || "");
  else if (action === "saveregistration") result = saveRegistration(e.parameter);
  else if (action === "debug")            result = debugSheet();
  else result = { error: "Unknown action: " + action };

  return respond(result);
}

// ── MAIN FUNCTIONS ────────────────────────────────────────────────────────────

function getNames() {
  const sheet = getMainSheet();
  const last  = sheet.getLastRow();
  if (last < 2) return { names: [] };
  const values = sheet.getRange(2, 1, last - 1, 1).getValues();
  return { names: values.map(r => String(r[0]).trim()).filter(Boolean) };
}

function getRegistration(name) {
  if (!name) return { found: false };
  const sheet = getMainSheet();
  const cols  = getColumnMap(sheet);
  if (cols.error) return { found: false, error: cols.error };

  const last = sheet.getLastRow();
  if (last < 2) return { found: false };

  const data = sheet.getRange(2, 1, last - 1, Math.max(...Object.values(cols)) + 1).getValues();
  const norm = name.trim().toLowerCase();

  for (const row of data) {
    if (String(row[0]).trim().toLowerCase() === norm) {
      return {
        found:     true,
        travel:    String(row[cols.transport] ?? ""),
        food:      String(row[cols.meal]      ?? ""),
        allergies: String(row[cols.allergies] ?? ""),
        hotel:     String(row[cols.hotel]     ?? "")
      };
    }
  }
  return { found: false };
}

function saveRegistration(p) {
  const name = String(p.name || "").trim();
  if (!name) return { success: false, error: "Name missing" };

  const sheet = getMainSheet();
  const cols  = getColumnMap(sheet);
  if (cols.error) return { success: false, error: "Column mapping failed: " + cols.error };

  const last = sheet.getLastRow();
  if (last < 2) return { success: false, error: "No guests found in sheet" };

  const names = sheet.getRange(2, 1, last - 1, 1).getValues();
  const norm  = name.toLowerCase();

  for (let i = 0; i < names.length; i++) {
    if (String(names[i][0]).trim().toLowerCase() === norm) {
      const row = i + 2; // +1 header, +1 for 1-based

      // Write each field using the detected column (1-based for getRange)
      if (cols.transport  >= 0) sheet.getRange(row, cols.transport  + 1).setValue(p.travel    || "");
      if (cols.meal       >= 0) sheet.getRange(row, cols.meal       + 1).setValue(p.food      || "");
      if (cols.allergies  >= 0) sheet.getRange(row, cols.allergies  + 1).setValue(p.allergies || "");
      if (cols.hotel      >= 0) sheet.getRange(row, cols.hotel      + 1).setValue(p.hotel     || "");
      if (cols.registered >= 0) sheet.getRange(row, cols.registered + 1).setValue("Yes");
      if (cols.timestamp  >= 0) sheet.getRange(row, cols.timestamp  + 1).setValue(new Date());

      return { success: true, row: row, cols: cols };
    }
  }

  return { success: false, error: "Name not found: " + name };
}

// ── DEBUG ─────────────────────────────────────────────────────────────────────

function debugSheet() {
  const sheet   = getMainSheet();
  const cols    = getColumnMap(sheet);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows    = sheet.getLastRow();
  const sample  = rows >= 2 ? sheet.getRange(2, 1, Math.min(rows - 1, 3), sheet.getLastColumn()).getValues() : [];

  return { sheetName: sheet.getName(), headers: headers, columnMap: cols, totalRows: rows, sampleData: sample };
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function getMainSheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
}

function getColumnMap(sheet) {
  const raw     = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headers = raw.map(h => String(h).toLowerCase().trim());

  const map = {
    transport:  headers.indexOf("transport"),
    meal:       headers.indexOf("meal"),
    allergies:  headers.indexOf("allergies"),
    hotel:      headers.indexOf("hotel"),
    registered: headers.indexOf("registered"),
    timestamp:  headers.indexOf("timestamp")
  };

  const missing = Object.entries(map).filter(([, v]) => v === -1).map(([k]) => k);
  if (missing.length > 0) map.error = "Headers not found: " + missing.join(", ") + " — found: " + headers.join(", ");

  return map;
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
