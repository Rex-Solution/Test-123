/* Oberfläche: Zustand, Reiter-Gerüst, Projektbaum, Prüfhinweise, Kopfleiste.
   Jeder Reiter meldet sich in REITER an:
   REITER.name = { werkzeuge(), palette(), zeichnung(el), liste(), rechts(), pruefungen(), titelPalette } */

const ui = {
  haupt: "planen", reiter: "aufbau",
  modus: { strom: "wand", signal: "wand", ausgabe: "screen" },
  screen: null,               // gewählter Screen (id)
  auswahl: new Set(),         // gewählte Module (ids)
  werkzeug: "auswahl",        // auswahl | pinsel
  ansicht: new Map(),         // je Screen: viewBox { x, y, b, h }
  hinten: false,              // Rückansicht im Aufbau
  sel: { verteiler: null, kreis: null, prozessor: null, strang: null, kabel: null, laka: null, output: null, weg: null },
  pinsel: { strom: null, signal: null },  // Ziel des Pinsels: { verteiler, kanal } bzw. { prozessor, port }
  libSel: null, libFilter: "", libNurOffen: false,
  einst: "datei",
  kabelFilter: { gewerk: "alle", screen: "alle", ohneLaenge: false },
};
const REITER = {};

function aktuellerScreen() {
  let s = screenById(ui.screen);
  if (!s && P.screens.length) { s = P.screens[0]; ui.screen = s.id; }
  return s;
}

/* Nach jeder Änderung: merken, sichern, neu zeichnen */
function aenderung({ merken = true } = {}) {
  if (merken) historieMerken(true); // jede Aktion ein eigener Rückgängig-Schritt
  autosave();
  render();
}

function render() {
  aktualisiereKopf();
  $$("[data-haupt]").forEach(b => b.setAttribute("aria-selected", b.dataset.haupt === ui.haupt));
  $$(".ansicht").forEach(a => a.classList.toggle("aktiv", a.id === ui.haupt));
  $("#unterleiste").hidden = ui.haupt !== "planen";
  if (ui.haupt === "planen") renderPlanen();
  else if (ui.haupt === "library") renderLibrary();
  else renderEinstellungen();
}

function aktualisiereKopf() {
  $("#status-name").textContent = P.daten.titel || "Projekt";
  const offen = istUngespeichert() || gespeicherterStand === null;
  $("#status-gespeichert").textContent = offen ? "· ungespeichert" : "· gespeichert";
  $("#status-gespeichert").className = offen ? "ungespeichert" : "leise";
  if (nurLesen()) { $("#status-gespeichert").textContent = "· nur ansehen"; $("#status-gespeichert").className = "ungespeichert"; }
  $("#btn-speichern").disabled = nurLesen();
  $("#btn-speichern").title = Datenquelle.verbunden() ? "Im Rex-System speichern (Strg+S)" : "Projekt als Datei speichern (Strg+S)";
  $("#btn-undo").disabled = !historie.zurueck.length && JSON.stringify(P) === historie.stand;
  $("#btn-redo").disabled = !historie.vor.length;
}

function ampelKlasse(liste) {
  if (liste.some(h => h.art === "fehler")) return "fehler";
  if (liste.some(h => h.art === "warn")) return "warn";
  return "ok";
}

function renderPlanen() {
  // Ampeln aller Reiter
  for (const b of $$("[data-reiter]")) {
    b.setAttribute("aria-selected", b.dataset.reiter === ui.reiter);
    const r = REITER[b.dataset.reiter];
    let liste = [];
    try { liste = r?.pruefungen ? r.pruefungen() : []; } catch (e) { console.error(e); liste = [{ art: "fehler", text: "Prüfung fehlgeschlagen" }]; }
    b.querySelector(".ampel").className = "ampel " + (P.screens.length ? ampelKlasse(liste) : "");
  }
  const r = REITER[ui.reiter];
  renderBaum();
  $("#palette-titel").textContent = r.titelPalette || "Library";
  $("#palette").innerHTML = r.palette ? r.palette() : "";
  $("#werkzeuge").innerHTML = r.werkzeuge ? r.werkzeuge() : "";
  const z = $("#zeichnung");
  z.className = "zeichnung";
  r.zeichnung(z);
  $("#liste").innerHTML = r.liste ? r.liste() : "";
  $("#rechts").innerHTML = (r.rechts ? r.rechts() : "") + pruefHtml(r.pruefungen ? r.pruefungen() : []);
}

