/* Ausgabe-Mapping: Zuspieler-Outputs → Prozessor-Eingänge → Layer (Ausschnitt → Fläche im Pixelraum).
   P.outputs  = [{ id, name, zuspieler, b, h, hz, anschluss, prozessor, eingang }]
   P.pixelraum = { [prozessorId]: { [screenId]: { x, y } } }
   P.layer    = [{ id, prozessor, output, ax, ay, b, h, zx, zy, zb, zh, modus: "1:1" | "skaliert" }] */

const ANSCHLUESSE = ["HDMI", "DP", "SDI", "DVI"];

function mappingDaten() {
  P.outputs = P.outputs || []; P.pixelraum = P.pixelraum || {}; P.layer = P.layer || [];
}
function prozessorScreens(gId) {
  const ids = [...new Set(P.straenge.filter(k => k.prozessor === gId).map(k => k.screen))];
  return P.screens.filter(s => ids.includes(s.id));
}
function prozessorEingaenge(g) { return anschluesseAusklappen(eintrag(g.lib)?.attribute?.anschluesse).filter(a => a.rolle === "video"); }
/* Lage der Screens im Pixelraum; fehlende werden rechts angefügt */
function pixelraum(gId) {
  mappingDaten();
  const raum = P.pixelraum[gId] = P.pixelraum[gId] || {};
  let x = Math.max(0, ...Object.entries(raum).filter(([id]) => screenById(id)).map(([id, p]) => p.x + pixelLage(screenById(id)).b));
  for (const s of prozessorScreens(gId)) if (!raum[s.id]) { raum[s.id] = { x, y: 0 }; x += pixelLage(s).b; }
  for (const id of Object.keys(raum)) if (!prozessorScreens(gId).some(s => s.id === id)) delete raum[id];
  return raum;
}
function pixelraumBloecke(gId) {
  const raum = pixelraum(gId);
  return prozessorScreens(gId).map(s => { const pl = pixelLage(s); return { s, x: raum[s.id].x, y: raum[s.id].y, b: pl.b, h: pl.h }; });
}
function pixelraumGrenzen(gId) {
  const bl = pixelraumBloecke(gId);
  if (!bl.length) return { x: 0, y: 0, b: 0, h: 0 };
  const x0 = Math.min(...bl.map(b => b.x)), y0 = Math.min(...bl.map(b => b.y));
  return { x: x0, y: y0, b: Math.max(...bl.map(b => b.x + b.b)) - x0, h: Math.max(...bl.map(b => b.y + b.h)) - y0 };
}
const outputById = id => (P.outputs || []).find(o => o.id === id) || null;

async function outputBearbeiten(o) {
  const neu = !o;
  o = o || { id: neueId("o"), name: "Medienserver 1 · Out " + ((P.outputs || []).length + 1), zuspieler: "Medienserver 1", b: 3840, h: 2160, hz: 50, anschluss: "HDMI", prozessor: null, eingang: null };
  const ps = P.geraete.filter(g => g.art === "prozessor");
  const eing = [["", "— nicht verbunden —"]];
  for (const g of ps) for (const e of prozessorEingaenge(g)) eing.push([`${g.id}|${e.name}`, `${g.name} · ${e.name}`]);
  const erg = await formularDialog(neu ? "Output anlegen" : "Output bearbeiten", [
    { name: "name", label: "Name *", wert: o.name },
    { name: "zuspieler", label: "Zuspieler", wert: o.zuspieler },
    { name: "b", label: "Breite (px)", art: "zahl", wert: o.b }, { name: "h", label: "Höhe (px)", art: "zahl", wert: o.h },
    { name: "hz", label: "Bildrate (Hz)", art: "zahl", wert: o.hz },
    { name: "anschluss", label: "Anschluss", art: "auswahl", wert: o.anschluss, optionen: ANSCHLUESSE.map(a => [a, a]) },
    { name: "eingang", label: "Verbunden mit", art: "auswahl", wert: o.prozessor ? `${o.prozessor}|${o.eingang}` : "", optionen: eing },
  ], neu ? "Anlegen" : "Übernehmen");
  if (!erg) return;
  if (!erg.name.trim() || !(erg.b > 0 && erg.h > 0 && erg.hz > 0)) return toast("Name, Breite, Höhe und Bildrate angeben.", "fehler");
  const [prozessor, eingang] = erg.eingang ? [erg.eingang.split("|")[0], erg.eingang.slice(erg.eingang.indexOf("|") + 1)] : [null, null];
  Object.assign(o, { name: erg.name.trim(), zuspieler: erg.zuspieler, b: Math.round(erg.b), h: Math.round(erg.h), hz: erg.hz, anschluss: erg.anschluss, prozessor, eingang });
  mappingDaten();
  if (neu) P.outputs.push(o);
  ui.sel.output = o.id;
  aenderung();
}

