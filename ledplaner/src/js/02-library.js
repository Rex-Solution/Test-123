/* Library: Datenformat (ledplaner-library-format.md), Beispieleinträge, Vollständigkeit.
   Ein Eintrag: { id, name, kategorie, attribute: { hersteller, gewicht, stromverbrauch, grafik,
   anschluesse, quelle, led: { typ, ... } } } */

const LIB_TYPEN = {
  modul: "LED-Modul", prozessor: "Prozessor", stagebox: "Stagebox", multicore: "Multicore",
  verteiler: "Stromverteiler", laka: "Laka", spinne: "Spinne", rigging: "Rigging", kabel: "Kabeltyp",
};

/* Feldschema je Typ. pf: "pflicht" | "pruef" | "" ; paar: zweites Feld, das mit dem ersten als ein Feld zählt.
   art: text | zahl | ja | auswahl | liste (Zahlen, Komma) | textliste | json */
const GEMEINSAM = {
  hersteller: { p: "hersteller", label: "Hersteller", art: "text", pf: "pflicht", leerErlaubt: true },
  warengruppe: { p: "warengruppe", label: "Warengruppe", art: "text", pf: "" },
  gewicht: pf => ({ p: "gewicht", label: "Gewicht", einheit: "kg", art: "zahl", pf }),
  strom: pf => ({ p: "stromverbrauch", label: "Leistung max.", einheit: "W", art: "zahl", pf }),
  grafik: { p: "grafik", label: "Grafik (Pfad NAS)", art: "text", pf: "" },
  quelle: { p: "quelle", label: "Quelle der Werte", art: "text", pf: "" },
  anschluesse: { p: "anschluesse", label: "Anschlüsse (JSON)", art: "json", pf: "" },
};
const SCHEMA = {
  modul: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.serie", label: "Serie", art: "text", pf: "pflicht" },
    { p: "led.receivingCard", label: "Receiving Card", art: "text", pf: "pflicht" },
    { abschnitt: "Pixel und Maße" },
    { p: "led.pixelB", paar: "led.pixelH", label: "Pixel B × H", einheit: "px", art: "zahl", pf: "pflicht" },
    { p: "led.mmB", paar: "led.mmH", label: "Maße B × H", einheit: "mm", art: "zahl", pf: "pflicht" },
    { p: "led.mmT", label: "Tiefe", einheit: "mm", art: "zahl", pf: "pruef" },
    { abschnitt: "Gewicht und Strom" }, GEMEINSAM.gewicht("pflicht"), GEMEINSAM.strom("pruef"),
    { p: "led.wTyp", label: "Leistung typ.", einheit: "W", art: "zahl", pf: "pruef" },
    { p: "led.einschaltstromA", label: "Einschaltstrom", einheit: "A", art: "zahl", pf: "pruef" },
    { p: "led.strom.maxJeBruecke", label: "Max. Module je Strombrücke", art: "zahl", pf: "pruef" },
    { abschnitt: "Daten" },
    { p: "led.daten.maxJeStrang", label: "Max. Module je Datenstrang", art: "zahl", pf: "pruef" },
    { abschnitt: "Mechanik" },
    { p: "led.mechanik.maxGeflogen", label: "Max. geflogen untereinander", art: "zahl", pf: "pruef" },
    { p: "led.mechanik.maxGestellt", label: "Max. gestellt übereinander", art: "zahl", pf: "pruef" },
    { p: "led.mechanik.kurve", label: "Kurve möglich", art: "ja", pf: "" },
    { p: "led.mechanik.winkelGrad", label: "Mögliche Winkel (°)", art: "liste", pf: "" },
    { p: "led.ip", label: "Schutzart", art: "text", pf: "" },
    { abschnitt: "Sonstiges" }, GEMEINSAM.grafik, { p: "led.grafikHinten", label: "Grafik hinten", art: "text", pf: "" },
    GEMEINSAM.quelle, GEMEINSAM.warengruppe, GEMEINSAM.anschluesse,
  ],
  prozessor: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.familie", label: "Familie", art: "text", pf: "" },
    { p: "led.receivingCards", label: "Unterstützte Receiving Cards (Komma)", art: "textliste", pf: "pflicht" },
    { abschnitt: "Kapazität" },
    { p: "led.pxJePort", label: "Pixel je Port", einheit: "px", art: "zahl", pf: "pflicht" },
    { p: "led.pxGesamt", label: "Pixel gesamt", einheit: "px", art: "zahl", pf: "pflicht" },
    { p: "led.layer", label: "Layer", art: "zahl", pf: "pflicht" },
    { p: "led.backup", label: "Backup-Ports möglich", art: "ja", pf: "" },
    { abschnitt: "Gerät" }, { p: "led.he", label: "Höheneinheiten", art: "zahl", pf: "pruef" },
    GEMEINSAM.gewicht("pruef"), GEMEINSAM.strom("pruef"), GEMEINSAM.quelle, GEMEINSAM.warengruppe, GEMEINSAM.anschluesse,
  ],
  stagebox: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.eingang", label: "Eingang (z.B. Glasfaser 10G)", art: "text", pf: "" },
    { p: "led.ports", label: "Ausgangs-Ports", art: "zahl", pf: "pflicht" },
    { p: "led.pxJePort", label: "Pixel je Port", einheit: "px", art: "zahl", pf: "pruef" },
    { p: "led.he", label: "Höheneinheiten", art: "zahl", pf: "" },
    GEMEINSAM.strom("pflicht"), GEMEINSAM.gewicht("pruef"), GEMEINSAM.quelle, GEMEINSAM.anschluesse,
  ],
  multicore: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.adern", label: "Datenstrecken", art: "zahl", pf: "pflicht" },
    { p: "led.laengeM", label: "Länge", einheit: "m", art: "zahl", pf: "pflicht" },
    { p: "led.aufloesung", label: "Auflösung an der Wand", art: "text", pf: "" },
    GEMEINSAM.gewicht("pruef"), GEMEINSAM.quelle,
  ],
  verteiler: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.einspeisung.typ", label: "Einspeisung Stecker", art: "text", pf: "pflicht" },
    { p: "led.einspeisung.ampere", label: "Einspeisung", einheit: "A", art: "zahl", pf: "pflicht" },
    { p: "led.einspeisung.netz", label: "Netz", art: "text", pf: "" },
    { abschnitt: "Kanäle und Ausgänge" },
    { p: "led.kanaele", label: "Kanäle (JSON)", art: "json", pf: "pflicht", generator: "kanaele" },
    { p: "led.ausgaenge", label: "Ausgänge (JSON)", art: "json", pf: "pflicht" },
    { p: "led.phasenBekannt", label: "Phasenzuordnung der Kanäle bekannt", art: "ja", pf: "pruef" },
    { p: "led.messung", label: "Lastmessung je Kanal", art: "ja", pf: "" },
    { abschnitt: "Gerät" }, { p: "led.he", label: "Höheneinheiten", art: "zahl", pf: "" },
    GEMEINSAM.gewicht("pruef"), GEMEINSAM.quelle, GEMEINSAM.warengruppe,
  ],
  laka: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.stecker", label: "Stecker", art: "text", pf: "pflicht" },
    { p: "led.kreise", label: "Stromkreise", art: "zahl", pf: "pflicht" },
    { p: "led.ampereJeKreis", label: "Je Kreis", einheit: "A", art: "zahl", pf: "pflicht" },
    { p: "led.laengeM", label: "Länge", einheit: "m", art: "zahl", pf: "pflicht" },
    GEMEINSAM.gewicht("pruef"), GEMEINSAM.quelle,
  ],
  spinne: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.steckerEin", label: "Stecker ein", art: "text", pf: "pflicht" },
    { p: "led.abgaenge", label: "Abgänge", art: "zahl", pf: "pflicht" },
    { p: "led.steckerAus", label: "Stecker aus", art: "text", pf: "pflicht" },
    { p: "led.laengeM", label: "Länge Abgänge", einheit: "m", art: "zahl", pf: "" },
    GEMEINSAM.quelle,
  ],
  rigging: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.art", label: "Art", art: "auswahl", pf: "pflicht", optionen: [["flugrahmen", "Flugrahmen"], ["stacking", "Stacking"], ["bodenstuetze", "Bodenstütze"], ["zubehoer", "Zubehör"]] },
    { p: "led.serien", label: "Passende Serien (Komma)", art: "textliste", pf: "pflicht" },
    { p: "led.breiteModule", label: "Breite in Modulen", art: "zahl", pf: "pflicht" },
    GEMEINSAM.gewicht("pflicht"),
    { p: "led.lastMaxKg", label: "Zulässige Last", einheit: "kg", art: "zahl", pf: "pruef" },
    { p: "led.punkte", label: "Aufhängepunkte (JSON)", art: "json", pf: "pruef" },
    GEMEINSAM.quelle,
  ],
  kabel: [
    { abschnitt: "Allgemein" }, GEMEINSAM.hersteller,
    { p: "led.gewerk", label: "Gewerk", art: "auswahl", pf: "pflicht", optionen: [["strom", "Strom"], ["signal", "Signal"], ["video", "Video"]] },
    { p: "led.farbsystem", label: "Farbe (Kabel-Farbsystem)", art: "auswahl", pf: "pflicht", optionen: Object.keys(KABELFARBEN).map(k => [k, k]) },
    { p: "led.steckerA", label: "Stecker A", art: "text", pf: "pflicht" },
    { p: "led.steckerB", label: "Stecker B", art: "text", pf: "pflicht" },
    { p: "led.laengenM", label: "Verfügbare Längen (m, Komma)", art: "liste", pf: "pruef" },
    { p: "led.brueckeLaengeM", label: "Standardlänge als Brücke", einheit: "m", art: "zahl", pf: "" },
    { p: "led.maxLaengeM", label: "Max. Länge", einheit: "m", art: "zahl", pf: "" },
    GEMEINSAM.quelle,
  ],
};

