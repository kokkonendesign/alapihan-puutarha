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
 *     (Koodin vaihto: muuta vain PIN-ominaisuuden arvo – uutta käyttöönottoa ei tarvita.)
 *     Koodi on vain täällä, ei julkisessa GitHub-koodissa.
 *
 * The map reads all labels and saves one label with POST; both need the PIN.
 * Each section is one row on the "Kasvit" sheet; you can also edit
 * the plant and notes columns straight in the spreadsheet.
 */

const SHEET_NAME = "Kasvit";
const HEADERS = ["Koodi", "Paikka", "Kasvi", "Muistiinpanot", "Päivitetty", "Kirjaaja"];

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
  } else if (sheet.getRange(1, HEADERS.length).getValue() === "") {
    // older sheets: add the "Kirjaaja" heading
    sheet.getRange(1, HEADERS.length).setValue(HEADERS[HEADERS.length - 1]).setFontWeight("bold");
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Reading the plants needs the PIN too, so the map's public code can't be used
 *  to read the sheet. GET only answers that a PIN is needed. */
function doGet() {
  return json_({ ok: false, error: "pin required" });
}

/** { sections: { "T4-S3": { species, note, at }, ... } } – all labels, for the map.
 *  at = when the row was last saved (milliseconds), from the "Päivitetty" column. */
function sections_() {
  const sheet = getSheet_();
  const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues() : [];
  const sections = {};
  rows.forEach(([id, , species, note, when]) => {
    if (!id) return;
    const at = when instanceof Date ? when.getTime() : (Date.parse(when) || 0);
    sections[String(id)] = { species: String(species || ""), note: String(note || ""), at };
  });
  return sections;
}

/** True when the family PIN sent by the map matches the PIN script property. */
function pinOk_(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty("PIN");
  return !!expected && String(pin || "").trim() === expected.trim();
}

/** POST body (text/plain JSON): { id, name, species, note, pin, by } → upserts that section's row.
 *  { action: "check", pin } only checks the PIN (the map's opening screen).
 *  { action: "list", pin } returns all labels: { ok: true, sections }.
 *  { action: "saveMany", pin, by, rows: [{ id, name, species, note }, ...] } saves many
 *  rows in one go (several amppelit with the same plant). */
function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad json" });
  }
  // a wrong PIN waits a moment, so guessing the code is slow
  if (!pinOk_(data.pin)) { Utilities.sleep(1500); return json_({ ok: false, error: "bad pin" }); }
  if (data.action === "check") return json_({ ok: true, checked: true });
  if (data.action === "list") return json_({ ok: true, sections: sections_() });

  // a leading ' keeps text like "=..." from being run as a spreadsheet formula
  const plain = (v, max) => { const s = String(v || "").slice(0, max); return /^[=+\-@]/.test(s) ? "'" + s : s; };
  const by = plain(data.by, 60);
  const items = data.action === "saveMany" ? (Array.isArray(data.rows) ? data.rows.slice(0, 400) : []) : [data];
  const rows = [];
  for (const it of items) {
    const id = String((it && it.id) || "").trim();
    if (!/^[A-Za-z0-9-]{1,20}$/.test(id)) return json_({ ok: false, error: "bad id" });
    rows.push([id, plain(it.name, 200), plain(it.species, 200), plain(it.note, 1000), new Date(), by]);
  }
  if (!rows.length) return json_({ ok: false, error: "nothing to save" });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_();
    const last = sheet.getLastRow();
    const ids = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
    const added = [];
    rows.forEach(row => {
      const idx = ids.indexOf(row[0]);
      if (idx >= 0) sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
      else { added.push(row); ids.push(row[0]); }
    });
    if (added.length) sheet.getRange(last + 1, 1, added.length, added[0].length).setValues(added);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true, saved: rows.length });
}
