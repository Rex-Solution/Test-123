/* Projekt: Datenmodell, Neu/Laden/Speichern, Migration, Rückgängig, Autosave.

   projekt = {
     format: "rex-ledplaner", formatVersion: 1, gespeichert, rexId (Projekt im Rex-System, sonst null),
     daten:   { titel, kunde, veranstaltung, ort, ersteller, revision, datum },
     regeln:  { reserve, schieflast, planung, spannung, absicherung, einschaltPruefen, backup, portMax, catMax, druckZusatz },
     library: { [id]: Kopie des Library-Eintrags (Stand beim Einfügen) },
     screens: [{ id, name, beschreibung, ukM, bauart, module: [{ id, lib, x, y }], strom: { richtung, start }, signal: { richtung, start } }],
     geraete: [ verteiler { id, art:"verteiler", lib, name, standort, speisung: { von, kabel, laengeM } }
              | einspeisung { id, art:"einspeisung", name, stecker, ampere, standort }
              | prozessor { id, art:"prozessor", lib, name, standort, portKabel, portLaengeM, strom }
              | stagebox  { id, art:"stagebox", lib, name, standort, prozessor, ports: [Prozessor-Ports], zuleitung: { kabel, laengeM, anzahl }, ausgangKabel, ausgangLaengeM, strom }
              | multicore { id, art:"multicore", lib, name, standort, prozessor, ports: [...], ausgangKabel, ausgangLaengeM } ],
              Ports ohne Stagebox/Multicore gehen direkt (portKabel, portLaengeM) vom Prozessor zur Wand.
     kreise:   [{ id, screen, verteiler, kanal, module: [modulIds in Reihenfolge] }],
     straenge: [{ id, screen, prozessor, port, backupPort, module: [...] }],
     lakas:    [{ id, lib, verteiler, ausgang, screen, laengeM }],
     kabel:    [{ id, lib, laengeM, anzahl, von, nach, bemerkung }]          // von Hand
     kabelAnpassung: { [schluessel automatisches Kabel]: { lib, laengeM, bemerkung } }
   }
   Positionen in mm (x nach rechts, y nach unten, Ursprung oben links des Screens). */

const PROJEKT_FORMAT = "rex-ledplaner";
const PROJEKT_VERSION = 1;
const SPEICHER_AKTUELL = "rex-ledplaner-aktuell";

function standardRegeln() {
  return { reserve: 20, schieflast: 20, planung: "max", spannung: 230, absicherung: 16, einschaltPruefen: true,
    backup: true, portMax: 90, catMax: 100, druckZusatz: "A3", riggingFreigabe: "intern" };
}

function neuesProjekt() {
  return {
    format: PROJEKT_FORMAT, formatVersion: PROJEKT_VERSION, gespeichert: null,
    daten: { titel: "Neues Projekt", kunde: "", veranstaltung: "", ort: "", ersteller: "", revision: "1", datum: new Date().toISOString().slice(0, 10) },
    regeln: standardRegeln(),
    library: {}, screens: [], geraete: [], kreise: [], straenge: [], lakas: [], kabel: [], kabelAnpassung: {},
    outputs: [], pixelraum: {}, layer: [],
    ausgabe: { palette: "regenbogen", beschriftung: "modul", linie: 2, kreis: true, kreuz: true, info: true, cursorTempo: 240, cursorBreite: 4 },
  };
}

function neuerScreen(name) {
  return { id: neueId("s"), name, beschreibung: "", ukM: null, bauart: "geflogen", module: [],
    strom: { richtung: "spalten", start: "ol", verteilung: "minimal" }, signal: { richtung: "spalten", start: "ol" } };
}