function pruefHtml(liste) {
  if (!P.screens.length) return "";
  if (!liste.length) liste = [{ art: "ok", text: "Keine Auffälligkeiten." }];
  return `<div class="label">Prüfhinweise</div>` + liste.map(h =>
    `<div class="hinweis ${h.art}"${h.ziel ? ` data-ziel="${esc(h.ziel)}"` : ""}>${esc(h.text)}</div>`).join("");
}

/* Klick auf Prüfhinweis: Ziel auswählen (z.B. "screen:<id>", "modul:<id>", "kabel:<key>") */
function springeZu(ziel) {
  const [art, id] = ziel.split(":");
  if (art === "screen") { ui.screen = id; ui.auswahl.clear(); }
  if (art === "modul") { const s = P.screens.find(s => s.module.some(m => m.id === id)); if (s) { ui.screen = s.id; ui.auswahl = new Set([id]); } }
  if (art === "kabel") { ui.reiter = "kabel"; ui.sel.kabel = ziel.slice(6); }
  if (art === "verteiler") { ui.reiter = "strom"; ui.sel.verteiler = id; }
  if (art === "prozessor") { ui.reiter = "signal"; ui.sel.prozessor = id; ui.sel.weg = null; }
  if (art === "weg") { const d = geraetById(id); if (d) { ui.reiter = "signal"; ui.sel.prozessor = d.prozessor; ui.sel.weg = id; } }
  if (art === "library") { ui.haupt = "library"; ui.libSel = id; }
  render();
}

function renderBaum() {
  const s = aktuellerScreen();
  const verteiler = P.geraete.filter(g => g.art === "verteiler");
  const einspeisungen = P.geraete.filter(g => g.art === "einspeisung");
  const prozessoren = P.geraete.filter(g => g.art === "prozessor");
  const li = (klasse, attr, name, rechts = "") => `<li class="${klasse}" ${attr}><span class="name">${esc(name)}</span>${rechts}</li>`;
  $("#baum").innerHTML = [
    `<li class="gruppe">Screens <button data-aktion="screen-neu" title="Neuen Screen anlegen" style="padding:0 8px">+</button></li>`,
    ...P.screens.map(x => li(x.id === s?.id ? "sel" : "", `data-screen="${x.id}"`, x.name, `<span class="leise klein">${x.module.length}</span>`)),
    P.screens.length ? "" : `<li class="leise">noch kein Screen</li>`,
    `<li class="gruppe">Stromverteiler</li>`,
    ...verteiler.map(g => li(ui.sel.verteiler === g.id ? "sel" : "", `data-geraet="${g.id}"`, g.name)),
    ...einspeisungen.map(g => li(ui.sel.verteiler === g.id ? "sel" : "", `data-geraet="${g.id}"`, "⏚ " + g.name)),
    verteiler.length || einspeisungen.length ? "" : `<li class="leise">—</li>`,
    `<li class="gruppe">Prozessoren</li>`,
    ...prozessoren.flatMap(g => [li(ui.sel.prozessor === g.id && !ui.sel.weg ? "sel" : "", `data-geraet="${g.id}"`, g.name),
      ...wegGeraete(g.id).map(d => li(ui.sel.weg === d.id ? "sel" : "", `data-geraet="${d.id}"`, "↳ " + d.name))]),
    prozessoren.length ? "" : `<li class="leise">—</li>`,
  ].join("");
}

