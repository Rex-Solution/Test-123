/* Kurven und Winkel: Knick an senkrechten Fugen zwischen Modulspalten.
   s.winkel = { [x der Fuge in mm]: Grad }  + = konkav (Bogen um das Publikum), − = konvex (nach außen).
   Die Vorderansicht bleibt die Abwicklung (Pixel, Strom, Signal unverändert); dazu kommt eine Draufsicht. */

const rad = g => g * Math.PI / 180;

/* Alle senkrechten Fugen eines Screens; durchgehend = kein Modul überspannt sie */
function screenFugen(s) {
  if (!s.module.length) return [];
  const g = grenzen(s.module);
  const rects = s.module.map(modRect);
  const xs = [...new Set(rects.map(r => Math.round(r.x)).filter(x => x > g.x))].sort((a, b) => a - b);
  return xs.map(x => ({ x, grad: Number(s.winkel?.[x]) || 0, durchgehend: !rects.some(r => r.x < x - 0.5 && r.x + r.b > x + 0.5) }));
}

/* Draufsicht und Kennzahlen */
function kurveDaten(s) {
  const fugen = screenFugen(s);
  const erg = { fugen, knicke: fugen.filter(f => f.grad && f.durchgehend), punkte: [], sehneMm: 0, stichMm: 0, gesamtGrad: 0, radiusMm: null, gebogen: false };
  if (!s.module.length) return erg;
  const g = grenzen(s.module);
  const kanten = [g.x, ...erg.knicke.map(f => f.x), g.x + g.b];
  let x = 0, y = 0, h = 0;
  const pts = [[0, 0]];
  for (let i = 1; i < kanten.length; i++) {
    const w = kanten[i] - kanten[i - 1];
    x += w * Math.cos(h); y += w * Math.sin(h);
    pts.push([x, y]);
    if (i < kanten.length - 1) h += rad(erg.knicke[i - 1].grad);   // + dreht zum Publikum (unten)
  }
  // Sehne waagerecht legen, oben bündig
  const [ex, ey] = pts[pts.length - 1];
  const dreh = -Math.atan2(ey, ex), c = Math.cos(dreh), si = Math.sin(dreh);
  let rot = pts.map(([px, py]) => [px * c - py * si, px * si + py * c]);
  const minY = Math.min(...rot.map(p => p[1]));
  rot = rot.map(([px, py]) => [px, py - minY]);
  erg.punkte = rot;
  erg.sehneMm = Math.hypot(ex, ey);
  erg.stichMm = Math.max(...rot.map(p => p[1]));
  erg.gesamtGrad = erg.knicke.reduce((a, f) => a + f.grad, 0);
  erg.gebogen = erg.knicke.length > 0;
  // Radius nur bei gleichmäßigem Bogen (gleiche Winkel, gleiche Segmentbreiten)
  const breiten = kanten.slice(1).map((k, i) => k - kanten[i]);
  if (erg.knicke.length && new Set(erg.knicke.map(f => f.grad)).size === 1 && new Set(breiten.map(b => Math.round(b))).size === 1)
    erg.radiusMm = breiten[0] / (2 * Math.sin(rad(Math.abs(erg.knicke[0].grad)) / 2));
  return erg;
}

/* Winkel aus Radius: Sehne w zwischen zwei Fugen → Knickwinkel */
function winkelAusRadius(w, radiusMm) { return w >= 2 * radiusMm ? null : 2 * Math.asin(w / (2 * radiusMm)) * 180 / Math.PI; }

function winkelSetzen(s, x, grad) {
  s.winkel = s.winkel || {};
  const g = Math.round(grad * 10) / 10;
  if (g) s.winkel[x] = g; else delete s.winkel[x];
}

/* Dialog für eine Fuge (Klick auf die Marke unter der Wand) */
async function fugeBearbeiten(s, x) {
  const alt = Number(s.winkel?.[x]) || 0;
  const erg = await formularDialog(`Winkel an der Fuge bei ${fmt(x - grenzen(s.module).x)} mm`, [
    { name: "grad", label: "Winkel (°), 0 = gerade", art: "zahl", wert: fmtFlex(Math.abs(alt)) },
    { name: "richtung", label: "Richtung", art: "auswahl", wert: alt < 0 ? "konvex" : "konkav", optionen: [["konkav", "konkav – Bogen um das Publikum"], ["konvex", "konvex – nach außen"]] },
  ]);
  if (!erg) return;
  if (!(erg.grad >= 0 && erg.grad <= 90)) return toast("Winkel: 0 bis 90°.", "fehler");
  winkelSetzen(s, x, erg.richtung === "konvex" ? -erg.grad : erg.grad);
  aenderung();
}

