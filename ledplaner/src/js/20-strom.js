/* Reiter Strom: Verteiler, Einspeisungen, Lakas, Kreise (Vorschlag + Pinsel), Phasen, Übersicht. */

/* ---------- Rechnen ---------- */
const PHASEN = ["L1", "L2", "L3"];

function modulLast(m, planung = P.regeln.planung) {
  const a = eintrag(m.lib)?.attribute || {};
  if (planung === "durchschnitt") return Number.isFinite(a.led?.wTyp) ? a.led.wTyp : (Number.isFinite(a.stromverbrauch) ? a.stromverbrauch : 0);
  return Number.isFinite(a.stromverbrauch) ? a.stromverbrauch : 0;
}
function verteilerLed(v) { return eintrag(v.lib)?.attribute?.led || {}; }
function kanalVon(v, nr) { return (verteilerLed(v).kanaele || []).find(k => k.nr === nr) || null; }
function kanalPhase(v, nr) {
  const k = kanalVon(v, nr);
  if (k?.phase) return { phase: k.phase, angenommen: false };
  return { phase: "L" + (((nr - 1) % 3) + 1), angenommen: true };
}
function kreisKapazitaet(k) {
  const v = geraetById(k.verteiler);
  const amp = (v && kanalVon(v, k.kanal)?.ampere) || P.regeln.absicherung;
  return amp * P.regeln.spannung * (1 - P.regeln.reserve / 100);
}
function kreisModule(k) { const s = screenById(k.screen); const map = new Map((s?.module || []).map(m => [m.id, m])); return k.module.map(id => map.get(id)).filter(Boolean); }
/* Last eines Kreises: Module + Geräte am selben Kanal (z.B. Stagebox am Ende der Kette) */
function kreisLast(k, planung) { return kreisModule(k).reduce((a, m) => a + modulLast(m, planung), 0) + geraeteLast(k.verteiler, k.kanal); }
function maxJeBruecke(module) {
  const w = module.map(m => eintrag(m.lib)?.attribute?.led?.strom?.maxJeBruecke).filter(Number.isFinite);
  return w.length ? Math.min(...w) : Infinity;
}
/* Kreise eines Screens in Anzeigereihenfolge (nach Verteiler und Kanal) */
function kreiseVon(screenId) {
  const vIdx = id => P.geraete.findIndex(g => g.id === id);
  return P.kreise.filter(k => k.screen === screenId).sort((a, b) => vIdx(a.verteiler) - vIdx(b.verteiler) || a.kanal - b.kanal);
}
function kreisName(k) {
  const vs = P.geraete.filter(g => g.art === "verteiler");
  const vi = vs.findIndex(v => v.id === k.verteiler);
  return (vs.length > 1 ? `V${vi + 1}·` : "") + "K" + k.kanal;
}
function kreisFarbe(k) { const liste = kreiseVon(k.screen); return wegFarbe(liste.indexOf(k)); }

/* Lasten je Verteiler und Einspeisung (inkl. nachgelagerter Verteiler und Geräte) */
function stromBilanz() {
  const v = new Map();
  for (const g of P.geraete) if (g.art === "verteiler" || g.art === "einspeisung") v.set(g.id, { phasen: { L1: 0, L2: 0, L3: 0 }, phasenTyp: { L1: 0, L2: 0, L3: 0 }, w: 0, wTyp: 0 });
  const add = (id, phase, w, wTyp) => { const b = v.get(id); if (!b) return; b.phasen[phase] += w / P.regeln.spannung; b.phasenTyp[phase] += wTyp / P.regeln.spannung; b.w += w; b.wTyp += wTyp; };
  // Kreise
  for (const k of P.kreise) {
    const ver = geraetById(k.verteiler); if (!ver) continue;
    const { phase } = kanalPhase(ver, k.kanal);
    add(ver.id, phase, kreisLast(k, "max"), kreisLast(k, "durchschnitt"));
  }
  // Geräte an Kanälen (Prozessor, Stagebox)
  for (const g of P.geraete) {
    if (!g.strom?.verteiler) continue;
    if (P.kreise.some(k => k.verteiler === g.strom.verteiler && k.kanal === g.strom.kanal)) continue;   // steckt schon in kreisLast
    const ver = geraetById(g.strom.verteiler); if (!ver) continue;
    const w = eintrag(g.lib)?.attribute?.stromverbrauch || 0;
    add(ver.id, kanalPhase(ver, g.strom.kanal).phase, w, w);
  }
  // Nachgelagerte Verteiler nach oben summieren (Schleifen werden ignoriert)
  const summe = new Map();
  const gesamt = (id, besucht = new Set()) => {
    if (summe.has(id)) return summe.get(id);
    if (besucht.has(id)) return v.get(id);
    besucht.add(id);
    const eigen = v.get(id);
    const erg = { phasen: { ...eigen.phasen }, phasenTyp: { ...eigen.phasenTyp }, w: eigen.w, wTyp: eigen.wTyp };
    for (const kind of P.geraete.filter(g => g.art === "verteiler" && g.speisung?.von === id)) {
      const k = gesamt(kind.id, besucht);
      for (const p of PHASEN) { erg.phasen[p] += k.phasen[p]; erg.phasenTyp[p] += k.phasenTyp[p]; }
      erg.w += k.w; erg.wTyp += k.wTyp;
    }
    summe.set(id, erg);
    return erg;
  };
  for (const id of v.keys()) gesamt(id);
  return summe;
}
function schieflast(ph) {
  const w = PHASEN.map(p => ph[p]); const max = Math.max(...w);
  return max > 0 ? (max - Math.min(...w)) / max : 0;
}
function einspeisungAmpere(g) {
  if (g.art === "einspeisung") return Number(g.ampere) || 0;
  return Number(verteilerLed(g).einspeisung?.ampere) || 0;
}

