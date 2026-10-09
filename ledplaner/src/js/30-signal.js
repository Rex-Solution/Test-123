/* Reiter Signal: Prozessoren, Datenstränge (Vorschlag + Pinsel), Backup, Ports, Übersicht.
   Port-Regel: ein Port nur Module derselben Serie mit derselben Receiving Card. */

function prozessorLed(g) { return eintrag(g.lib)?.attribute?.led || {}; }
function prozessorPorts(g) {
  const ports = anschluesseAusklappen(eintrag(g.lib)?.attribute?.anschluesse).filter(a => a.rolle === "port");
  const eigene = ports.length ? ports.map((a, i) => ({ nr: i + 1, name: a.name })) : [];
  /* Prozessor ohne eigene Ports (led.portsUeberStagebox, z.B. MX2000 Pro): jede angeschlossene Stagebox stellt ihre Ports bereit */
  for (const b of portBloecke(g)) for (let nr = b.von; nr <= b.bis; nr++) eigene.push({ nr, name: `${b.box.name} · Port ${nr - b.von + 1}` });
  return eigene;
}
/* Port-Blöcke der Stageboxen eines Prozessors mit led.portsUeberStagebox (fortlaufend hinter den eigenen Ports) */
function portBloecke(g) {
  if (!prozessorLed(g).portsUeberStagebox) return [];
  let nr = anschluesseAusklappen(eintrag(g.lib)?.attribute?.anschluesse).filter(a => a.rolle === "port").length;
  return wegGeraete(g.id).filter(d => d.art === "stagebox").map(box => {
    const n = wegKapazitaet(box) || 0; const b = { box, von: nr + 1, bis: nr + n }; nr += n; return b;
  });
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
function straengeVon(screenId) {
  const pIdx = id => P.geraete.findIndex(g => g.id === id);
  return P.straenge.filter(k => k.screen === screenId).sort((a, b) => pIdx(a.prozessor) - pIdx(b.prozessor) || a.port - b.port);
}
function strangName(k) {
  const ps = P.geraete.filter(g => g.art === "prozessor");
  return (ps.length > 1 ? `Pr${ps.findIndex(p => p.id === k.prozessor) + 1}·` : "") + "P" + k.port;
}
function strangFarbe(k) { return wegFarbe(straengeVon(k.screen).indexOf(k)); }
/* Belegte Ports eines Geräts: eigene Hauptports + Backup-Ports (auch Backups anderer Controller auf diesem Gerät) */
function belegtePorts(gId) {
  const s = new Set();
  for (const k of P.straenge) { if (k.prozessor === gId) s.add(k.port); if (Number.isFinite(k.backupPort) && backupGeraetId(k) === gId) s.add(k.backupPort); }
  return s;
}

/* ---------- Geräte ---------- */
function prozessorAnlegen(libId) {
  nutzeEintrag(libId);
  const n = P.geraete.filter(g => g.art === "prozessor").length + 1;
  const cat = libListe("kabel").find(e => e.attribute.led.farbsystem === "LAN")?.id || null;
  if (cat) nutzeEintrag(cat);
  const g = { id: neueId("p"), art: "prozessor", lib: libId, name: "Prozessor " + n, standort: "FOH / Regie",
    portKabel: cat, portLaengeM: null, strom: null };
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
  if (hauptVon(g)) return toast(`${g.name} ist Backup-Controller von ${hauptVon(g).name} – Vorschlag am Haupt-Controller erzeugen.`, "fehler");
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
    const erg = segmentieren(reihe.map(modulPixel), kap, Infinity);
    ueberlast = ueberlast || erg.ueberlast;
    for (let i = 0; i + 1 < erg.grenzen.length; i++) segmente.push(reihe.slice(erg.grenzen[i], erg.grenzen[i + 1]));
  }
  const belegt = belegtePorts(g.id);
  // freie Ports: der Wand zugewiesene zuerst, anderen Wänden zugewiesene nie
  const eigen = new Set(zuweisung(s).signal.filter(t => t.startsWith(g.id + "|")).map(t => Number(t.split("|")[1])));
  const offen = prozessorPorts(g).map(p => p.nr).filter(n => !belegt.has(n) && (portScreen(g.id, n) || s.id) === s.id);
  const frei = [...offen.filter(n => eigen.has(n)), ...offen.filter(n => !eigen.has(n))];
  // Controller-Backup: Port N des Backup-Controllers spiegelt Port N – alle eigenen Ports frei für Hauptstränge
  const bc = backupController(g);
  const bcPorts = bc ? new Set(prozessorPorts(bc).map(p => p.nr)) : null;
  const backup = !bc && P.regeln.backup && prozessorLed(g).backup !== false;
  const noetig = segmente.length * (backup ? 2 : 1);
  if (noetig > frei.length) return toast(`${g.name}: ${noetig} Ports nötig${backup ? " (mit Backup)" : ""}, aber nur ${frei.length} frei.`, "fehler");
  segmente.forEach((seg, i) => {
    const port = frei[i];
    P.straenge.push({ id: neueId("d"), screen: s.id, prozessor: g.id, port,
      backupPort: bc ? (bcPorts.has(port) ? port : null) : backup ? frei[segmente.length + i] : null, backupGeraet: bc ? bc.id : null, module: seg.map(m => m.id) });
  });
  wegeAbgleichen(g.id);
  ui.sel.prozessor = g.id;
  aenderung();
  toast(`${segmente.length} Datenstränge an ${g.name}${bc ? " + Backup über " + bc.name : backup ? " + Backup" : ""} vorgeschlagen${ueberlast ? " – Achtung: einzelne Module über der Portgrenze" : ""}.`, ueberlast ? "fehler" : "ok");
}

