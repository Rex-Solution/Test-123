/* Reiter Aufbau: Module per Drag & Drop setzen, auswählen, verschieben, Werkzeuge. */

REITER.aufbau = {
  titelPalette: "Library – in die Wand ziehen",

  werkzeuge() {
    const s = aktuellerScreen();
    const dis = s ? "" : "disabled";
    const sel = ui.auswahl.size;
    return `<button data-a="raster" ${dis} title="Rechteck aus Spalten × Reihen eines Modultyps einfügen">Raster einfügen …</button>
      <button data-a="erweitern" ${dis} title="Spalten/Reihen an einer Seite anfügen oder entfernen">Erweitern / Kürzen …</button>
      <span class="trenner"></span>
      <button data-a="dup" ${dis} title="Auswahl duplizieren (Strg+D); ohne Auswahl den ganzen Screen">Duplizieren</button>
      <button data-a="spiegel-x" ${dis} title="Auswahl bzw. Screen horizontal spiegeln">Spiegeln ↔</button>
      <button data-a="spiegel-y" ${dis} title="Auswahl bzw. Screen vertikal spiegeln">Spiegeln ↕</button>
      <button data-a="winkel" ${dis} title="Winkel an den senkrechten Fugen setzen – je Fuge oder als Radius">∠ Kurve …</button>
      <button data-a="loeschen" class="gefahr" ${sel ? "" : "disabled"} title="Auswahl entfernen (Entf)">Entfernen</button>
      <span class="nur-touch knopfreihe"><span class="trenner"></span><button data-a="alle" ${dis}>Alle</button>
        <button data-a="mehrfach" class="${ui.mehrfach ? "aktiv" : ""}" title="Antippen fügt Module zur Auswahl hinzu">Mehrfachauswahl</button>
        <button data-a="einrasten" class="${ui.einrasten ? "aktiv" : ""}" title="Aus: Module frei setzen">Einrasten: ${ui.einrasten ? "an" : "aus"}</button></span>
      <span class="trenner"></span>
      <div class="umschalter"><button data-a="vorne" aria-selected="${!ui.hinten}">Vorderansicht</button><button data-a="hinten" aria-selected="${ui.hinten}">Rückansicht</button></div>
      <button data-a="einpassen" ${dis}>Einpassen</button>
      ${s ? `<span class="trenner"></span><div class="umschalter"><button data-a="bauart" data-wert="geflogen" aria-selected="${s.bauart === "geflogen"}">Geflogen</button><button data-a="bauart" data-wert="gestellt" aria-selected="${s.bauart === "gestellt"}">Gestellt</button></div>` : ""}`;
  },

  palette() {
    const module = libListe("modul");
    if (!module.length) return `<p class="klein leise">Keine LED-Module in der Library.</p>`;
    return module.map(e => {
      const led = e.attribute.led;
      const nutzbar = eintragNutzbar(e);
      const f = 26 / Math.max(led.mmB || 500, led.mmH || 500);
      return `<div class="palette-item" draggable="${nutzbar}" data-lib="${e.id}" title="${nutzbar ? "In die Zeichnung ziehen oder anklicken" : "Pflichtangaben fehlen – in der Library ergänzen"}" style="${nutzbar ? "" : "opacity:.5"}">
        <span class="form" style="width:${Math.max(6, (led.mmB || 500) * f)}px;height:${Math.max(6, (led.mmH || 500) * f)}px"></span>
        <span class="name">${esc(e.name)}</span>${badgeHtml(e)}</div>`;
    }).join("") + (ui.touch ? `<p class="klein leise">Mit dem Finger in die Wand ziehen: Modul setzen (rastet ein, „Einrasten: aus“ = frei). Antippen: rechts anfügen.
      Zwei Finger: zoomen und verschieben. Ein Finger auf freier Fläche: Auswahlrahmen.</p>` : `<p class="klein leise">Ziehen: Modul setzen (rastet an Nachbarn ein, <kbd>Alt</kbd> = frei). Klick: rechts anfügen.
      <kbd>Entf</kbd> entfernen · <kbd>Strg</kbd>+<kbd>A</kbd> alles · Pfeile 10 mm (<kbd>Shift</kbd> 100 mm).</p>`);
  },

  zeichnung(el) {
    const s = aktuellerScreen();
    if (!s) return leerZeichnung(el, `Noch kein Screen.<br><br><button data-a="screen-neu" class="primaer" style="pointer-events:auto">+ Screen anlegen</button>`);
    const v = ansicht(s);
    el.innerHTML = `<svg viewBox="${vbText(v)}" preserveAspectRatio="xMidYMid meet">${screenSvgInhalt(s, { auswahl: ui.auswahl, hinten: ui.hinten, zusatz: ui.hinten ? "" : riggingSvg(s) + kurveMarkenSvg(s), masseTiefer: !ui.hinten,
      oben: `${s.name}${ui.hinten ? " · Rückansicht" : ""}${kurveDaten(s).gebogen ? " · Abwicklung" : ""}${s.ukM != null ? " · UK " + fmtFlex(s.ukM) + " m" : ""} · ${s.bauart}` })}</svg>`;
    if (!s.module.length) el.insertAdjacentHTML("beforeend", `<div class="leer-hinweis">Module aus der Library hierher ziehen<br>oder „Raster einfügen …“ verwenden.</div>`);
    const svg = el.querySelector("svg");
    ansichtSteuerung(el, svg, s);
    aufbauInteraktion(svg, s);
  },

  liste() {
    const s = aktuellerScreen();
    if (!s) return `<p class="leise klein">Kein Screen gewählt.</p>`;
    const sum = screenSummen(s);
    const zeilen = [...sum.typen.entries()].map(([lib, n]) => {
      const e = eintrag(lib); const a = e?.attribute || {}; const led = a.led || {};
      return `<tr><td>${esc(e?.name || lib)}</td><td class="zahl">${n}</td><td class="zahl">${fmt(n * (led.pixelB || 0) * (led.pixelH || 0))}</td>
        <td class="zahl">${Number.isFinite(a.gewicht) ? fmt(n * a.gewicht, 1) + " kg" : "—"}</td>
        <td class="zahl">${Number.isFinite(a.stromverbrauch) ? fmt(n * a.stromverbrauch) + " W" : "—"}</td>
        <td>${esc(led.serie || "—")} · ${esc(led.receivingCard || "—")}</td></tr>`;
    }).join("");
    const pl = pixelLage(s);
    return `<div class="kopf"><b>Module in „${esc(s.name)}“</b><span class="leise klein">${fmtFlex(sum.bM, 2)} × ${fmtFlex(sum.hM, 2)} m · ${fmt(sum.m2, 2)} m² · ${fmt(pl.b)} × ${fmt(pl.h)} px</span></div>
      <table><tr><th>Typ</th><th class="zahl">Anzahl</th><th class="zahl">Pixel</th><th class="zahl">Gewicht</th><th class="zahl">Leistung max.</th><th>Serie · Receiving Card</th></tr>
      ${zeilen || `<tr><td colspan="6" class="leise">Noch keine Module.</td></tr>`}
      ${zeilen ? `<tr><td><b>Summe</b></td><td class="zahl"><b>${sum.anzahl}</b></td><td class="zahl"><b>${fmt(sum.px)}</b></td>
        <td class="zahl"><b>${fmt(sum.kg, 1)} kg</b></td><td class="zahl"><b>${fmt(sum.wMax)} W</b></td><td></td></tr>` : ""}</table>`;
  },

  rechts() {
    const s = aktuellerScreen();
    if (!s) return `<div class="karte"><p class="klein leise">Lege links unter „Screens“ mit + den ersten Screen an.</p></div>`;
    const sum = screenSummen(s);
    const auswahl = s.module.filter(m => ui.auswahl.has(m.id));
    const typen = [...new Set(auswahl.map(m => m.lib))];
    return `<div class="karte"><div class="label">Screen</div>
        <label class="feld"><span>Name *</span><input data-screen-feld="name" value="${esc(s.name)}"></label>
        <label class="feld"><span>Beschreibung</span><input data-screen-feld="beschreibung" value="${esc(s.beschreibung)}"></label>
        <div class="zwei"><label class="feld"><span>Unterkante (m)</span><input data-screen-feld="ukM" value="${s.ukM == null ? "" : fmtFlex(s.ukM)}" inputmode="decimal"></label>
        <label class="feld"><span>Bauart</span><select data-screen-feld="bauart"><option value="geflogen"${s.bauart === "geflogen" ? " selected" : ""}>geflogen</option><option value="gestellt"${s.bauart === "gestellt" ? " selected" : ""}>gestellt</option></select></label></div>
        <div class="knopfreihe"><button data-a="screen-dup">Screen duplizieren</button><button data-a="screen-loeschen" class="gefahr">Screen löschen</button></div></div>
      <div class="karte"><div class="label">Summe Screen</div><table class="werte">
        <tr><td>Module</td><td>${sum.anzahl}</td></tr><tr><td>Fläche</td><td>${fmt(sum.m2, 2)} m²</td></tr>
        <tr><td>Gewicht Module</td><td>${fmt(sum.kg, 1)} kg</td></tr><tr><td>Leistung max. / typ.</td><td>${fmt(sum.wMax)} / ${fmt(sum.wTyp)} W</td></tr></table></div>
      ${s.module.length ? riggingKarte(s) + kurveKarte(s) : ""}
      ${auswahl.length ? `<div class="karte"><div class="label">Auswahl · ${auswahl.length} Modul${auswahl.length === 1 ? "" : "e"}</div>
        <label class="feld"><span>Modultyp tauschen</span><select data-a-change="typ-tauschen"><option value="">${typen.length === 1 ? esc(eintrag(typen[0])?.name) : "– gemischt –"}</option>
        ${libListe("modul").filter(eintragNutzbar).map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join("")}</select></label></div>` : ""}`;
  },

  pruefungen() {
    const liste = [];
    if (!P.screens.length) return [{ art: "info", text: "Noch kein Screen angelegt." }];
    for (const s of P.screens) {
      if (!s.module.length) { liste.push({ art: "warn", text: `${s.name}: noch keine Module.`, ziel: "screen:" + s.id }); continue; }
      const typen = [...new Set(s.module.map(m => m.lib))];
      for (const t of typen) {
        const e = eintrag(t);
        if (!e) liste.push({ art: "fehler", text: `${s.name}: Modultyp „${t}“ fehlt in der Library.`, ziel: "screen:" + s.id });
        else if (!eintragNutzbar(e)) liste.push({ art: "fehler", text: `${e.name}: Pflichtangaben fehlen.`, ziel: "library:" + t });
      }
      const sum = screenSummen(s);
      if (sum.unbekannt.size) liste.push({ art: "warn", text: `${s.name}: ${[...sum.unbekannt].join(", ")} nicht bei allen Modulen bekannt.`, ziel: "screen:" + s.id });
      // Überlappung
      const r = s.module.map(m => ({ m, r: modRect(m) }));
      const ueber = new Set();
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (schneidet(r[i].r, r[j].r)) { ueber.add(r[i].m.id); ueber.add(r[j].m.id); }
      if (ueber.size) liste.push({ art: "fehler", text: `${s.name}: ${ueber.size} Module überlappen.`, ziel: "modul:" + [...ueber][0] });
      liste.push(...kurvePruefungen(s));
      // Max. Module untereinander / übereinander
      const feld = s.bauart === "geflogen" ? "maxGeflogen" : "maxGestellt";
      const spalten = new Map();
      for (const m of s.module) { const k = Math.round(m.x); spalten.set(k, [...(spalten.get(k) || []), m]); }
      let unbekannt = false;
      for (const [, ms] of spalten) {
        const grenze = Math.min(...ms.map(m => eintrag(m.lib)?.attribute?.led?.mechanik?.[feld] ?? Infinity));
        if (!Number.isFinite(grenze)) { unbekannt = true; continue; }
        if (ms.length > grenze) liste.push({ art: "warn", text: `${s.name}: ${ms.length} Module ${s.bauart === "geflogen" ? "untereinander" : "übereinander"}, erlaubt ${grenze}.`, ziel: "modul:" + ms[0].id });
      }
      if (unbekannt) liste.push({ art: "warn", text: `${s.name}: max. Module ${s.bauart === "geflogen" ? "geflogen untereinander" : "gestellt übereinander"} unbekannt – nicht geprüft.`, ziel: "screen:" + s.id });
      const pitches = [...new Set(typen.map(t => fmtFlex(eintrag(t)?.attribute?.led?.pitchMm ?? (eintrag(t)?.attribute?.led?.mmB / eintrag(t)?.attribute?.led?.pixelB), 2)))];
      if (pitches.length > 1) liste.push({ art: "info", text: `${s.name}: verschiedene Pixelpitches (${pitches.join(" / ")} mm) – getrennte Datenports nötig.`, ziel: "screen:" + s.id });
    }
    return [...liste, ...riggingPruefungen()];
  },

  taste(e) {
    const s = aktuellerScreen();
    if (!s) return false;
    const k = e.key;
    if (k === "Delete" || k === "Backspace") { if (ui.auswahl.size) modulEntfernen(s, [...ui.auswahl]); return true; }
    if (k === "Escape") { ui.auswahl.clear(); render(); return true; }
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "a") { ui.auswahl = new Set(s.module.map(m => m.id)); render(); return true; }
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === "d") { aufbauDuplizieren(s); return true; }
    const pfeile = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (pfeile[k] && ui.auswahl.size) {
      const schritt = e.shiftKey ? 100 : 10;
      const [dx, dy] = pfeile[k];
      verschiebeAuswahl(s, dx * schritt * (ui.hinten ? -1 : 1), dy * schritt);
      return true;
    }
    return false;
  },
};