/* Layer automatisch: passt der ganze Pixelraum in den Output → ein Layer, sonst ein Layer je Screen */
function layerVorschlag(gId) {
  mappingDaten();
  const o = P.outputs.find(x => x.prozessor === gId);
  if (!o) return toast("Zuerst einen Output mit diesem Prozessor verbinden.", "fehler");
  const bl = pixelraumBloecke(gId);
  if (!bl.length) return toast("Der Prozessor versorgt noch keinen Screen (Reiter Signal).", "fehler");
  P.layer = P.layer.filter(l => l.prozessor !== gId);
  const g = pixelraumGrenzen(gId);
  if (g.b <= o.b && g.h <= o.h) {
    P.layer.push({ id: neueId("y"), prozessor: gId, output: o.id, ax: 0, ay: 0, b: g.b, h: g.h, zx: g.x, zy: g.y, zb: g.b, zh: g.h, modus: "1:1" });
  } else {
    let x = 0, y = 0, zeile = 0;
    for (const b of bl) {
      if (x + b.b > o.b) { x = 0; y += zeile; zeile = 0; }
      P.layer.push({ id: neueId("y"), prozessor: gId, output: o.id, ax: x, ay: y, b: b.b, h: b.h, zx: b.x, zy: b.y, zb: b.b, zh: b.h, modus: "1:1" });
      x += b.b; zeile = Math.max(zeile, b.h);
    }
  }
  aenderung();
  toast(`${P.layer.filter(l => l.prozessor === gId).length} Layer angelegt.`, "ok");
}

/* Testbild eines Prozessor-Pixelraums und eines Outputs */
function pixelraumCanvas(gId) {
  const g = pixelraumGrenzen(gId);
  const c = document.createElement("canvas");
  c.width = Math.max(1, g.x + g.b); c.height = Math.max(1, g.y + g.h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
  for (const b of pixelraumBloecke(gId)) ctx.drawImage(testbildCanvas(b.s), b.x, b.y);
  return c;
}
function outputCanvas(o) {
  const c = document.createElement("canvas");
  c.width = o.b; c.height = o.h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, c.width, c.height);
  const raeume = new Map();
  for (const l of (P.layer || []).filter(l => l.output === o.id)) {
    if (!raeume.has(l.prozessor)) raeume.set(l.prozessor, pixelraumCanvas(l.prozessor));
    ctx.imageSmoothingEnabled = l.modus !== "1:1";
    ctx.drawImage(raeume.get(l.prozessor), l.zx, l.zy, l.zb, l.zh, l.ax, l.ay, l.b, l.h);
  }
  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.font = `600 ${Math.max(14, o.h / 40)}px "Segoe UI", sans-serif`;
  ctx.textBaseline = "bottom"; ctx.fillText(`${o.name} · ${o.b} × ${o.h} @ ${o.hz} Hz`, 12, o.h - 10);
  return c;
}