/* Geladene Daten in gültige Form bringen (auch ältere/fremde Dateien) */
function normalisiereProjekt(roh) {
  const d = roh && roh.projekt ? roh.projekt : roh;
  if (!d || typeof d !== "object") throw new Error("Keine Projektdatei");
  if (d.format && d.format !== PROJEKT_FORMAT) throw new Error("Falsches Format: " + d.format);
  const p = neuesProjekt();
  p.daten = { ...p.daten, ...(d.daten || {}) };
  p.regeln = { ...standardRegeln(), ...(d.regeln || {}) };
  p.library = d.library && typeof d.library === "object" ? d.library : {};
  for (const k of ["screens", "geraete", "kreise", "straenge", "lakas", "kabel", "outputs", "layer"]) p[k] = Array.isArray(d[k]) ? d[k] : [];
  p.pixelraum = d.pixelraum && typeof d.pixelraum === "object" ? d.pixelraum : {};
  p.kabelAnpassung = d.kabelAnpassung && typeof d.kabelAnpassung === "object" ? d.kabelAnpassung : {};
  p.ausgabe = { ...p.ausgabe, ...(d.ausgabe || {}) };
  p.gespeichert = d.gespeichert || null;
  p.rexId = typeof d.rexId === "string" || typeof d.rexId === "number" ? d.rexId : null;
  // bis 10/2026: Weg zur Wand als Feld am Prozessor → eigenes Gerät ohne Library-Eintrag
  for (const g of p.geraete.filter(g => g.art === "prozessor" && "weg" in g)) {
    if (g.weg === "stagebox" || g.weg === "multicore") {
      const ports = [...new Set(p.straenge.filter(k => k.prozessor === g.id).flatMap(k => [k.port, k.backupPort]).filter(Number.isFinite))].sort((a, b) => a - b);
      const d = { id: neueId(g.weg === "stagebox" ? "sb" : "mc"), art: g.weg, lib: null, name: (g.weg === "stagebox" ? "Stagebox " : "Multicore ") + g.name, standort: "an der Wand",
        prozessor: g.id, ports, ausgangKabel: null, ausgangLaengeM: null };
      if (g.weg === "stagebox") { d.zuleitung = { kabel: g.portKabel, laengeM: g.portLaengeM ?? null, anzahl: 1 }; d.strom = null; g.portLaengeM = null; }
      p.geraete.push(d);
    }
    delete g.weg; delete g.wegLib;
  }
  for (const d of p.geraete.filter(d => d.art === "stagebox" || d.art === "multicore")) d.ports = Array.isArray(d.ports) ? d.ports.filter(Number.isFinite) : [];
  for (const s of p.screens) {
    s.module = Array.isArray(s.module) ? s.module.filter(m => m && m.lib && Number.isFinite(m.x) && Number.isFinite(m.y)) : [];
    s.strom = { richtung: "spalten", start: "ol", verteilung: "minimal", ...(s.strom || {}) };
    s.signal = { richtung: "spalten", start: "ol", ...(s.signal || {}) };
    s.bauart = s.bauart === "gestellt" ? "gestellt" : "geflogen";
  }
  return p;
}

/* ---------- Zustand ---------- */
let P = neuesProjekt();
let gespeicherterStand = null; // JSON beim letzten Speichern → „ungespeichert“-Anzeige

/* Library-Eintrag fürs Projekt: zuerst die Projektkopie, sonst die Library */
function eintrag(id) { return P.library[id] || LIB.eintraege.get(id) || null; }
function nutzeEintrag(id) {
  if (!P.library[id] && LIB.eintraege.has(id)) P.library[id] = klon(LIB.eintraege.get(id));
  return eintrag(id);
}
/* Abweichungen Projektkopie ↔ Library */
function libraryAbweichungen() {
  const erg = [];
  for (const [id, kopie] of Object.entries(P.library)) {
    const aktuell = LIB.eintraege.get(id);
    if (aktuell && JSON.stringify(aktuell) !== JSON.stringify(kopie)) erg.push(id);
  }
  return erg;
}

const screenById = id => P.screens.find(s => s.id === id) || null;
const geraetById = id => P.geraete.find(g => g.id === id) || null;

/* Maße eines Moduls in mm */
function modMass(m) {
  const e = eintrag(m.lib);
  const led = e?.attribute?.led || {};
  return { b: Number(led.mmB) || 500, h: Number(led.mmH) || 500 };
}
function modRect(m) { const { b, h } = modMass(m); return { x: m.x, y: m.y, b, h }; }

/* ---------- Rückgängig / Wiederholen ---------- */
const HISTORIE_MAX = 80;
const historie = { zurueck: [], vor: [], stand: null, timer: 0 };