/* ---------- Aktionen ---------- */

function modulEntfernen(s, ids) {
  const weg = new Set(ids);
  s.module = s.module.filter(m => !weg.has(m.id));
  for (const k of P.kreise) if (k.screen === s.id) k.module = k.module.filter(id => !weg.has(id));
  for (const k of P.straenge) if (k.screen === s.id) k.module = k.module.filter(id => !weg.has(id));
  P.kreise = P.kreise.filter(k => k.module.length);
  P.straenge = P.straenge.filter(k => k.module.length);
  ids.forEach(id => ui.auswahl.delete(id));
  aenderung();
}

function verschiebeAuswahl(s, dx, dy) {
  const ms = s.module.filter(m => ui.auswahl.has(m.id));
  const neu = ms.map(m => ({ ...modRect(m), x: m.x + dx, y: m.y + dy }));
  if (!platzFrei(s, neu, ui.auswahl)) return toast("Dort ist kein Platz – Module würden sich überlappen.", "fehler");
  ms.forEach(m => { m.x += dx; m.y += dy; });
  aenderung();
}

function modulHinzufuegen(s, lib, x, y) {
  nutzeEintrag(lib);
  const m = { id: neueId("m"), lib, x: Math.round(x), y: Math.round(y) };
  if (!platzFrei(s, [modRect(m)])) { toast("Dort ist kein Platz – Modul würde ein anderes überlappen.", "fehler"); return null; }
  s.module.push(m);
  return m;
}