/* ---------- Pinsel ---------- */
function pinselSignalText() { const [gId, nr] = (ui.pinsel.signal || "").split("|"); const g = geraetById(gId); return g ? `${g.name} · P${nr}` : ""; }
function signalPinselMalen(svg, s) {
  if (!ui.pinsel.signal) { toast("Zuerst unten einen Port wählen (vorher rechts beim Prozessor der Wand zuweisen).", "fehler"); return null; }
  const [gId, portText] = ui.pinsel.signal.split("|"); const port = Number(portText);
  const g = geraetById(gId); if (!g) return null;
  let k = P.straenge.find(x => x.prozessor === gId && x.port === port);
  if (k && k.screen !== s.id) { toast(`Port ${port} versorgt schon „${screenById(k.screen)?.name}“.`, "fehler"); return null; }
  if (!k && hauptVon(g)) { toast(`${g.name} ist Backup-Controller – am Haupt-Controller ${hauptVon(g).name} malen.`, "fehler"); return null; }
  const bc = backupController(g);
  if (!k && bc) {
    k = { id: neueId("d"), screen: s.id, prozessor: gId, port, backupPort: prozessorPorts(bc).some(p => p.nr === port) ? port : null, backupGeraet: bc.id, module: [] };
    P.straenge.push(k);
  }
  if (!k) {
    let backupPort = null;
    if (P.regeln.backup) {
      // Backup: zuerst ein freier, der Wand zugewiesener Port, sonst der letzte freie des Prozessors
      const belegt = belegtePorts(gId); belegt.add(port);
      const eigen = freieZugewiesenePorts(s).filter(x => x.g.id === gId && x.nr !== port).map(x => x.nr);
      backupPort = eigen.reverse()[0] ?? prozessorPorts(g).map(p => p.nr).reverse().find(n => !belegt.has(n) && !portScreen(gId, n)) ?? null;
    }
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
    pinselAnzeige(`${strangName(k)}: ${k.module.length} Module · ${fmt(px)} px von ${fmt(kap)} px (${fmt(px / kap * 100)} %)`, px > kap * P.regeln.portMax / 100);
  };
}

/* ---------- Darstellung ---------- */
function signalSvgInhalt(s) {
  const st = straengeVon(s.id);
  const farbe = new Map(); st.forEach((k, i) => k.module.forEach(id => farbe.set(id, wegFarbe(i))));
  return screenSvgInhalt(s, {
    fuellung: m => farbe.has(m.id) ? farbe.get(m.id) + "2e" : "transparent",
    fehlerIds: new Set(s.module.filter(m => !farbe.has(m.id)).map(m => m.id)),
    wege: st.map((k, i) => ({ farbe: wegFarbe(i), module: k.module, start: strangName(k), ende: backupName(k) })),
    oben: `${s.name} · Signal · ● Start Hauptweg · ▢ Einspeisung Backup (gleicher Weg)`,
    zusatz: symbolSvg(s, "signal"),
  });
}

