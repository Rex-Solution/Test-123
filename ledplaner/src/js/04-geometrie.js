/* Geometrie: Grenzen, Modulnamen, Einrasten, Überlappung, Schlangenlinie, Segmentierung, Pixel. */

const EPS = 0.5; // mm Toleranz

function grenzen(module) {
  if (!module.length) return { x: 0, y: 0, b: 0, h: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const m of module) {
    const r = modRect(m);
    x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.b); y1 = Math.max(y1, r.y + r.h);
  }
  return { x: x0, y: y0, b: x1 - x0, h: y1 - y0 };
}

const schneidet = (a, b) => a.x < b.x + b.b - EPS && b.x < a.x + a.b - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

/* Modulnamen: Spalte als Buchstabe (nach linker Kante), Reihe als Zahl (nach oberer Kante) */
function modulNamen(screen) {
  const xs = [...new Set(screen.module.map(m => Math.round(m.x)))].sort((a, b) => a - b);
  const ys = [...new Set(screen.module.map(m => Math.round(m.y)))].sort((a, b) => a - b);
  const namen = new Map();
  for (const m of screen.module) namen.set(m.id, spaltenBuchstabe(xs.indexOf(Math.round(m.x))) + (ys.indexOf(Math.round(m.y)) + 1));
  return namen;
}

/* Einrasten an Kanten anderer Module (sonst 10-mm-Raster). r = bewegtes Rechteck */
function einrasten(r, andere, toleranz) {
  const kandX = [], kandY = [];
  for (const o of andere) {
    kandX.push(o.x, o.x + o.b, o.x - r.b, o.x + o.b - r.b);
    kandY.push(o.y, o.y + o.h, o.y - r.h, o.y + o.h - r.h);
  }
  const rasten = (v, kand) => {
    let best = Math.round(v / 10) * 10, abst = toleranz;
    for (const k of kand) { const d = Math.abs(v - k); if (d < abst) { abst = d; best = k; } }
    return best;
  };
  return { x: rasten(r.x, kandX), y: rasten(r.y, kandY) };
}

/* Freier Platz? */
function platzFrei(screen, rechtecke, ignoriereIds = new Set()) {
  const andere = screen.module.filter(m => !ignoriereIds.has(m.id)).map(modRect);
  return rechtecke.every(r => !andere.some(o => schneidet(r, o)));
}

/* Module in Linien (Spalten oder Zeilen) gruppieren und als Schlangenlinie ordnen.
   richtung: "spalten" | "zeilen"; start: "ol" | "or" | "ul" | "ur" */
function schlangenReihenfolge(module, richtung = "spalten", start = "ol") {
  if (!module.length) return [];
  const spaltenweise = richtung !== "zeilen";
  const links = start[1] === "l", oben = start[0] === "o";
  const mitte = m => { const r = modRect(m); return { cx: r.x + r.b / 2, cy: r.y + r.h / 2, r }; };
  const daten = module.map(m => ({ m, ...mitte(m) }));
  // Linien bilden: Module, deren Mitte in der Querachse nah beieinander liegt
  const quer = d => spaltenweise ? d.cx : d.cy;
  const laengs = d => spaltenweise ? d.cy : d.cx;
  const groesse = d => spaltenweise ? d.r.b : d.r.h;
  daten.sort((a, b) => quer(a) - quer(b));
  const linien = [];
  for (const d of daten) {
    const l = linien[linien.length - 1];
    if (l && Math.abs(quer(d) - l.q) < Math.min(groesse(d), l.g) / 2) l.d.push(d);
    else linien.push({ q: quer(d), g: groesse(d), d: [d] });
  }
  const vorwaertsQuer = spaltenweise ? links : oben;
  const vorwaertsLaengs = spaltenweise ? oben : links;
  if (!vorwaertsQuer) linien.reverse();
  const erg = [];
  linien.forEach((l, i) => {
    const vor = (i % 2 === 0) === vorwaertsLaengs;
    l.d.sort((a, b) => vor ? laengs(a) - laengs(b) : laengs(b) - laengs(a));
    erg.push(...l.d.map(d => d.m));
  });
  return erg;
}

