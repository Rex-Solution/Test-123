/* 3D-Ansicht eines Screens (ohne Bibliotheken): Module als Flächen im Raum, Kurve aus der Draufsicht,
   Unterkante, Flugrahmen mit Aufhängung, Boden-Raster und Person (1,80 m) als Maßstab.
   Koordinaten in mm: X nach rechts, Y nach oben (Boden = 0), Z zum Publikum. Darstellung als SVG (Maler-Verfahren). */

function dreidStandard() { return { yaw: -28, pitch: 18, zoom: 1 }; }

/* Abwicklung (x in mm entlang der Wand) → Punkt in der Draufsicht [X, Z] */
function dreidLage(s) {
  const g = grenzen(s.module);
  const d = kurveDaten(s);
  const kanten = [g.x, ...d.knicke.map(f => f.x), g.x + g.b];
  const pts = d.punkte.length ? d.punkte : [[0, 0], [g.b, 0]];
  const sehne = d.sehneMm || g.b;
  const pos = u => {
    let i = kanten.findIndex((k, j) => j < kanten.length - 1 && u <= kanten[j + 1] + 0.01);
    if (i < 0) i = kanten.length - 2;
    const t = (u - kanten[i]) / ((kanten[i + 1] - kanten[i]) || 1);
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    return [ax + (bx - ax) * t - sehne / 2, az + (bz - az) * t];
  };
  return { g, d, kanten, pos, sehne, uk: (s.ukM ?? 0) * 1000 };
}

/* Szene: Liste von Flächen { pts:[[x,y,z]…], fuell, linie, rueck } und Linien/Punkte */
function dreidSzene(s) {
  const L = dreidLage(s);
  const { g, kanten, pos, uk } = L;
  const flaechen = [], linien = [];
  const hoehe = y => uk + (g.y + g.h - y);
  const typen = [...new Set(s.module.map(m => m.lib))];
  for (const m of s.module) {
    const r = modRect(m);
    const xs = [r.x, ...kanten.filter(k => k > r.x + 0.5 && k < r.x + r.b - 0.5), r.x + r.b];
    for (let i = 0; i + 1 < xs.length; i++) {
      const [x1, z1] = pos(xs[i]), [x2, z2] = pos(xs[i + 1]);
      const yo = hoehe(r.y), yu = hoehe(r.y + r.h);
      flaechen.push({ pts: [[x1, yo, z1], [x2, yo, z2], [x2, yu, z2], [x1, yu, z1]], typ: typen.indexOf(m.lib), id: m.id });
    }
  }
  // Flugrahmen und Aufhängung
  const r = s.bauart === "geflogen" ? riggingDaten(s) : null;
  if (r?.rahmen.length) {
    const oben = uk + g.h;
    for (const ra of r.rahmen) {
      const xs = [ra.x, ...kanten.filter(k => k > ra.x + 0.5 && k < ra.x + ra.b - 0.5), ra.x + ra.b];
      for (let i = 0; i + 1 < xs.length; i++) {
        const [x1, z1] = pos(xs[i]), [x2, z2] = pos(xs[i + 1]);
        flaechen.push({ pts: [[x1, oben + 120, z1], [x2, oben + 120, z2], [x2, oben, z2], [x1, oben, z1]], rahmen: true });
      }
    }
    for (const p of r.punkte) { const [x, z] = pos(p.x); linien.push({ a: [x, oben + 120, z], b: [x, oben + 2500, z], farbe: "#9a9a9a", strich: true }); }
  }
  // Boden-Raster (1 m) und Person
  const breite = Math.ceil((L.sehne / 2 + 3000) / 1000) * 1000;
  const zMax = Math.ceil(((L.d.stichMm || 0) + 6000) / 1000) * 1000;
  for (let x = -breite; x <= breite; x += 1000) linien.push({ a: [x, 0, -2000], b: [x, 0, zMax], farbe: "#2c2c2c" });
  for (let z = -2000; z <= zMax; z += 1000) linien.push({ a: [-breite, 0, z], b: [breite, 0, z], farbe: "#2c2c2c" });
  const person = [-L.sehne / 2 - 900, (L.d.stichMm || 0) + 800];
  return { L, flaechen, linien, person, ziel: [0, (uk + g.h) / 2, (L.d.stichMm || 0) / 2], groesse: Math.max(L.sehne, uk + g.h, 3000) };
}