REITER.signal = {
  titelPalette: "Library – Signalgeräte",
  werkzeuge() {
    const s = aktuellerScreen();
    const uebersicht = ui.modus.signal === "prozessoren";
    return `<button data-d="vorschlag" ${s?.module.length ? "" : "disabled"} title="Datenstränge automatisch bilden (je Serie/Receiving Card, ausgewogen)">Vorschlag erzeugen</button>
      ${s ? `<select data-d-feld="richtung"><option value="spalten"${s.signal.richtung === "spalten" ? " selected" : ""}>spaltenweise ↕</option><option value="zeilen"${s.signal.richtung === "zeilen" ? " selected" : ""}>zeilenweise ↔</option></select>
      <select data-d-feld="start">${[["ol", "oben links"], ["or", "oben rechts"], ["ul", "unten links"], ["ur", "unten rechts"]].map(([k, t]) => `<option value="${k}"${s.signal.start === k ? " selected" : ""}>${t}</option>`).join("")}</select>` : ""}
      <span class="trenner"></span>
      <button data-d="pinsel" class="${ui.werkzeug === "pinsel" ? "aktiv" : ""}" ${s ? "" : "disabled"} title="Port unten in der Liste wählen, dann über die Module malen">🖌 Pinsel${ui.werkzeug === "pinsel" && ui.pinsel.signal ? " · " + esc(pinselSignalText()) : ""}</button>
      <button data-d="strang-loeschen" ${ui.sel.strang ? "" : "disabled"}>Strang löschen</button>
      <button data-d="backup" class="${P.regeln.backup ? "aktiv" : ""}" title="Backup-Ports für neue Stränge">Backup: ${P.regeln.backup ? "an" : "aus"}</button>
      <span class="trenner"></span>
      <div class="umschalter"><button data-d="modus" data-wert="wand" aria-selected="${ui.modus.signal === "wand"}">Wand</button><button data-d="modus" data-wert="backup" aria-selected="${ui.modus.signal === "backup"}">Backup</button><button data-d="modus" data-wert="prozessoren" aria-selected="${uebersicht}">Alle Prozessoren</button></div>`;
  },
  palette() {
    const s = aktuellerScreen();
    return `<div class="label">Prozessoren – Klick: anlegen</div>` + (libListe("prozessor").map(e => {
      const passt = !s?.module.length || passtZuModulen(e.id, s.module);
      const ok = passt && eintragNutzbar(e);
      return `<button class="palette-item" data-d="prozessor-neu" data-lib="${e.id}" ${ok ? "" : "disabled"} title="${passt ? "" : "passt nicht zur Receiving Card der Module"}"><span class="name">${esc(e.name)}</span>${passt ? badgeHtml(e) : `<span class="badge fehler">RC</span>`}</button>`;
    }).join("") || `<p class="klein leise">Keine Prozessoren in der Library.</p>`) +
      `<p class="klein leise">Nur Prozessoren, deren Receiving Cards zu den Modulen passen, sind wählbar. Ein Port nimmt nur Module derselben Serie mit derselben Receiving Card.</p>` +
      Object.keys(WEG_ARTEN).map(art => `<div class="label">${WEG_MEHRZAHL[art]} – Klick: an ${esc(geraetById(ui.sel.prozessor)?.name || "gewählten Prozessor")}</div>` + (libListe(art).map(e =>
        `<button class="palette-item" data-d="weg-neu" data-art="${art}" data-lib="${e.id}" ${eintragNutzbar(e) && geraetById(ui.sel.prozessor) ? "" : "disabled"}><span class="name">${esc(e.name)}</span>${badgeHtml(e)}</button>`).join("") || `<p class="klein leise">Keine Einträge in der Library.</p>`)).join("");
  },
  zeichnung(el) {
    if (ui.modus.signal === "prozessoren") return signalUebersicht(el);
    if (ui.modus.signal === "backup") return backupUebersicht(el);
    const s = aktuellerScreen();
    if (!s) return leerZeichnung(el, "Noch kein Screen – im Reiter Aufbau anlegen.");
    if (!s.module.length) return leerZeichnung(el, "Der Screen hat noch keine Module.");
    el.innerHTML = `<svg viewBox="${vbText(ansicht(s))}" preserveAspectRatio="xMidYMid meet">${signalSvgInhalt(s)}</svg>`;
    if (ui.werkzeug === "pinsel") el.classList.add("pinsel");
    const svg = el.querySelector("svg");
    ansichtSteuerung(el, svg, s);
    symbolZiehen(svg, s);
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
    if (ui.modus.signal === "prozessoren" || ui.modus.signal === "backup") return signalListeAlle();
    const s = aktuellerScreen(); if (!s) return "";
    const st = straengeVon(s.id);
    const ohne = s.module.length - st.reduce((a, k) => a + k.module.length, 0);
    const zeilen = zugewiesenePorts(s);
    return `<div class="kopf"><b>Ports „${esc(s.name)}“ · Klick: mit dem Pinsel belegen</b> <span class="leise klein">(<kbd>⌫</kbd> ein Modul zurück · <kbd>Entf</kbd> ganzer Strang)</span><span class="leise klein">max. Port-Auslastung ${fmt(P.regeln.portMax)} %${ohne ? ` · <span style="color:var(--warnung)">${ohne} Module ohne Port</span>` : ""}</span></div>
      <table><tr><th>Strang</th><th>Prozessor</th><th>Port</th><th>Rolle</th><th>Module</th><th class="zahl">Pixel</th><th>Auslastung</th><th>Weg</th></tr>
      ${zeilen.map(({ g, nr, ziel, strang: k, rolle }) => {
        const gewaehlt = ui.werkzeug === "pinsel" && ui.pinsel.signal === (k ? zielText(g.id, k.port) : ziel);
        if (!k) return `<tr class="klickbar${gewaehlt ? " sel" : ""}" data-ziel="${ziel}"><td><span class="punkt" style="background:transparent;border:1px dashed var(--text-leise)"></span>frei</td><td>${esc(g.name)}</td><td>${nr}</td><td>—</td><td>0</td><td colspan="3" class="leise">anklicken und Module übermalen</td></tr>`;
        const ms = strangModule(k); const px = strangPixel(k);
        return `<tr class="klickbar${gewaehlt || ui.sel.strang === k.id ? " sel" : ""}" data-ziel="${zielText(g.id, k.port)}" data-strang="${k.id}"><td><span class="punkt" style="background:${strangFarbe(k)}${rolle === "backup" ? ";opacity:.5" : ""}"></span>${strangName(k)}</td><td>${esc(g.name)}</td><td>${nr}</td>
          <td>${rolle === "haupt" ? `Haupt${Number.isFinite(k.backupPort) ? " (Backup " + backupName(k) + ")" : ""}` : "Backup zu " + strangName(k)}</td><td>${ms.length} · ${esc(eintrag(ms[0]?.lib)?.attribute?.led?.serie || "")}</td><td class="zahl">${fmt(px)}</td>
          <td>${balken(px / (portKapazitaet(g) || 1))}</td><td>${esc(wegText(k))}</td></tr>`; }).join("")
        || `<tr><td colspan="8" class="leise">Noch keine Ports zugewiesen – rechts beim Prozessor Ports anklicken oder „Vorschlag erzeugen“.</td></tr>`}</table>`;
  },
  rechts() { return signalRechts(); },
  pruefungen() { return signalPruefungen(); },
  taste(e) {
    if (e.key === "Escape" && ui.werkzeug === "pinsel") { ui.werkzeug = "auswahl"; render(); return true; }
    // Pinsel: Backspace = letztes Modul zurück, Entf = ganzen Strang löschen
    if (ui.werkzeug === "pinsel" && (e.key === "Backspace" || e.key === "Delete")) {
      const [gId, nr] = (ui.pinsel.signal || "").split("|");
      const k = P.straenge.find(x => x.prozessor === gId && x.port === Number(nr));
      if (!k) return true;
      if (e.key === "Delete") { strangLoeschen(k.id); return true; }
      k.module.pop(); if (!k.module.length) P.straenge = P.straenge.filter(x => x !== k);
      aenderung(); return true;
    }
    if ((e.key === "Delete" || e.key === "Backspace") && ui.sel.strang) { strangLoeschen(ui.sel.strang); return true; }
    return false;
  },
};