/* Laka für einen Ausgang sicherstellen (Harting/Socapex-Ausgänge) */
function sichereLaka(v, ausgangName, screenId) {
  const ausgang = (verteilerLed(v).ausgaenge || []).find(a => a.name === ausgangName);
  if (!ausgang || !/harting|socapex/i.test(ausgang.stecker || "")) return null;
  let l = P.lakas.find(l => l.verteiler === v.id && l.ausgang === ausgangName);
  if (l) { if (!l.screen) l.screen = screenId; return l; }
  const passend = libListe("laka").filter(e => e.attribute.led.stecker === ausgang.stecker && e.attribute.led.kreise >= ausgang.kanaele.length)
    .sort((a, b) => Math.abs(a.attribute.led.laengeM - 25) - Math.abs(b.attribute.led.laengeM - 25));
  const lib = passend[0]?.id || null;
  if (lib) nutzeEintrag(lib);
  l = { id: neueId("l"), lib, verteiler: v.id, ausgang: ausgangName, screen: screenId, laengeM: lib ? eintrag(lib).attribute.led.laengeM : null };
  P.lakas.push(l);
  return l;
}
function lakaFuerKreis(k) {
  const v = geraetById(k.verteiler); if (!v) return null;
  const kanal = kanalVon(v, k.kanal); if (!kanal) return null;
  return P.lakas.find(l => l.verteiler === v.id && l.ausgang === kanal.ausgang) || null;
}

/* Freie Kanäle eines Verteilers */
function belegteKanaele(vId) { return new Set([...P.kreise.filter(k => k.verteiler === vId).map(k => k.kanal), ...P.geraete.filter(g => g.strom?.verteiler === vId).map(g => g.strom.kanal)]); }

/* ---------- Vorschlag ---------- */
async function stromVorschlag() {
  const s = aktuellerScreen();
  if (!s?.module.length) return toast("Der Screen hat keine Module.", "fehler");
  let v = geraetById(ui.sel.verteiler);
  if (!v || v.art !== "verteiler") v = P.geraete.find(g => g.art === "verteiler");
  if (!v) {
    const lib = libListe("verteiler").find(eintragNutzbar);
    if (!lib) return toast("Keine Stromverteiler in der Library.", "fehler");
    v = verteilerAnlegen(lib.id, false);
    toast(`${v.name} (${lib.name}) angelegt.`, "ok");
  }
  const alt = P.kreise.filter(k => k.screen === s.id);
  if (alt.length && !confirm(`Die ${alt.length} vorhandenen Kreise von „${s.name}“ ersetzen?`)) return;
  P.kreise = P.kreise.filter(k => k.screen !== s.id);
  const reihe = schlangenReihenfolge(s.module, s.strom.richtung, s.strom.start);
  const led = verteilerLed(v);
  const belegt = belegteKanaele(v.id);
  // Kanäle: ganze Ausgänge bevorzugen, die schon diesem Screen gehören oder frei sind
  const ausgaenge = (led.ausgaenge || []).map(a => ({ a, frei: a.kanaele.filter(n => !belegt.has(n)),
    eigen: P.lakas.some(l => l.verteiler === v.id && l.ausgang === a.name && l.screen === s.id),
    fremd: P.lakas.some(l => l.verteiler === v.id && l.ausgang === a.name && l.screen && l.screen !== s.id) }))
    .filter(x => !x.fremd)
    .sort((x, y) => (y.eigen - x.eigen) || (y.frei.length - x.frei.length));
  let freieKanaele = ausgaenge.flatMap(x => x.frei);
  if (!led.ausgaenge?.length) freieKanaele.push(...(led.kanaele || []).map(k => k.nr).filter(n => !belegt.has(n)));
  // der Wand von Hand zugewiesene Kanäle zuerst, fremd zugewiesene nie
  const eigen = new Set(zuweisung(s).strom.filter(t => t.startsWith(v.id + "|")).map(t => Number(t.split("|")[1])));
  freieKanaele = [...freieKanaele.filter(n => eigen.has(n)), ...freieKanaele.filter(n => !eigen.has(n) && (kanalScreen(v.id, n) || s.id) === s.id)];
  if (!freieKanaele.length) return toast(`${v.name}: keine freien Kanäle.`, "fehler");
  const kap = Math.min(...freieKanaele.map(n => (kanalVon(v, n)?.ampere || P.regeln.absicherung) * P.regeln.spannung * (1 - P.regeln.reserve / 100)));
  // „ausgang“: so viele Kreise, wie der erste Ausgang freie Kanäle hat (mehr Reserve)
  const nMin = s.strom.verteilung === "ausgang" ? (ausgaenge[0]?.frei.length || 1) : 1;
  const { grenzen: g, ueberlast } = segmentieren(reihe.map(m => modulLast(m)), kap, maxJeBruecke(reihe), nMin);
  const n = g.length - 1;
  if (n > freieKanaele.length) return toast(`${v.name}: ${n} Kreise nötig, aber nur ${freieKanaele.length} Kanäle frei. Weiteren Verteiler anlegen.`, "fehler");
  for (let i = 0; i < n; i++) {
    const kanal = freieKanaele[i];
    P.kreise.push({ id: neueId("k"), screen: s.id, verteiler: v.id, kanal, module: reihe.slice(g[i], g[i + 1]).map(m => m.id) });
    const ka = kanalVon(v, kanal); if (ka?.ausgang) sichereLaka(v, ka.ausgang, s.id);
  }
  ui.sel.verteiler = v.id;
  aenderung();
  toast(`${n} Kreise an ${v.name} vorgeschlagen${ueberlast ? " – Achtung: einzelne Module über der Kreisgrenze" : ""}.`, ueberlast ? "fehler" : "ok");
}

