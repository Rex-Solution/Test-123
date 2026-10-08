/* Reiter Signal: Prozessoren, Datenstränge (Vorschlag + Pinsel), Backup, Ports, Übersicht.
   Port-Regel: ein Port nur Module derselben Serie mit derselben Receiving Card. */

function prozessorLed(g) { return eintrag(g.lib)?.attribute?.led || {}; }
function prozessorPorts(g) {
  const ports = anschluesseAusklappen(eintrag(g.lib)?.attribute?.anschluesse).filter(a => a.rolle === "port");
  return ports.length ? ports.map((a, i) => ({ nr: i + 1, name: a.name })) : [];
}
function modulSchluessel(m) { const led = eintrag(m.lib)?.attribute?.led || {}; return `${led.serie || "?"}|${led.receivingCard || "?"}`; }
function modulPixel(m) { const led = eintrag(m.lib)?.attribute?.led || {}; return (led.pixelB || 0) * (led.pixelH || 0); }
function passtZuModulen(prozLib, module) {
  const rcs = eintrag(prozLib)?.attribute?.led?.receivingCards || [];
  return module.every(m => rcs.includes(eintrag(m.lib)?.attribute?.led?.receivingCard));
}
function strangModule(k) { const s = screenById(k.screen); const map = new Map((s?.module || []).map(m => [m.id, m])); return k.module.map(id => map.get(id)).filter(Boolean); }
function strangPixel(k) { return strangModule(k).reduce((a, m) => a + modulPixel(m), 0); }
function portKapazitaet(g) { return (prozessorLed(g).pxJePort || 0); }
function maxJeStrang(module) {
  const w = module.map(m => eintrag(m.lib)?.attribute?.led?.daten?.maxJeStrang).filter(Number.isFinite);
  return w.length ? Math.min(...w) : Infinity;
}
function straengeVon(screenId) {
  const pIdx = id => P.geraete.findIndex(g => g.id === id);
  return P.straenge.filter(k => k.screen === screenId).sort((a, b) => pIdx(a.prozessor) - pIdx(b.prozessor) || a.port - b.port);
}
function strangName(k) {
  const ps = P.geraete.filter(g => g.art === "prozessor");
  return (ps.length > 1 ? `Pr${ps.findIndex(p => p.id === k.prozessor) + 1}·` : "") + "P" + k.port;
}
function strangFarbe(k) { return wegFarbe(straengeVon(k.screen).indexOf(k)); }
function belegtePorts(gId) { return new Set(P.straenge.filter(k => k.prozessor === gId).flatMap(k => [k.port, k.backupPort].filter(Number.isFinite))); }

/* ---------- Geräte ---------- */
function prozessorAnlegen(libId) {
  nutzeEintrag(libId);
  const n = P.geraete.filter(g => g.art === "prozessor").length + 1;
  const cat = libListe("kabel").find(e => e.attribute.led.farbsystem === "LAN")?.id || null;
  if (cat) nutzeEintrag(cat);
  const g = { id: neueId("p"), art: "prozessor", lib: libId, name: "Prozessor " + n, standort: "FOH / Regie", weg: "direkt",
    portKabel: cat, portLaengeM: null, wegLib: null, strom: null };
  P.geraete.push(g);
  ui.sel.prozessor = g.id;
  aenderung();
  return g;
}

