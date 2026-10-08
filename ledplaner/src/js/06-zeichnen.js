/* Zeichnen eines Screens als SVG (1 Einheit = 1 mm, Linienstil auf dunklem Grund)
   und gemeinsame Ansichtssteuerung (Zoom, Verschieben) für Aufbau, Strom und Signal. */

const TYPFARBEN = ["rgba(77,163,255,.10)", "rgba(99,230,190,.12)", "rgba(255,212,59,.10)", "rgba(229,153,247,.12)", "rgba(255,192,120,.12)"];

/* opt: { auswahl:Set, hinten, fuellung(m), wege:[{ farbe, module:[ids], start, ende }], fehlerIds:Set, druck, oben:"", zusatz:"", masseTiefer } */
function screenSvgInhalt(screen, opt = {}) {
  const g = grenzen(screen.module);
  const namen = modulNamen(screen);
  const typIndex = [...new Set(screen.module.map(m => m.lib))];
  const lx = (x, b) => opt.hinten ? g.x + g.x + g.b - x - b : x;   // Rückansicht: horizontal gespiegelt
  const mm = Math.max(g.b, g.h, 1000);
  const strich = Math.max(4, mm / 900);
  const teile = [];
  // Module
  for (const m of screen.module) {
    const r = modRect(m);
    const x = lx(r.x, r.b);
    const fuell = opt.fuellung ? opt.fuellung(m) : TYPFARBEN[typIndex.indexOf(m.lib) % TYPFARBEN.length];
    const sel = opt.auswahl?.has(m.id);
    const fehler = opt.fehlerIds?.has(m.id);
    const fs = Math.min(r.b, r.h) * 0.14;
    teile.push(`<g class="modul${sel ? " sel" : ""}${fehler ? " fehler" : ""}" data-mod="${m.id}">
      <rect x="${x}" y="${r.y}" width="${r.b}" height="${r.h}" fill="${fuell || "transparent"}"/>
      <rect class="modul-rahmen" fill="none" stroke="#bdbdbd" x="${x + strich}" y="${r.y + strich}" width="${r.b - 2 * strich}" height="${r.h - 2 * strich}" rx="${strich * 1.5}" stroke-width="${sel ? strich * 2.2 : strich}"/>
      <text x="${x + fs * 0.6}" y="${r.y + fs * 1.3}" font-size="${fs}" fill="#9a9a9a">${esc(namen.get(m.id))}</text></g>`);
  }
  // Wege (Stromkreise, Datenstränge)
  for (const w of opt.wege || []) teile.push(wegSvg(screen, w, lx, mm));
  // Maße
  if (screen.module.length && opt.masse !== false) {
    const a = mm * 0.05, fs = mm * 0.028, st = strich * 0.8;
    const y = g.y + g.h + a + (opt.masseTiefer ? mm * 0.035 : 0), x = g.x + g.b + a;   // masseTiefer: Platz für Fugen-Marken
    teile.push(`<g stroke="#9a9a9a" stroke-width="${st}" fill="none">
      <line x1="${g.x}" y1="${y}" x2="${g.x + g.b}" y2="${y}"/><line x1="${g.x}" y1="${y - a / 3}" x2="${g.x}" y2="${y + a / 3}"/><line x1="${g.x + g.b}" y1="${y - a / 3}" x2="${g.x + g.b}" y2="${y + a / 3}"/>
      <line x1="${x}" y1="${g.y}" x2="${x}" y2="${g.y + g.h}"/><line x1="${x - a / 3}" y1="${g.y}" x2="${x + a / 3}" y2="${g.y}"/><line x1="${x - a / 3}" y1="${g.y + g.h}" x2="${x + a / 3}" y2="${g.y + g.h}"/></g>
      <text x="${g.x + g.b / 2}" y="${y - a / 4}" font-size="${fs}" fill="#9a9a9a" text-anchor="middle">${fmt(g.b)} mm</text>
      <text x="${x + a / 4}" y="${g.y + g.h / 2}" font-size="${fs}" fill="#9a9a9a" text-anchor="middle" transform="rotate(90 ${x + a / 4} ${g.y + g.h / 2})">${fmt(g.h)} mm</text>`);
  }
  if (opt.zusatz) teile.push(opt.zusatz);
  if (opt.oben) teile.push(`<text x="${g.x}" y="${g.y - mm * (opt.zusatz ? 0.22 : 0.03)}" font-size="${mm * 0.028}" fill="#9a9a9a">${esc(opt.oben)}</text>`);
  return teile.join("");
}