/* Klick in der Palette: rechts neben den vorhandenen Modulen (oben bündig) anfügen */
function modulAnfuegen(lib) {
  const s = aktuellerScreen();
  if (!s) return toast("Bitte zuerst einen Screen anlegen.", "fehler");
  const g = grenzen(s.module);
  const m = modulHinzufuegen(s, lib, s.module.length ? g.x + g.b : 0, s.module.length ? g.y : 0);
  if (m) { ui.auswahl = new Set([m.id]); aenderung(); }
}

async function rasterEinfuegen() {
  const s = aktuellerScreen();
  const module = libListe("modul").filter(eintragNutzbar);
  if (!module.length) return toast("Keine vollständigen LED-Module in der Library.", "fehler");
  const g = grenzen(s.module);
  const erg = await formularDialog("Raster einfügen", [
    { name: "lib", label: "Modultyp", art: "auswahl", wert: module[0].id, optionen: module.map(e => [e.id, e.name]) },
    { name: "spalten", label: "Spalten", art: "zahl", wert: 12 },
    { name: "reihen", label: "Reihen", art: "zahl", wert: 3 },
    { name: "x", label: "Position X (mm, links)", art: "zahl", wert: s.module.length ? g.x : 0 },
    { name: "y", label: "Position Y (mm, oben)", art: "zahl", wert: s.module.length ? g.y + g.h : 0 },
    { name: "hinweis", art: "hinweis", label: "Standard: unter den vorhandenen Modulen. Y wächst nach unten." },
  ], "Einfügen");
  if (!erg) return;
  const sp = Math.round(erg.spalten), re = Math.round(erg.reihen);
  if (!(sp >= 1 && sp <= 200 && re >= 1 && re <= 200)) return toast("Spalten/Reihen: 1 bis 200.", "fehler");
  nutzeEintrag(erg.lib);
  const { b, h } = modMass({ lib: erg.lib });
  const neu = [];
  for (let r = 0; r < re; r++) for (let c = 0; c < sp; c++) neu.push({ id: neueId("m"), lib: erg.lib, x: (erg.x || 0) + c * b, y: (erg.y || 0) + r * h });
  if (!platzFrei(s, neu.map(modRect))) return toast("Das Raster überlappt vorhandene Module.", "fehler");
  s.module.push(...neu);
  ui.auswahl = new Set(neu.map(m => m.id));
  ui.ansicht.delete(s.id);
  aenderung();
}

