/* Alapihan Puutarha – who is logging (name) + family PIN, asked once.
 *
 * When the site opens, a lock screen asks for the logger's name (Kirjaajan
 * nimi) and the family PIN. After that both are remembered on this device,
 * and saving plants or moving tables never asks again – until nobody has used
 * the site for IDLE_MIN minutes, when the lock screen comes back. The name is
 * saved with every change (the sheet's "Kirjaaja" column).
 * The plants are only shown after the PIN: the Apps Script refuses to read the
 * sheet without it, so the public code can't be used to read it either.
 * When the PIN is accepted the page gets a "pingate-open" event.
 *
 * The PIN itself is checked by the Apps Script (PIN script property), never
 * stored in this public code. Pages call PinGate.init(SHEETS_URL) and use
 * PinGate.getPin() / setPin() / getName() / require().
 */
(function () {
  const PIN_KEY = "alapiha-greenhouse-pin";
  const ACTIVE_KEY = "alapiha-pin-active";    // last time someone used the site (ms)
  const NAME_KEY = "alapiha-kirjaaja";        // the logger's name, kept between visits
  const IDLE_MIN = 60;
  const IDLE_MS = IDLE_MIN * 60 * 1000;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  let url = "", gate = null, active = false, waiting = [];   // waiting: require() calls to answer

  function lastActive() { return Number(store.get(ACTIVE_KEY)) || 0; }
  function fresh() { return Date.now() - lastActive() < IDLE_MS; }
  function getPin() {
    const pin = store.get(PIN_KEY) || "";
    return pin && fresh() ? pin : "";
  }
  function setPin(v) {
    store.set(PIN_KEY, v || null);
    if (v) store.set(ACTIVE_KEY, String(Date.now()));
  }
  function touch() {
    // throttle: write at most every 20 s
    if (getPin() && Date.now() - lastActive() > 20000) store.set(ACTIVE_KEY, String(Date.now()));
  }
  function getName() { return store.get(NAME_KEY) || ""; }
  function needsGate() { return active && !getPin(); }

  /* ---------- lock screen ---------- */
  function css() {
    const st = document.createElement("style");
    st.textContent = `
      .pin-gate { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center;
        padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px));
        background: color-mix(in srgb, var(--bg, #f6f4ee) 82%, transparent); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
      .pin-gate[hidden] { display: none !important; }
      .pin-card { width: min(380px, 100%); background: var(--surface, #fff); color: var(--ink, #1f2a22);
        border: 1px solid var(--line, #d9d5c8); border-radius: 18px; padding: 22px 20px 18px; box-shadow: 0 20px 60px rgba(0,0,0,.22); text-align: center; }
      .pin-card .pin-title { margin: 0 0 8px; line-height: 0; }
      .pin-card .pin-logo { display: block; width: min(250px, 80%); height: auto; margin: 0 auto; }
      .pin-card p { margin: 0 0 14px; color: var(--muted, #66705f); font-size: .92rem; }
      .pin-card .pin-label { display: block; text-align: left; font-size: .85rem; font-weight: 600; color: var(--muted, #66705f); margin: 10px 0 4px; }
      .pin-card input { width: 100%; box-sizing: border-box; font: inherit; font-size: 1.2rem; text-align: center; letter-spacing: .08em;
        padding: 12px 14px; border-radius: 12px; border: 1px solid var(--line, #d9d5c8); background: var(--bg, #f6f4ee); color: var(--ink, #1f2a22); }
      .pin-card input:focus { outline: 2px solid var(--focus, #7aa8ff); outline-offset: 1px; }
      .pin-card .pin-err { color: var(--select, #b5452c); font-weight: 600; font-size: .9rem; margin: 8px 0 0; min-height: 1.2em; }
      .pin-card button.pin-open { width: 100%; margin-top: 10px; font: inherit; font-weight: 600; font-size: .9rem; text-transform: uppercase; letter-spacing: .08em; padding: 13px; border-radius: 999px;
        border: 0; background: var(--pink, #f48fb1); color: var(--pink-ink, #fff); cursor: pointer; }
      .pin-card button.pin-open:hover { background: var(--pink-strong, #e2769c); }
      .pin-card button.pin-open:disabled { opacity: .6; cursor: progress; }
    `;
    document.head.appendChild(st);
  }
  function build() {
    css();
    gate = document.createElement("div");
    gate.className = "pin-gate";
    gate.hidden = true;
    gate.innerHTML = `
      <form class="pin-card" role="dialog" aria-modal="true" aria-labelledby="pin-gate-title" autocomplete="off">
        <h2 id="pin-gate-title" class="pin-title"><img class="pin-logo" src="logo.png" alt="Alapihan Puutarha" width="720" height="390"></h2>
        <p class="pin-why"></p>
        <label class="pin-label" for="pin-gate-name">Kirjaajan nimi</label>
        <input type="text" class="pin-name" id="pin-gate-name" maxlength="40" autocomplete="given-name" enterkeyhint="next">
        <label class="pin-label" for="pin-gate-pin">PIN-koodi</label>
        <input type="password" class="pin-input" id="pin-gate-pin" autocapitalize="off" spellcheck="false" enterkeyhint="go">
        <p class="pin-err" role="alert"></p>
        <button type="submit" class="pin-open">Avaa</button>
      </form>`;
    document.body.appendChild(gate);
    const form = gate.querySelector("form");
    const input = gate.querySelector(".pin-input");
    const nameIn = gate.querySelector(".pin-name");
    const err = gate.querySelector(".pin-err");
    const btn = gate.querySelector(".pin-open");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const name = nameIn.value.trim().slice(0, 40), pin = input.value.trim();
      if (!name) { err.textContent = "Kirjoita nimesi, niin muut näkevät, kuka kirjasi kasvin."; nameIn.focus(); return; }
      if (!pin) { err.textContent = "Kirjoita PIN-koodi."; input.focus(); return; }
      btn.disabled = true; btn.textContent = "Tarkistetaan…"; err.textContent = "";
      const res = await check(pin);
      btn.disabled = false; btn.textContent = "Avaa";
      if (res === "bad") { err.textContent = "Väärä PIN-koodi. Yritä uudelleen."; input.value = ""; input.focus(); return; }
      store.set(NAME_KEY, name);
      setPin(pin);
      hide(pin);
    });
    // keep keyboard focus inside the lock screen
    gate.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const f = [...gate.querySelectorAll("input, button:not(:disabled)")];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  /* "ok" = PIN accepted, "bad" = wrong PIN, "unknown" = can't tell (older script or no
     connection): accepted for now; a wrong PIN is still refused when saving. */
  async function check(pin) {
    if (!url) return "unknown";
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "check", pin }) });
      const out = await res.json();
      if (out.ok && out.checked) return "ok";
      if (out.error === "bad pin") return "bad";
      return "unknown";
    } catch (e) { return "unknown"; }
  }
  const WHY = {
    open: "Kartta on vain perheen käytössä. Kirjoita nimesi ja PIN-koodi – ne kysytään vain kerran, kunhan sivua käytetään.",
    idle: "Sivu oli pitkään käyttämättä. Kirjoita PIN-koodi uudelleen.",
    save: "Tallentaminen vaatii nimesi ja PIN-koodin. Ne kysytään vain kerran.",
    bad: "PIN-koodi on vaihtunut. Kirjoita uusi PIN-koodi.",
  };
  function show(reason) {
    if (!gate) build();
    if (!gate.hidden) return;
    gate.querySelector(".pin-why").textContent = WHY[reason] || WHY.open;
    gate.querySelector(".pin-err").textContent = "";
    gate.querySelector(".pin-input").value = "";
    const nameIn = gate.querySelector(".pin-name");
    nameIn.value = getName();
    gate.hidden = false;
    requestAnimationFrame(() => (nameIn.value ? gate.querySelector(".pin-input") : nameIn).focus());
  }
  function hide(pin) {
    if (gate) gate.hidden = true;
    const w = waiting; waiting = [];
    w.forEach(resolve => resolve(pin || ""));
    if (pin) window.dispatchEvent(new Event("pingate-open"));
  }
  /* For a save without a PIN: show the lock screen and wait.
     Resolves with the PIN once it is given. */
  function require(reason) {
    const pin = getPin();
    if (pin) return Promise.resolve(pin);
    return new Promise(resolve => { waiting.push(resolve); show(reason || "save"); });
  }
  function isOpen() { return !!gate && !gate.hidden; }

  function init(sheetsUrl) {
    url = sheetsUrl || "";
    active = true;
    if (needsGate()) show(store.get(PIN_KEY) ? "idle" : "open");
    // use keeps the PIN fresh; coming back after a long break asks again
    const onUse = e => {
      if (isOpen()) return;
      if (needsGate()) {
        if (e && e.type === "pointerdown") { e.preventDefault(); e.stopPropagation(); }
        show("idle");
        return;
      }
      touch();
    };
    document.addEventListener("pointerdown", onUse, true);
    document.addEventListener("keydown", e => { if (!isOpen()) onUse(e); }, true);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && needsGate()) show("idle"); });
    setInterval(() => { if (!document.hidden && needsGate()) show("idle"); }, 60000);
  }

  window.PinGate = { init, getPin, setPin, getName, require, isOpen, IDLE_MIN };
})();