/* ---------- Vorschlag ---------- */
function signalVorschlag() {
  const s = aktuellerScreen();
  if (!s?.module.length) return toast("Der Screen hat keine Module.", "fehler");
  let g = geraetById(ui.sel.prozessor);
  if (!g || g.art !== "prozessor") g = P.geraete.find(x => x.art === "prozessor" && passtZuModulen(x.lib, s.module));
  if (!g) {
    const lib = libListe("prozessor").find(e => eintragNutzbar(e) && passtZuModulen(e.id, s.module));
    if (!lib) return toast("Kein passender Prozessor in der Library (Receiving Card prüfen).", "fehler");
    g = prozessorAnlegen(lib.id);
  }
  if (!passtZuModulen(g.lib, s.module)) return toast(`${g.name} passt nicht zur Receiving Card aller Module.`, "fehler");
  const alt = P.straenge.filter(k => k.screen === s.id && k.prozessor === g.id);
  if (alt.length && !confirm(`Die ${alt.length} vorhandenen Stränge von „${s.name}“ an ${g.name} ersetzen?`)) return;
  P.straenge = P.straenge.filter(k => !(k.screen === s.id && k.prozessor === g.id));
  const kap = portKapazitaet(g) * (P.regeln.portMax / 100);
  if (!kap) return toast(`${g.name}: Pixel je Port fehlen in der Library.`, "fehler");
  // je Serie + Receiving Card eigene Stränge
  const gruppen = new Map();
  for (const m of s.module) gruppen.set(modulSchluessel(m), [...(gruppen.get(modulSchluessel(m)) || []), m]);
  const segmente = [];
  let ueberlast = false;
  for (const [, ms] of gruppen) {
    const reihe = schlangenReihenfolge(ms, s.signal.richtung, s.signal.start);
    const erg = segmentieren(reihe.map(modulPixel), kap, maxJeStrang(reihe));
    ueberlast = ueberlast || erg.ueberlast;
    for (let i = 0; i + 1 < erg.grenzen.length; i++) segmente.push(reihe.slice(erg.grenzen[i], erg.grenzen[i + 1]));
  }
  const belegt = belegtePorts(g.id);
  const frei = prozessorPorts(g).map(p => p.nr).filter(n => !belegt.has(n));
  const backup = P.regeln.backup && prozessorLed(g).backup !== false;
  const noetig = segmente.length * (backup ? 2 : 1);
  if (noetig > frei.length) return toast(`${g.name}: ${noetig} Ports nötig${backup ? " (mit Backup)" : ""}, aber nur ${frei.length} frei.`, "fehler");
  segmente.forEach((seg, i) => {
    P.straenge.push({ id: neueId("d"), screen: s.id, prozessor: g.id, port: frei[i], backupPort: backup ? frei[segmente.length + i] : null, module: seg.map(m => m.id) });
  });
  ui.sel.prozessor = g.id;
  aenderung();
  toast(`${segmente.length} Datenstränge an ${g.name}${backup ? " + Backup" : ""} vorgeschlagen${ueberlast ? " – Achtung: einzelne Module über der Portgrenze" : ""}.`, ueberlast ? "fehler" : "ok");
}

/* ---------- Pinsel ---------- */
function signalZiele() {
  const ziele = [];
  for (const g of P.geraete.filter(x => x.art === "prozessor")) {
    const backups = new Set(P.straenge.filter(k => k.prozessor === g.id).map(k => k.backupPort));
    for (const p of prozessorPorts(g)) {
      if (backups.has(p.nr)) continue;
      const k = P.straenge.find(x => x.prozessor === g.id && x.port === p.nr);
      ziele.push({ wert: `${g.id}|${p.nr}`, text: `${g.name} · Port ${p.nr}${k ? " · " + (screenById(k.screen)?.name || "") + " " + k.module.length + " Mod." : " · frei"}` });
    }
  }
  return ziele;
}
function signalPinselMalen(svg, s) {
  if (!ui.pinsel.signal) { toast("Zuerst oben einen Port für den Pinsel wählen.", "fehler"); return null; }
  const [gId, portText] = ui.pinsel.signal.split("|"); const port = Number(portText);
  const g = geraetById(gId); if (!g) return null;
  let k = P.straenge.find(x => x.prozessor === gId && x.port === port);
  if (k && k.screen !== s.id) { toast(`Port ${port} versorgt schon „${screenById(k.screen)?.name}“.`, "fehler"); return null; }
  if (!k) {
    let backupPort = null;
    if (P.regeln.backup) { const belegt = belegtePorts(gId); belegt.add(port); backupPort = prozessorPorts(g).map(p => p.nr).reverse().find(n => !belegt.has(n)) ?? null; }
    k = { id: neueId("d"), screen: s.id, prozessor: gId, port, backupPort, module: [] };
    P.straenge.push(k);
  }
  let hinweis = false;
  return id => {
    if (k.module.includes(id)) return;
    const m = s.module.find(x => x.id === id);
    const erstes = strangModule(k)[0];
    if (erstes && modulSchluessel(erstes) !== modulSchluessel(m)) { if (!hinweis) { toast("Anderes Modul (Serie/Receiving Card) – nicht auf denselben Port.", "fehler"); hinweis = true; } return; }
    if (!passtZuModulen(g.lib, [m])) { if (!hinweis) { toast(`${g.name} passt nicht zur Receiving Card dieses Moduls.`, "fehler"); hinweis = true; } return; }
    for (const x of P.straenge) if (x !== k && x.screen === s.id) x.module = x.module.filter(i => i !== id);
    k.module.push(id);
    P.straenge = P.straenge.filter(x => x.module.length || x === k);
    svg.innerHTML = signalSvgInhalt(s);
    const px = strangPixel(k), kap = portKapazitaet(g);
    pinselAnzeige(`${strangName(k)}: ${k.module.length} Module · ${fmt(px)} px von ${fmt(kap)} px (${fmt(px / kap * 100)} %)`, px > kap * P.regeln.portMax / 100 || k.module.length > maxJeStrang(strangModule(k)));
  };
}