/* Dialog für mehrere Fugen: gleicher Winkel oder Radius */
async function winkelDialog(s) {
  const fugen = screenFugen(s).filter(f => f.durchgehend);
  if (!fugen.length) return toast("Der Screen hat keine durchgehende senkrechte Fuge.", "fehler");
  const auswahl = s.module.filter(m => ui.auswahl.has(m.id)).map(modRect);
  const imBereich = f => auswahl.length < 2 || (f.x > Math.min(...auswahl.map(r => r.x)) && f.x < Math.max(...auswahl.map(r => r.x + r.b)));
  const erg = await formularDialog("Kurve / Winkel", [
    { name: "hinweis", art: "hinweis", label: auswahl.length >= 2 ? `Gilt für die Fugen innerhalb der Auswahl (${fugen.filter(imBereich).length}).` : `Gilt für alle ${fugen.length} Fugen. Für einen Teilbereich vorher Module auswählen.` },
    { name: "modus", label: "Angabe", art: "auswahl", wert: "winkel", optionen: [["winkel", "Winkel je Fuge (°)"], ["radius", "Radius (m)"], ["gerade", "gerade machen"]] },
    { name: "wert", label: "Wert", art: "zahl", wert: "" },
    { name: "richtung", label: "Richtung", art: "auswahl", wert: "konkav", optionen: [["konkav", "konkav – Bogen um das Publikum"], ["konvex", "konvex – nach außen"]] },
  ], "Übernehmen");
  if (!erg) return;
  const ziel = fugen.filter(imBereich);
  const vz = erg.richtung === "konvex" ? -1 : 1;
  if (erg.modus === "gerade") { for (const f of ziel) winkelSetzen(s, f.x, 0); return aenderung(); }
  if (erg.modus === "winkel") {
    if (!(erg.wert >= 0 && erg.wert <= 90)) return toast("Winkel: 0 bis 90°.", "fehler");
    for (const f of ziel) winkelSetzen(s, f.x, vz * erg.wert);
    return aenderung();
  }
  if (!(erg.wert > 0)) return toast("Radius: Zahl in Metern größer 0.", "fehler");
  // Je Fuge: mittlere Breite der angrenzenden Segmente (exakt bei gleich breiten Spalten)
  const g = grenzen(s.module);
  const kanten = [g.x, ...fugen.map(f => f.x), g.x + g.b];
  for (const f of ziel) {
    const i = kanten.indexOf(f.x);
    const w = ((kanten[i] - kanten[i - 1]) + (kanten[i + 1] - kanten[i])) / 2;
    const grad = winkelAusRadius(w, erg.wert * 1000);
    if (grad == null) return toast(`Radius zu klein für ${fmt(w)} mm breite Spalten.`, "fehler");
    winkelSetzen(s, f.x, vz * grad);
  }
  aenderung();
}

/* ---------- Darstellung ---------- */
/* Marken unter der Abwicklung: alle durchgehenden Fugen (alleFugen) oder nur die Knicke */
function kurveMarkenSvg(s, alleFugen = true) {
  if (!s.module.length) return "";
  const g = grenzen(s.module);
  const mm = Math.max(g.b, g.h, 1000), fs = mm * 0.02, st = Math.max(4, mm / 900);
  let t = `<g class="fugen">`;
  for (const f of screenFugen(s)) {
    if (!f.grad && (!alleFugen || !f.durchgehend)) continue;
    const farbe = !f.durchgehend ? "#d29922" : f.grad ? "#4da3ff" : "#6b6b6b";
    if (f.grad) t += `<line x1="${f.x}" y1="${g.y}" x2="${f.x}" y2="${g.y + g.h}" stroke="${farbe}" stroke-width="${st * 3}" stroke-dasharray="${st * 10} ${st * 6}" pointer-events="none"/>`;
    t += `<g data-fuge="${f.x}" style="cursor:pointer"><rect x="${f.x - fs * 1.6}" y="${g.y + g.h + fs * 0.25}" width="${fs * 3.2}" height="${fs * 1.3}" rx="${fs * 0.3}" fill="#141414" stroke="${farbe}" stroke-width="${st}"/>
      <text x="${f.x}" y="${g.y + g.h + fs * 1.25}" font-size="${fs * 0.9}" fill="${farbe}" text-anchor="middle">${f.grad > 0 ? "+" : ""}${fmtFlex(f.grad)}°</text></g>`;
  }
  return t + "</g>";
}