/* ---------- Geräte ---------- */
function verteilerAnlegen(libId, mitRender = true) {
  nutzeEintrag(libId);
  const n = P.geraete.filter(g => g.art === "verteiler").length + 1;
  const kabel = libListe("kabel").find(e => e.attribute.led.gewerk === "strom" && /63/.test(e.name))?.id || null;
  if (kabel) nutzeEintrag(kabel);
  const v = { id: neueId("v"), art: "verteiler", lib: libId, name: "Verteiler " + n, standort: "", speisung: { von: null, kabel, laengeM: null } };
  P.geraete.push(v);
  ui.sel.verteiler = v.id;
  if (mitRender) aenderung();
  return v;
}
async function einspeisungAnlegen() {
  const erg = await formularDialog("Einspeisung anlegen", [
    { name: "name", label: "Name *", wert: "Hausanschluss " + (P.geraete.filter(g => g.art === "einspeisung").length + 1) },
    { name: "stecker", label: "Anschluss", art: "auswahl", wert: "CEE 125 A", optionen: [["CEE 16 A", "CEE 16 A"], ["CEE 32 A", "CEE 32 A"], ["CEE 63 A", "CEE 63 A"], ["CEE 125 A", "CEE 125 A"], ["Powerlock", "Powerlock"], ["Aggregat", "Aggregat"]] },
    { name: "ampere", label: "Absicherung (A)", art: "zahl", wert: 125 },
    { name: "standort", label: "Standort", wert: "" },
  ], "Anlegen");
  if (!erg) return;
  if (!erg.name.trim() || !(erg.ampere > 0)) return toast("Name und Absicherung (A) angeben.", "fehler");
  const g = { id: neueId("e"), art: "einspeisung", name: erg.name.trim(), stecker: erg.stecker, ampere: erg.ampere, standort: erg.standort };
  P.geraete.push(g);
  ui.sel.verteiler = g.id;
  aenderung();
}
function geraetLoeschen(g) {
  if (!confirm(`„${g.name}“ löschen? Zugehörige Kreise und Lakas werden entfernt.`)) return;
  P.geraete = P.geraete.filter(x => x !== g);
  P.kreise = P.kreise.filter(k => k.verteiler !== g.id);
  P.lakas = P.lakas.filter(l => l.verteiler !== g.id);
  P.straenge = P.straenge.filter(k => k.prozessor !== g.id);
  P.geraete = P.geraete.filter(x => !(istWeg(x) && x.prozessor === g.id));
  for (const x of P.geraete) { if (x.speisung?.von === g.id) x.speisung.von = null; if (x.strom?.verteiler === g.id) x.strom = null; }
  ui.sel.verteiler = null; ui.sel.prozessor = null;
  aenderung();
}

/* ---------- Pinsel ---------- */
function pinselStromText() { const [vId, nr] = (ui.pinsel.strom || "").split("|"); const v = geraetById(vId); return v ? `${v.name} · K${nr}` : ""; }
function stromPinselMalen(svg, s, e) {
  if (!ui.pinsel.strom) { toast("Zuerst unten einen Kanal wählen (vorher rechts beim Verteiler der Wand zuweisen).", "fehler"); return null; }
  const [vId, kanalText] = ui.pinsel.strom.split("|");
  const kanal = Number(kanalText);
  const v = geraetById(vId); if (!v) return null;
  let kreis = P.kreise.find(k => k.verteiler === vId && k.kanal === kanal);
  if (kreis && kreis.screen !== s.id) { toast(`Kanal ${kanal} versorgt schon „${screenById(kreis.screen)?.name}“.`, "fehler"); return null; }
  if (!kreis) { kreis = { id: neueId("k"), screen: s.id, verteiler: vId, kanal, module: [] }; P.kreise.push(kreis); }
  const ka = kanalVon(v, kanal); if (ka?.ausgang) sichereLaka(v, ka.ausgang, s.id);
  let geraetHinweis = false;
  const hinzu = id => {
    if (kreis.module.includes(id)) return;
    for (const k of P.kreise) if (k !== kreis && k.screen === s.id) k.module = k.module.filter(x => x !== id);
    kreis.module.push(id);
    P.kreise = P.kreise.filter(k => k.module.length || k === kreis);
    svg.innerHTML = stromSvgInhalt(s);
    const last = kreisLast(kreis), kap = kreisKapazitaet(kreis);
    pinselAnzeige(`${kreisName(kreis)}: ${kreis.module.length} Module · ${fmt(last)} W von ${fmt(kap)} W (${fmt(last / kap * 100)} %)`, last > kap || kreis.module.length > maxJeBruecke(kreisModule(kreis)));
  };
  // Stagebox mit dem Pinsel überstreichen = aus diesem Kanal versorgen
  hinzu.geraet = gId => {
    const d = geraetById(gId); if (!d || (d.strom?.verteiler === vId && d.strom.kanal === kanal)) return;
    d.strom = { verteiler: vId, kanal };
    svg.innerHTML = stromSvgInhalt(s);
    if (!geraetHinweis) { toast(`${d.name} wird aus ${v.name} · Kanal ${kanal} versorgt.`, "ok"); geraetHinweis = true; }
  };
  return hinzu;
}
function pinselAnzeige(text, warn) {
  let el = $("#zeichnung .pinselanzeige");
  if (!el) { el = document.createElement("div"); el.className = "zoomanzeige pinselanzeige"; el.style.bottom = "34px"; $("#zeichnung").appendChild(el); }
  el.textContent = text; el.style.color = warn ? "var(--warnung)" : "var(--text)";
}
/* Gemeinsame Pinsel-Mechanik für Strom und Signal */
function pinselInteraktion(svg, s, starte) {
  let malen = null;
  svg.addEventListener("pointerdown", e => {
    if (e.button !== 0 || leertaste.gedrueckt || ui.werkzeug !== "pinsel") return;
    const g = e.target.closest("[data-mod]"), ger = e.target.closest("[data-strom-geraet]"); if (!g && !ger) return;
    malen = starte(svg, s, e);
    if (!malen) return;
    if (ger) malen.geraet?.(ger.dataset.stromGeraet); else malen(g.dataset.mod);
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", e => {
    if (!malen) return;
    const ziel = document.elementFromPoint(e.clientX, e.clientY);
    const ger = ziel?.closest?.("[data-strom-geraet]");
    if (ger) return malen.geraet?.(ger.dataset.stromGeraet);
    const el = ziel?.closest?.("[data-mod]");
    if (el) malen(el.dataset.mod);
  });
  svg.addEventListener("pointerup", () => { if (malen) { malen = null; aenderung(); } });
}

/* ---------- Darstellung ---------- */
function stromSvgInhalt(s) {
  const kreise = kreiseVon(s.id);
  const farbe = new Map(); kreise.forEach((k, i) => k.module.forEach(id => farbe.set(id, wegFarbe(i))));
  const ohne = new Set(s.module.filter(m => !farbe.has(m.id)).map(m => m.id));
  return screenSvgInhalt(s, {
    fuellung: m => farbe.has(m.id) ? farbe.get(m.id) + "2e" : "transparent",
    fehlerIds: ohne, auswahl: new Set(),
    wege: kreise.map((k, i) => ({ farbe: wegFarbe(i), module: k.module, start: kreisName(k) })),
    oben: `${s.name} · Strom · ${P.regeln.planung === "max" ? "Max.-Last" : "Durchschnitt"}`,
    zusatz: symbolSvg(s, "strom"),
  });
}