/* ---------- Darstellung (Modus „Mapping“ im Reiter Ausgabe) ---------- */
function mappingProzessor() {
  const ps = P.geraete.filter(g => g.art === "prozessor");
  let g = geraetById(ui.sel.prozessor);
  if (!g || g.art !== "prozessor") g = ps[0] || null;
  return g;
}
function mappingSvg(g) {
  const o = outputById(ui.sel.output) && outputById(ui.sel.output).prozessor === g.id ? outputById(ui.sel.output) : (P.outputs || []).find(x => x.prozessor === g.id);
  const raum = pixelraumGrenzen(g.id);
  const rb = Math.max(raum.x + raum.b, 1920), rh = Math.max(raum.y + raum.h, 1080);
  const ob = o ? o.b : 1920, oh = o ? o.h : 1080;
  const abstand = Math.max(ob, rb) * 0.25;
  const vbB = ob + abstand + rb, vbH = Math.max(oh, rh);
  const fs = vbB / 70, st = vbB / 900;
  const layer = (P.layer || []).filter(l => l.prozessor === g.id);
  let t = `<svg viewBox="${-st * 20} ${-fs * 3} ${vbB + st * 40} ${vbH + fs * 5}" preserveAspectRatio="xMidYMid meet">`;
  t += `<text x="0" y="${-fs}" font-size="${fs}" fill="#9a9a9a">${o ? esc(`${o.name} · ${o.b} × ${o.h} @ ${o.hz} Hz · ${o.anschluss}`) : "Kein Output verbunden"}</text>`;
  t += `<rect x="0" y="0" width="${ob}" height="${oh}" fill="#1c1c1c" stroke="${kabelFarbe(o?.anschluss === "SDI" ? "SDI" : o?.anschluss === "DP" ? "DisplayPort" : "HDMI")}" stroke-width="${st * 3}"/>`;
  const x0 = ob + abstand;
  t += `<text x="${x0}" y="${-fs}" font-size="${fs}" fill="#9a9a9a">Pixelraum ${esc(g.name)} · Screens ziehen zum Anordnen</text>`;
  t += `<rect x="${x0}" y="0" width="${rb}" height="${rh}" fill="#141414" stroke="#9a9a9a" stroke-width="${st * 2}"/>`;
  for (const b of pixelraumBloecke(g.id)) {
    t += `<g class="raum-block" data-raum="${b.s.id}" style="cursor:move"><rect x="${x0 + b.x}" y="${b.y}" width="${b.b}" height="${b.h}" fill="rgba(77,163,255,.16)" stroke="#e8e8e8" stroke-width="${st * 2}"/>
      <text x="${x0 + b.x + b.b / 2}" y="${b.y + b.h / 2}" font-size="${fs}" fill="#e8e8e8" text-anchor="middle" pointer-events="none">${esc(b.s.name)} · ${b.b} × ${b.h}</text></g>`;
  }
  layer.forEach((l, i) => {
    const f = wegFarbe(i);
    const zeigen = l.output === o?.id;
    if (zeigen) t += `<rect x="${l.ax}" y="${l.ay}" width="${l.b}" height="${l.h}" fill="${f}33" stroke="${f}" stroke-width="${st * 3}"/><text x="${l.ax + fs * 0.5}" y="${l.ay + fs * 1.3}" font-size="${fs}" fill="${f}">Layer ${i + 1}</text>`;
    t += `<rect x="${x0 + l.zx}" y="${l.zy}" width="${l.zb}" height="${l.zh}" fill="none" stroke="${f}" stroke-width="${st * 3}" stroke-dasharray="${st * 12} ${st * 8}" pointer-events="none"/>`;
    if (zeigen) t += `<line x1="${l.ax + l.b}" y1="${l.ay + l.h / 2}" x2="${x0 + l.zx}" y2="${l.zy + l.zh / 2}" stroke="${f}" stroke-width="${st * 2}" pointer-events="none"/>`;
  });
  return t + "</svg>";
}

