/* Spinne (je Laka), Stagebox und Multicore-Auflösung als Symbol in der Wand.
   Das Symbol lässt sich in der Zeichnung verschieben; Linien führen zu den Kreisanfängen bzw. Strangan-/-enden.
   Kabellängen werden aus dem Abstand entlang der Wand (rechtwinklig, wie an den Rahmen geführt) plus der
   Reserve aus den Hausregeln abgeleitet und auf die nächste Länge des Kabeltyps aufgerundet.
   laka.pos = { x, y }  ·  weg.pos = { screen, x, y }  (mm im Screen; fehlt = Mitte der Ziele) */

function modulMitte(s, id) { const m = s.module.find(x => x.id === id); if (!m) return null; const r = modRect(m); return { x: r.x + r.b / 2, y: r.y + r.h / 2 }; }
function wandAbstandMm(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function benoetigtM(mm) { return mm / 1000 + (P.regeln.kabelReserveM ?? 1); }
/* nächste Länge des Kabeltyps ≥ Bedarf; ohne Längenliste auf 0,5 m aufrunden */
function standardLaenge(lib, m) {
  const l = eintrag(lib)?.attribute?.led?.laengenM;
  if (Array.isArray(l) && l.length) { const passt = [...l].sort((a, b) => a - b).find(x => x >= m - 1e-9); if (passt != null) return passt; }
  return Math.ceil(m * 2) / 2;
}
function mitteVon(punkte, s) {
  if (punkte.length) return { x: Math.round(punkte.reduce((a, p) => a + p.x, 0) / punkte.length / 10) * 10, y: Math.round(punkte.reduce((a, p) => a + p.y, 0) / punkte.length / 10) * 10 };
  const g = grenzen(s.module); return { x: g.x + g.b / 2, y: g.y + g.h / 2 };
}

/* ---------- Spinne ---------- */
function spinneZiele(s, l) {
  return P.kreise.filter(k => k.screen === s.id && lakaFuerKreis(k) === l && k.module.length).map(k => ({ kreis: k, punkt: modulMitte(s, k.module[0]) })).filter(z => z.punkt);
}
function spinnePos(s, l) { return l.pos || mitteVon(spinneZiele(s, l).map(z => z.punkt), s); }
function spinneBedarf(s, l) { const p = spinnePos(s, l); return spinneZiele(s, l).map(z => ({ kreis: z.kreis, m: benoetigtM(wandAbstandMm(p, z.punkt)) })); }

/* ---------- Stagebox / Multicore ---------- */
function wegZiele(s, d) {
  const ziele = [];
  for (const nr of d.ports) {
    const k = P.straenge.find(x => x.prozessor === d.prozessor && x.screen === s.id && (x.port === nr || x.backupPort === nr));
    if (!k || !k.module.length) continue;
    const haupt = k.port === nr;
    ziele.push({ nr, strang: k, haupt, punkt: modulMitte(s, haupt ? k.module[0] : k.module[k.module.length - 1]) });
  }
  return ziele.filter(z => z.punkt);
}
function wegPos(s, d) { return d.pos?.screen === s.id ? d.pos : mitteVon(wegZiele(s, d).map(z => z.punkt), s); }
function wegeAufScreen(s) { return P.geraete.filter(istWeg).filter(d => wegZiele(s, d).length || d.pos?.screen === s.id); }
/* Länge des Kabels von der Stagebox/Auflösung zu einem Port-Ziel (null = nicht bestimmbar) */
function wegKabelLaenge(d, nr) {
  if (Number.isFinite(d.ausgangLaengeM)) return d.ausgangLaengeM;   // feste Länge von Hand
  for (const s of P.screens) {
    const z = wegZiele(s, d).find(x => x.nr === nr);
    if (z) return standardLaenge(d.ausgangKabel, benoetigtM(wandAbstandMm(wegPos(s, d), z.punkt)));
  }
  return null;
}

/* ---------- Zeichnen ---------- */
function symbolSvg(s, art) {
  if (!s.module.length) return "";
  const g = grenzen(s.module);
  const mm = Math.max(g.b, g.h, 1000), r = mm * 0.028, st = Math.max(4, mm / 900), fs = mm * 0.02;
  const teile = [];
  const symbol = (id, p, text, farbe, form) => `<g data-symbol="${id}" style="cursor:move">${form === "kreis"
    ? `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#141414" stroke="${farbe}" stroke-width="${st * 1.6}"/>`
    : `<rect x="${p.x - r * 1.3}" y="${p.y - r * 0.8}" width="${r * 2.6}" height="${r * 1.6}" rx="${r * 0.25}" fill="#141414" stroke="${farbe}" stroke-width="${st * 1.6}"/>`}
    <text x="${p.x}" y="${p.y + fs * 0.35}" font-size="${fs}" fill="#e8e8e8" text-anchor="middle" pointer-events="none">${esc(text)}</text></g>`;
  const linie = (a, b, farbe, gestrichelt) => `<polyline points="${a.x},${a.y} ${b.x},${a.y} ${b.x},${b.y}" fill="none" stroke="${farbe}" stroke-width="${st * 1.6}"${gestrichelt ? ` stroke-dasharray="${st * 6} ${st * 4}"` : ""} opacity=".85" pointer-events="none"/>`;
  if (art === "strom") {
    P.lakas.filter(l => l.screen === s.id).forEach((l, i) => {
      const p = spinnePos(s, l);
      for (const z of spinneZiele(s, l)) teile.push(linie(p, z.punkt, kreisFarbe(z.kreis)));
      teile.push(symbol("laka:" + l.id, p, "Sp" + (i + 1), libFarbe(l.lib) || "#808000", "kreis"));
    });
  } else {
    for (const d of wegeAufScreen(s)) {
      const p = wegPos(s, d);
      for (const z of wegZiele(s, d)) teile.push(linie(p, z.punkt, strangFarbe(z.strang), !z.haupt));
      teile.push(symbol("weg:" + d.id, p, wegKurz(d), d.art === "stagebox" ? "#4da3ff" : "#63e6be", "rechteck"));
    }
  }
  return teile.length ? `<g class="symbole">${teile.join("")}</g>` : "";
}

/* Symbol mit der Maus/dem Finger verschieben (vor Auswahl und Pinsel) */
function symbolZiehen(svg, s) {
  let zug = null;
  svg.addEventListener("pointerdown", e => {
    const el = e.target.closest("[data-symbol]"); if (!el || e.button !== 0) return;
    e.stopImmediatePropagation(); e.preventDefault();
    zug = { el, id: el.dataset.symbol, start: svgPunkt(svg, e), pid: e.pointerId };
    svg.setPointerCapture(e.pointerId);
  }, true);
  svg.addEventListener("pointermove", e => {
    if (!zug || e.pointerId !== zug.pid) return;
    e.stopImmediatePropagation();
    const p = svgPunkt(svg, e);
    zug.dx = p.x - zug.start.x; zug.dy = p.y - zug.start.y;
    zug.el.setAttribute("transform", `translate(${zug.dx} ${zug.dy})`);
  }, true);
  svg.addEventListener("pointerup", e => {
    if (!zug || e.pointerId !== zug.pid) return;
    e.stopImmediatePropagation();
    const z = zug; zug = null;
    if (!z.dx && !z.dy) return;
    const [art, id] = z.id.split(":");
    if (art === "laka") { const l = P.lakas.find(x => x.id === id); const p = spinnePos(s, l); l.pos = { x: Math.round((p.x + z.dx) / 10) * 10, y: Math.round((p.y + z.dy) / 10) * 10 }; }
    else { const d = geraetById(id); const p = wegPos(s, d); d.pos = { screen: s.id, x: Math.round((p.x + z.dx) / 10) * 10, y: Math.round((p.y + z.dy) / 10) * 10 }; }
    aenderung();
  }, true);
}

/* ---------- Prüfungen ---------- */
function symbolPruefungen() {
  const liste = [];
  for (const s of P.screens) for (const l of P.lakas.filter(l => l.screen === s.id)) {
    const spinne = libListe("spinne").find(e => e.attribute.led.steckerEin === eintrag(l.lib)?.attribute?.led?.stecker);
    const bein = spinne?.attribute?.led?.laengeM;
    if (!Number.isFinite(bein)) continue;
    const zuLang = spinneBedarf(s, l).filter(b => b.m > bein + 1e-9);
    if (zuLang.length) liste.push({ art: "warn", text: `${s.name}: Spinne an ${l.ausgang} – ${zuLang.map(b => `${kreisName(b.kreis)} braucht ${fmtFlex(Math.round(b.m * 10) / 10)} m`).join(", ")}, Spinne hat ${fmtFlex(bein)} m. Spinne näher setzen oder Verlängerung.`, ziel: "screen:" + s.id });
  }
  return liste;
}