REITER.strom = {
  titelPalette: "Library – Strom",
  werkzeuge() {
    const s = aktuellerScreen();
    const uebersicht = ui.modus.strom === "verteiler";
    return `<button data-s="vorschlag" ${s?.module.length ? "" : "disabled"} title="Kreise automatisch bilden (Schlangenlinie, ausgewogen)">Vorschlag erzeugen</button>
      ${s ? `<select data-s-feld="richtung" title="Verlauf"><option value="spalten"${s.strom.richtung === "spalten" ? " selected" : ""}>spaltenweise ↕</option><option value="zeilen"${s.strom.richtung === "zeilen" ? " selected" : ""}>zeilenweise ↔</option></select>
      <select data-s-feld="verteilung" title="Anzahl Kreise"><option value="minimal"${s.strom.verteilung !== "ausgang" ? " selected" : ""}>so wenige Kreise wie möglich</option><option value="ausgang"${s.strom.verteilung === "ausgang" ? " selected" : ""}>ganzen Ausgang nutzen (mehr Reserve)</option></select>
      <select data-s-feld="start" title="Startecke">${[["ol", "oben links"], ["or", "oben rechts"], ["ul", "unten links"], ["ur", "unten rechts"]].map(([k, t]) => `<option value="${k}"${s.strom.start === k ? " selected" : ""}>${t}</option>`).join("")}</select>` : ""}
      <span class="trenner"></span>
      <button data-s="pinsel" class="${ui.werkzeug === "pinsel" ? "aktiv" : ""}" ${s ? "" : "disabled"} title="Kanal unten in der Liste wählen, dann über die Module malen">🖌 Pinsel${ui.werkzeug === "pinsel" && ui.pinsel.strom ? " · " + esc(pinselStromText()) : ""}</button>
      <button data-s="kreis-loeschen" ${ui.sel.kreis ? "" : "disabled"}>Kreis löschen</button>
      <span class="trenner"></span>
      <div class="umschalter"><button data-s="planung" data-wert="max" aria-selected="${P.regeln.planung === "max"}">Max.</button><button data-s="planung" data-wert="durchschnitt" aria-selected="${P.regeln.planung === "durchschnitt"}">Ø</button></div>
      <div class="umschalter"><button data-s="modus" data-wert="wand" aria-selected="${!uebersicht}">Wand</button><button data-s="modus" data-wert="verteiler" aria-selected="${uebersicht}">Alle Verteiler</button></div>`;
  },
  palette() {
    const v = libListe("verteiler");
    return `<div class="knopfreihe" style="margin-bottom:8px"><button data-s="einspeisung">+ Einspeisung</button></div>
      <div class="label">Stromverteiler – Klick: anlegen</div>
      ${v.map(e => `<button class="palette-item" data-s="verteiler-neu" data-lib="${e.id}" ${eintragNutzbar(e) ? "" : "disabled"}><span class="name">${esc(e.name)}</span>${badgeHtml(e)}</button>`).join("") || `<p class="klein leise">Keine Verteiler in der Library.</p>`}
      <div class="label">Lakas</div>${libListe("laka").map(e => `<div class="palette-item" style="cursor:default"><span class="name">${esc(e.name)}</span>${badgeHtml(e)}</div>`).join("")}
      <p class="klein leise">Lakas werden beim Belegen eines Harting-Ausgangs automatisch zugeordnet; Länge und Typ rechts beim Verteiler ändern.</p>`;
  },
  zeichnung(el) {
    if (ui.modus.strom === "verteiler") return stromUebersicht(el);
    const s = aktuellerScreen();
    if (!s) return leerZeichnung(el, "Noch kein Screen – im Reiter Aufbau anlegen.");
    if (!s.module.length) return leerZeichnung(el, "Der Screen hat noch keine Module.");
    el.innerHTML = `<svg viewBox="${vbText(ansicht(s))}" preserveAspectRatio="xMidYMid meet">${stromSvgInhalt(s)}</svg>`;
    if (ui.werkzeug === "pinsel") el.classList.add("pinsel");
    const svg = el.querySelector("svg");
    ansichtSteuerung(el, svg, s);
    symbolZiehen(svg, s);
    pinselInteraktion(svg, s, stromPinselMalen);
    svg.addEventListener("click", e => {
      if (ui.werkzeug === "pinsel") return;
      const id = e.target.closest("[data-mod]")?.dataset.mod;
      const k = id && P.kreise.find(k => k.screen === s.id && k.module.includes(id));
      ui.sel.kreis = k?.id || null; if (k) ui.sel.verteiler = k.verteiler;
      render();
    });
  },
  liste() {
    if (ui.modus.strom === "verteiler") return stromListeAlle();
    const s = aktuellerScreen(); if (!s) return "";
    const kreise = kreiseVon(s.id);
    const ohne = s.module.length - kreise.reduce((a, k) => a + k.module.length, 0);
    const zeilen = zugewieseneKanaele(s);
    return `<div class="kopf"><b>Kanäle „${esc(s.name)}“ · Klick: mit dem Pinsel belegen</b> <span class="leise klein">(<kbd>⌫</kbd> ein Modul zurück · <kbd>Entf</kbd> ganzer Kreis)</span><span class="leise klein">Planung mit ${P.regeln.planung === "max" ? "Max.-Last" : "Durchschnitt"} · ${fmt(P.regeln.absicherung)} A · ${fmt(P.regeln.spannung)} V · ${fmt(P.regeln.reserve)} % Reserve${ohne ? ` · <span style="color:var(--warnung)">${ohne} Module ohne Kreis</span>` : ""}</span></div>
      <table><tr><th>Kreis</th><th>Verteiler</th><th>Kanal</th><th>Phase</th><th>Zuleitung</th><th class="zahl">Module</th><th class="zahl">Last max.</th><th class="zahl">Last Ø</th><th>Auslastung</th></tr>
      ${zeilen.map(({ v, nr, ziel, kreis: k, geraet }) => {
        const ph = kanalPhase(v, nr); const l = k ? lakaFuerKreis(k) : P.lakas.find(x => x.verteiler === v.id && x.ausgang === kanalVon(v, nr)?.ausgang);
        const gewaehlt = ui.werkzeug === "pinsel" && ui.pinsel.strom === ziel;
        const zuleitung = l ? `${esc(kanalVon(v, nr)?.ausgang || "")} · Laka ${fmtFlex(l.laengeM)} m` : "direkt";
        const dazu = geraeteAmKanal(v.id, nr).map(d => " + " + esc(d.name)).join("");
        if (geraet && !k) return `<tr class="klickbar${gewaehlt ? " sel" : ""}" data-ziel="${ziel}"><td><span class="punkt" style="background:transparent;border:1px solid var(--text-leise)"></span>Gerät</td><td>${esc(v.name)}</td><td>${nr}</td><td>${ph.phase}</td><td>${zuleitung}</td><td class="zahl">0</td><td colspan="3">versorgt ${esc(geraeteAmKanal(v.id, nr).map(d => d.name).join(", "))} · ${fmt(geraeteLast(v.id, nr))} W</td></tr>`;
        if (!k) return `<tr class="klickbar${gewaehlt ? " sel" : ""}" data-ziel="${ziel}"><td><span class="punkt" style="background:transparent;border:1px dashed var(--text-leise)"></span>frei</td><td>${esc(v.name)}</td><td>${nr}</td>
          <td>${ph.phase}${ph.angenommen ? " ?" : ""}</td><td>${zuleitung}</td><td class="zahl">0</td><td colspan="3" class="leise">anklicken und Module übermalen</td></tr>`;
        const last = kreisLast(k), kap = kreisKapazitaet(k);
        return `<tr class="klickbar${gewaehlt || ui.sel.kreis === k.id ? " sel" : ""}" data-ziel="${ziel}" data-kreis="${k.id}"><td><span class="punkt" style="background:${kreisFarbe(k)}"></span>${kreisName(k)}${dazu}</td><td>${esc(v.name)}</td><td>${nr}</td>
          <td>${ph.phase}${ph.angenommen ? " ?" : ""}</td><td>${zuleitung}</td>
          <td class="zahl">${k.module.length}</td><td class="zahl">${fmt(kreisLast(k, "max"))} W</td><td class="zahl">${fmt(kreisLast(k, "durchschnitt"))} W</td><td>${balken(last / kap)}</td></tr>`;
      }).join("") || `<tr><td colspan="9" class="leise">Noch keine Kanäle zugewiesen – rechts beim Verteiler Kanäle anklicken („ganzer Ausgang“) oder „Vorschlag erzeugen“.</td></tr>`}</table>`;
  },
  rechts() { return stromRechts(); },
  pruefungen() { return stromPruefungen(); },
  taste(e) {
    if (e.key === "Escape" && ui.werkzeug === "pinsel") { ui.werkzeug = "auswahl"; render(); return true; }
    // Pinsel: Backspace = letztes Modul zurück, Entf = ganzen Kreis löschen
    if (ui.werkzeug === "pinsel" && (e.key === "Backspace" || e.key === "Delete")) {
      const [vId, nr] = (ui.pinsel.strom || "").split("|");
      const k = P.kreise.find(x => x.verteiler === vId && x.kanal === Number(nr));
      if (!k) return true;
      if (e.key === "Delete") { kreisLoeschen(k.id); return true; }
      k.module.pop(); if (!k.module.length) P.kreise = P.kreise.filter(x => x !== k);
      aenderung(); return true;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && ui.sel.kreis) { kreisLoeschen(ui.sel.kreis); return true; }
    return false;
  },
};

