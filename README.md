# Alapihan Puutarha · Kasvihuonekartta

Interaktiivinen kartta Alapihan Puutarhasta.

- **Etusivu (`piha.html` → `docs/index.html`):** piha ylhäältä katsottuna. Kasvihuoneet, lampi ja ulkopöydät ovat
  samoilla paikoilla kuin Google Mapsin ilmakuvassa (käännetty 33°, jotta kasvihuoneet ovat pystyssä).
  Kasvihuonetta napauttamalla pääsee sisälle, ulkopöydälle voi kirjoittaa kasvin suoraan.
- **Kasvikartta (`kasvihuone.html?talo=1…5` → `docs/kasvihuone.html`):** pöydät, kukkakourut, amppelit ja lattia.
  Kasvihuone 1 (talo=2, iso keskimmäinen) käyttää alkuperäisiä koodeja (T4-S1…), muut etuliitettä: Tilaushuone A (talo=1) = K1-, Tilaushuone B (talo=5) = K5-, Kasvihuone 2 (talo=3) = K3-, Kasvihuone 3 (talo=4) = K4-. Jokainen amppeli on oma kohtansa (H3-5 = amppelirivi H3, amppeli 5). Ulkopöydät ovat P1–P8.
- **Merkinnät:** jaettu Google-taulukko, johon sivu yhdistää Apps Script -verkkosovelluksen kautta (`apps-script/Code.gs`)

## Muokkaaminen

1. Muokkaa `piha.html` tai `kasvihuone.html`.
2. Aja `python3 build.py`, joka päivittää `docs/`-kansion.
3. Tee commit ja push – GitHub Pages päivittyy minuutissa.

Google-taulukon yhteys: liitä Apps Script -verkkosovelluksen osoite (`…/exec`) `SHEETS_URL`-kohtaan tiedostoissa `piha.html` ja `kasvihuone.html`.

## Kirjaajan nimi ja PIN-koodi

Kun sivu avataan, se kysyy kerran **kirjaajan nimen** ja **perheen PIN-koodin** (`pin-gate.js`). Ne muistetaan
laitteella, kunnes sivua ei ole käytetty tuntiin; silloin PIN kysytään uudelleen. Nimi tallentuu jokaisen
merkinnän viereen taulukon **Kirjaaja**-sarakkeeseen. Kasvit näkyvät vasta PIN-koodin jälkeen: Apps Script
ei näytä taulukon tietoja ilman koodia.

Apps Script tarkistaa koodin, eikä koodi ole tässä julkisessa koodissa: se asetetaan Apps Scriptin
*Projektin asetukset → Skriptin ominaisuudet* -kohtaan nimellä `PIN`. Koodin vaihtamiseen riittää muuttaa arvo.

## Ulkopöytien muokkaus

Etusivun **Muokkaa ulkopöytiä** -painikkeella voi siirtää pöytiä vetämällä (hiiri tai sormi), kääntää, pidentää,
lisätä ja poistaa niitä. Jokaisen muutetun pöydän paikka tallentuu taulukkoon omana rivinään (`L-P3` jne.,
muistiinpanoissa sijainti), joten kaikki näkevät saman järjestyksen. Muokkaus vaatii saman perheen PIN-koodin.
Jos rivin poistaa taulukosta, pöytä palaa alkuperäiselle paikalleen.
