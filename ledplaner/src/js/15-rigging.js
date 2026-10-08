/* Rigging (im Reiter Aufbau): Flugrahmen über geflogenen Screens bzw. Bodenlast bei gestellten,
   Last je Rahmen und Aufhängepunkt (Richtwerte, gleichmäßige Verteilung auf die Punkte eines Rahmens).
   screen.rigging = { lib: <Library-ID Flugrahmen/Stacking> | null, anzeigen: true } */

function riggingDaten(s) {
  s.rigging = { lib: null, anzeigen: true, ...(s.rigging || {}) };
  const erg = { rahmen: [], punkte: [], gesamtKg: 0, unbekannt: [], lib: null, spaltenKg: [] };
  if (!s.module.length) return erg;
  const g = grenzen(s.module);
  // Spalten (linke Kante) mit Gewicht
  const spalten = new Map();
  for (const m of s.module) {
    const k = Math.round(m.x);
    const r = modRect(m);
    const sp = spalten.get(k) || { x: r.x, b: r.b, kg: 0, anzahl: 0, unbekannt: false };
    const kg = eintrag(m.lib)?.attribute?.gewicht;
    if (Number.isFinite(kg)) sp.kg += kg; else sp.unbekannt = true;
    sp.anzahl++; sp.b = Math.max(sp.b, r.b);
    spalten.set(k, sp);
  }
  erg.spaltenKg = [...spalten.values()].sort((a, b) => a.x - b.x);
  if (erg.spaltenKg.some(x => x.unbekannt)) erg.unbekannt.push("Modulgewicht");
  const e = eintrag(s.rigging.lib);
  erg.lib = e;
  if (s.bauart !== "geflogen" || !e) { erg.gesamtKg = erg.spaltenKg.reduce((a, x) => a + x.kg, 0); return erg; }
  const led = e.attribute.led || {};
  const breite = (led.breiteModule || 1) * (erg.spaltenKg[0]?.b || 500);
  const n = Math.max(1, Math.ceil(g.b / breite - 1e-6));
  const rahmenKg = e.attribute.gewicht;
  if (!Number.isFinite(rahmenKg)) erg.unbekannt.push("Rahmengewicht");
  const punkteVorlage = Array.isArray(led.punkte) && led.punkte.length ? led.punkte : [{ xMm: breite * 0.25, lastMaxKg: null }, { xMm: breite * 0.75, lastMaxKg: null }];
  for (let i = 0; i < n; i++) {
    const x0 = g.x + i * breite;
    const unter = erg.spaltenKg.filter(sp => sp.x + sp.b / 2 >= x0 && sp.x + sp.b / 2 < x0 + breite);
    const kg = unter.reduce((a, sp) => a + sp.kg, 0) + (Number.isFinite(rahmenKg) ? rahmenKg : 0);
    const rahmen = { nr: i + 1, x: x0, b: breite, y: g.y, kg, spalten: unter.length, lastMaxKg: led.lastMaxKg ?? null };
    erg.rahmen.push(rahmen);
    for (const p of punkteVorlage) erg.punkte.push({ rahmen: i + 1, x: x0 + p.xMm, kg: kg / punkteVorlage.length, lastMaxKg: p.lastMaxKg ?? null });
    erg.gesamtKg += kg;
  }
  return erg;
}

/* SVG-Zusatz: Rahmen und Punkte über dem Screen */
function riggingSvg(s) {
  const d = riggingDaten(s);
  if (s.bauart !== "geflogen" || !d.rahmen.length || !s.rigging.anzeigen) return "";
  const g = grenzen(s.module);
  const mm = Math.max(g.b, g.h, 1000);
  const h = mm * 0.035, st = Math.max(4, mm / 900), fs = mm * 0.022;
  let t = `<g class="rigging" pointer-events="none">`;
  for (const r of d.rahmen) {
    const ueber = r.lastMaxKg && r.kg > r.lastMaxKg;
    t += `<rect x="${r.x + st}" y="${g.y - h - st}" width="${r.b - 2 * st}" height="${h}" fill="none" stroke="${ueber ? "#d29922" : "#e8e8e8"}" stroke-width="${st * 1.4}"/>
      <text x="${r.x + r.b / 2}" y="${g.y - h - st * 3}" font-size="${fs}" fill="#e8e8e8" text-anchor="middle">${fmt(r.kg, 1)} kg</text>`;
  }
  for (const p of d.punkte) {
    const ueber = p.lastMaxKg && p.kg > p.lastMaxKg;
    const y0 = g.y - h - st, y1 = y0 - mm * 0.09;
    t += `<line x1="${p.x}" y1="${y0}" x2="${p.x}" y2="${y1}" stroke="#9a9a9a" stroke-width="${st}" stroke-dasharray="${st * 6} ${st * 4}"/>
      <circle cx="${p.x}" cy="${y1}" r="${mm * 0.008}" fill="#141414" stroke="${ueber ? "#d29922" : "#e8e8e8"}" stroke-width="${st * 1.2}"/>
      <text x="${p.x}" y="${y1 - mm * 0.016}" font-size="${fs * 0.85}" fill="#9a9a9a" text-anchor="middle">${fmt(p.kg, 1)}</text>`;
  }
  return t + `<text x="${g.x}" y="${g.y - h - mm * 0.15}" font-size="${fs}" fill="#9a9a9a">Aufhängepunkte · Last je Punkt in kg (Richtwert, gleichmäßig verteilt)</text></g>`;
}

