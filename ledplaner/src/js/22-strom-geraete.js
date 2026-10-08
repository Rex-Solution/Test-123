/* Strom-Geräte an der Wand: Spinnen (je Laka, eigener Library-Typ mit Abgangslänge), Tausch von Ausgängen per
   Drag & Drop, Schieflast-Hinweis in Karten und Stageboxen im Stromplan (mit dem Pinsel versorgen).
   laka.spinne = Library-ID | null (null = automatisch: kürzeste Spinne, deren Abgänge bis zu allen Kreisanfängen reichen) */

/* ---------- Spinne ---------- */
function spinnenFuer(l) {
  const stecker = eintrag(l.lib)?.attribute?.led?.stecker;
  return libListe("spinne").filter(e => e.attribute.led.steckerEin === stecker).sort((a, b) => (a.attribute.led.laengeM ?? 0) - (b.attribute.led.laengeM ?? 0));
}
function spinneLib(l) {
  if (l.spinne && eintrag(l.spinne)) return eintrag(l.spinne);
  const liste = spinnenFuer(l); const s = screenById(l.screen);
  const bedarf = s ? Math.max(0, ...spinneBedarf(s, l).map(b => b.m)) : 0;
  return liste.find(e => (e.attribute.led.laengeM ?? 0) >= bedarf - 1e-9) || liste[liste.length - 1] || null;
}
function spinneName(l) { const e = spinneLib(l); return e ? e.name : "keine passende Spinne"; }

/* ---------- Ausgänge tauschen (Laka mit allen Kreisen auf einen anderen Ausgang) ---------- */
function ausgangVon(v, name) { return (verteilerLed(v).ausgaenge || []).find(a => a.name === name) || null; }
function ausgangTauschen(vA, aName, vB, bName) {
  const A = ausgangVon(vA, aName), B = ausgangVon(vB, bName);
  if (!A || !B || (vA === vB && aName === bName)) return;
  if ((A.stecker || "") !== (B.stecker || "")) return toast(`${aName} (${A.stecker}) und ${bName} (${B.stecker}) haben verschiedene Stecker.`, "fehler");
  const tausch = new Map();
  A.kanaele.forEach((n, i) => tausch.set(zielText(vA.id, n), B.kanaele[i] != null ? zielText(vB.id, B.kanaele[i]) : null));
  B.kanaele.forEach((n, i) => tausch.set(zielText(vB.id, n), A.kanaele[i] != null ? zielText(vA.id, A.kanaele[i]) : null));
  const benutzt = t => P.kreise.some(k => zielText(k.verteiler, k.kanal) === t) || P.geraete.some(g => g.strom && zielText(g.strom.verteiler, g.strom.kanal) === t);
  if ([...tausch].some(([alt, neu]) => neu === null && benutzt(alt))) return toast("Die Ausgänge haben unterschiedlich viele Kanäle – belegte Kanäle passen nicht.", "fehler");
  const umsetzen = (v, nr) => { const neu = tausch.get(zielText(v, nr)); if (!neu) return null; const [nv, nn] = neu.split("|"); return { v: nv, nr: Number(nn) }; };
  for (const k of P.kreise) { const n = umsetzen(k.verteiler, k.kanal); if (n) { k.verteiler = n.v; k.kanal = n.nr; } }
  for (const g of P.geraete) if (g.strom) { const n = umsetzen(g.strom.verteiler, g.strom.kanal); if (n) g.strom = { verteiler: n.v, kanal: n.nr }; }
  for (const s of P.screens) zuweisung(s).strom = zuweisung(s).strom.map(t => tausch.get(t) || t);
  for (const l of P.lakas) {
    if (l.verteiler === vA.id && l.ausgang === aName) { l._neu = { verteiler: vB.id, ausgang: bName }; }
    else if (l.verteiler === vB.id && l.ausgang === bName) { l._neu = { verteiler: vA.id, ausgang: aName }; }
  }
  for (const l of P.lakas) if (l._neu) { Object.assign(l, l._neu); delete l._neu; }
  aenderung();
  toast(`${vA.name} · ${aName} ⇄ ${vB.name} · ${bName} getauscht.`, "ok");
}
/* Drag & Drop der Ausgänge (Verteiler-Karte und Übersicht aller Verteiler) */
function ausgangZiehenEreignisse(el) {
  el.addEventListener("dragstart", e => {
    const a = e.target.closest?.("[data-ausgang]"); if (!a) return;
    e.dataTransfer.setData("text/ausgang", a.dataset.ausgang); e.dataTransfer.effectAllowed = "move";
  });
  el.addEventListener("dragover", e => {
    const a = e.target.closest?.("[data-ausgang]"); if (!a || !e.dataTransfer.types.includes("text/ausgang")) return;
    e.preventDefault(); el.querySelectorAll(".ausgang-ziel").forEach(x => x.classList.remove("ausgang-ziel")); a.classList.add("ausgang-ziel");
  });
  el.addEventListener("dragleave", e => e.target.closest?.("[data-ausgang]")?.classList.remove("ausgang-ziel"));
  el.addEventListener("drop", e => {
    const a = e.target.closest?.("[data-ausgang]"); const quelle = e.dataTransfer.getData("text/ausgang");
    if (!a || !quelle) return;
    e.preventDefault();
    const [vA, nA] = quelle.split("|"), [vB, nB] = a.dataset.ausgang.split("|");
    ausgangTauschen(geraetById(vA), nA, geraetById(vB), nB);
  });
}