function mappingZeichnung(el) {
  const g = mappingProzessor();
  if (!g) return leerZeichnung(el, "Noch kein Prozessor – im Reiter Signal anlegen.");
  el.innerHTML = mappingSvg(g);
  const svg = el.querySelector("svg");
  let zug = null;
  svg.addEventListener("pointerdown", e => {
    const b = e.target.closest("[data-raum]"); if (!b) return;
    const raum = pixelraum(g.id);
    zug = { id: b.dataset.raum, start: svgPunkt(svg, e), x: raum[b.dataset.raum].x, y: raum[b.dataset.raum].y, el: b };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener("pointermove", e => {
    if (!zug) return;
    const p = svgPunkt(svg, e);
    let x = Math.max(0, Math.round(zug.x + p.x - zug.start.x)), y = Math.max(0, Math.round(zug.y + p.y - zug.start.y));
    const andere = pixelraumBloecke(g.id).filter(b => b.s.id !== zug.id);
    const pl = pixelLage(screenById(zug.id));
    ({ x, y } = einrasten({ x, y, b: pl.b, h: pl.h }, [...andere, { x: 0, y: 0, b: 0, h: 0 }], 12 * mmJePixel(svg)));
    zug.neu = { x: Math.max(0, x), y: Math.max(0, y) };
    zug.el.setAttribute("transform", `translate(${zug.neu.x - zug.x} ${zug.neu.y - zug.y})`);
  });
  svg.addEventListener("pointerup", () => {
    if (!zug) return;
    const z = zug; zug = null;
    if (!z.neu) return;
    // Layer, deren Zielfläche genau auf dem Screen lag, wandern mit
    const pl = pixelLage(screenById(z.id));
    for (const l of P.layer.filter(l => l.prozessor === g.id && l.zx === z.x && l.zy === z.y && l.zb === pl.b && l.zh === pl.h)) { l.zx = z.neu.x; l.zy = z.neu.y; }
    pixelraum(g.id)[z.id] = z.neu; aenderung();
  });
}

function mappingListe() {
  const g = mappingProzessor(); if (!g) return "";
  const layer = (P.layer || []).filter(l => l.prozessor === g.id);
  const outs = (P.outputs || []).filter(o => o.prozessor === g.id);
  const max = prozessorLed(g).layer;
  return `<div class="kopf"><b>Layer ${esc(g.name)}</b><span class="leise klein">${layer.length} / ${fmt(max)} Layer belegt</span></div>
    <table class="tabelle-edit"><tr><th>Layer</th><th>Output</th><th>Ausschnitt X / Y</th><th>Größe</th><th>Ziel X / Y</th><th>Zielgröße</th><th>Modus</th><th></th></tr>
    ${layer.map((l, i) => `<tr data-layer="${l.id}"><td><span class="punkt" style="background:${wegFarbe(i)}"></span>${i + 1}</td>
      <td><select data-l-feld="output">${outs.map(o => `<option value="${o.id}"${l.output === o.id ? " selected" : ""}>${esc(o.name)}</option>`).join("")}</select></td>
      <td><input class="anzahl" data-l-feld="ax" value="${l.ax}"> <input class="anzahl" data-l-feld="ay" value="${l.ay}"></td>
      <td><input class="anzahl" data-l-feld="b" value="${l.b}"> <input class="anzahl" data-l-feld="h" value="${l.h}"></td>
      <td><input class="anzahl" data-l-feld="zx" value="${l.zx}"> <input class="anzahl" data-l-feld="zy" value="${l.zy}"></td>
      <td>${l.modus === "1:1" ? `${l.b} × ${l.h}` : `<input class="anzahl" data-l-feld="zb" value="${l.zb}"> <input class="anzahl" data-l-feld="zh" value="${l.zh}">`}</td>
      <td><select data-l-feld="modus"><option value="1:1"${l.modus === "1:1" ? " selected" : ""}>1:1</option><option value="skaliert"${l.modus === "skaliert" ? " selected" : ""}>skaliert</option></select></td>
      <td><button data-m="layer-weg" style="padding:2px 8px">✕</button></td></tr>`).join("") || `<tr><td colspan="8" class="leise">Keine Layer – „Layer vorschlagen“ oder „+ Layer“.</td></tr>`}</table>`;
}

function mappingRechts() {
  const g = mappingProzessor(); if (!g) return "";
  const o = outputById(ui.sel.output);
  const eing = prozessorEingaenge(g);
  return (o ? `<div class="karte"><div class="label">Output</div><table class="werte"><tr><td>Name</td><td>${esc(o.name)}</td></tr><tr><td>Format</td><td>${o.b} × ${o.h} @ ${fmtFlex(o.hz)} Hz</td></tr>
      <tr><td>Anschluss</td><td>${esc(o.anschluss)}</td></tr><tr><td>Verbunden</td><td>${o.prozessor ? esc(geraetById(o.prozessor)?.name) + " · " + esc(o.eingang) : "—"}</td></tr></table>
      <div class="knopfreihe" style="margin-top:8px"><button data-m="output-bearbeiten">Bearbeiten</button><button data-m="output-png">PNG</button><button data-m="output-live">▶ Live</button><button data-m="output-weg" class="gefahr">Löschen</button></div></div>` : "")
    + `<div class="karte"><div class="label">Eingänge ${esc(g.name)}</div><table class="werte">${eing.map(e => {
      const v = (P.outputs || []).filter(x => x.prozessor === g.id && x.eingang === e.name);
      return `<tr><td>${esc(e.name)}</td><td>${v.length ? v.map(x => esc(x.name)).join(", ") : '<span class="leise">frei</span>'}</td></tr>`; }).join("")}</table></div>`;
}

function mappingPruefungen() {
  mappingDaten();
  const liste = [];
  for (const o of P.outputs) {
    if (!o.prozessor) { liste.push({ art: "warn", text: `${o.name}: mit keinem Prozessor-Eingang verbunden.` }); continue; }
    const g = geraetById(o.prozessor); if (!g) continue;
    const e = prozessorEingaenge(g).find(x => x.name === o.eingang);
    if (!e) { liste.push({ art: "fehler", text: `${o.name}: Eingang „${o.eingang}“ gibt es an ${g.name} nicht.` }); continue; }
    if ((e.maxB && o.b > e.maxB) || (e.maxH && o.h > e.maxH)) liste.push({ art: "warn", text: `${o.name}: ${o.b} × ${o.h} größer als ${g.name} · ${e.name} (max. ${e.maxB} × ${e.maxH}).` });
    if (e.maxHz && o.hz > e.maxHz) liste.push({ art: "warn", text: `${o.name}: ${fmtFlex(o.hz)} Hz über ${fmtFlex(e.maxHz)} Hz des Eingangs.` });
    if (e.typ && o.anschluss && e.typ !== o.anschluss) liste.push({ art: "warn", text: `${o.name}: ${o.anschluss} an ${e.typ}-Eingang – Konverter nötig.` });
    if (P.outputs.filter(x => x.prozessor === o.prozessor && x.eingang === o.eingang).length > 1) liste.push({ art: "fehler", text: `${g.name} · ${o.eingang}: mehrere Outputs am selben Eingang.` });
  }
  for (const g of P.geraete.filter(x => x.art === "prozessor")) {
    const outs = P.outputs.filter(o => o.prozessor === g.id);
    if (new Set(outs.map(o => o.hz)).size > 1) liste.push({ art: "info", text: `${g.name}: Outputs mit unterschiedlichen Bildraten (${[...new Set(outs.map(o => fmtFlex(o.hz)))].join(" / ")} Hz).` });
    const layer = P.layer.filter(l => l.prozessor === g.id);
    const max = prozessorLed(g).layer;
    if (max && layer.length > max) liste.push({ art: "warn", text: `${g.name}: ${layer.length} Layer, möglich ${max}.`, ziel: "prozessor:" + g.id });
    for (const l of layer) {
      const o = outputById(l.output);
      if (o && (l.ax < 0 || l.ay < 0 || l.ax + l.b > o.b || l.ay + l.h > o.h)) liste.push({ art: "warn", text: `${g.name}: Layer-Ausschnitt liegt außerhalb von ${o.name}.` });
      if (l.modus === "1:1" && (l.b !== l.zb || l.h !== l.zh)) liste.push({ art: "warn", text: `${g.name}: Layer 1:1, aber Ausschnitt ${l.b} × ${l.h} ≠ Fläche ${l.zb} × ${l.zh}.` });
    }
    const bl = pixelraumBloecke(g.id);
    for (const b of bl) {
      const r = { x: b.x, y: b.y, b: b.b, h: b.h };
      if (P.outputs.some(o => o.prozessor === g.id)) {
        // Abdeckung: Schnittflächen aller Layer (Überlappung der Layer selbst wird vernachlässigt)
        const flaeche = layer.reduce((a, l) => a + Math.max(0, Math.min(r.x + r.b, l.zx + l.zb) - Math.max(r.x, l.zx)) * Math.max(0, Math.min(r.y + r.h, l.zy + l.zh) - Math.max(r.y, l.zy)), 0);
        if (!flaeche) liste.push({ art: "warn", text: `${b.s.name}: an ${g.name} ohne Bild (kein Layer).`, ziel: "screen:" + b.s.id });
        else if (flaeche < r.b * r.h) liste.push({ art: "warn", text: `${b.s.name}: nur ${fmt(flaeche / (r.b * r.h) * 100)} % von Layern abgedeckt.`, ziel: "screen:" + b.s.id });
      }
      if (bl.some(x => x !== b && schneidet(r, { x: x.x, y: x.y, b: x.b, h: x.h }))) liste.push({ art: "warn", text: `${g.name}: „${b.s.name}“ überlappt im Pixelraum.`, ziel: "prozessor:" + g.id });
    }
    if (bl.length && !outs.length) liste.push({ art: "info", text: `${g.name}: noch kein Output verbunden.`, ziel: "prozessor:" + g.id });
  }
  return liste;
}

function mappingEreignisse() {
  $("#palette").addEventListener("click", e => {
    if (ui.reiter !== "ausgabe") return;
    const a = e.target.closest("[data-m]"); if (!a) return;
    if (a.dataset.m === "output-neu") outputBearbeiten(null);
    if (a.dataset.m === "output-sel") { ui.sel.output = a.dataset.id; const o = outputById(a.dataset.id); if (o?.prozessor) ui.sel.prozessor = o.prozessor; render(); }
  });
  $("#palette").addEventListener("dblclick", e => { const a = e.target.closest("[data-m='output-sel']"); if (a && ui.reiter === "ausgabe") outputBearbeiten(outputById(a.dataset.id)); });
  $("#werkzeuge").addEventListener("click", e => {
    if (ui.reiter !== "ausgabe") return;
    const a = e.target.closest("[data-m]")?.dataset.m; const g = mappingProzessor();
    if (a === "layer-vorschlag" && g) layerVorschlag(g.id);
    if (a === "layer-neu" && g) {
      const o = (P.outputs || []).find(x => x.prozessor === g.id);
      if (!o) return toast("Zuerst einen Output mit diesem Prozessor verbinden.", "fehler");
      mappingDaten(); P.layer.push({ id: neueId("y"), prozessor: g.id, output: o.id, ax: 0, ay: 0, b: 1920, h: 1080, zx: 0, zy: 0, zb: 1920, zh: 1080, modus: "1:1" }); aenderung();
    }
    if (a === "modus") { ui.modus.ausgabe = e.target.closest("[data-m]").dataset.wert; render(); }
  });
  $("#werkzeuge").addEventListener("change", e => {
    if (ui.reiter !== "ausgabe" || e.target.dataset.mFeld !== "prozessor") return;
    ui.sel.prozessor = e.target.value; render();
  });
  $("#liste").addEventListener("change", e => {
    if (ui.reiter !== "ausgabe") return;
    const tr = e.target.closest("[data-layer]"); const f = e.target.dataset.lFeld; if (!tr || !f) return;
    const l = P.layer.find(x => x.id === tr.dataset.layer); if (!l) return;
    if (f === "output" || f === "modus") l[f] = e.target.value;
    else { const z = leseZahl(e.target.value); if (!Number.isFinite(z)) return toast("Bitte eine ganze Zahl (px).", "fehler"); l[f] = Math.round(z); }
    if (l.modus === "1:1") { l.zb = l.b; l.zh = l.h; }
    aenderung();
  });
  $("#liste").addEventListener("click", e => {
    if (ui.reiter !== "ausgabe") return;
    const tr = e.target.closest("[data-layer]");
    if (tr && e.target.closest("[data-m='layer-weg']")) { P.layer = P.layer.filter(l => l.id !== tr.dataset.layer); aenderung(); }
  });
  $("#rechts").addEventListener("click", e => {
    if (ui.reiter !== "ausgabe") return;
    const a = e.target.closest("[data-m]")?.dataset.m; const o = outputById(ui.sel.output); if (!a || !o) return;
    if (a === "output-bearbeiten") outputBearbeiten(o);
    if (a === "output-weg") { if (!confirm(`Output „${o.name}“ löschen?`)) return; P.outputs = P.outputs.filter(x => x !== o); P.layer = P.layer.filter(l => l.output !== o.id); ui.sel.output = null; aenderung(); }
    if (a === "output-png") outputCanvas(o).toBlob(b => herunterladen(b, dateiname(`${P.daten.titel}_${o.name}_testbild`, ".png"), "image/png"));
    if (a === "output-live") liveCanvasOeffnen(o.name, outputCanvas(o));
  });
}
