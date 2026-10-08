/* Hauptreiter Einstellungen: Speichern/Laden, Projektdaten, Hausregeln, verknüpfte Programme. */

const REGEL_FELDER = [
  { abschnitt: "Strom" },
  { k: "reserve", label: "Reserve je Kreis (%)", art: "zahl", min: 0, max: 90 },
  { k: "schieflast", label: "Max. Schieflast (%)", art: "zahl", min: 0, max: 100 },
  { k: "planung", label: "Planung mit", art: "auswahl", optionen: [["max", "Max.-Last"], ["durchschnitt", "Durchschnitt"]] },
  { k: "spannung", label: "Spannung (V)", art: "zahl", min: 100, max: 400 },
  { k: "absicherung", label: "Standard-Absicherung (A)", art: "zahl", min: 1, max: 125 },
  { k: "einschaltPruefen", label: "Einschaltstrom prüfen", art: "ja" },
  { abschnitt: "Signal" },
  { k: "backup", label: "Backup standardmäßig (ab Strangende)", art: "ja" },
  { k: "portMax", label: "Max. Port-Auslastung (%)", art: "zahl", min: 10, max: 100 },
  { k: "catMax", label: "Max. Cat-Länge (m)", art: "zahl", min: 1, max: 500 },
  { abschnitt: "Druck" },
  { k: "druckZusatz", label: "Zusatz Großformat", art: "auswahl", optionen: [["A3", "A3 quer"], ["A4", "A4 quer"], ["keins", "keins"]] },
  { k: "riggingFreigabe", label: "Freigabefeld Rigging", art: "auswahl", optionen: [["intern", "intern"], ["extern", "extern (Location/Statiker)"]] },
];
const PROJEKT_FELDER = [["titel", "Titel / Projektname *"], ["kunde", "Kunde"], ["veranstaltung", "Veranstaltung"], ["ort", "Ort / Location"], ["ersteller", "Ersteller"], ["revision", "Revision"], ["datum", "Datum"]];

