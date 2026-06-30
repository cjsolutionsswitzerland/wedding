// ── GOOGLE APPS SCRIPT BACKEND ────────────────────────────────────────────────
// Paste this entire file into: Google Sheet → Extensions → Apps Script
// Then deploy: Deploy → New Deployment → Web App
//   Execute as: Me  |  Who has access: Anyone
// Copy the deployment URL and paste it into js/app.js → CONFIG.scriptUrl
//
// Sheet structure expected:
//   Tab 1 (any name, e.g. "Tabelle1"): guest names in column A, starting row 2
//   Tab "Registrations": created automatically on first RSVP submission
//     Columns: Name | Transport | Meal | Allergies | Hotel | Registered | Timestamp

const SPREADSHEET_ID = "1E0QZnlPrUVmtoP2zUS-cFAwxBx_9vCc5CRphEO7y_eQ";
const SHEET_RSVP     = "Registrations";

function doGet(e) {
  const action = (e.parameter.action || "").toLowerCase();

  let result;
  if      (action === "getnames")         result = getNames();
  else if (action === "getregistration")  result = getRegistration(e.parameter.name || "");
  else if (action === "saveregistration") result = saveRegistration(e.parameter);
  else result = { error: "Unknown action: " + action };

  return respond(result);
}

// Returns { names: ["Name1", "Name2", ...] } from the FIRST sheet, column A
function getNames() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0]; // always use the first tab regardless of name
  const last  = sheet.getLastRow();
  if (last < 2) return { names: [] };
  const values = sheet.getRange(2, 1, last - 1, 1).getValues();
  const names  = values.map(r => String(r[0]).trim()).filter(Boolean);
  return { names };
}

// Returns { found: true/false, travel, food, allergies, hotel }
function getRegistration(name) {
  if (!name) return { found: false };
  const sheet = getRsvpSheet();
  const last  = sheet.getLastRow();
  if (last < 2) return { found: false };
  const data = sheet.getRange(2, 1, last - 1, 7).getValues();
  const norm = name.trim().toLowerCase();
  for (const row of data) {
    if (String(row[0]).trim().toLowerCase() === norm) {
      return { found: true, travel: row[1], food: row[2], allergies: row[3], hotel: row[4] };
    }
  }
  return { found: false };
}

// Inserts or updates the row for this guest; also writes back to the first sheet
function saveRegistration(p) {
  const name = String(p.name || "").trim();
  if (!name) return { success: false, error: "Name missing" };

  const sheet = getRsvpSheet();
  const last  = sheet.getLastRow();
  const row   = [name, p.travel || "", p.food || "", p.allergies || "", p.hotel || "", "Yes", new Date()];

  if (last >= 2) {
    const data = sheet.getRange(2, 1, last - 1, 1).getValues();
    const norm = name.toLowerCase();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === norm) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        syncToGuestSheet(name, true);
        return { success: true, updated: true };
      }
    }
  }

  sheet.appendRow(row);
  syncToGuestSheet(name, true);
  return { success: true, updated: false };
}

// Marks the guest as "Registered: Yes" in the original guest list sheet
function syncToGuestSheet(name, registered) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];
  const last  = sheet.getLastRow();
  if (last < 2) return;
  const data = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  const norm = name.toLowerCase();

  // Find which column is "Registered" (column F = index 5 if following the Excel structure)
  // Header row detection: look for "Registered" in row 1
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let regCol = headers.findIndex(h => String(h).toLowerCase() === "registered");
  if (regCol === -1) regCol = 5; // fallback: column F (0-indexed = 5 → 1-indexed = 6)

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === norm) {
      sheet.getRange(i + 2, regCol + 1).setValue(registered ? "Yes" : "No");
      sheet.getRange(i + 2, regCol + 2).setValue(new Date()); // Timestamp next column
      return;
    }
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function getRsvpSheet() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_RSVP);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RSVP);
    sheet.appendRow(["Name", "Transport", "Meal", "Allergies", "Hotel", "Registered", "Timestamp"]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold");
  }
  return sheet;
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