/* ---------- Darstellung ---------- */
function signalSvgInhalt(s) {
  const st = straengeVon(s.id);
  const farbe = new Map(); st.forEach((k, i) => k.module.forEach(id => farbe.set(id, wegFarbe(i))));
  return screenSvgInhalt(s, {
    fuellung: m => farbe.has(m.id) ? farbe.get(m.id) + "2e" : "transparent",
    fehlerIds: new Set(s.module.filter(m => !farbe.has(m.id)).map(m => m.id)),
    wege: st.map((k, i) => ({ farbe: wegFarbe(i), module: k.module, start: strangName(k), ende: Number.isFinite(k.backupPort) ? "B" + k.backupPort : null })),
    oben: `${s.name} · Signal · ● Start Hauptweg · ▢ Einspeisung Backup (gleicher Weg)`,
  });
}

REITER.signal = {
  titelPalette: "Library – Prozessoren",
  werkzeuge() {
    const s = aktuellerScreen();
    const ziele = signalZiele();
    const uebersicht = ui.modus.signal === "prozessoren";
    return `<button data-d="vorschlag" ${s?.module.length ? "" : "disabled"} title="Datenstränge automatisch bilden (je Serie/Receiving Card, ausgewogen)">Vorschlag erzeugen</button>
      ${s ? `<select data-d-feld="richtung"><option value="spalten"${s.signal.richtung === "spalten" ? " selected" : ""}>spaltenweise ↕</option><option value="zeilen"${s.signal.richtung === "zeilen" ? " selected" : ""}>zeilenweise ↔</option></select>
      <select data-d-feld="start">${[["ol", "oben links"], ["or", "oben rechts"], ["ul", "unten links"], ["ur", "unten rechts"]].map(([k, t]) => `<option value="${k}"${s.signal.start === k ? " selected" : ""}>${t}</option>`).join("")}</select>` : ""}
      <span class="trenner"></span>
      <button data-d="pinsel" class="${ui.werkzeug === "pinsel" ? "aktiv" : ""}" ${ziele.length && s ? "" : "disabled"}>🖌 Pinsel</button>
      <select data-d-feld="pinselziel" ${ziele.length ? "" : "disabled"}><option value="">Port wählen …</option>${ziele.map(z => `<option value="${z.wert}"${ui.pinsel.signal === z.wert ? " selected" : ""}>${esc(z.text)}</option>`).join("")}</select>
      <button data-d="strang-loeschen" ${ui.sel.strang ? "" : "disabled"}>Strang löschen</button>
      <button data-d="backup" class="${P.regeln.backup ? "aktiv" : ""}" title="Backup-Ports für neue Stränge">Backup: ${P.regeln.backup ? "an" : "aus"}</button>
      <span class="trenner"></span>
      <div class="umschalter"><button data-d="modus" data-wert="wand" aria-selected="${!uebersicht}">Wand</button><button data-d="modus" data-wert="prozessoren" aria-selected="${uebersicht}">Alle Prozessoren</button></div>`;
  },
  palette() {
    const s = aktuellerScreen();
    return `<div class="label">Prozessoren – Klick: anlegen</div>` + (libListe("prozessor").map(e => {
      const passt = !s?.module.length || passtZuModulen(e.id, s.module);
      const ok = passt && eintragNutzbar(e);
      return `<button class="palette-item" data-d="prozessor-neu" data-lib="${e.id}" ${ok ? "" : "disabled"} title="${passt ? "" : "passt nicht zur Receiving Card der Module"}"><span class="name">${esc(e.name)}</span>${passt ? badgeHtml(e) : `<span class="badge fehler">RC</span>`}</button>`;
    }).join("") || `<p class="klein leise">Keine Prozessoren in der Library.</p>`) +
      `<p class="klein leise">Nur Prozessoren, deren Receiving Cards zu den Modulen passen, sind wählbar. Ein Port nimmt nur Module derselben Serie mit derselben Receiving Card.</p>`;
  },
  zeichnung(el) {
    if (ui.modus.signal === "prozessoren") return signalUebersicht(el);
    const s = aktuellerScreen();
    if (!s) return leerZeichnung(el, "Noch kein Screen – im Reiter Aufbau anlegen.");
    if (!s.module.length) return leerZeichnung(el, "Der Screen hat noch keine Module.");
    el.innerHTML = `<svg viewBox="${vbText(ansicht(s))}" preserveAspectRatio="xMidYMid meet">${signalSvgInhalt(s)}</svg>`;
    if (ui.werkzeug === "pinsel") el.classList.add("pinsel");
    const svg = el.querySelector("svg");
    ansichtSteuerung(el, svg, s);
    pinselInteraktion(svg, s, signalPinselMalen);
    svg.addEventListener("click", e => {
      if (ui.werkzeug === "pinsel") return;
      const id = e.target.closest("[data-mod]")?.dataset.mod;
      const k = id && P.straenge.find(k => k.screen === s.id && k.module.includes(id));
      ui.sel.strang = k?.id || null; if (k) ui.sel.prozessor = k.prozessor;
      render();
    });
  },
  liste() {
    if (ui.modus.signal === "prozessoren") return signalListeAlle();
    const s = aktuellerScreen(); if (!s) return "";
    const st = straengeVon(s.id);
    const ohne = s.module.length - st.reduce((a, k) => a + k.module.length, 0);
    return `<div class="kopf"><b>Ports „${esc(s.name)}“</b><span class="leise klein">max. Port-Auslastung ${fmt(P.regeln.portMax)} %${ohne ? ` · <span style="color:var(--warnung)">${ohne} Module ohne Port</span>` : ""}</span></div>
      <table><tr><th>Strang</th><th>Prozessor</th><th>Port</th><th>Backup</th><th>Module</th><th class="zahl">Pixel</th><th>Auslastung</th><th>Weg</th></tr>
      ${st.map((k, i) => { const g = geraetById(k.prozessor); const ms = strangModule(k); const px = strangPixel(k);
        return `<tr class="klickbar${ui.sel.strang === k.id ? " sel" : ""}" data-strang="${k.id}"><td><span class="punkt" style="background:${wegFarbe(i)}"></span>${strangName(k)}</td><td>${esc(g?.name || "—")}</td><td>${k.port}</td>
          <td>${Number.isFinite(k.backupPort) ? "Port " + k.backupPort : "—"}</td><td>${ms.length} · ${esc(eintrag(ms[0]?.lib)?.attribute?.led?.serie || "")}</td><td class="zahl">${fmt(px)}</td>
          <td>${balken(px / (portKapazitaet(g) || 1))}</td><td>${esc({ direkt: "direkt (Cat)", stagebox: "Stagebox", multicore: "Multicore" }[g?.weg] || "—")}</td></tr>`; }).join("")
        || `<tr><td colspan="8" class="leise">Noch keine Datenstränge – „Vorschlag erzeugen“ oder mit dem Pinsel malen.</td></tr>`}</table>`;
  },
  rechts() { return signalRechts(); },
  pruefungen() { return signalPruefungen(); },
  taste(e) {
    if (e.key === "Escape" && ui.werkzeug === "pinsel") { ui.werkzeug = "auswahl"; render(); return true; }
    if ((e.key === "Delete" || e.key === "Backspace") && ui.sel.strang) { strangLoeschen(ui.sel.strang); return true; }
    return false;
  },
};