function wegSvg(screen, w, lx, mm) {
  const map = new Map(screen.module.map(m => [m.id, m]));
  const pts = w.module.map(id => map.get(id)).filter(Boolean).map(m => { const r = modRect(m); return [lx(r.x, r.b) + r.b / 2, r.y + r.h / 2]; });
  if (!pts.length) return "";
  const b = Math.max(10, mm / 220);
  const linie = pts.map(p => p.join(",")).join(" ");
  let s = `<g class="weg" pointer-events="none">
    <polyline points="${linie}" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="${b * 1.8}" stroke-linejoin="round"/>
    <polyline points="${linie}" fill="none" stroke="${w.farbe}" stroke-width="${b}" stroke-linejoin="round"/>`;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    const a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    s += `<path d="M ${b * 1.8} 0 L ${-b * 1.4} ${-b * 1.5} L ${-b * 1.4} ${b * 1.5} Z" fill="${w.farbe}" transform="translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) rotate(${a})"/>`;
  }
  const r = b * 4.5;
  const [sx, sy] = pts[0];
  s += `<circle cx="${sx}" cy="${sy}" r="${r}" fill="${w.farbe}" stroke="#141414" stroke-width="${b * 0.6}"/>
    <text x="${sx}" y="${sy + r * 0.36}" font-size="${r * 0.95}" font-weight="700" text-anchor="middle" fill="#000">${esc(w.start)}</text>`;
  if (w.ende) {
    const [ex, ey] = pts[pts.length - 1];
    s += `<rect x="${ex - r * 1.05}" y="${ey - r * 0.9}" width="${r * 2.1}" height="${r * 1.8}" rx="${r * 0.35}" fill="#141414" stroke="${w.farbe}" stroke-width="${b * 0.8}"/>
      <text x="${ex}" y="${ey + r * 0.36}" font-size="${r * 0.95}" font-weight="700" text-anchor="middle" fill="${w.farbe}">${esc(w.ende)}</text>`;
  }
  return s + "</g>";
}

/* ---------- Ansicht (viewBox) je Screen ---------- */
function einpassAnsicht(screen) {
  const g = grenzen(screen.module);
  if (!screen.module.length) return { x: -1000, y: -1000, b: 8000, h: 5000 };
  const mm = Math.max(g.b, g.h, 1000);
  const rand = mm * 0.12 + 300, oben = rand + mm * 0.18; // oben Platz für Rigging und Titel
  return { x: g.x - rand, y: g.y - oben, b: g.b + 2 * rand, h: g.h + rand + oben };
}
function ansicht(screen) {
  if (!ui.ansicht.has(screen.id)) ui.ansicht.set(screen.id, einpassAnsicht(screen));
  return ui.ansicht.get(screen.id);
}
const vbText = v => `${v.x} ${v.y} ${v.b} ${v.h}`;

/* SVG-Koordinaten (mm) aus Mausposition */
function svgPunkt(svg, e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
/* mm je Bildschirmpixel (für Toleranzen) */
function mmJePixel(svg) {
  const m = svg.getScreenCTM();
  return m ? 1 / m.a : 1;
}

/* Zoom (Mausrad) und Verschieben (Leertaste/mittlere Taste/Hand) für eine Screen-Zeichnung */
function ansichtSteuerung(el, svg, screen, { leerKlick } = {}) {
  const v = ansicht(screen);
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const p = svgPunkt(svg, e);
    const f = e.deltaY < 0 ? 1 / 1.15 : 1.15;
    v.x = p.x - (p.x - v.x) * f; v.y = p.y - (p.y - v.y) * f; v.b *= f; v.h *= f;
    svg.setAttribute("viewBox", vbText(v));
    zoomAnzeige(el, svg);
  }, { passive: false });
  let pan = null;
  svg.addEventListener("pointerdown", e => {
    if (!(e.button === 1 || leertaste.gedrueckt)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    pan = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y, f: mmJePixel(svg) };
    svg.setPointerCapture(e.pointerId);
  }, true);
  svg.addEventListener("pointermove", e => {
    if (!pan) return;
    v.x = pan.vx - (e.clientX - pan.x) * pan.f; v.y = pan.vy - (e.clientY - pan.y) * pan.f;
    svg.setAttribute("viewBox", vbText(v));
  });
  svg.addEventListener("pointerup", () => { pan = null; });
  zoomAnzeige(el, svg);
}
function zoomAnzeige(el, svg) {
  let z = el.querySelector(".zoomanzeige");
  if (!z) { z = document.createElement("div"); z.className = "zoomanzeige"; el.appendChild(z); }
  requestAnimationFrame(() => { const f = mmJePixel(svg); z.textContent = `1 px ≈ ${fmtFlex(f, 1)} mm · Mausrad: Zoom · Leertaste + Ziehen: verschieben`; });
}
const leertaste = { gedrueckt: false };
document.addEventListener("keydown", e => { if (e.key === " " && !e.target.matches("input, textarea, select, button")) { leertaste.gedrueckt = true; $("#zeichnung")?.classList.add("pan"); if (e.target === document.body) e.preventDefault(); } });
document.addEventListener("keyup", e => { if (e.key === " ") { leertaste.gedrueckt = false; $("#zeichnung")?.classList.remove("pan"); } });

function einpassen() {
  const s = aktuellerScreen();
  if (s) { ui.ansicht.set(s.id, einpassAnsicht(s)); render(); }
}

/* Leerer Zustand der Zeichenfläche */
function leerZeichnung(el, text) {
  el.innerHTML = `<div class="leer-hinweis">${text}</div>`;
}