/* ---------- Ereignisse des Gerüsts ---------- */
function gerustEreignisse() {
  $$("[data-haupt]").forEach(b => b.onclick = () => { ui.haupt = b.dataset.haupt; render(); });
  $$("[data-reiter]").forEach(b => b.onclick = () => { ui.reiter = b.dataset.reiter; ui.werkzeug = "auswahl"; render(); });
  $("#btn-undo").onclick = rueckgaengig;
  $("#btn-redo").onclick = wiederholen;
  $("#btn-speichern").onclick = () => projektSpeichern();
  $("#btn-drucken").onclick = druckDialog;
  $("#btn-live").onclick = () => liveOeffnen(aktuellerScreen());

  $("#baum").addEventListener("click", async e => {
    const a = e.target.closest("[data-aktion]")?.dataset.aktion;
    if (a === "screen-neu") return screenAnlegen();
    const sc = e.target.closest("[data-screen]");
    if (sc) { ui.screen = sc.dataset.screen; ui.auswahl.clear(); render(); return; }
    const g = e.target.closest("[data-geraet]");
    if (g) {
      const ger = geraetById(g.dataset.geraet);
      if (ger.art === "prozessor") { ui.reiter = "signal"; ui.sel.prozessor = ger.id; ui.sel.weg = null; }
      else if (istWeg(ger)) { ui.reiter = "signal"; ui.sel.prozessor = ger.prozessor; ui.sel.weg = ger.id; }
      else { ui.reiter = "strom"; ui.sel.verteiler = ger.id; }
      render();
    }
  });
  $("#baum").addEventListener("dblclick", e => {
    const sc = e.target.closest("[data-screen]");
    if (sc) screenBearbeiten(screenById(sc.dataset.screen));
  });
  $("#rechts").addEventListener("click", e => { const h = e.target.closest(".hinweis[data-ziel]"); if (h) springeZu(h.dataset.ziel); });

  document.addEventListener("keydown", e => {
    const imFeld = e.target.matches("input, textarea, select");
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); projektSpeichern(); return; }
    if (imFeld || $("#dialog").open) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); rueckgaengig(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); wiederholen(); return; }
    if (ui.haupt !== "planen") return;
    const r = REITER[ui.reiter];
    if (r.taste && r.taste(e) === true) e.preventDefault();
  });
  window.addEventListener("beforeunload", e => { if (istUngespeichert()) { e.preventDefault(); e.returnValue = ""; } });
}

async function screenAnlegen() {
  const erg = await formularDialog("Neuer Screen", [
    { name: "name", label: "Name *", wert: "Screen " + (P.screens.length + 1) },
    { name: "beschreibung", label: "Beschreibung", wert: "" },
    { name: "ukM", label: "Unterkante (m)", art: "zahl", wert: "" },
    { name: "bauart", label: "Bauart", art: "auswahl", wert: "geflogen", optionen: [["geflogen", "geflogen"], ["gestellt", "gestellt"]] },
  ], "Anlegen");
  if (!erg) return;
  if (!erg.name.trim()) return toast("Name: darf nicht leer sein.", "fehler");
  const s = neuerScreen(erg.name.trim());
  s.beschreibung = erg.beschreibung; s.ukM = Number.isFinite(erg.ukM) ? erg.ukM : null; s.bauart = erg.bauart;
  P.screens.push(s);
  ui.screen = s.id; ui.auswahl.clear(); ui.reiter = "aufbau";
  aenderung();
}

async function screenBearbeiten(s) {
  if (!s) return;
  const erg = await formularDialog("Screen bearbeiten", [
    { name: "name", label: "Name *", wert: s.name },
    { name: "beschreibung", label: "Beschreibung", wert: s.beschreibung },
    { name: "ukM", label: "Unterkante (m)", art: "zahl", wert: s.ukM ?? "" },
    { name: "bauart", label: "Bauart", art: "auswahl", wert: s.bauart, optionen: [["geflogen", "geflogen"], ["gestellt", "gestellt"]] },
  ]);
  if (!erg) return;
  if (!erg.name.trim()) return toast("Name: darf nicht leer sein.", "fehler");
  Object.assign(s, { name: erg.name.trim(), beschreibung: erg.beschreibung, ukM: Number.isFinite(erg.ukM) ? erg.ukM : null, bauart: erg.bauart });
  aenderung();
}

/* Hilfen für Tabellen/Balken */
function balken(anteil, mitText = true) {
  const p = Math.max(0, Math.min(100, anteil * 100));
  const k = anteil > 1 ? "fehler" : anteil > 0.9 ? "warn" : "";
  return `<span class="balken"><i class="${k}" style="width:${p}%"></i></span>${mitText ? fmt(anteil * 100) + " %" : ""}`;
}