async function erweiternKuerzen() {
  const s = aktuellerScreen();
  if (!s.module.length) return toast("Der Screen hat noch keine Module.", "fehler");
  const erg = await formularDialog("Erweitern / Kürzen", [
    { name: "aktion", label: "Aktion", art: "auswahl", wert: "plus", optionen: [["plus", "Erweitern (anfügen)"], ["minus", "Kürzen (entfernen)"]] },
    { name: "seite", label: "Seite", art: "auswahl", wert: "rechts", optionen: [["rechts", "rechts"], ["links", "links"], ["unten", "unten"], ["oben", "oben"]] },
    { name: "anzahl", label: "Anzahl Spalten/Reihen", art: "zahl", wert: 1 },
  ], "Ausführen");
  if (!erg) return;
  const n = Math.round(erg.anzahl);
  if (!(n >= 1 && n <= 50)) return toast("Anzahl: 1 bis 50.", "fehler");
  for (let i = 0; i < n; i++) {
    const g = grenzen(s.module);
    const rand = m => { const r = modRect(m); return { rechts: Math.abs(r.x + r.b - (g.x + g.b)) < EPS, links: Math.abs(r.x - g.x) < EPS, unten: Math.abs(r.y + r.h - (g.y + g.h)) < EPS, oben: Math.abs(r.y - g.y) < EPS }[erg.seite]; };
    const kante = s.module.filter(rand);
    if (erg.aktion === "minus") {
      if (kante.length === s.module.length) { toast("Der letzte Rest wird nicht entfernt.", "fehler"); break; }
      modulEntfernenOhneRender(s, kante.map(m => m.id));
    } else {
      const neu = kante.map(m => { const r = modRect(m); const d = { rechts: [r.b, 0], links: [-r.b, 0], unten: [0, r.h], oben: [0, -r.h] }[erg.seite];
        return { id: neueId("m"), lib: m.lib, x: m.x + d[0], y: m.y + d[1] }; });
      if (!platzFrei(s, neu.map(modRect))) { toast("Kein Platz zum Erweitern.", "fehler"); break; }
      s.module.push(...neu);
    }
  }
  ui.ansicht.delete(s.id);
  aenderung();
}
function modulEntfernenOhneRender(s, ids) {
  const weg = new Set(ids);
  s.module = s.module.filter(m => !weg.has(m.id));
  for (const k of [...P.kreise, ...P.straenge]) if (k.screen === s.id) k.module = k.module.filter(id => !weg.has(id));
  P.kreise = P.kreise.filter(k => k.module.length); P.straenge = P.straenge.filter(k => k.module.length);
  ids.forEach(id => ui.auswahl.delete(id));
}

