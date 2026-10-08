/* Zuweisung zur Wand: Verteiler-Kanäle und Prozessor-Ports werden einem Screen zugewiesen.
   Die Liste unten im Reiter zeigt alle zugewiesenen (auch leere); ein Klick wählt sie als Pinsel-Ziel.
   screen.zuweisung = { strom: ["<verteilerId>|<kanal>", …], signal: ["<prozessorId>|<port>", …] }  (von Hand)
   Zusätzlich gelten als zugewiesen: Kanäle mit Kreisen des Screens, Kanäle eines Ausgangs, dessen Laka zum
   Screen geht, und Ports mit Strängen (Haupt und Backup) des Screens. */

function zuweisung(s) { s.zuweisung = { strom: [], signal: [], ...(s.zuweisung || {}) }; return s.zuweisung; }
const zielText = (id, nr) => `${id}|${nr}`;

/* ---------- Strom ---------- */
function kanalGeraet(vId, nr) { return P.geraete.find(g => g.strom?.verteiler === vId && g.strom.kanal === nr) || null; }
function kanalScreen(vId, nr) {
  const k = P.kreise.find(x => x.verteiler === vId && x.kanal === nr);
  if (k) return k.screen;
  const v = geraetById(vId); const ausgang = v && kanalVon(v, nr)?.ausgang;
  const l = ausgang && P.lakas.find(x => x.verteiler === vId && x.ausgang === ausgang && x.screen);
  if (l) return l.screen;
  return P.screens.find(s => zuweisung(s).strom.includes(zielText(vId, nr)))?.id || null;
}
function zugewieseneKanaele(s) {
  const z = new Set(zuweisung(s).strom);
  for (const k of P.kreise.filter(k => k.screen === s.id)) z.add(zielText(k.verteiler, k.kanal));
  for (const l of P.lakas.filter(l => l.screen === s.id)) {
    const v = geraetById(l.verteiler);
    for (const a of (v ? verteilerLed(v).ausgaenge || [] : []).filter(a => a.name === l.ausgang)) for (const nr of a.kanaele) z.add(zielText(v.id, nr));
  }
  const vIdx = id => P.geraete.findIndex(g => g.id === id);
  return [...z].map(t => { const [vId, n] = t.split("|"); return { v: geraetById(vId), nr: Number(n), ziel: t }; })
    .filter(x => x.v && kanalVon(x.v, x.nr))
    .map(x => ({ ...x, kreis: P.kreise.find(k => k.verteiler === x.v.id && k.kanal === x.nr) || null, geraet: kanalGeraet(x.v.id, x.nr) }))
    .sort((a, b) => vIdx(a.v.id) - vIdx(b.v.id) || a.nr - b.nr);
}
function kanalZuweisen(s, vId, nr) {
  const z = zuweisung(s); const t = zielText(vId, nr);
  const hier = z.strom.includes(t);
  if (hier) { z.strom = z.strom.filter(x => x !== t); return aenderung(); }
  const anderer = kanalScreen(vId, nr);
  if (anderer === s.id) return toast(`Kanal ${nr} gehört schon zu „${s.name}“ (über Kreis oder Laka).`, "info");
  if (anderer) return toast(`Kanal ${nr} ist „${screenById(anderer)?.name}“ zugewiesen.`, "fehler");
  if (kanalGeraet(vId, nr)) return toast(`Kanal ${nr} versorgt schon ${kanalGeraet(vId, nr).name}.`, "fehler");
  z.strom.push(t);
  aenderung();
}
function ausgangZuweisen(s, v, ausgangName) {
  const a = (verteilerLed(v).ausgaenge || []).find(x => x.name === ausgangName); if (!a) return;
  const fremd = a.kanaele.map(nr => kanalScreen(v.id, nr)).find(id => id && id !== s.id);
  if (fremd) return toast(`${ausgangName} versorgt schon „${screenById(fremd)?.name}“.`, "fehler");
  sichereLaka(v, ausgangName, s.id);
  const z = zuweisung(s);
  for (const nr of a.kanaele) if (!kanalGeraet(v.id, nr) && !z.strom.includes(zielText(v.id, nr))) z.strom.push(zielText(v.id, nr));
  aenderung();
}
/* Kanal-Raster in der Verteiler-Karte: Klick weist dem aktuellen Screen zu bzw. hebt auf */
function kanalRasterHtml(v, s) {
  if (!s) return "";
  return `<div class="label">Kanäle für „${esc(s.name)}“ · Klick: zuweisen</div>` + (verteilerLed(v).ausgaenge || []).map(a => `<div class="klein" style="display:flex;justify-content:space-between;align-items:center;margin-top:4px"><span>${esc(a.name)}</span><button data-zuweisen-ausgang="${esc(a.name)}" style="padding:0 8px">ganzer Ausgang</button></div>
    <div class="kanalgitter">${a.kanaele.map(nr => {
      const scr = kanalScreen(v.id, nr), dev = kanalGeraet(v.id, nr), k = P.kreise.find(x => x.verteiler === v.id && x.kanal === nr);
      if (dev) return `<div class="kanal" title="${esc(dev.name)}" style="opacity:.6"><b>${nr}</b><br>${esc(dev.name).slice(0, 8)}</div>`;
      if (scr && scr !== s.id) return `<div class="kanal" title="${esc(screenById(scr)?.name)}" style="opacity:.45"><b>${nr}</b><br>${esc(screenById(scr)?.name || "").slice(0, 8)}</div>`;
      if (scr === s.id) return `<button class="kanal zugewiesen" data-zuweisen="${zielText(v.id, nr)}" style="border-color:${k ? kreisFarbe(k) : "var(--akzent)"}"><b>${nr}</b><br>${k ? kreisName(k) : "frei"}</button>`;
      return `<button class="kanal frei" data-zuweisen="${zielText(v.id, nr)}"><b>${nr}</b><br>${kanalPhase(v, nr).phase}</button>`;
    }).join("")}</div>`).join("");
}

