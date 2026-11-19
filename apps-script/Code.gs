/**
 * Alapihan Puutarha – kasvihuonekartan tallennus Google-taulukkoon.
 *
 * Asennus (tehdään kerran):
 *  1. Avaa jaettu Google-taulukko → Laajennukset → Apps Script.
 *  2. Poista valmis koodi ja liitä tämä tiedosto tilalle. Tallenna.
 *  3. Ota käyttöön → Uusi käyttöönotto → tyyppi "Verkkosovellus".
 *       Suorita käyttäjänä: Minä
 *       Kenellä on pääsy: Kuka tahansa
 *  4. Hyväksy oikeudet ja kopioi verkkosovelluksen URL (päättyy /exec).
 *  5. Perheen PIN-koodi: Projektin asetukset (rataskuvake) → Skriptin ominaisuudet
 *     → Lisää ominaisuus: nimi PIN, arvo = perheen koodi. Tallenna.
 *     Koodi on vain täällä, ei julkisessa GitHub-koodissa.
 *
 * The map reads all labels with GET and saves one label with POST.
 * Each section is one row on the "Kasvit" sheet; you can also edit
 * the plant and notes columns straight in the spreadsheet.
 */

const SHEET_NAME = "Kasvit";
const HEADERS = ["Koodi", "Paikka", "Kasvi", "Muistiinpanot", "Päivitetty"];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 320);
    sheet.setColumnWidth(3, 220);
    sheet.setColumnWidth(4, 320);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** GET → { ok: true, sections: { "T4-S3": { species, note }, ... } } */
function doGet() {
  const sheet = getSheet_();
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues() : [];
  const sections = {};
  rows.forEach(([id, , species, note]) => {
    if (id) sections[String(id)] = { species: String(species || ""), note: String(note || "") };
  });
  return json_({ ok: true, sections });
}

/** True when the family PIN sent by the map matches the PIN script property. */
function pinOk_(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty("PIN");
  return !!expected && String(pin || "").trim() === expected.trim();
}

/** POST body (text/plain JSON): { id, name, species, note, pin } → upserts that section's row. */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad json" });
  }
  // a wrong PIN waits a moment, so guessing the code is slow
  if (!pinOk_(data.pin)) { Utilities.sleep(1500); return json_({ ok: false, error: "bad pin" }); }
  const id = String(data.id || "").trim();
  if (!/^[A-Za-z0-9-]{1,20}$/.test(id)) return json_({ ok: false, error: "bad id" });
  // a leading ' keeps text like "=..." from being run as a spreadsheet formula
  const plain = (v, max) => { const s = String(v || "").slice(0, max); return /^[=+\-@]/.test(s) ? "'" + s : s; };
  const name = plain(data.name, 200);
  const species = plain(data.species, 200);
  const note = plain(data.note, 1000);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const last = sheet.getLastRow();
    const ids = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
    const idx = ids.indexOf(id);
    const row = [id, name, species, note, new Date()];
    if (idx >= 0) {
      sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}