function aufbauDuplizieren(s) {
  if (!ui.auswahl.size) return screenDuplizieren(s);
  const ms = s.module.filter(m => ui.auswahl.has(m.id));
  const g = grenzen(ms), ga = grenzen(s.module);
  const dx = ga.x + ga.b - g.x;
  const neu = ms.map(m => ({ id: neueId("m"), lib: m.lib, x: m.x + dx, y: m.y }));
  if (!platzFrei(s, neu.map(modRect))) return toast("Kein Platz für die Kopie.", "fehler");
  s.module.push(...neu);
  ui.auswahl = new Set(neu.map(m => m.id));
  ui.ansicht.delete(s.id);
  aenderung();
}

function screenDuplizieren(s) {
  const n = klon(s);
  n.id = neueId("s"); n.name = s.name + " (Kopie)";
  n.module.forEach(m => { m.id = neueId("m"); });
  P.screens.push(n);
  ui.screen = n.id; ui.auswahl.clear();
  aenderung();
  toast("Screen dupliziert (ohne Strom- und Signalwege).", "ok");
}

function screenLoeschen(s) {
  if (!confirm(`Screen „${s.name}“ mit ${s.module.length} Modulen löschen?`)) return;
  P.screens = P.screens.filter(x => x !== s);
  P.kreise = P.kreise.filter(k => k.screen !== s.id);
  P.straenge = P.straenge.filter(k => k.screen !== s.id);
  P.lakas = P.lakas.filter(l => l.screen !== s.id);
  ui.screen = P.screens[0]?.id || null; ui.auswahl.clear();
  aenderung();
}