/* Draufsicht als eigenständiges SVG (Publikum unten) */
function draufsichtSvg(s, hoehePx = 120) {
  const d = kurveDaten(s);
  if (!d.punkte.length) return "";
  const b = d.sehneMm, h = Math.max(d.stichMm, b * 0.04);
  const rand = b * 0.06, fs = b * 0.045, st = Math.max(4, b / 400);
  const tiefe = Math.max(...d.punkte.map(p => p[1]));
  const linie = d.punkte.map(p => p.join(",")).join(" ");
  return `<svg viewBox="${-rand} ${-rand - fs} ${b + 2 * rand} ${h + 2 * rand + fs * 4}" style="width:100%;height:${hoehePx}px;background:#141414;border-radius:6px" preserveAspectRatio="xMidYMid meet">
    <polyline points="${linie}" fill="none" stroke="#e8e8e8" stroke-width="${st * 3}" stroke-linejoin="round"/>
    ${d.punkte.slice(1, -1).map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${st * 2.5}" fill="#4da3ff"/>`).join("")}
    ${d.stichMm > 1 ? `<line x1="0" y1="${tiefe}" x2="${b}" y2="${tiefe}" stroke="#6b6b6b" stroke-width="${st}" stroke-dasharray="${st * 6} ${st * 4}"/>` : ""}
    <text x="${b / 2}" y="${tiefe + fs * 2.2}" font-size="${fs}" fill="#9a9a9a" text-anchor="middle">Sehne ${fmt(d.sehneMm)} mm${d.stichMm > 1 ? ` · Stich ${fmt(d.stichMm)} mm` : ""} · Publikum ↓</text></svg>`;
}

function kurveKarte(s) {
  const d = kurveDaten(s);
  return `<div class="karte"><div class="label">Kurve / Winkel · Draufsicht</div>
    ${d.gebogen ? draufsichtSvg(s) + `<table class="werte" style="margin-top:6px"><tr><td>Knicke</td><td>${d.knicke.length}</td></tr>
      <tr><td>Gesamtwinkel</td><td>${fmtFlex(Math.round(d.gesamtGrad * 10) / 10)}°</td></tr><tr><td>Sehne (Breite gebogen)</td><td>${fmt(d.sehneMm)} mm</td></tr>
      <tr><td>Stich (Tiefe)</td><td>${fmt(d.stichMm)} mm</td></tr>${d.radiusMm ? `<tr><td>Radius</td><td>${fmtFlex(Math.round(d.radiusMm / 10) / 100)} m</td></tr>` : ""}</table>
      <div class="knopfreihe" style="margin-top:8px"><button data-a="winkel">Ändern …</button><button data-a="gerade">Gerade machen</button></div>`
      : `<p class="klein leise">Gerade. Winkel über „∠ Kurve …“ setzen oder eine Fugen-Marke unter der Wand anklicken.</p>`}</div>`;
}

/* ---------- Prüfungen ---------- */
function winkelErlaubt(lib, grad) {
  const led = eintrag(lib)?.attribute?.led || {};
  if (led.mechanik?.kurve === false) return { ok: false, grund: "keine Kurve möglich" };
  const liste = led.mechanik?.winkelGrad;
  if (!Array.isArray(liste) || !liste.length) return { ok: null };
  const mitVorzeichen = liste.some(w => w < 0);
  const treffer = liste.some(w => Math.abs((mitVorzeichen ? grad : Math.abs(grad)) - w) < 0.05);
  return treffer ? { ok: true } : { ok: false, grund: `erlaubt ${liste.map(w => fmtFlex(w) + "°").join(", ")}` };
}

function kurvePruefungen(s) {
  const liste = [];
  const d = kurveDaten(s);
  const z = "screen:" + s.id;
  for (const f of d.fugen.filter(f => f.grad && !f.durchgehend)) liste.push({ art: "warn", text: `${s.name}: Knick bei ${fmt(f.x)} mm, aber ein Modul überspannt die Fuge – Winkel wird ignoriert.`, ziel: z });
  const unbekannt = new Set();
  for (const f of d.knicke) {
    const nachbarn = s.module.filter(m => { const r = modRect(m); return Math.abs(r.x + r.b - f.x) < 0.5 || Math.abs(r.x - f.x) < 0.5; });
    for (const lib of new Set(nachbarn.map(m => m.lib))) {
      const e = winkelErlaubt(lib, f.grad);
      if (e.ok === false) liste.push({ art: "warn", text: `${s.name}: ${fmtFlex(f.grad)}° bei ${fmt(f.x)} mm – ${eintrag(lib)?.name}: ${e.grund}.`, ziel: z });
      if (e.ok === null) unbekannt.add(eintrag(lib)?.name || lib);
    }
  }
  if (unbekannt.size) liste.push({ art: "info", text: `${s.name}: mögliche Winkel für ${[...unbekannt].join(", ")} unbekannt – Library ergänzen.`, ziel: "library:" + s.module.find(m => unbekannt.has(eintrag(m.lib)?.name))?.lib });
  if (d.gebogen && s.bauart === "geflogen") {
    const r = riggingDaten(s);
    const ueber = r.rahmen.filter(x => d.knicke.some(f => f.x > x.x + 0.5 && f.x < x.x + x.b - 0.5));
    if (ueber.length) liste.push({ art: "warn", text: `${s.name}: ${ueber.length} Flugrahmen über einem Knick (Rahmen ${ueber.map(x => x.nr).join(", ")}) – Kurvenrahmen oder Rahmenbreite prüfen.`, ziel: z });
  }
  return liste;
}