function renderEinstellungen() {
  $$("#einst-menue li").forEach(li => li.classList.toggle("sel", li.dataset.einst === ui.einst));
  const el = $("#einst-inhalt");
  if (ui.einst === "datei") {
    el.innerHTML = `<div class="karte"><h2>Speichern / Laden</h2>
      <p class="klein leise">${Datenquelle.verbunden()
        ? `Projekte liegen im Rex-System${P.rexId ? ` (dieses Projekt: Nr. ${esc(P.rexId)})` : " (dieses Projekt noch nicht)"}. Als Datei <code>.ledplaner.json</code> geht es zusätzlich.`
        : "Projekte werden als Datei <code>.ledplaner.json</code> gespeichert (ohne Datenbank)."} Zusätzlich sichert der Browser automatisch den letzten Stand.</p>
      <div class="knopfreihe"><button data-e="neu">Neu</button><button data-e="oeffnen">Datei öffnen …</button>${Datenquelle.verbunden() ? `<button data-e="rex-oeffnen">Aus Rex öffnen …</button><button data-e="datei-speichern" ${nurLesen() ? "disabled" : ""}>Als Datei speichern</button>` : ""}
        <button data-e="speichern" class="primaer" ${nurLesen() ? "disabled" : ""}>${Datenquelle.verbunden() ? "Im Rex-System speichern" : "Speichern"}</button></div>
      <div class="abschnitt">Beispiel</div>
      <p class="klein leise">Lädt den Beispiel-Screen „Bühne Mitte“ (12 × 3 LEDTEK P4+WH + 1 Reihe P4+sWH) mit StageSmarts C24, NovaStar MX30 und CVT10.</p>
      <button data-e="beispiel">Beispielprojekt laden</button>
      <div class="abschnitt">Library</div>
      <p class="klein leise">Library-Einträge im Hauptreiter „Library“ importieren und exportieren (<code>.ledlibrary.json</code>).</p></div>`;
  } else if (ui.einst === "projekt") {
    el.innerHTML = `<div class="karte"><h2>Projektdaten</h2><p class="klein leise">Erscheinen im Schriftfeld aller Pläne und auf dem Deckblatt.</p>
      <div class="drei">${PROJEKT_FELDER.map(([k, t]) => `<label class="feld${k === "titel" && !P.daten.titel ? " pflicht-fehlt" : ""}"><span>${t}</span><input data-projekt="${k}" value="${esc(P.daten[k] || "")}" ${k === "datum" ? 'type="date"' : ""}></label>`).join("")}</div></div>`;
  } else if (ui.einst === "regeln") {
    el.innerHTML = `<div class="karte"><div class="knopfreihe"><h2 style="margin:0">Hausregeln</h2><span class="fueller"></span><button data-e="regeln-standard">Standardwerte</button></div>
      <p class="klein leise">Gelten für dieses Projekt. Ab der Datenbank-Anbindung kommen sie firmenweit aus dem Rex-System.</p>
      <div class="drei">${REGEL_FELDER.map(f => {
        if (f.abschnitt) return `<div class="abschnitt" style="grid-column:1/-1">${f.abschnitt}</div>`;
        const w = P.regeln[f.k];
        if (f.art === "ja") return `<label class="feld"><span>${f.label}</span><select data-regel="${f.k}" data-art="ja"><option value="ja"${w ? " selected" : ""}>ja</option><option value="nein"${w ? "" : " selected"}>nein</option></select></label>`;
        if (f.art === "auswahl") return `<label class="feld"><span>${f.label}</span><select data-regel="${f.k}">${f.optionen.map(([o, t]) => `<option value="${o}"${w === o ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
        return `<label class="feld"><span>${f.label}</span><input data-regel="${f.k}" data-art="zahl" data-min="${f.min}" data-max="${f.max}" value="${fmtFlex(w)}" inputmode="decimal"></label>`;
      }).join("")}</div></div>`;
  } else if (ui.einst === "material") {
    el.innerHTML = materialHtml();
  } else {
    const f = REX.freischaltung;
    el.innerHTML = `<div class="karte"><h2>Rex-System</h2>
      <table class="werte"><tr><td>Datenquelle</td><td>${Datenquelle.verbunden() ? `Datenbank-Agent · ${esc(KONFIG.API_BASIS_URL)}${REX.fehler ? ` <span style="color:var(--fehler)">– nicht erreichbar</span>` : ""}` : "eigenständig (eingebaute Library, Browser, Dateien)"}</td></tr>
      <tr><td>Library</td><td>${["rex", "beispiel", "lokal"].map(h => { const n = [...LIB.herkunft.values()].filter(x => x === h).length; return n ? `${n} ${{ rex: "aus Rex", beispiel: "Beispiele", lokal: "lokal bearbeitet" }[h]}` : ""; }).filter(Boolean).join(" · ")}</td></tr>
      <tr><td>Freischaltung LED-Planer</td><td>${f.ledplaner ? `<span class="badge voll">freigeschaltet</span>` : `<span class="badge teil">nur ansehen</span>`} <span class="leise klein">(${esc(f.quelle)})</span></td></tr></table>
      <p class="klein leise">Die Anbindung an den Datenbank-Agent ist vorbereitet: Library, Freischaltung, Projekte und Material-Rückgabe laufen über eine Stelle im Code (<code>00-datenquelle.js</code>). Ohne Adresse arbeitet der LED-Planer vollständig eigenständig.</p>
      <div class="abschnitt">Signalfluss-Planer</div>
      <p class="klein leise">Der Signalfluss-Planer wird neu gebaut. Der LED-Planer braucht ihn nicht: Zuspieler-Outputs werden im Reiter Ausgabe von Hand angelegt. Eine Verknüpfung kommt später.</p></div>`;
  }
}

function einstellungenEreignisse() {
  $("#einst-menue").addEventListener("click", e => { const li = e.target.closest("[data-einst]"); if (li) { ui.einst = li.dataset.einst; renderEinstellungen(); } });
  $("#einst-inhalt").addEventListener("click", e => {
    const a = e.target.closest("[data-e]")?.dataset.e;
    if (a === "neu") projektNeu();
    if (a === "oeffnen") projektOeffnen();
    if (a === "speichern") projektSpeichern();
    if (a === "datei-speichern") projektSpeichern(true);
    if (a === "rex-oeffnen") projektAusRexOeffnen();
    if (a?.startsWith("material-")) materialAktion(a);
    if (a === "beispiel") beispielProjektLaden();
    if (a === "regeln-standard") { P.regeln = standardRegeln(); aenderung(); }
  });
  $("#einst-inhalt").addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.projekt) {
      if (t.dataset.projekt === "titel" && !t.value.trim()) { toast("Titel: darf nicht leer sein.", "fehler"); return renderEinstellungen(); }
      P.daten[t.dataset.projekt] = t.value; return aenderung();
    }
    if (t.dataset.regel) {
      let w = t.value;
      if (t.dataset.art === "ja") w = w === "ja";
      else if (t.dataset.art === "zahl") {
        w = leseZahl(w);
        const min = Number(t.dataset.min), max = Number(t.dataset.max);
        if (!(w >= min && w <= max)) { toast(`Wert: ${min} bis ${max}.`, "fehler"); return renderEinstellungen(); }
      }
      P.regeln[t.dataset.regel] = w;
      aenderung();
    }
  });
}