/* ---------- Schieflast sichtbar ---------- */
function schieflastHtml(b) {
  const sl = schieflast(P.regeln.planung === "max" ? b.phasen : b.phasenTyp) * 100;
  const zuViel = b.w && sl > P.regeln.schieflast;
  return zuViel ? `<div class="hinweis warn">Schieflast ${fmt(sl)} % – erlaubt ${fmt(P.regeln.schieflast)} %. Kreise auf andere Phasen verteilen.</div>`
    : `<p class="klein leise">Schieflast ${fmt(sl)} % (erlaubt ${fmt(P.regeln.schieflast)} %)</p>`;
}

/* ---------- Stageboxen im Stromplan ---------- */
function geraeteAmKanal(vId, nr) { return P.geraete.filter(g => g.strom?.verteiler === vId && g.strom.kanal === nr); }
function geraeteLast(vId, nr) { return geraeteAmKanal(vId, nr).reduce((a, g) => a + (eintrag(g.lib)?.attribute?.stromverbrauch || 0), 0); }
function stromGeraeteAufScreen(s) { return wegeAufScreen(s).filter(d => d.art === "stagebox"); }
function stagboxStromSvg(s) {
  const g = grenzen(s.module);
  const mm = Math.max(g.b, g.h, 1000), r = mm * 0.028, st = Math.max(4, mm / 900), fs = mm * 0.02;
  return stromGeraeteAufScreen(s).map(d => {
    const p = wegPos(s, d);
    const k = d.strom && P.kreise.find(x => x.verteiler === d.strom.verteiler && x.kanal === d.strom.kanal);
    const farbe = d.strom ? (k ? kreisFarbe(k) : "#e8e8e8") : "#f85149";
    return `<g data-symbol="weg:${d.id}" data-strom-geraet="${d.id}" style="cursor:pointer"><rect x="${p.x - r * 1.3}" y="${p.y - r * 0.8}" width="${r * 2.6}" height="${r * 1.6}" rx="${r * 0.25}" fill="#141414" stroke="${farbe}" stroke-width="${st * 1.6}"${d.strom ? "" : ` stroke-dasharray="${st * 4} ${st * 3}"`}/>
      <text x="${p.x}" y="${p.y + fs * 0.35}" font-size="${fs}" fill="#e8e8e8" text-anchor="middle" pointer-events="none">${esc(wegKurz(d))} ⚡</text>
      <text x="${p.x}" y="${p.y + r * 0.8 + fs * 1.1}" font-size="${fs * 0.8}" fill="${farbe}" text-anchor="middle" pointer-events="none">${d.strom ? esc(`${geraetById(d.strom.verteiler)?.name || ""} K${d.strom.kanal}`) : "ohne Strom"}</text></g>`;
  }).join("");
}