function strangLoeschen(id) { P.straenge = P.straenge.filter(k => k.id !== id); ui.sel.strang = null; aenderung(); }

function signalRechts() {
  let html = "";
  const k = P.straenge.find(x => x.id === ui.sel.strang);
  if (k) {
    const g = geraetById(k.prozessor); const px = strangPixel(k);
    html += `<div class="karte"><div class="label">Strang ${strangName(k)}</div><table class="werte">
      <tr><td>Prozessor · Port</td><td>${esc(g?.name)} · ${k.port}</td></tr><tr><td>Backup</td><td>${Number.isFinite(k.backupPort) ? "Port " + k.backupPort + " (am Strangende)" : "—"}</td></tr>
      <tr><td>Module</td><td>${k.module.length}</td></tr><tr><td>Pixel</td><td>${fmt(px)} / ${fmt(portKapazitaet(g))}</td></tr></table>
      <div class="knopfreihe" style="margin-top:8px"><button data-d="strang-pinsel">Mit Pinsel fortsetzen</button><button data-d="backup-weg">${Number.isFinite(k.backupPort) ? "Backup entfernen" : "Backup hinzufügen"}</button><button data-d="strang-loeschen" class="gefahr">Löschen</button></div></div>`;
  }
  const g = geraetById(ui.sel.prozessor);
  if (g && g.art === "prozessor") {
    const led = prozessorLed(g);
    const ports = prozessorPorts(g); const belegt = belegtePorts(g.id);
    const px = P.straenge.filter(x => x.prozessor === g.id).reduce((a, x) => a + strangPixel(x), 0);
    const kabel = libListe("kabel").filter(e => e.attribute.led.gewerk === "signal");
    const kanaele = [];
    for (const v of P.geraete.filter(x => x.art === "verteiler")) {
      const frei = belegteKanaele(v.id);
      for (const ka of verteilerLed(v).kanaele || []) if (!frei.has(ka.nr) || (g.strom?.verteiler === v.id && g.strom.kanal === ka.nr)) kanaele.push([`${v.id}|${ka.nr}`, `${v.name} · Kanal ${ka.nr}`]);
    }
    html += `<div class="karte"><div class="label">${esc(g.name)} · ${esc(eintrag(g.lib)?.name || "")}</div>
      <label class="feld"><span>Name *</span><input data-p-feld="name" value="${esc(g.name)}"></label>
      <label class="feld"><span>Standort</span><input data-p-feld="standort" value="${esc(g.standort || "")}"></label>
      <label class="feld"><span>Weg zur Wand</span><select data-p-feld="weg">${[["direkt", "direkt (Cat je Port)"], ["stagebox", "über Stagebox (Glasfaser)"], ["multicore", "über Multicore"]].map(([w, t]) => `<option value="${w}"${g.weg === w ? " selected" : ""}>${t}</option>`).join("")}</select></label>
      <div class="zwei"><label class="feld"><span>${g.weg === "direkt" ? "Port-Kabel" : "Kabel zur Wand"}</span><select data-p-feld="portKabel"><option value="">—</option>${kabel.map(e => `<option value="${e.id}"${g.portKabel === e.id ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>
      <label class="feld"><span>Länge (m)</span><input data-p-feld="portLaengeM" value="${g.portLaengeM ?? ""}" inputmode="decimal"></label></div>
      <label class="feld"><span>Strom für den Prozessor</span><select data-p-feld="strom"><option value="">— nicht zugeordnet —</option>${kanaele.map(([w, t]) => `<option value="${w}"${g.strom && `${g.strom.verteiler}|${g.strom.kanal}` === w ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>
      <table class="werte"><tr><td>Receiving Cards</td><td>${esc((led.receivingCards || []).join(", "))}</td></tr><tr><td>Belegte Ports</td><td>${belegt.size} / ${ports.length}</td></tr>
      <tr><td>Pixel</td><td>${fmt(px)} / ${fmt(led.pxGesamt)}</td></tr><tr><td>Layer</td><td>${fmt(led.layer)}</td></tr></table>
      <div class="knopfreihe" style="margin-top:8px"><button data-d="geraet-loeschen" class="gefahr">Prozessor löschen</button></div></div>`;
  } else if (!k) html += `<div class="karte"><p class="klein leise">Prozessor links anlegen oder im Projektbaum anklicken. Stränge per „Vorschlag erzeugen“ oder mit dem Pinsel anlegen.</p></div>`;
  return html;
}

function signalUebersicht(el) {
  el.classList.add("liste-modus");
  const ps = P.geraete.filter(g => g.art === "prozessor");
  if (!ps.length) return void (el.innerHTML = `<p class="leise">Noch keine Prozessoren.</p>`);
  el.innerHTML = `<div class="uebersicht">${ps.map(g => {
    const led = prozessorLed(g); const ports = prozessorPorts(g);
    const st = P.straenge.filter(k => k.prozessor === g.id);
    const px = st.reduce((a, k) => a + strangPixel(k), 0);
    const eingaenge = anschluesseAusklappen(eintrag(g.lib)?.attribute?.anschluesse).filter(a => a.rolle === "video");
    const portHtml = ports.map(p => {
      const haupt = st.find(k => k.port === p.nr), bk = st.find(k => k.backupPort === p.nr);
      if (haupt) return `<div class="port" style="border-color:${strangFarbe(haupt)}"><b>Port ${p.nr}</b><br>Haupt · ${esc(screenById(haupt.screen)?.name || "")}<br>${fmt(strangPixel(haupt) / portKapazitaet(g) * 100)} %</div>`;
      if (bk) return `<div class="port" style="border-color:${strangFarbe(bk)};border-style:dashed"><b>Port ${p.nr}</b><br>Backup zu ${p.nr === bk.backupPort ? bk.port : ""}<br>${esc(screenById(bk.screen)?.name || "")}</div>`;
      return `<div class="port frei"><b>Port ${p.nr}</b><br>frei</div>`;
    }).join("");
    return `<div class="karte"><div class="knopfreihe"><h2 style="margin:0">${esc(g.name)} · ${esc(eintrag(g.lib)?.name || "")}</h2><span class="fueller"></span>${st.length ? `<span class="badge voll">ok</span>` : `<span class="badge teil">leer</span>`}</div>
      <p class="klein leise">Standort: ${esc(g.standort || "—")} · Receiving Cards: ${esc((led.receivingCards || []).join(", "))}</p>
      <div class="label">Ausgänge (${ports.length} × ${fmt(led.pxJePort)} px)</div><div class="portgitter">${portHtml}</div>
      <div class="label">Eingänge</div><table class="werte">${eingaenge.map(a => `<tr><td>${esc(a.name)}</td><td class="leise">frei</td></tr>`).join("")}</table>
      <div class="label">Auslastung</div><table class="werte"><tr><td>Pixel</td><td>${fmt(px)} / ${fmt(led.pxGesamt)} (${fmt(led.pxGesamt ? px / led.pxGesamt * 100 : 0)} %)</td></tr>
      <tr><td>Ports</td><td>${belegtePorts(g.id).size} / ${ports.length}</td></tr><tr><td>Layer</td><td>— / ${fmt(led.layer)}</td></tr></table></div>`;
  }).join("")}</div>`;
}

function signalListeAlle() {
  const zeilen = [];
  for (const g of P.geraete.filter(x => x.art === "prozessor")) for (const k of P.straenge.filter(x => x.prozessor === g.id).sort((a, b) => a.port - b.port)) {
    const px = strangPixel(k);
    zeilen.push(`<tr><td>${esc(g.name)}</td><td>${k.port}</td><td>Haupt</td><td>${esc(screenById(k.screen)?.name || "—")}</td><td><span class="punkt" style="background:${strangFarbe(k)}"></span>${strangName(k)}</td><td class="zahl">${fmt(px)}</td><td>${balken(px / (portKapazitaet(g) || 1))}</td></tr>`);
    if (Number.isFinite(k.backupPort)) zeilen.push(`<tr><td>${esc(g.name)}</td><td>${k.backupPort}</td><td>Backup zu ${k.port}</td><td>${esc(screenById(k.screen)?.name || "—")}</td><td><span class="punkt" style="background:${strangFarbe(k)}"></span>${strangName(k)} (Ende)</td><td class="zahl">${fmt(px)}</td><td>${balken(px / (portKapazitaet(g) || 1))}</td></tr>`);
  }
  return `<div class="kopf"><b>Alle Ports aller Prozessoren</b></div><table><tr><th>Prozessor</th><th>Port</th><th>Art</th><th>Screen</th><th>Strang</th><th class="zahl">Pixel</th><th>Auslastung</th></tr>
    ${zeilen.join("") || `<tr><td colspan="7" class="leise">Keine Stränge.</td></tr>`}</table>`;
}

function signalPruefungen() {
  const liste = [];
  if (!P.screens.some(s => s.module.length)) return liste;
  const ps = P.geraete.filter(g => g.art === "prozessor");
  if (!ps.length) { liste.push({ art: "warn", text: "Noch kein Prozessor angelegt." }); return liste; }
  for (const s of P.screens) {
    const zu = new Set(P.straenge.filter(k => k.screen === s.id).flatMap(k => k.module));
    const ohne = s.module.filter(m => !zu.has(m.id));
    if (ohne.length) liste.push({ art: "warn", text: `${s.name}: ${ohne.length} Module ohne Datenport.`, ziel: "screen:" + s.id });
  }
  for (const k of P.straenge) {
    const g = geraetById(k.prozessor); const ms = strangModule(k); const s = screenById(k.screen);
    if (!g) continue;
    if (new Set(ms.map(modulSchluessel)).size > 1) liste.push({ art: "fehler", text: `${s?.name} ${strangName(k)}: verschiedene Serien/Receiving Cards an einem Port.`, ziel: "screen:" + k.screen });
    if (!passtZuModulen(g.lib, ms)) liste.push({ art: "fehler", text: `${s?.name} ${strangName(k)}: ${g.name} passt nicht zur Receiving Card.`, ziel: "screen:" + k.screen });
    const px = strangPixel(k), kap = portKapazitaet(g);
    if (px > kap) liste.push({ art: "warn", text: `${s?.name} ${strangName(k)}: ${fmt(px)} px über der Portkapazität ${fmt(kap)} px.`, ziel: "screen:" + k.screen });
    else if (px > kap * P.regeln.portMax / 100) liste.push({ art: "warn", text: `${s?.name} ${strangName(k)}: Auslastung ${fmt(px / kap * 100)} % über ${fmt(P.regeln.portMax)} %.`, ziel: "screen:" + k.screen });
    const mx = maxJeStrang(ms);
    if (ms.length > mx) liste.push({ art: "warn", text: `${s?.name} ${strangName(k)}: ${ms.length} Module, erlaubt ${mx} je Strang.`, ziel: "screen:" + k.screen });
    if (P.regeln.backup && !Number.isFinite(k.backupPort)) liste.push({ art: "warn", text: `${s?.name} ${strangName(k)}: kein Backup-Port.`, ziel: "screen:" + k.screen });
  }
  if (P.straenge.length && P.straenge.some(k => strangModule(k).some(m => !Number.isFinite(eintrag(m.lib)?.attribute?.led?.daten?.maxJeStrang)))) liste.push({ art: "warn", text: "Max. Module je Datenstrang unbekannt – nur Pixelkapazität geprüft." });
  for (const g of ps) {
    const led = prozessorLed(g);
    const px = P.straenge.filter(k => k.prozessor === g.id).reduce((a, k) => a + strangPixel(k), 0);
    if (led.pxGesamt && px > led.pxGesamt) liste.push({ art: "warn", text: `${g.name}: ${fmt(px)} px über der Gesamtkapazität ${fmt(led.pxGesamt)} px.`, ziel: "prozessor:" + g.id });
    if (!P.straenge.some(k => k.prozessor === g.id)) liste.push({ art: "info", text: `${g.name}: keine Ports belegt – wird er gebraucht?`, ziel: "prozessor:" + g.id });
    if (!g.strom) liste.push({ art: "info", text: `${g.name}: Stromversorgung nicht zugeordnet.`, ziel: "prozessor:" + g.id });
    if (!Number.isFinite(g.portLaengeM) && P.straenge.some(k => k.prozessor === g.id)) liste.push({ art: "warn", text: `${g.name}: Länge der Port-Kabel fehlt.`, ziel: "prozessor:" + g.id });
    if (g.weg === "direkt" && g.portLaengeM > P.regeln.catMax) liste.push({ art: "warn", text: `${g.name}: Cat-Strecke ${fmtFlex(g.portLaengeM)} m über ${fmt(P.regeln.catMax)} m – Glasfaser/Stagebox nutzen.`, ziel: "prozessor:" + g.id });
  }
  return liste;
}

function signalEreignisse() {
  $("#werkzeuge").addEventListener("click", e => {
    if (ui.reiter !== "signal") return;
    const b = e.target.closest("[data-d]"); if (!b) return;
    const a = b.dataset.d;
    if (a === "vorschlag") signalVorschlag();
    else if (a === "pinsel") {
      ui.werkzeug = ui.werkzeug === "pinsel" ? "auswahl" : "pinsel";
      if (ui.werkzeug === "pinsel" && !ui.pinsel.signal) { const z = signalZiele().find(z => z.text.endsWith("frei")) || signalZiele()[0]; ui.pinsel.signal = z?.wert || null; }
      render();
    }
    else if (a === "strang-loeschen" && ui.sel.strang) strangLoeschen(ui.sel.strang);
    else if (a === "backup") { P.regeln.backup = !P.regeln.backup; aenderung(); }
    else if (a === "modus") { ui.modus.signal = b.dataset.wert; render(); }
  });
  $("#werkzeuge").addEventListener("change", e => {
    if (ui.reiter !== "signal") return;
    const f = e.target.dataset.dFeld; const s = aktuellerScreen();
    if (f === "richtung" || f === "start") { s.signal[f] = e.target.value; aenderung(); }
    if (f === "pinselziel") { ui.pinsel.signal = e.target.value || null; if (ui.pinsel.signal) ui.werkzeug = "pinsel"; render(); }
  });
  $("#palette").addEventListener("click", e => {
    if (ui.reiter !== "signal") return;
    const b = e.target.closest("[data-d='prozessor-neu']"); if (b && !b.disabled) prozessorAnlegen(b.dataset.lib);
  });
  $("#liste").addEventListener("click", e => {
    if (ui.reiter !== "signal") return;
    const tr = e.target.closest("[data-strang]"); if (!tr) return;
    const k = P.straenge.find(x => x.id === tr.dataset.strang);
    ui.sel.strang = k?.id || null; if (k) ui.sel.prozessor = k.prozessor;
    render();
  });
  $("#rechts").addEventListener("click", e => {
    if (ui.reiter !== "signal") return;
    const a = e.target.closest("[data-d]")?.dataset.d; if (!a) return;
    const k = P.straenge.find(x => x.id === ui.sel.strang);
    if (a === "strang-loeschen" && k) strangLoeschen(k.id);
    if (a === "strang-pinsel" && k) { ui.pinsel.signal = `${k.prozessor}|${k.port}`; ui.werkzeug = "pinsel"; ui.screen = k.screen; render(); }
    if (a === "backup-weg" && k) {
      if (Number.isFinite(k.backupPort)) k.backupPort = null;
      else { const g = geraetById(k.prozessor); const belegt = belegtePorts(g.id); const frei = prozessorPorts(g).map(p => p.nr).reverse().find(n => !belegt.has(n)); if (!frei) return toast("Kein Port frei.", "fehler"); k.backupPort = frei; }
      aenderung();
    }
    if (a === "geraet-loeschen") { const g = geraetById(ui.sel.prozessor); if (g) geraetLoeschen(g); }
  });
  $("#rechts").addEventListener("change", e => {
    if (ui.reiter !== "signal") return;
    const g = geraetById(ui.sel.prozessor); const f = e.target.dataset.pFeld;
    if (!g || !f) return;
    let w = e.target.value;
    if (f === "name" && !w.trim()) { toast("Name: darf nicht leer sein.", "fehler"); return render(); }
    if (f === "portLaengeM") { w = leseZahl(w); if (Number.isNaN(w)) return toast("Länge: Zahl in Metern.", "fehler"); }
    if (f === "strom") { w = w ? { verteiler: w.split("|")[0], kanal: Number(w.split("|")[1]) } : null; }
    if (f === "portKabel" && w) nutzeEintrag(w);
    g[f] = w === "" ? null : w;
    aenderung();
  });
}