function wegText(k) {
  const d = portWeg(k.prozessor, k.port);
  const b = Number.isFinite(k.backupPort) ? portWeg(backupGeraetId(k), k.backupPort) : d;
  return d === b ? (d ? d.name : "direkt (Cat)") : `${d?.name || "direkt"} / Backup ${b?.name || "direkt"}`;
}

function strangLoeschen(id) { P.straenge = P.straenge.filter(k => k.id !== id); ui.sel.strang = null; aenderung(); }

function signalRechts() {
  let html = "";
  const k = P.straenge.find(x => x.id === ui.sel.strang);
  if (k) {
    const g = geraetById(k.prozessor); const px = strangPixel(k);
    html += `<div class="karte"><div class="label">Strang ${strangName(k)}</div><table class="werte">
      <tr><td>Prozessor · Port</td><td>${esc(g?.name)} · ${k.port}</td></tr><tr><td>Backup</td><td>${Number.isFinite(k.backupPort) ? `${k.backupGeraet ? esc(geraetById(k.backupGeraet)?.name) + " · " : ""}Port ${k.backupPort} (am Strangende)` : "—"}</td></tr>
      <tr><td>Module</td><td>${k.module.length}</td></tr><tr><td>Pixel</td><td>${fmt(px)} / ${fmt(portKapazitaet(g))}</td></tr></table>
      <div class="knopfreihe" style="margin-top:8px"><button data-d="strang-pinsel">Mit Pinsel fortsetzen</button>${k.backupGeraet ? "" : `<button data-d="backup-weg">${Number.isFinite(k.backupPort) ? "Backup entfernen" : "Backup hinzufügen"}</button>`}<button data-d="strang-loeschen" class="gefahr">Löschen</button></div></div>`;
  }
  const g = geraetById(ui.sel.prozessor);
  if (g && g.art === "prozessor") {
    const led = prozessorLed(g);
    const ports = prozessorPorts(g); const belegt = belegtePorts(g.id);
    const px = P.straenge.filter(x => x.prozessor === g.id).reduce((a, x) => a + strangPixel(x), 0);
    const kabel = libListe("kabel").filter(e => e.attribute.led.gewerk === "signal");
    html += `<div class="karte"><div class="label">${esc(g.name)} · ${esc(eintrag(g.lib)?.name || "")}</div>
      <label class="feld"><span>Name *</span><input data-p-feld="name" value="${esc(g.name)}"></label>
      <label class="feld"><span>Standort</span><input data-p-feld="standort" value="${esc(g.standort || "")}"></label>
      <div class="zwei"><label class="feld"><span>Port-Kabel (direkt)</span><select data-p-feld="portKabel"><option value="">—</option>${kabel.map(e => `<option value="${e.id}"${g.portKabel === e.id ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>
      <label class="feld"><span>Länge (m)</span><input data-p-feld="portLaengeM" value="${g.portLaengeM ?? ""}" inputmode="decimal"></label></div>
      <label class="feld"><span>Strom für den Prozessor</span>${kanalSelect(g, 'data-p-feld="strom"')}</label>
      <table class="werte"><tr><td>Receiving Cards</td><td>${esc((led.receivingCards || []).join(", "))}</td></tr><tr><td>Belegte Ports</td><td>${belegt.size} / ${ports.length}</td></tr>
      <tr><td>Pixel</td><td>${fmt(px)} / ${fmt(led.pxGesamt)}</td></tr><tr><td>Layer</td><td>${fmt(led.layer)}</td></tr></table>
      ${portRasterHtml(g, aktuellerScreen())}
      <div class="abschnitt">Backup</div>${controllerBackupHtml(g)}
      <div class="knopfreihe" style="margin-top:8px"><button data-d="geraet-loeschen" class="gefahr">Prozessor löschen</button></div></div>`;
    html += wegeKarte(g);
    const d = geraetById(ui.sel.weg);
    if (istWeg(d) && d.prozessor === g.id) html += wegKarte(d);
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
      const an = strangeAnPort(g.id, p.nr); const haupt = an?.rolle === "haupt" ? an.strang : null, bk = an?.rolle === "backup" ? an.strang : null;
      const via = portWeg(g.id, p.nr); const viaText = via ? `<br><span class="leise">über ${esc(wegKurz(via))}</span>` : "";
      if (haupt) return `<div class="port" style="border-color:${strangFarbe(haupt)}"><b>Port ${p.nr}</b><br>Haupt · ${esc(screenById(haupt.screen)?.name || "")}<br>${fmt(strangPixel(haupt) / portKapazitaet(g) * 100)} %${viaText}</div>`;
      if (bk) return `<div class="port" style="border-color:${strangFarbe(bk)};border-style:dashed"><b>Port ${p.nr}</b><br>Backup zu ${strangName(bk)}<br>${esc(screenById(bk.screen)?.name || "")}${viaText}</div>`;
      return `<div class="port frei"><b>Port ${p.nr}</b><br>frei</div>`;
    }).join("");
    const haupt = hauptVon(g), bc = backupController(g);
    return `<div class="karte"${haupt ? ' style="border-left:4px dashed var(--akzent)"' : ""}><div class="knopfreihe"><h2 style="margin:0">${esc(g.name)} · ${esc(eintrag(g.lib)?.name || "")}</h2><span class="fueller"></span>${haupt ? `<span class="badge teil">Backup von ${esc(haupt.name)}</span>` : st.length ? `<span class="badge voll">ok</span>` : `<span class="badge teil">leer</span>`}</div>
      <p class="klein leise">Standort: ${esc(g.standort || "—")} · Receiving Cards: ${esc((led.receivingCards || []).join(", "))}${bc ? ` · Backup-Controller: <b>${esc(bc.name)}</b>` : ""}</p>
      <div class="label">Ausgänge (${ports.length} × ${fmt(led.pxJePort)} px)</div><div class="portgitter">${portHtml}</div>
      ${wegGeraete(g.id).length ? `<div class="label">Wege zur Wand</div><table class="werte">${wegGeraete(g.id).map(d => `<tr><td>${esc(wegKurz(d))} · ${esc(d.name)}</td><td>${esc(eintrag(d.lib)?.name || "—")} · Ports ${wegBelegung(d).map(e => (e.g !== d.prozessor ? prozessorKurz(e.g) + " " : "") + e.nr).join(", ") || "—"} · ${esc(d.standort || "")}</td></tr>`).join("")}</table>` : ""}
      <div class="label">Eingänge</div><table class="werte">${eingaenge.map(a => { const o = (P.outputs || []).filter(x => x.prozessor === g.id && x.eingang === a.name); return `<tr><td>${esc(a.name)}</td><td>${o.length ? o.map(x => esc(`${x.name} · ${x.b} × ${x.h} @ ${fmtFlex(x.hz)} Hz`)).join(", ") : '<span class="leise">frei</span>'}</td></tr>`; }).join("")}</table>
      <div class="label">Auslastung</div><table class="werte"><tr><td>Pixel</td><td>${fmt(px)} / ${fmt(led.pxGesamt)} (${fmt(led.pxGesamt ? px / led.pxGesamt * 100 : 0)} %)</td></tr>
      <tr><td>Ports</td><td>${belegtePorts(g.id).size} / ${ports.length}</td></tr><tr><td>Layer</td><td>${(P.layer || []).filter(l => l.prozessor === g.id).length} / ${fmt(led.layer)}</td></tr></table></div>`
      + wegGeraete(g.id).map(wegKarteUebersicht).join("");
  }).join("")}</div>`;
}

function signalListeAlle() {
  const zeilen = [];
  for (const g of P.geraete.filter(x => x.art === "prozessor")) for (const p of prozessorPorts(g)) {
    const an = strangeAnPort(g.id, p.nr); if (!an) continue;
    const k = an.strang, px = strangPixel(k), kap = portKapazitaet(geraetById(k.prozessor)) || 1;
    zeilen.push(`<tr><td>${esc(g.name)}</td><td>${p.nr}</td><td>${an.rolle === "haupt" ? "Haupt" : "Backup zu " + strangName(k)}</td><td>${esc(screenById(k.screen)?.name || "—")}</td><td><span class="punkt" style="background:${strangFarbe(k)}"></span>${strangName(k)}${an.rolle === "backup" ? " (Ende)" : ""}</td><td class="zahl">${fmt(px)}</td><td>${balken(px / kap)}</td></tr>`);
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
    if (P.regeln.backup && !Number.isFinite(k.backupPort)) liste.push({ art: "warn", text: `${s?.name} ${strangName(k)}: kein Backup-Port.`, ziel: "screen:" + k.screen });
  }
  for (const g of ps) {
    const led = prozessorLed(g);
    const px = P.straenge.filter(k => k.prozessor === g.id).reduce((a, k) => a + strangPixel(k), 0);
    if (led.pxGesamt && px > led.pxGesamt) liste.push({ art: "warn", text: `${g.name}: ${fmt(px)} px über der Gesamtkapazität ${fmt(led.pxGesamt)} px.`, ziel: "prozessor:" + g.id });
    if (!hauptVon(g) && !P.straenge.some(k => k.prozessor === g.id)) liste.push({ art: "info", text: `${g.name}: keine Ports belegt – wird er gebraucht?`, ziel: "prozessor:" + g.id });
    if (!g.strom) liste.push({ art: "info", text: `${g.name}: Stromversorgung nicht zugeordnet.`, ziel: "prozessor:" + g.id });
    const direkt = genutztePorts(g.id).some(nr => !portWeg(g.id, nr));
    if (direkt && !Number.isFinite(g.portLaengeM)) liste.push({ art: "warn", text: `${g.name}: Länge der Port-Kabel fehlt.`, ziel: "prozessor:" + g.id });
    if (direkt && g.portLaengeM > P.regeln.catMax) liste.push({ art: "warn", text: `${g.name}: Cat-Strecke ${fmtFlex(g.portLaengeM)} m über ${fmt(P.regeln.catMax)} m – Glasfaser/Stagebox nutzen.`, ziel: "prozessor:" + g.id });
  }
  liste.push(...wegePruefungen(), ...controllerBackupPruefungen());
  return liste;
}

function signalEreignisse() {
  controllerBackupEreignisse($("#rechts")); controllerBackupEreignisse($("#zeichnung"));
  $("#zeichnung").addEventListener("click", e => { if (ui.reiter === "signal" && e.target.closest("[data-d='backup-auto']")) backupAutomatisch(); });
  $("#zeichnung").addEventListener("change", e => {
    if (ui.reiter !== "signal" || !e.target.dataset.backupPort) return;
    const k = P.straenge.find(x => x.id === e.target.dataset.backupPort);
    if (k) backupSetzen(k, e.target.value === "" ? null : Number(e.target.value));
  });
  $("#werkzeuge").addEventListener("click", e => {
    if (ui.reiter !== "signal") return;
    const b = e.target.closest("[data-d]"); if (!b) return;
    const a = b.dataset.d;
    if (a === "vorschlag") signalVorschlag();
    else if (a === "pinsel") {
      ui.werkzeug = ui.werkzeug === "pinsel" ? "auswahl" : "pinsel";
      if (ui.werkzeug === "pinsel" && !ui.pinsel.signal) {
        const s = aktuellerScreen(); const z = s && (freieZugewiesenePorts(s)[0] || zugewiesenePorts(s).find(x => x.rolle === "haupt"));
        if (!z) { ui.werkzeug = "auswahl"; return toast("Zuerst rechts beim Prozessor Ports dieser Wand zuweisen.", "fehler"); }
        ui.pinsel.signal = z.ziel;
      }
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
  });
  $("#palette").addEventListener("click", e => {
    if (ui.reiter !== "signal") return;
    const b = e.target.closest("[data-d='prozessor-neu']"); if (b && !b.disabled) prozessorAnlegen(b.dataset.lib);
    const w = e.target.closest("[data-d='weg-neu']"); if (w && !w.disabled) wegAnlegen(w.dataset.art, w.dataset.lib, ui.sel.prozessor);
  });
  $("#liste").addEventListener("click", e => {
    if (ui.reiter !== "signal") return;
    const tr = e.target.closest("[data-ziel]"); if (!tr) return;
    // Zeile wählen = Port als Pinsel-Ziel (Backup-Zeile wählt den Hauptport ihres Strangs)
    const k = P.straenge.find(x => x.id === tr.dataset.strang);
    ui.sel.strang = k?.id || null; ui.sel.prozessor = tr.dataset.ziel.split("|")[0];
    ui.pinsel.signal = tr.dataset.ziel; ui.werkzeug = "pinsel";
    render();
  });
  $("#rechts").addEventListener("click", e => {
    if (ui.reiter !== "signal") return;
    const zw = e.target.closest("[data-zuweisen]");
    if (zw) { const [gId, nr] = zw.dataset.zuweisen.split("|"); return portZuweisen(aktuellerScreen(), gId, Number(nr)); }
    const ws = e.target.closest("[data-weg-sel]");
    if (ws) { ui.sel.weg = ui.sel.weg === ws.dataset.wegSel ? null : ws.dataset.wegSel; return render(); }
    const wa = e.target.closest("[data-w]")?.dataset.w; const d = geraetById(ui.sel.weg);
    if (wa && istWeg(d)) {
      if (wa === "loeschen") wegLoeschen(d);
      if (wa === "auffuellen") { wegPortsAuffuellen(d); aenderung(); }
      if (wa === "backup-spiegeln") {
        // Adern für den Backup-Controller: alle seine Backup-Ports, die noch keinen anderen Weg haben (bis zur Adernzahl)
        const bc = backupController(geraetById(d.prozessor)); if (!bc) return;
        const kap = wegKapazitaet(d) ?? Infinity;
        const neu = [...new Set(P.straenge.filter(k => k.prozessor === d.prozessor && k.backupGeraet === bc.id && Number.isFinite(k.backupPort)).map(k => k.backupPort))]
          .sort((a, b) => a - b).filter(nr => !portWeg(bc.id, nr) || portWeg(bc.id, nr) === d);
        d.backupPorts = neu.slice(0, Math.max(0, kap - d.ports.length));
        if (neu.length > d.backupPorts.length) toast(`Nur ${d.backupPorts.length} Adern frei – ${neu.length - d.backupPorts.length} Backup-Ports passen nicht.`, "fehler");
        aenderung();
      }
      return;
    }
    const a = e.target.closest("[data-d]")?.dataset.d; if (!a) return;
    const k = P.straenge.find(x => x.id === ui.sel.strang);
    if (a === "strang-loeschen" && k) strangLoeschen(k.id);
    if (a === "strang-pinsel" && k) { ui.pinsel.signal = `${k.prozessor}|${k.port}`; ui.werkzeug = "pinsel"; ui.screen = k.screen; render(); }
    if (a === "backup-weg" && k && !k.backupGeraet) {
      if (Number.isFinite(k.backupPort)) k.backupPort = null;
      else { const g = geraetById(k.prozessor); const belegt = belegtePorts(g.id); const frei = prozessorPorts(g).map(p => p.nr).reverse().find(n => !belegt.has(n)); if (!frei) return toast("Kein Port frei.", "fehler"); k.backupPort = frei; }
      aenderung();
    }
    if (a === "geraet-loeschen") { const g = geraetById(ui.sel.prozessor); if (g) geraetLoeschen(g); }
  });
  $("#rechts").addEventListener("change", e => {
    if (ui.reiter !== "signal") return;
    const neu = e.target.dataset.wNeu;
    if (neu) { if (e.target.value) wegAnlegen(neu, e.target.value, ui.sel.prozessor); return; }
    const wf = e.target.dataset.wFeld;
    if (wf) { const d = geraetById(ui.sel.weg); if (istWeg(d)) wegAendern(d, wf, e.target.value); return; }
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