function kreisLoeschen(id) {
  P.kreise = P.kreise.filter(k => k.id !== id);
  ui.sel.kreis = null;
  aenderung();
}

function stromRechts() {
  const g = geraetById(ui.sel.verteiler);
  const bilanz = stromBilanz();
  let html = "";
  const kreis = P.kreise.find(k => k.id === ui.sel.kreis);
  if (kreis) {
    const v = geraetById(kreis.verteiler); const ph = kanalPhase(v, kreis.kanal);
    const last = kreisLast(kreis), kap = kreisKapazitaet(kreis);
    html += `<div class="karte"><div class="label">Kreis ${kreisName(kreis)}</div><table class="werte">
      <tr><td>Verteiler · Kanal</td><td>${esc(v?.name)} · ${kreis.kanal}</td></tr><tr><td>Phase</td><td>${ph.phase}${ph.angenommen ? " (angenommen)" : ""}</td></tr>
      <tr><td>Module</td><td>${kreis.module.length}</td></tr><tr><td>Last</td><td>${fmt(last)} / ${fmt(kap)} W</td></tr></table>
      <div class="knopfreihe" style="margin-top:8px"><button data-s="kreis-pinsel">Mit Pinsel fortsetzen</button><button data-s="kreis-loeschen" class="gefahr">Löschen</button></div></div>`;
  }
  if (g && g.art === "verteiler") {
    const led = verteilerLed(g); const b = bilanz.get(g.id); const amp = einspeisungAmpere(g);
    const quellen = P.geraete.filter(x => (x.art === "einspeisung" || x.art === "verteiler") && x.id !== g.id);
    const kabel = libListe("kabel").filter(e => e.attribute.led.gewerk === "strom");
    html += `<div class="karte"><div class="label">${esc(g.name)} · ${esc(eintrag(g.lib)?.name || "")}</div>
      <label class="feld"><span>Name *</span><input data-g-feld="name" value="${esc(g.name)}"></label>
      <label class="feld"><span>Standort</span><input data-g-feld="standort" value="${esc(g.standort)}"></label>
      <div class="label">Einspeisung (${esc(led.einspeisung?.typ || "—")})</div>
      <label class="feld"><span>Gespeist von</span><select data-g-feld="speisung.von"><option value="">— nicht festgelegt —</option>
        ${quellen.map(q => `<option value="${q.id}"${g.speisung?.von === q.id ? " selected" : ""}>${esc(q.name)}</option>`).join("")}</select></label>
      <div class="zwei"><label class="feld"><span>Kabel</span><select data-g-feld="speisung.kabel"><option value="">—</option>${kabel.map(e => `<option value="${e.id}"${g.speisung?.kabel === e.id ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>
      <label class="feld"><span>Länge (m)</span><input data-g-feld="speisung.laengeM" value="${g.speisung?.laengeM ?? ""}" inputmode="decimal"></label></div>
      <div class="label">Phasen (${P.regeln.planung === "max" ? "max." : "Ø"}) · Anteil an ${fmt(amp)} A</div>
      ${PHASEN.map(p => { const a = (P.regeln.planung === "max" ? b.phasen : b.phasenTyp)[p]; return `<div class="phase"><span style="color:${PHASENFARBE[p]}">${p}</span>${balken(amp ? a / amp : 0, false)}<span>${fmt(a, 1)} / ${fmt(amp)} A</span></div>`; }).join("")}
      ${schieflastHtml(b)}<p class="klein leise">${fmt(b.w / 1000, 2)} kW max. · ${fmt(b.wTyp / 1000, 2)} kW Ø</p>
      ${kanalRasterHtml(g, aktuellerScreen())}
      <div class="label">Ausgänge und Lakas · ⠿ ziehen zum Tauschen</div>
      ${(led.ausgaenge || []).map(a => {
        const l = P.lakas.find(x => x.verteiler === g.id && x.ausgang === a.name);
        const lakas = libListe("laka").filter(e => e.attribute.led.stecker === a.stecker);
        return `<div class="ausgang-block" data-ausgang="${g.id}|${esc(a.name)}" draggable="true" style="margin-bottom:8px"><b class="klein"><span class="griff">⠿</span> ${esc(a.name)}</b> <span class="leise klein">${esc(a.stecker)} · Kanäle ${a.kanaele.join(", ")}</span>
          ${l ? `<div style="display:grid;grid-template-columns:1fr 72px;gap:8px"><select data-laka="${l.id}" data-laka-feld="lib">${lakas.map(e => `<option value="${e.id}"${l.lib === e.id ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select>
            <input data-laka="${l.id}" data-laka-feld="laengeM" value="${l.laengeM ?? ""}" placeholder="Länge m" inputmode="decimal"></div>
            <label class="feld" style="margin:4px 0"><span>Spinne</span><select data-laka="${l.id}" data-laka-feld="spinne"><option value="">automatisch – ${esc(spinneName({ ...l, spinne: null }))}</option>${spinnenFuer(l).map(e => `<option value="${e.id}"${l.spinne === e.id ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>
            <div class="klein leise">→ ${esc(screenById(l.screen)?.name || "—")} <button data-s="laka-weg" data-laka="${l.id}" style="padding:0 6px">entfernen</button></div>` : `<div class="klein leise">keine Laka</div>`}</div>`;
      }).join("")}
      <div class="knopfreihe"><button data-s="geraet-loeschen" class="gefahr">Verteiler löschen</button></div></div>`;
  } else if (g && g.art === "einspeisung") {
    const b = bilanz.get(g.id);
    html += `<div class="karte"><div class="label">Einspeisung · ${esc(g.name)}</div>
      <label class="feld"><span>Name *</span><input data-g-feld="name" value="${esc(g.name)}"></label>
      <div class="zwei"><label class="feld"><span>Anschluss</span><input data-g-feld="stecker" value="${esc(g.stecker)}"></label>
      <label class="feld"><span>Absicherung (A)</span><input data-g-feld="ampere" value="${g.ampere}" inputmode="decimal"></label></div>
      <label class="feld"><span>Standort</span><input data-g-feld="standort" value="${esc(g.standort || "")}"></label>
      ${PHASEN.map(p => `<div class="phase"><span style="color:${PHASENFARBE[p]}">${p}</span>${balken(g.ampere ? b.phasen[p] / g.ampere : 0, false)}<span>${fmt(b.phasen[p], 1)} / ${fmt(g.ampere)} A</span></div>`).join("")}
      ${schieflastHtml(b)}
      <div class="knopfreihe"><button data-s="geraet-loeschen" class="gefahr">Einspeisung löschen</button></div></div>`;
  } else if (!kreis) {
    html += `<div class="karte"><p class="klein leise">Verteiler links im Projektbaum oder in der Library anklicken. Kreise per „Vorschlag erzeugen“ oder mit dem Pinsel anlegen.</p></div>`;
  }
  return html;
}

function stromUebersicht(el) {
  el.classList.add("liste-modus");
  const bilanz = stromBilanz();
  const vs = P.geraete.filter(g => g.art === "verteiler");
  const es = P.geraete.filter(g => g.art === "einspeisung");
  if (!vs.length && !es.length) return void (el.innerHTML = `<p class="leise">Noch keine Verteiler oder Einspeisungen.</p>`);
  const pl = P.regeln.planung === "max" ? "phasen" : "phasenTyp";
  el.innerHTML = `<div class="uebersicht">${[...vs, ...es].map(g => {
    const b = bilanz.get(g.id); const amp = einspeisungAmpere(g);
    const sl = schieflast(b[pl]);
    const kopf = `<div class="knopfreihe"><h2 style="margin:0">${esc(g.name)}${g.art === "verteiler" ? " · " + esc(eintrag(g.lib)?.name || "") : ""}</h2><span class="fueller"></span>
      ${b.w ? (sl * 100 > P.regeln.schieflast ? `<span class="badge teil">Schieflast</span>` : `<span class="badge voll">ok</span>`) : `<span class="badge teil">leer</span>`}</div>`;
    const phasen = PHASEN.map(p => `<div class="phase"><span style="color:${PHASENFARBE[p]}">${p}</span>${balken(amp ? b[pl][p] / amp : 0, false)}<span>${fmt(b[pl][p], 1)} / ${fmt(amp)} A</span></div>`).join("");
    const quelle = g.speisung?.von ? geraetById(g.speisung.von)?.name : null;
    let kanaele = "";
    if (g.art === "verteiler") {
      const led = verteilerLed(g);
      kanaele = (led.ausgaenge || []).map(a => {
        const l = P.lakas.find(x => x.verteiler === g.id && x.ausgang === a.name);
        return `<div class="label ausgang-block" data-ausgang="${g.id}|${esc(a.name)}" draggable="true" title="Ziehen auf einen anderen Ausgang: tauschen"><span class="griff">⠿</span> ${esc(a.name)}${l ? " · Laka → " + esc(screenById(l.screen)?.name || "") + " · " + esc(spinneName(l)) : " · frei"}</div><div class="kanalgitter">${a.kanaele.map(n => {
          const k = P.kreise.find(x => x.verteiler === g.id && x.kanal === n);
          const dev = P.geraete.find(x => x.strom?.verteiler === g.id && x.strom.kanal === n);
          const ph = kanalPhase(g, n);
          if (k) return `<div class="kanal" style="border-color:${kreisFarbe(k)}"><b>${n}</b><br>${ph.phase} · ${fmt(kreisLast(k) / P.regeln.spannung, 1)} A</div>`;
          if (dev) return `<div class="kanal" style="border-color:var(--text-leise)"><b>${n}</b><br>${esc(dev.name)}</div>`;
          return `<div class="kanal frei">${n}<br>${ph.phase} · frei</div>`;
        }).join("")}</div>`;
      }).join("");
    }
    return `<div class="karte">${kopf}<p class="klein leise">${g.standort ? "Standort: " + esc(g.standort) + " · " : ""}${g.art === "verteiler" ? `Einspeisung ${esc(verteilerLed(g).einspeisung?.typ || "—")}${quelle ? " ← " + esc(quelle) : ""}` : `Anschluss ${esc(g.stecker)} · ${fmt(g.ampere)} A`}</p>
      ${phasen}${schieflastHtml(b)}<p class="klein leise">Max. ${fmt(b.w / 1000, 2)} kW · Ø ${fmt(b.wTyp / 1000, 2)} kW</p>${kanaele}</div>`;
  }).join("")}</div>`;
}

function stromListeAlle() {
  const zeilen = [];
  for (const v of P.geraete.filter(g => g.art === "verteiler")) {
    for (const k of P.kreise.filter(x => x.verteiler === v.id).sort((a, b) => a.kanal - b.kanal)) {
      const ph = kanalPhase(v, k.kanal);
      zeilen.push(`<tr><td>${esc(v.name)}</td><td>${k.kanal}</td><td>${ph.phase}${ph.angenommen ? " ?" : ""}</td><td>${esc(kanalVon(v, k.kanal)?.ausgang || "—")}</td>
        <td><span class="punkt" style="background:${kreisFarbe(k)}"></span>${kreisName(k)}</td><td>${esc(screenById(k.screen)?.name || "—")}</td>
        <td class="zahl">${fmt(kreisLast(k, "max"))} W</td><td class="zahl">${fmt(kreisLast(k, "durchschnitt"))} W</td><td>${balken(kreisLast(k) / kreisKapazitaet(k))}</td></tr>`);
    }
  }
  const belegt = zeilen.length;
  const gesamt = P.geraete.filter(g => g.art === "verteiler").reduce((a, v) => a + (verteilerLed(v).kanaele || []).length, 0);
  return `<div class="kopf"><b>Alle Abgänge aller Verteiler</b><span class="leise klein">${belegt} von ${gesamt} Kanälen mit Kreisen belegt</span></div>
    <table><tr><th>Verteiler</th><th>Kanal</th><th>Phase</th><th>Ausgang</th><th>Kreis</th><th>Screen</th><th class="zahl">Last max.</th><th class="zahl">Last Ø</th><th>Auslastung</th></tr>
    ${zeilen.join("") || `<tr><td colspan="9" class="leise">Keine Kreise.</td></tr>`}</table>`;
}

function stromPruefungen() {
  const liste = [];
  if (!P.screens.some(s => s.module.length)) return liste;
  const vs = P.geraete.filter(g => g.art === "verteiler");
  if (!vs.length) liste.push({ art: "warn", text: "Noch kein Stromverteiler angelegt." });
  for (const s of P.screens) {
    const zugeordnet = new Set(P.kreise.filter(k => k.screen === s.id).flatMap(k => k.module));
    const ohne = s.module.filter(m => !zugeordnet.has(m.id));
    if (ohne.length) liste.push({ art: "warn", text: `${s.name}: ${ohne.length} Module ohne Stromkreis.`, ziel: "screen:" + s.id });
  }
  let einschaltUnbekannt = false;
  for (const k of P.kreise) {
    const last = kreisLast(k), kap = kreisKapazitaet(k), ms = kreisModule(k);
    const s = screenById(k.screen);
    if (last > kap) liste.push({ art: "warn", text: `${s?.name} ${kreisName(k)}: ${fmt(last)} W über ${fmt(kap)} W (inkl. Reserve).`, ziel: "screen:" + k.screen });
    const mx = maxJeBruecke(ms);
    if (ms.length > mx) liste.push({ art: "warn", text: `${s?.name} ${kreisName(k)}: ${ms.length} Module an einer Brücke, erlaubt ${mx}.`, ziel: "screen:" + k.screen });
    if (P.regeln.einschaltPruefen) {
      const werte = ms.map(m => eintrag(m.lib)?.attribute?.led?.einschaltstromA);
      if (werte.some(w => !Number.isFinite(w))) einschaltUnbekannt = true;
      else {
        const summe = werte.reduce((a, b) => a + b, 0);
        const v = geraetById(k.verteiler); const ka = kanalVon(v, k.kanal);
        const faktor = { B: 5, C: 10, D: 20 }[ka?.charakteristik || "C"] || 10;
        const grenze = (ka?.ampere || P.regeln.absicherung) * faktor;
        if (summe > grenze) liste.push({ art: "warn", text: `${s?.name} ${kreisName(k)}: Einschaltstrom ${fmt(summe)} A über ${fmt(grenze)} A (${ka?.charakteristik || "C"}-Automat) – Kreis teilen oder gestaffelt einschalten.`, ziel: "screen:" + k.screen });
      }
    }
  }
  if (einschaltUnbekannt && P.regeln.einschaltPruefen && P.kreise.length) liste.push({ art: "warn", text: "Einschaltstrom der Module unbekannt – nicht geprüft." });
  const bilanz = stromBilanz();
  for (const g of P.geraete.filter(g => g.art === "verteiler" || g.art === "einspeisung")) {
    const b = bilanz.get(g.id); const amp = einspeisungAmpere(g);
    for (const p of PHASEN) if (amp && b.phasen[p] > amp) liste.push({ art: "warn", text: `${g.name}: ${p} mit ${fmt(b.phasen[p], 1)} A über ${fmt(amp)} A.`, ziel: "verteiler:" + g.id });
    const sl = schieflast(P.regeln.planung === "max" ? b.phasen : b.phasenTyp);
    if (b.w && sl * 100 > P.regeln.schieflast) liste.push({ art: "warn", text: `${g.name}: Schieflast ${fmt(sl * 100)} % (erlaubt ${fmt(P.regeln.schieflast)} %).`, ziel: "verteiler:" + g.id });
    if (g.art === "verteiler") {
      if (verteilerLed(g).phasenBekannt !== true && P.kreise.some(k => k.verteiler === g.id)) liste.push({ art: "warn", text: `${g.name}: Phasenzuordnung der Kanäle unbekannt – L1/L2/L3 der Reihe nach angenommen.`, ziel: "verteiler:" + g.id });
      if (!g.speisung?.von) liste.push({ art: "info", text: `${g.name}: Einspeisung nicht festgelegt.`, ziel: "verteiler:" + g.id });
      if (!P.kreise.some(k => k.verteiler === g.id) && !P.geraete.some(x => x.strom?.verteiler === g.id)) liste.push({ art: "info", text: `${g.name}: keine Kreise – wird er gebraucht?`, ziel: "verteiler:" + g.id });
    }
  }
  liste.push(...symbolPruefungen());
  for (const l of P.lakas) {
    const anz = P.kreise.filter(k => lakaFuerKreis(k) === l).length;
    const e = eintrag(l.lib);
    if (!e) liste.push({ art: "warn", text: `Laka an ${geraetById(l.verteiler)?.name} ${l.ausgang}: kein passender Typ in der Library.` });
    else if (anz > e.attribute.led.kreise) liste.push({ art: "warn", text: `${e.name}: ${anz} Kreise, Laka hat nur ${e.attribute.led.kreise}.` });
  }
  return liste;
}

/* ---------- Ereignisse ---------- */
function stromEreignisse() {
  ausgangZiehenEreignisse($("#rechts")); ausgangZiehenEreignisse($("#zeichnung"));
  $("#werkzeuge").addEventListener("click", e => {
    if (ui.reiter !== "strom") return;
    const b = e.target.closest("[data-s]"); if (!b) return;
    const a = b.dataset.s;
    if (a === "vorschlag") stromVorschlag();
    else if (a === "pinsel") {
      ui.werkzeug = ui.werkzeug === "pinsel" ? "auswahl" : "pinsel";
      if (ui.werkzeug === "pinsel" && !ui.pinsel.strom) {
        const s = aktuellerScreen(); const z = s && (freieZugewieseneKanaele(s)[0] || zugewieseneKanaele(s).find(x => !x.geraet));
        if (!z) { ui.werkzeug = "auswahl"; return toast("Zuerst rechts beim Verteiler Kanäle dieser Wand zuweisen.", "fehler"); }
        ui.pinsel.strom = z.ziel;
      }
      render();
    }
    else if (a === "kreis-loeschen" && ui.sel.kreis) kreisLoeschen(ui.sel.kreis);
    else if (a === "planung") { P.regeln.planung = b.dataset.wert; aenderung(); }
    else if (a === "modus") { ui.modus.strom = b.dataset.wert; render(); }
  });
  $("#werkzeuge").addEventListener("change", e => {
    if (ui.reiter !== "strom") return;
    const f = e.target.dataset.sFeld; const s = aktuellerScreen();
    if (f === "richtung" || f === "start" || f === "verteilung") { s.strom[f] = e.target.value; aenderung(); }
  });
  $("#palette").addEventListener("click", e => {
    if (ui.reiter !== "strom") return;
    const b = e.target.closest("[data-s]"); if (!b) return;
    if (b.dataset.s === "einspeisung") einspeisungAnlegen();
    if (b.dataset.s === "verteiler-neu") verteilerAnlegen(b.dataset.lib);
  });
  $("#liste").addEventListener("click", e => {
    if (ui.reiter !== "strom") return;
    const tr = e.target.closest("[data-ziel]"); if (!tr) return;
    // Zeile wählen = Kanal als Pinsel-Ziel (und Kreis auswählen, falls vorhanden)
    const k = P.kreise.find(x => x.id === tr.dataset.kreis);
    ui.sel.kreis = k?.id || null; ui.sel.verteiler = tr.dataset.ziel.split("|")[0];
    ui.pinsel.strom = tr.dataset.ziel; ui.werkzeug = "pinsel";
    render();
  });
  $("#rechts").addEventListener("click", e => {
    if (ui.reiter !== "strom") return;
    const zw = e.target.closest("[data-zuweisen]");
    if (zw) { const [vId, nr] = zw.dataset.zuweisen.split("|"); return kanalZuweisen(aktuellerScreen(), vId, Number(nr)); }
    const za = e.target.closest("[data-zuweisen-ausgang]");
    if (za) return ausgangZuweisen(aktuellerScreen(), geraetById(ui.sel.verteiler), za.dataset.zuweisenAusgang);
    const b = e.target.closest("[data-s]"); if (!b) return;
    const a = b.dataset.s;
    if (a === "kreis-loeschen" && ui.sel.kreis) kreisLoeschen(ui.sel.kreis);
    if (a === "kreis-pinsel") { const k = P.kreise.find(x => x.id === ui.sel.kreis); if (k) { ui.pinsel.strom = `${k.verteiler}|${k.kanal}`; ui.werkzeug = "pinsel"; ui.screen = k.screen; render(); } }
    if (a === "geraet-loeschen") { const g = geraetById(ui.sel.verteiler); if (g) geraetLoeschen(g); }
    if (a === "laka-weg") { P.lakas = P.lakas.filter(l => l.id !== b.dataset.laka); aenderung(); }
  });
  $("#rechts").addEventListener("change", e => {
    if (ui.reiter !== "strom") return;
    const g = geraetById(ui.sel.verteiler);
    const f = e.target.dataset.gFeld;
    if (f && g) {
      let wert = e.target.value;
      if (f === "name" && !wert.trim()) { toast("Name: darf nicht leer sein.", "fehler"); return render(); }
      if (f.endsWith("laengeM") || f === "ampere") { const z = leseZahl(wert); if (Number.isNaN(z)) return toast("Bitte eine Zahl eingeben.", "fehler"); wert = z; }
      if (f === "speisung.kabel" && wert) nutzeEintrag(wert);
      setzePfad(g, f, wert === "" ? null : wert);
      return aenderung();
    }
    const lakaId = e.target.dataset.laka;
    if (lakaId) {
      const l = P.lakas.find(x => x.id === lakaId); if (!l) return;
      if (e.target.dataset.lakaFeld === "lib") { l.lib = e.target.value; nutzeEintrag(l.lib); l.laengeM = eintrag(l.lib)?.attribute?.led?.laengeM ?? l.laengeM; }
      else if (e.target.dataset.lakaFeld === "spinne") { l.spinne = e.target.value || null; if (l.spinne) nutzeEintrag(l.spinne); }
      else { const z = leseZahl(e.target.value); if (Number.isNaN(z)) return toast("Länge: Zahl in Metern.", "fehler"); l.laengeM = z; }
      aenderung();
    }
  });
}
