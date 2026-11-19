# Alapihan Puutarha · Kasvihuonekartta

Interaktiivinen kartta Alapihan Puutarhasta.

- **Etusivu (`piha.html` → `docs/index.html`):** piha ylhäältä katsottuna. Kasvihuoneet, lampi ja ulkopöydät ovat
  samoilla paikoilla kuin Google Mapsin ilmakuvassa (käännetty 33°, jotta kasvihuoneet ovat pystyssä).
  Kasvihuonetta napauttamalla pääsee sisälle, ulkopöydälle voi kirjoittaa kasvin suoraan.
- **Kasvikartta (`kasvihuone.html?talo=1…4` → `docs/kasvihuone.html`):** pöydät, kukkakourut, amppelit ja lattia.
  Kasvihuone 2 käyttää alkuperäisiä koodeja (T4-S1…), muut etuliitettä (K1-, K3-, K4-). Ulkopöydät ovat P1–P8.
- **Merkinnät:** jaettu Google-taulukko, johon sivu yhdistää Apps Script -verkkosovelluksen kautta (`apps-script/Code.gs`)

## Muokkaaminen

1. Muokkaa `piha.html` tai `kasvihuone.html`.
2. Aja `python3 build.py`, joka päivittää `docs/`-kansion.
3. Tee commit ja push – GitHub Pages päivittyy minuutissa.

Google-taulukon yhteys: liitä Apps Script -verkkosovelluksen osoite (`…/exec`) `SHEETS_URL`-kohtaan tiedostoissa `piha.html` ja `kasvihuone.html`.

## Perheen PIN-koodi

Tallentaminen vaatii perheen PIN-koodin. Apps Script tarkistaa koodin, eikä koodi ole tässä julkisessa koodissa:
se asetetaan Apps Scriptin *Projektin asetukset → Skriptin ominaisuudet* -kohtaan nimellä `PIN`.
Sivu kysyy koodin kerran ja muistaa sen kyseisellä laitteella.

## Ulkopöytien muokkaus

Etusivun **Muokkaa ulkopöytiä** -painikkeella voi siirtää pöytiä vetämällä (hiiri tai sormi), kääntää, pidentää,
lisätä ja poistaa niitä. Jokaisen muutetun pöydän paikka tallentuu taulukkoon omana rivinään (`L-P3` jne.,
muistiinpanoissa sijainti), joten kaikki näkevät saman järjestyksen. Muokkaus vaatii saman perheen PIN-koodin.
Jos rivin poistaa taulukosta, pöytä palaa alkuperäiselle paikalleen.