function aufbauSpiegeln(s, achse) {
  const ms = ui.auswahl.size ? s.module.filter(m => ui.auswahl.has(m.id)) : s.module;
  // ganzer Screen gespiegelt: Winkel wandern mit (Richtung bleibt)
  if (achse === "x" && ms.length === s.module.length && s.winkel) {
    const g = grenzen(s.module);
    s.winkel = Object.fromEntries(Object.entries(s.winkel).map(([x, w]) => [g.x + g.x + g.b - Number(x), w]));
  }
  spiegeln(ms, achse);
  aenderung();
}

/* ---------- Maus und Ziehen ---------- */

function aufbauInteraktion(svg, s) {
  let zug = null;      // Verschieben der Auswahl
  let rahmen = null;   // Auswahlrahmen
  svg.addEventListener("pointerdown", e => {
    if (e.button !== 0 || leertaste.gedrueckt) return;
    const fuge = e.target.closest("[data-fuge]");
    if (fuge) { fugeBearbeiten(s, Number(fuge.dataset.fuge)); return; }
    const p = svgPunkt(svg, e);
    const g = e.target.closest("[data-mod]");
    if (g) {
      const id = g.dataset.mod;
      if (e.shiftKey || e.ctrlKey || ui.mehrfach) { ui.auswahl.has(id) ? ui.auswahl.delete(id) : ui.auswahl.add(id); render(); return; }
      if (!ui.auswahl.has(id)) { ui.auswahl = new Set([id]); markiereAuswahl(svg); }
      zug = { start: p, dx: 0, dy: 0, bewegt: false, ankerId: id };
    } else {
      rahmen = { start: p, el: null };
    }
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", e => {
    const p = svgPunkt(svg, e);
    if (zug) {
      let dx = (p.x - zug.start.x) * (ui.hinten ? -1 : 1), dy = p.y - zug.start.y;
      if (!e.altKey && ui.einrasten) {
        const anker = s.module.find(m => m.id === zug.ankerId);
        const r = modRect(anker);
        const andere = s.module.filter(m => !ui.auswahl.has(m.id)).map(modRect);
        const z = einrasten({ ...r, x: r.x + dx, y: r.y + dy }, andere, 14 * mmJePixel(svg));
        dx = z.x - r.x; dy = z.y - r.y;
      }
      zug.dx = dx; zug.dy = dy; zug.bewegt = zug.bewegt || Math.abs(dx) > 0 || Math.abs(dy) > 0;
      for (const id of ui.auswahl) svg.querySelector(`[data-mod="${id}"]`)?.setAttribute("transform", `translate(${dx * (ui.hinten ? -1 : 1)} ${dy})`);
    } else if (rahmen) {
      const x = Math.min(p.x, rahmen.start.x), y = Math.min(p.y, rahmen.start.y), b = Math.abs(p.x - rahmen.start.x), h = Math.abs(p.y - rahmen.start.y);
      if (!rahmen.el) { rahmen.el = document.createElementNS("http://www.w3.org/2000/svg", "rect"); rahmen.el.setAttribute("fill", "rgba(77,163,255,.12)"); rahmen.el.setAttribute("stroke", "#4da3ff"); rahmen.el.setAttribute("stroke-width", 3 * mmJePixel(svg)); svg.appendChild(rahmen.el); }
      Object.entries({ x, y, width: b, height: h }).forEach(([k, v]) => rahmen.el.setAttribute(k, v));
      rahmen.r = { x, y, b, h };
    }
  });
  svg.addEventListener("pointerup", e => {
    if (zug) {
      const z = zug; zug = null;
      if (z.bewegt) {
        const ms = s.module.filter(m => ui.auswahl.has(m.id));
        const neu = ms.map(m => ({ ...modRect(m), x: m.x + z.dx, y: m.y + z.dy }));
        if (platzFrei(s, neu, ui.auswahl)) { ms.forEach(m => { m.x = Math.round(m.x + z.dx); m.y = Math.round(m.y + z.dy); }); aenderung(); }
        else { toast("Dort ist kein Platz – Module würden sich überlappen.", "fehler"); render(); }
      } else render();
    } else if (rahmen) {
      const r = rahmen; rahmen = null;
      if (r.r && r.r.b > 2 && r.r.h > 2) {
        const rr = ui.hinten ? spiegelRect(s, r.r) : r.r;
        ui.auswahl = new Set(s.module.filter(m => schneidet(modRect(m), rr)).map(m => m.id));
      } else if (!ui.mehrfach) ui.auswahl.clear();
      render();
    }
  });
  // Drag & Drop aus der Palette
  svg.addEventListener("dragover", e => { if (e.dataTransfer.types.includes("text/lib")) e.preventDefault(); });
  svg.addEventListener("drop", e => {
    e.preventDefault();
    const lib = e.dataTransfer.getData("text/lib");
    if (lib) modulAbsetzen(svg, s, lib, e.clientX, e.clientY, e.altKey || !ui.einrasten);
  });
}
/* Modul an einer Bildschirmposition absetzen (Maus-Drop oder Finger-Ziehen) */
function modulAbsetzen(svg, s, lib, clientX, clientY, frei) {
  nutzeEintrag(lib);
  const { b, h } = modMass({ lib });
  const p = svgPunkt(svg, { clientX, clientY });
  let x = p.x - b / 2, y = p.y - h / 2;
  if (ui.hinten) { const g = grenzen(s.module); x = g.x + g.x + g.b - x - b; }
  if (!frei && s.module.length) ({ x, y } = einrasten({ x, y, b, h }, s.module.map(modRect), 40 * mmJePixel(svg)));
  else if (!s.module.length) { x = Math.round(x / 10) * 10; y = Math.round(y / 10) * 10; }
  const m = modulHinzufuegen(s, lib, x, y);
  if (m) { ui.auswahl = new Set([m.id]); aenderung(); }
}
function spiegelRect(s, r) { const g = grenzen(s.module); return { ...r, x: g.x + g.x + g.b - r.x - r.b }; }
function markiereAuswahl(svg) { svg.querySelectorAll("[data-mod]").forEach(g => g.classList.toggle("sel", ui.auswahl.has(g.dataset.mod))); }