function historieStart() { historie.zurueck = []; historie.vor = []; historie.stand = JSON.stringify(P); }
function historieMerken(sofort = false) {
  clearTimeout(historie.timer);
  const merken = () => {
    const jetzt = JSON.stringify(P);
    if (jetzt === historie.stand) return;
    historie.zurueck.push(historie.stand);
    if (historie.zurueck.length > HISTORIE_MAX) historie.zurueck.shift();
    historie.vor.length = 0;
    historie.stand = jetzt;
    aktualisiereKopf();
  };
  if (sofort) merken(); else historie.timer = setTimeout(merken, 300);
}
function historieSchritt(von, nach) {
  historieMerken(true);
  if (!von.length) return;
  nach.push(historie.stand);
  historie.stand = von.pop();
  P = JSON.parse(historie.stand);
  aenderung({ merken: false });
}
const rueckgaengig = () => historieSchritt(historie.zurueck, historie.vor);
const wiederholen = () => historieSchritt(historie.vor, historie.zurueck);

/* ---------- Speichern / Laden ---------- */
function projektJson() {
  P.gespeichert = new Date().toISOString();
  return JSON.stringify(P, null, 2);
}
/* Speichern: mit Rex-Anbindung in die Datenbank, sonst (oder mit alsDatei) als Datei */
async function projektSpeichern(alsDatei = false) {
  if (nurLesen()) return toast("Nur ansehen – der LED-Planer ist für diesen Benutzer nicht freigeschaltet.", "fehler");
  if (Datenquelle.verbunden() && !alsDatei) {
    try { P.rexId = await Datenquelle.speichereProjekt(projektJson(), P.rexId); }
    catch (e) { return toast("Speichern im Rex-System fehlgeschlagen: " + e.message + " – „Als Datei speichern“ nutzen.", "fehler"); }
  } else herunterladen(projektJson(), dateiname(P.daten.titel, ".ledplaner.json"));
  gespeicherterStand = JSON.stringify(P);
  autosave();
  aktualisiereKopf();
  toast(Datenquelle.verbunden() && !alsDatei ? "Projekt im Rex-System gespeichert." : "Projekt gespeichert.", "ok");
}
function projektUebernehmen(d, quelle) {
  P = normalisiereProjekt(d);
  gespeicherterStand = JSON.stringify(P);
  historieStart();
  ui.screen = P.screens[0]?.id || null; ui.auswahl.clear();
  aenderung({ merken: false });
  toast(`„${quelle}“ geöffnet.`, "ok");
}
async function projektAusRexOeffnen() {
  if (istUngespeichert() && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
  let liste;
  try { liste = await Datenquelle.ladeProjektListe(); } catch (e) { return toast("Projektliste nicht erreichbar: " + e.message, "fehler"); }
  if (!Array.isArray(liste) || !liste.length) return toast("Im Rex-System gibt es noch keine LED-Planer-Projekte.", "info");
  const erg = await formularDialog("Projekt aus Rex öffnen", [
    { name: "id", label: "Projekt", art: "auswahl", wert: liste[0].id, optionen: liste.map(p => [p.id, `${p.titel || p.id}${p.geaendert ? " · " + String(p.geaendert).slice(0, 10) : ""}`]) },
  ], "Öffnen");
  if (!erg) return;
  try { const d = await Datenquelle.ladeProjekt(erg.id); d.rexId = d.rexId ?? erg.id; projektUebernehmen(d, liste.find(p => String(p.id) === erg.id)?.titel || erg.id); }
  catch (e) { toast("Projekt konnte nicht geladen werden: " + e.message, "fehler"); }
}
async function projektOeffnen() {
  const f = await waehleDatei($("#datei-projekt"));
  if (!f) return;
  try {
    projektUebernehmen(JSON.parse(f.text), f.name);
  } catch (e) {
    toast("Datei konnte nicht geöffnet werden: " + e.message, "fehler");
  }
}
function projektNeu() {
  if (istUngespeichert() && !confirm("Ungespeicherte Änderungen verwerfen und ein neues Projekt anlegen?")) return;
  P = neuesProjekt();
  gespeicherterStand = JSON.stringify(P);
  historieStart();
  ui.screen = null; ui.auswahl.clear();
  aenderung({ merken: false });
}
function istUngespeichert() { return gespeicherterStand !== null && JSON.stringify(P) !== gespeicherterStand; }

function autosave() { speicher.schreiben(SPEICHER_AKTUELL, { projekt: P, gespeicherterStand }); }
function autosaveLaden() {
  const d = speicher.lesen(SPEICHER_AKTUELL);
  if (!d || !d.projekt) return false;
  try {
    P = normalisiereProjekt(d.projekt);
    gespeicherterStand = d.gespeicherterStand || JSON.stringify(P);
    return true;
  } catch (e) { return false; }
}