function dreidSvg(s, b, h, kamera = ui.dreid || dreidStandard()) {
  if (!s.module.length) return "";
  const sz = dreidSzene(s);
  const yaw = rad(kamera.yaw), pitch = rad(kamera.pitch);
  const dist = sz.groesse * 2 / kamera.zoom;
  const F = Math.min(b, h) * 1.25;
  const [tx, ty, tz] = sz.ziel;
  const proj = ([x, y, z]) => {
    x -= tx; y -= ty; z -= tz;
    const x1 = x * Math.cos(yaw) - z * Math.sin(yaw), z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const t = Math.max(dist - z2, dist * 0.05);
    return [b / 2 + F * x1 / t, h / 2 - F * y2 / t, t];
  };
  const teile = [];
  for (const l of sz.linien) {
    const a = proj(l.a), c = proj(l.b);
    teile.push({ t: (a[2] + c[2]) / 2 + (l.farbe === "#2c2c2c" ? 1e9 : 0), svg: `<line x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${l.farbe}" stroke-width="1"${l.strich ? ' stroke-dasharray="4 3"' : ""}/>` });
  }
  for (const f of sz.flaechen) {
    const p = f.pts.map(proj);
    const flaeche = (p[1][0] - p[0][0]) * (p[3][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[3][0] - p[0][0]);
    const rueck = flaeche < 0;   // im Bild gegen den Uhrzeigersinn → Rückseite zeigt zur Kamera
    const fuell = f.rahmen ? "#3a3a3a" : rueck ? "#262626" : ["#1d3a5c", "#1f4a3e", "#4a431d", "#3f2a4d", "#4a3420"][f.typ % 5];
    teile.push({ t: p.reduce((a, q) => a + q[2], 0) / 4, svg: `<polygon points="${p.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" ")}" fill="${fuell}" stroke="${f.rahmen ? "#9a9a9a" : rueck ? "#555" : "#bdbdbd"}" stroke-width="0.8" stroke-linejoin="round"/>` });
  }
  // Person 1,80 m
  const [px, pz] = sz.person;
  const fuss = proj([px, 0, pz]), kopf = proj([px, 1600, pz]), hut = proj([px, 1800, pz]);
  const kr = Math.abs(kopf[1] - hut[1]) / 2;
  teile.push({ t: fuss[2], svg: `<g stroke="#e8e8e8" stroke-width="1.5" fill="none"><line x1="${fuss[0]}" y1="${fuss[1]}" x2="${kopf[0]}" y2="${kopf[1]}"/><circle cx="${(kopf[0] + hut[0]) / 2}" cy="${(kopf[1] + hut[1]) / 2}" r="${kr}"/></g><text x="${fuss[0] + 6}" y="${fuss[1]}" font-size="11" fill="#9a9a9a">1,80 m</text>` });
  teile.sort((a, c) => c.t - a.t);
  return `<svg viewBox="0 0 ${b} ${h}" data-dreid="${s.id}" style="display:block;width:100%;height:auto;background:#141414;border-radius:4px;touch-action:none">${teile.map(x => x.svg).join("")}</svg>`;
}

function dreidZeichnung(el, s) {
  if (!s.module.length) return leerZeichnung(el, "Der Screen hat noch keine Module.");
  ui.dreid = ui.dreid || dreidStandard();
  const L = dreidLage(s);
  el.innerHTML = `<div class="dreid-flaeche" style="position:absolute;inset:0;touch-action:none"></div>
    <div class="zoomanzeige">3D · ${fmtFlex(L.sehne / 1000, 2)} m breit${L.d.gebogen ? " (gebogen)" : ""} · UK ${fmtFlex(L.uk / 1000, 2)} m · ${ui.touch ? "ein Finger: drehen · zwei Finger: zoomen" : "Ziehen: drehen · Mausrad: zoomen"}</div>
    <div class="zoomknoepfe"><button data-zoom="-" title="Verkleinern">−</button><button data-zoom="+" title="Vergrößern">+</button><button data-zoom="fit" title="Ansicht zurücksetzen">⤢</button></div>`;
  const fl = el.querySelector(".dreid-flaeche");
  const zeichne = () => { fl.innerHTML = dreidSvg(s, Math.max(200, fl.clientWidth), Math.max(200, fl.clientHeight)); };
  zeichne();
  let zug = null, plan = 0;
  dreidZeichnung.neu = () => { if (!plan) plan = requestAnimationFrame(() => { plan = 0; if (fl.isConnected) zeichne(); }); };
  fl.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    zug = { x: e.clientX, y: e.clientY, yaw: ui.dreid.yaw, pitch: ui.dreid.pitch, id: e.pointerId };
    fl.setPointerCapture(e.pointerId);
  });
  fl.addEventListener("pointermove", e => {
    if (!zug || e.pointerId !== zug.id) return;
    ui.dreid.yaw = zug.yaw + (e.clientX - zug.x) * 0.4;
    ui.dreid.pitch = Math.max(-5, Math.min(80, zug.pitch + (e.clientY - zug.y) * 0.3));
    dreidZeichnung.neu();
  });
  const los = () => { zug = null; };
  fl.addEventListener("pointerup", los); fl.addEventListener("pointercancel", los);
  fl.addEventListener("wheel", e => { e.preventDefault(); dreidZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
}

function dreidZoom(f) {
  ui.dreid.zoom = Math.max(0.2, Math.min(8, ui.dreid.zoom * f));
  dreidZeichnung.neu?.();
}