/* Pfad lesen/schreiben in attribute */
function holePfad(obj, pfad) { return pfad.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setzePfad(obj, pfad, wert) {
  const teile = pfad.split(".");
  const letzter = teile.pop();
  let o = obj;
  for (const t of teile) { if (o[t] == null || typeof o[t] !== "object") o[t] = {}; o = o[t]; }
  o[letzter] = wert;
}
function gefuellt(f, attr) {
  const v = holePfad(attr, f.p);
  const ok = w => w !== null && w !== undefined && (w !== "" || f.leerErlaubt) && !(Array.isArray(w) && w.length === 0);
  if (!ok(v)) return false;
  return f.paar ? ok(holePfad(attr, f.paar)) : true;
}

/* Vollständigkeit: { gefuellt, gesamt, offen:[labels], pflichtFehlt:[labels] } */
function vollstaendigkeit(e) {
  const typ = e?.attribute?.led?.typ;
  const felder = (SCHEMA[typ] || []).filter(f => f.p && (f.pf === "pflicht" || f.pf === "pruef"));
  const erg = { gefuellt: 0, gesamt: felder.length, offen: [], pflichtFehlt: [] };
  if (!e.name) erg.pflichtFehlt.push("Name");
  for (const f of felder) {
    if (gefuellt(f, e.attribute)) erg.gefuellt++;
    else if (f.pf === "pflicht") erg.pflichtFehlt.push(f.label);
    else erg.offen.push(f.label);
  }
  return erg;
}
function badgeHtml(e) {
  const v = vollstaendigkeit(e);
  if (v.pflichtFehlt.length) return `<span class="badge fehler" title="Pflicht fehlt: ${esc(v.pflichtFehlt.join(", "))}">${v.gefuellt}/${v.gesamt}</span>`;
  if (v.offen.length) return `<span class="badge teil" title="offen: ${esc(v.offen.join(", "))}">${v.gefuellt}/${v.gesamt}</span>`;
  return `<span class="badge voll">vollständig</span>`;
}
const eintragNutzbar = e => e && vollstaendigkeit(e).pflichtFehlt.length === 0;

/* ---------- Beispieleinträge (eingebaut, ohne Datenbank) ---------- */
function kanaeleErzeugen(anzahl, jeAusgang, ampere = 16, charakteristik = "C", fi = "30 mA Typ A", phasen = null) {
  const kanaele = [], ausgaenge = [];
  for (let i = 1; i <= anzahl; i++) {
    const ausgang = "Harting " + Math.ceil(i / jeAusgang);
    kanaele.push({ nr: i, ampere, charakteristik, fi, phase: phasen ? phasen(i) : null, ausgang });
  }
  for (let a = 1; a <= Math.ceil(anzahl / jeAusgang); a++) {
    ausgaenge.push({ name: "Harting " + a, stecker: "Harting 16-pol", kanaele: kanaele.filter(k => k.ausgang === "Harting " + a).map(k => k.nr) });
  }
  return { kanaele, ausgaenge };
}

const QUELLE_LEDTEK = "LEDTEK / Händler, Stand 10/2026 – Werte prüfen";
const BEISPIEL_LIBRARY = [
  { id: "beispiel-ledtek-p4wh-pro-v3", name: "LEDTEK P4+WH PRO V3", kategorie: "Video · LED-Modul",
    attribute: { hersteller: "LEDTEK", gewicht: 13.9, stromverbrauch: 175, grafik: null, quelle: QUELLE_LEDTEK,
      anschluesse: [
        { name: "Strom ein", typ: "PowerCON TRUE1", richtung: "in", rolle: "strom" }, { name: "Strom aus", typ: "PowerCON TRUE1", richtung: "out", rolle: "strom" },
        { name: "Daten ein", typ: "etherCON", richtung: "in", rolle: "daten" }, { name: "Daten aus", typ: "etherCON", richtung: "out", rolle: "daten" }],
      led: { typ: "modul", serie: "P4+ PRO V3", receivingCard: "NovaStar A8s", pixelB: 104, pixelH: 208, mmB: 500, mmH: 1000, mmT: 85,
        pitchMm: 4.81, wTyp: 90, einschaltstromA: null, strom: { maxJeBruecke: null }, daten: { maxJeStrang: null },
        mechanik: { maxGeflogen: null, maxGestellt: null, kurve: true, winkelGrad: null }, ip: "IP65" } } },
  { id: "beispiel-ledtek-p4swh-pro-v3", name: "LEDTEK P4+sWH PRO V3", kategorie: "Video · LED-Modul",
    attribute: { hersteller: "LEDTEK", gewicht: 8.5, stromverbrauch: 88, grafik: null, quelle: QUELLE_LEDTEK + " (Leistung geschätzt)",
      anschluesse: [
        { name: "Strom ein", typ: "PowerCON TRUE1", richtung: "in", rolle: "strom" }, { name: "Strom aus", typ: "PowerCON TRUE1", richtung: "out", rolle: "strom" },
        { name: "Daten ein", typ: "etherCON", richtung: "in", rolle: "daten" }, { name: "Daten aus", typ: "etherCON", richtung: "out", rolle: "daten" }],
      led: { typ: "modul", serie: "P4+ PRO V3", receivingCard: "NovaStar A8s", pixelB: 104, pixelH: 104, mmB: 500, mmH: 500, mmT: null,
        pitchMm: 4.81, wTyp: 45, einschaltstromA: null, strom: { maxJeBruecke: null }, daten: { maxJeStrang: null },
        mechanik: { maxGeflogen: null, maxGestellt: null, kurve: true, winkelGrad: null }, ip: "IP65" } } },
  { id: "beispiel-novastar-mx30", name: "NovaStar MX30", kategorie: "Video · LED-Prozessor",
    attribute: { hersteller: "NovaStar", gewicht: null, stromverbrauch: 55, quelle: "NovaStar Handbuch MX30 V1.0.1 + Händler",
      anschluesse: [
        { name: "HDMI 2.0", typ: "HDMI", richtung: "in", rolle: "video", maxB: 4096, maxH: 2160, maxHz: 60, loop: true },
        { name: "HDMI 1.4", typ: "HDMI", richtung: "in", rolle: "video", maxB: 4096, maxH: 1080, maxHz: 60, loop: true },
        { name: "DP 1.1", typ: "DP", richtung: "in", rolle: "video", maxB: null, maxH: null, maxHz: 60 },
        { name: "SDI", typ: "SDI", richtung: "in", rolle: "video", maxB: 1920, maxH: 1080, maxHz: 60, loop: true, anzahl: 2 },
        { name: "Port", typ: "LAN", richtung: "out", rolle: "port", anzahl: 10 },
        { name: "OPT", typ: "Fiber", richtung: "out", rolle: "glasfaser", anzahl: 2 },
        { name: "Strom ein", typ: "Kaltgeräte", richtung: "in", rolle: "strom" }],
      led: { typ: "prozessor", familie: "COEX", receivingCards: ["NovaStar A8s"], pxJePort: 659722, pxGesamt: 6500000, layer: 3, backup: true, he: null } } },
  { id: "beispiel-stagesmarts-c24", name: "StageSmarts C24 (4 × Harting)", kategorie: "Strom · Verteiler",
    attribute: { hersteller: "StageSmarts", gewicht: 18, quelle: "StageSmarts Datenblatt / Händler",
      led: { typ: "verteiler", einspeisung: { typ: "CEE 63 A 5-pol", ampere: 63, netz: "TN-S 230/400 V" },
        ...kanaeleErzeugen(24, 6), phasenBekannt: false, messung: true, he: 6 } } },
  ...[10, 25, 50].map(m => ({ id: "beispiel-laka-h16-" + m, name: `Laka Harting 16-pol · ${m} m`, kategorie: "Strom · Laka",
    attribute: { hersteller: "", gewicht: null, led: { typ: "laka", stecker: "Harting 16-pol", kreise: 6, ampereJeKreis: 16, laengeM: m } } })),
  { id: "beispiel-spinne-h16-true1", name: "Spinne Harting → 6 × TRUE1", kategorie: "Strom · Spinne",
    attribute: { hersteller: "", led: { typ: "spinne", steckerEin: "Harting 16-pol", abgaenge: 6, steckerAus: "PowerCON TRUE1", laengeM: 1.5 } } },
  { id: "beispiel-novastar-cvt10", name: "NovaStar CVT10", kategorie: "Video · Stagebox",
    attribute: { hersteller: "NovaStar", gewicht: 2.1, stromverbrauch: 22, grafik: null,
      quelle: "Händlerangaben (CVT10-M/-S), Stand 10/2026 – Leistung mit aktuellem NovaStar-Datenblatt prüfen",
      anschluesse: [
        { name: "OPT", typ: "Fiber", richtung: "in", rolle: "glasfaser", anzahl: 2 },
        { name: "Port", typ: "LAN", richtung: "out", rolle: "port", anzahl: 10 },
        { name: "Strom ein", typ: "PowerCON TRUE1", richtung: "in", rolle: "strom" }],
      led: { typ: "stagebox", eingang: "2 × 10G optisch (LC; -M multimode 300 m, -S singlemode)", ports: 10, pxJePort: null, he: 1 } } },
  ...[25, 50].map(m => ({ id: "beispiel-multicore-cat4-" + m, name: `Cat-Multicore 4-fach · ${m} m`, kategorie: "Video · Multicore",
    attribute: { hersteller: "", gewicht: null, quelle: "Platzhalter – Bestand",
      led: { typ: "multicore", adern: 4, laengeM: m, aufloesung: "4 × etherCON" } } })),
  { id: "beispiel-flugrahmen-1m", name: "Flugrahmen 1 m (P4+ PRO)", kategorie: "Rigging",
    attribute: { hersteller: "LEDTEK", gewicht: null, led: { typ: "rigging", art: "flugrahmen", serien: ["P4+ PRO V3"], breiteModule: 2, lastMaxKg: null, punkte: null } } },
  ...[
    ["kabel-cee125", "CEE 125 A 5-pol", "strom", "Strom", "CEE 125 A", "CEE 125 A", [10, 25, 50], null],
    ["kabel-cee63", "CEE 63 A 5-pol", "strom", "Strom", "CEE 63 A", "CEE 63 A", [10, 25, 50], null],
    ["kabel-cee32", "CEE 32 A 5-pol", "strom", "Strom", "CEE 32 A", "CEE 32 A", [10, 25, 50], null],
    ["kabel-true1", "PowerCON TRUE1", "strom", "Strom", "PowerCON TRUE1", "PowerCON TRUE1", [1, 3, 5, 10, 20], 1],
    ["kabel-kaltgeraete", "Kaltgeräte / IEC", "strom", "Strom", "Schuko", "IEC C13", [2, 5], null],
    ["kabel-cat6", "Cat6 etherCON", "signal", "LAN", "etherCON", "etherCON", [1, 5, 10, 20, 30, 60, 90], 1],
    ["kabel-fiber", "Glasfaser OpticalCON", "signal", "Fiber", "opticalCON", "opticalCON", [50, 100, 200], null],
    ["kabel-hdmi", "HDMI 2.0", "video", "HDMI", "HDMI", "HDMI", [1, 3, 5, 10], null],
    ["kabel-sdi", "SDI (BNC)", "video", "SDI", "BNC", "BNC", [5, 10, 25, 50], null],
  ].map(([id, name, gewerk, farbsystem, a, b, laengen, bruecke]) => ({ id: "beispiel-" + id, name, kategorie: "Kabel",
    attribute: { hersteller: "", led: { typ: "kabel", gewerk, farbsystem, steckerA: a, steckerB: b, laengenM: laengen,
      brueckeLaengeM: bruecke, maxLaengeM: farbsystem === "LAN" ? 100 : null } } })),
];

/* ---------- Library-Speicher ---------- */
const SPEICHER_LIBRARY = "rex-ledplaner-library";
const LIB = { eintraege: new Map(), herkunft: new Map() };

/* Reihenfolge: eingebaute Beispiele < Rex-Library (Datenbank-Agent) < lokal bearbeitete Einträge */
function libLaden(rexListe = null) {
  LIB.eintraege.clear(); LIB.herkunft.clear();
  for (const e of BEISPIEL_LIBRARY) { LIB.eintraege.set(e.id, klon(e)); LIB.herkunft.set(e.id, "beispiel"); }
  for (const e of rexListe || []) { LIB.eintraege.set(e.id, e); LIB.herkunft.set(e.id, "rex"); }
  const lokal = speicher.lesen(SPEICHER_LIBRARY);
  if (lokal && Array.isArray(lokal.eintraege)) {
    for (const e of lokal.eintraege) if (e && e.id) { LIB.eintraege.set(e.id, e); LIB.herkunft.set(e.id, "lokal"); }
  }
}
function libSichern() {
  const eintraege = [...LIB.eintraege.values()].filter(e => LIB.herkunft.get(e.id) === "lokal");
  return speicher.schreiben(SPEICHER_LIBRARY, { format: "rex-ledplaner-library", formatVersion: 1, gespeichert: new Date().toISOString(), eintraege });
}
function libExport() {
  return JSON.stringify({ format: "rex-ledplaner-library", formatVersion: 1, gespeichert: new Date().toISOString(),
    eintraege: [...LIB.eintraege.values()] }, null, 2);
}
function libImport(text) {
  const d = JSON.parse(text);
  const liste = Array.isArray(d) ? d : d.eintraege;
  if (!Array.isArray(liste)) throw new Error("Keine Einträge gefunden");
  let n = 0;
  for (const e of liste) {
    if (!e || !e.id || !e.attribute?.led?.typ) continue;
    LIB.eintraege.set(e.id, e);
    if (LIB.herkunft.get(e.id) !== "beispiel") LIB.herkunft.set(e.id, "lokal"); else LIB.herkunft.set(e.id, "lokal");
    n++;
  }
  libSichern();
  return n;
}

/* Typ-Helfer */
const libTyp = e => e?.attribute?.led?.typ;
const libListe = typ => [...LIB.eintraege.values()].filter(e => !typ || libTyp(e) === typ).sort((a, b) => a.name.localeCompare(b.name, "de"));

/* Anschlüsse mit „anzahl“ ausklappen: Port × 10 → Port 1 … Port 10 */
function anschluesseAusklappen(liste) {
  const erg = [];
  for (const a of liste || []) {
    if (a.anzahl > 1) for (let i = 1; i <= a.anzahl; i++) erg.push({ ...a, anzahl: undefined, name: `${a.name} ${i}` });
    else erg.push(a);
  }
  return erg;
}