/* Beispielprojekt: der durchgerechnete Screen aus ledplaner-beispieldaten.md */
function beispielProjektLaden() {
  if (istUngespeichert() && !confirm("Ungespeicherte Änderungen verwerfen und das Beispiel laden?")) return;
  P = neuesProjekt();
  P.daten.titel = "Beispiel Bühne Mitte";
  const s = neuerScreen("Bühne Mitte");
  s.beschreibung = "Bühne Mitte, hinter der Band"; s.ukM = 2.5;
  for (const id of ["beispiel-ledtek-p4wh-pro-v3", "beispiel-ledtek-p4swh-pro-v3"]) nutzeEintrag(id);
  for (let c = 0; c < 12; c++) {
    for (let r = 0; r < 3; r++) s.module.push({ id: neueId("m"), lib: "beispiel-ledtek-p4wh-pro-v3", x: c * 500, y: r * 1000 });
    s.module.push({ id: neueId("m"), lib: "beispiel-ledtek-p4swh-pro-v3", x: c * 500, y: 3000 });
  }
  P.screens.push(s);
  ui.screen = s.id; ui.auswahl.clear(); ui.ansicht.clear();
  const ein = { id: neueId("e"), art: "einspeisung", name: "Hausanschluss", stecker: "CEE 63 A", ampere: 63, standort: "Bühne links" };
  P.geraete.push(ein);
  const v = verteilerAnlegen("beispiel-stagesmarts-c24", false);
  v.standort = "Bühne links hinten"; v.speisung.von = ein.id; v.speisung.laengeM = 25;
  s.strom.verteilung = "ausgang";
  s.rigging = { lib: "beispiel-flugrahmen-1m", anzeigen: true }; nutzeEintrag("beispiel-flugrahmen-1m");
  gespeicherterStand = null;
  historieStart();
  ui.haupt = "planen"; ui.reiter = "strom";
  // Kreise und Stränge über die normalen Vorschläge (ohne Rückfragen)
  const confirmAlt = window.confirm; window.confirm = () => true;
  try {
    stromVorschlag();
    const lib = "beispiel-novastar-mx30";
    const g = prozessorAnlegen(lib); g.portLaengeM = 60; g.strom = { verteiler: v.id, kanal: 7 };
    signalVorschlag();
    // Glasfaser vom MX30 (FOH) zur CVT10 hinter der Wand, von dort Cat zu den Strängen
    const sb = wegAnlegen("stagebox", "beispiel-novastar-cvt10", g.id);
    Object.assign(sb, { standort: "hinter der Wand", ausgangLaengeM: 5, strom: { verteiler: v.id, kanal: 8 } });
    g.portLaengeM = null; ui.sel.weg = null;
    P.outputs.push({ id: neueId("o"), name: "Medienserver 1 · Out 1", zuspieler: "Medienserver 1", b: 3840, h: 2160, hz: 50, anschluss: "HDMI", prozessor: g.id, eingang: "HDMI 2.0" });
    layerVorschlag(g.id);
  } finally { window.confirm = confirmAlt; }
  ui.reiter = "aufbau";
  aenderung();
  toast("Beispielprojekt geladen.", "ok");
}