function riggingKarte(s) {
  const d = riggingDaten(s);
  const serien = [...new Set(s.module.map(m => eintrag(m.lib)?.attribute?.led?.serie))];
  const passend = libListe("rigging").filter(e => (e.attribute.led.art === (s.bauart === "geflogen" ? "flugrahmen" : "stacking")));
  const maxPunkt = Math.max(0, ...d.punkte.map(p => p.kg));
  return `<div class="karte"><div class="label">Rigging · ${s.bauart}</div>
    <label class="feld"><span>${s.bauart === "geflogen" ? "Flugrahmen" : "Stacking / Bodenstütze"}</span><select data-rig="lib"><option value="">— keiner —</option>
      ${passend.map(e => `<option value="${e.id}"${s.rigging?.lib === e.id ? " selected" : ""}${eintragNutzbar(e) ? "" : " disabled"}>${esc(e.name)}${eintragNutzbar(e) ? "" : " (Pflicht fehlt)"}${(e.attribute.led.serien || []).some(x => serien.includes(x)) ? "" : " – andere Serie"}</option>`).join("")}</select></label>
    <label class="feld check"><input type="checkbox" data-rig="anzeigen" ${s.rigging?.anzeigen !== false ? "checked" : ""}><span>In der Zeichnung anzeigen</span></label>
    <table class="werte">${s.bauart === "geflogen" && d.rahmen.length ? `<tr><td>Flugrahmen</td><td>${d.rahmen.length}</td></tr><tr><td>Aufhängepunkte</td><td>${d.punkte.length}</td></tr>
      <tr><td>Max. Last je Punkt</td><td>${fmt(maxPunkt, 1)} kg</td></tr>` : ""}
      <tr><td>${s.bauart === "geflogen" ? "Gesamtlast" : "Bodenlast gesamt"}</td><td>${fmt(d.gesamtKg, 1)} kg${d.unbekannt.length ? " + ?" : ""}</td></tr>
      ${s.bauart === "gestellt" ? `<tr><td>Max. je Spalte</td><td>${fmt(Math.max(0, ...d.spaltenKg.map(x => x.kg)), 1)} kg</td></tr>` : ""}</table>
    <p class="klein leise">Richtwerte. Ersetzt keine Statik – Freigabe ${P.regeln.riggingFreigabe === "extern" ? "extern" : "intern"} durch fachkundige Person.</p></div>`;
}

function riggingPruefungen() {
  const liste = [];
  for (const s of P.screens.filter(s => s.module.length)) {
    const d = riggingDaten(s);
    if (s.bauart === "geflogen" && !d.lib) liste.push({ art: "info", text: `${s.name}: kein Flugrahmen gewählt – Lasten je Punkt nicht berechnet.`, ziel: "screen:" + s.id });
    if (d.unbekannt.length) liste.push({ art: "warn", text: `${s.name}: Rigging-Last unvollständig (${d.unbekannt.join(", ")} fehlt).`, ziel: "screen:" + s.id });
    for (const r of d.rahmen) if (r.lastMaxKg && r.kg > r.lastMaxKg) liste.push({ art: "warn", text: `${s.name}: Flugrahmen ${r.nr} trägt ${fmt(r.kg, 1)} kg, zulässig ${fmt(r.lastMaxKg)} kg.`, ziel: "screen:" + s.id });
    for (const p of d.punkte) if (p.lastMaxKg && p.kg > p.lastMaxKg) liste.push({ art: "warn", text: `${s.name}: Punkt an Rahmen ${p.rahmen} mit ${fmt(p.kg, 1)} kg über ${fmt(p.lastMaxKg)} kg.`, ziel: "screen:" + s.id });
    if (d.lib && d.rahmen.some(r => !r.lastMaxKg)) liste.push({ art: "warn", text: `${s.name}: zulässige Last des Flugrahmens unbekannt – nicht geprüft.`, ziel: "library:" + d.lib.id });
  }
  return liste;
}

function riggingEreignisse() {
  $("#rechts").addEventListener("change", e => {
    if (ui.reiter !== "aufbau") return;
    const f = e.target.dataset.rig; if (!f) return;
    const s = aktuellerScreen(); riggingDaten(s);
    if (f === "lib") { s.rigging.lib = e.target.value || null; if (s.rigging.lib) nutzeEintrag(s.rigging.lib); }
    if (f === "anzeigen") s.rigging.anzeigen = e.target.checked;
    aenderung();
  });
}