/* Ereignisse der Werkzeugleiste, Palette und rechten Spalte (Reiter Aufbau) */
function aufbauEreignisse() {
  $("#werkzeuge").addEventListener("click", e => {
    if (ui.reiter !== "aufbau") return;
    const b = e.target.closest("[data-a]"); if (!b) return;
    const s = aktuellerScreen();
    const a = b.dataset.a;
    if (a === "raster") rasterEinfuegen();
    else if (a === "erweitern") erweiternKuerzen();
    else if (a === "dup") aufbauDuplizieren(s);
    else if (a === "spiegel-x") aufbauSpiegeln(s, "x");
    else if (a === "spiegel-y") aufbauSpiegeln(s, "y");
    else if (a === "loeschen") modulEntfernen(s, [...ui.auswahl]);
    else if (a === "vorne" || a === "hinten") { ui.hinten = a === "hinten"; render(); }
    else if (a === "einpassen") einpassen();
    else if (a === "bauart") { s.bauart = b.dataset.wert; aenderung(); }
    else if (a === "winkel") winkelDialog(s);
    else if (a === "alle") { ui.auswahl = new Set(s.module.map(m => m.id)); render(); }
    else if (a === "mehrfach") { ui.mehrfach = !ui.mehrfach; render(); }
    else if (a === "einrasten") { ui.einrasten = !ui.einrasten; render(); }
  });
  $("#zeichnung").addEventListener("click", e => { if (e.target.closest("[data-a='screen-neu']")) screenAnlegen(); });
  $("#palette").addEventListener("dragstart", e => {
    const it = e.target.closest("[data-lib]"); if (!it) return;
    e.dataTransfer.setData("text/lib", it.dataset.lib); e.dataTransfer.effectAllowed = "copy";
  });
  $("#palette").addEventListener("click", e => {
    if (ui.reiter !== "aufbau") return;
    const it = e.target.closest("[data-lib]"); if (!it || it.getAttribute("draggable") !== "true") return;
    if (Date.now() - ui.klickSperre < 500) return;   // gerade mit dem Finger gezogen
    modulAnfuegen(it.dataset.lib);
  });
  $("#rechts").addEventListener("change", e => {
    if (ui.reiter !== "aufbau") return;
    const s = aktuellerScreen(); if (!s) return;
    const f = e.target.dataset.screenFeld;
    if (f) {
      if (f === "name" && !e.target.value.trim()) { toast("Name: darf nicht leer sein.", "fehler"); return render(); }
      if (f === "ukM") { const z = leseZahl(e.target.value); if (Number.isNaN(z)) { toast("Unterkante: Zahl in Metern eingeben.", "fehler"); return; } s.ukM = z; }
      else s[f] = f === "name" ? e.target.value.trim() : e.target.value;
      return aenderung();
    }
    if (e.target.dataset.aChange === "typ-tauschen" && e.target.value) {
      const lib = e.target.value; nutzeEintrag(lib);
      const ms = s.module.filter(m => ui.auswahl.has(m.id));
      const alt = ms.map(m => m.lib);
      ms.forEach(m => { m.lib = lib; });
      if (!platzFrei(s, ms.map(modRect), ui.auswahl) || ms.some(m => s.module.some(o => !ui.auswahl.has(o.id) && schneidet(modRect(m), modRect(o))))) {
        ms.forEach((m, i) => { m.lib = alt[i]; });
        toast("Der neue Typ passt nicht – Module würden sich überlappen.", "fehler");
        return render();
      }
      aenderung();
    }
  });
  $("#rechts").addEventListener("click", e => {
    if (ui.reiter !== "aufbau") return;
    const a = e.target.closest("[data-a]")?.dataset.a; const s = aktuellerScreen();
    if (a === "screen-dup") screenDuplizieren(s);
    if (a === "screen-loeschen") screenLoeschen(s);
    if (a === "winkel") winkelDialog(s);
    if (a === "gerade" && confirm(`„${s.name}“ gerade machen (alle Winkel 0°)?`)) { s.winkel = {}; aenderung(); }
  });
}
