# Alapihan Puutarha · Kasvihuonekartta

Interaktiivinen kartta Alapihan kasvihuoneesta: pöydät, kukkakourut, amppelit ja lattia.
Napauta kohtaa kartalla ja kirjoita, mikä kasvi siinä kasvaa.

- **Sivu:** `docs/index.html` (GitHub Pages)
- **Merkinnät:** jaettu Google-taulukko, johon sivu yhdistää Apps Script -verkkosovelluksen kautta (`apps-script/Code.gs`)

## Muokkaaminen

1. Muokkaa `index.html` (sama tiedosto julkaistaan myös claude.ai-sivuna).
2. Aja `python3 build.py`, joka päivittää `docs/index.html`.
3. Tee commit ja push – GitHub Pages päivittyy minuutissa.

Google-taulukon yhteys: liitä Apps Script -verkkosovelluksen osoite (`…/exec`) `SHEETS_URL`-kohtaan tiedostossa `index.html`.