/* ---------- Signal ---------- */
function portStrang(gId, nr) { return strangeAnPort(gId, nr)?.strang || null; }
function portScreen(gId, nr) {
  const k = portStrang(gId, nr);
  if (k) return k.screen;
  return P.screens.find(s => zuweisung(s).signal.includes(zielText(gId, nr)))?.id || null;
}
function zugewiesenePorts(s) {
  const z = new Set(zuweisung(s).signal);
  for (const k of P.straenge.filter(k => k.screen === s.id)) { z.add(zielText(k.prozessor, k.port)); if (Number.isFinite(k.backupPort)) z.add(zielText(backupGeraetId(k), k.backupPort)); }
  const gIdx = id => P.geraete.findIndex(g => g.id === id);
  return [...z].map(t => { const [gId, n] = t.split("|"); return { g: geraetById(gId), nr: Number(n), ziel: t }; })
    .filter(x => x.g && prozessorPorts(x.g).some(p => p.nr === x.nr))
    .map(x => { const an = strangeAnPort(x.g.id, x.nr); return { ...x, strang: an?.strang || null, rolle: an ? an.rolle : "frei" }; })
    .sort((a, b) => gIdx(a.g.id) - gIdx(b.g.id) || a.nr - b.nr);
}
function portZuweisen(s, gId, nr) {
  const z = zuweisung(s); const t = zielText(gId, nr);
  if (z.signal.includes(t)) { z.signal = z.signal.filter(x => x !== t); return aenderung(); }
  const anderer = portScreen(gId, nr);
  if (anderer === s.id) return toast(`Port ${nr} gehört schon zu „${s.name}“ (Strang).`, "info");
  if (anderer) return toast(`Port ${nr} ist „${screenById(anderer)?.name}“ zugewiesen.`, "fehler");
  z.signal.push(t);
  aenderung();
}
function portRasterHtml(g, s) {
  if (!s) return "";
  return `<div class="label">Ports für „${esc(s.name)}“ · Klick: zuweisen</div><div class="portgitter">${prozessorPorts(g).map(p => {
    const scr = portScreen(g.id, p.nr), an = strangeAnPort(g.id, p.nr), k = an?.strang;
    if (scr && scr !== s.id) return `<div class="port" title="${esc(screenById(scr)?.name)}" style="opacity:.45"><b>${p.nr}</b><br>${esc(screenById(scr)?.name || "").slice(0, 8)}</div>`;
    if (scr === s.id) return `<button class="port zugewiesen" data-zuweisen="${zielText(g.id, p.nr)}" style="border-color:${k ? strangFarbe(k) : "var(--akzent)"}${an?.rolle === "backup" ? ";border-style:dashed" : ""}"><b>${p.nr}</b><br>${k ? (an.rolle === "haupt" ? strangName(k) : "B·" + strangName(k)) : "frei"}</button>`;
    return `<button class="port frei" data-zuweisen="${zielText(g.id, p.nr)}"><b>${p.nr}</b><br>—</button>`;
  }).join("")}</div>`;
}

/* Freie zugewiesene Ziele (für Pinsel ohne Auswahl und Vorschläge) */
function freieZugewieseneKanaele(s) { return zugewieseneKanaele(s).filter(x => !x.kreis && !x.geraet); }
function freieZugewiesenePorts(s) { return zugewiesenePorts(s).filter(x => x.rolle === "frei"); }