/* Lasten in möglichst wenige zusammenhängende, ausgewogene Abschnitte teilen.
   Grenzen: kap (Summe je Abschnitt), maxAnzahl (Module je Abschnitt, optional). */
function segmentieren(lasten, kap, maxAnzahl = Infinity, nMin = 1) {
  const L = lasten.length;
  if (!L) return { grenzen: [], ueberlast: false };
  const P0 = [0];
  for (const l of lasten) P0.push(P0[P0.length - 1] + l);
  const summe = P0[L];
  const eps = 1e-9 * Math.max(1, kap);
  const n0 = Math.min(L, Math.max(1, nMin, Math.ceil(summe / kap - 1e-9), Math.ceil(L / maxAnzahl)));
  for (let n = n0; n <= L; n++) {
    const g = [0];
    for (let k = 1; k < n; k++) {
      const ziel = summe * k / n;
      const von = g[k - 1] + 1, bis = L - (n - k);
      let best = von;
      for (let i = von; i <= bis; i++) if (Math.abs(P0[i] - ziel) < Math.abs(P0[best] - ziel)) best = i;
      g.push(best);
    }
    g.push(L);
    let ok = true;
    for (let k = 0; k < n; k++) {
      if (P0[g[k + 1]] - P0[g[k]] > kap + eps || g[k + 1] - g[k] > maxAnzahl) { ok = false; break; }
    }
    if (ok) return { grenzen: g, ueberlast: false };
  }
  return { grenzen: [...Array(L + 1).keys()], ueberlast: true };
}

/* Pixel-Lage der Module (je Modultyp eigene Dichte) relativ zur linken oberen Ecke des Screens */
function pixelLage(screen) {
  const g = grenzen(screen.module);
  const lage = new Map();
  let bMax = 0, hMax = 0;
  for (const m of screen.module) {
    const led = eintrag(m.lib)?.attribute?.led || {};
    const fx = (led.pixelB || 0) / (led.mmB || 1), fy = (led.pixelH || 0) / (led.mmH || 1);
    const r = { x: Math.round((m.x - g.x) * fx), y: Math.round((m.y - g.y) * fy), b: led.pixelB || 0, h: led.pixelH || 0 };
    lage.set(m.id, r);
    bMax = Math.max(bMax, r.x + r.b); hMax = Math.max(hMax, r.y + r.h);
  }
  return { lage, b: bMax, h: hMax };
}

/* Summen eines Screens */
function screenSummen(screen) {
  const g = grenzen(screen.module);
  const s = { m2: 0, kg: 0, wMax: 0, wTyp: 0, px: 0, anzahl: screen.module.length, typen: new Map(), bM: g.b / 1000, hM: g.h / 1000, unbekannt: new Set() };
  for (const m of screen.module) {
    const e = eintrag(m.lib); const a = e?.attribute || {}; const led = a.led || {};
    const r = modRect(m);
    s.m2 += r.b * r.h / 1e6;
    if (Number.isFinite(a.gewicht)) s.kg += a.gewicht; else s.unbekannt.add("Gewicht");
    if (Number.isFinite(a.stromverbrauch)) s.wMax += a.stromverbrauch; else s.unbekannt.add("Leistung max.");
    if (Number.isFinite(led.wTyp)) s.wTyp += led.wTyp; else s.unbekannt.add("Leistung typ.");
    s.px += (led.pixelB || 0) * (led.pixelH || 0);
    s.typen.set(m.lib, (s.typen.get(m.lib) || 0) + 1);
  }
  return s;
}

/* Spiegeln einer Modulmenge in ihrem eigenen Rahmen */
function spiegeln(module, achse) {
  const g = grenzen(module);
  for (const m of module) {
    const r = modRect(m);
    if (achse === "x") m.x = g.x + (g.x + g.b) - (r.x + r.b);
    else m.y = g.y + (g.y + g.h) - (r.y + r.h);
  }
}
