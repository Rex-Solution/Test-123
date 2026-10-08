/* Rigging (im Reiter Aufbau): Brackets über geflogenen bzw. unter gestellten Screens.
   Module sitzen fest an Bracket-Plätzen: ein Platz = eine Modulbreite (z.B. 50 cm). Ein 50-cm-Bracket hat
   einen Platz, ein 1-m-Bracket zwei (links/rechts). Der Planer legt die Brackets automatisch über die
   belegten Spalten; bei Rest (z.B. ungerade Spaltenzahl mit 1-m-Brackets) wird je Screen gewählt:
   kleineres Bracket ergänzen oder ein großes Bracket nur halb belegen – Seite links oder rechts.
   screen.rigging = { lib, lib2 (Ergänzung), rest: "ergaenzen" | "halb", seite: "rechts" | "links", anzeigen }
   Lasten sind Richtwerte (gleichmäßig auf die Punkte eines Brackets verteilt). */

const RIGGING_ART = { geflogen: ["flugrahmen"], gestellt: ["stacking", "bodenstuetze"] };

function riggingStandard(s) {
  s.rigging = { lib: null, lib2: null, rest: "ergaenzen", seite: "rechts", anzeigen: true, ...(s.rigging || {}) };
  return s.rigging;
}
const bracketPasst = (s, e) => !!e && (RIGGING_ART[s.bauart] || []).includes(e.attribute?.led?.art);
const bracketPlaetze = e => Math.max(1, Math.round(e?.attribute?.led?.breiteModule || 1));

/* Platz unter der Wand für Stacking-Brackets (Fugen-Marken und Maße rücken darunter) */
function untenVersatz(s) {
  if (s.bauart !== "gestellt" || !bracketRaster(s) || s.rigging.anzeigen === false) return 0;
  const g = grenzen(s.module); return Math.max(g.b, g.h, 1000) * 0.075;
}

/* Raster der Bracket-Plätze; null = nicht gebunden (kein passendes Bracket gewählt) */
function bracketRaster(s, libNeu = null) {
  const r = riggingStandard(s);
  if (!bracketPasst(s, eintrag(r.lib))) return null;
  const masse = [...s.module.map(m => modMass(m)), ...(libNeu ? [modMass({ lib: libNeu })] : [])];
  const haeufig = werte => { const n = new Map(); for (const w of werte) n.set(w, (n.get(w) || 0) + 1); return [...n.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]; };
  return { platz: haeufig(masse.map(m => m.b)) || 500, hoehe: Math.min(...masse.map(m => m.h), Infinity) || 500 };
}
/* Position auf das Raster setzen (x auf Bracket-Plätze, y auf das Modulraster) */
function aufRaster(raster, x, y) { return { x: Math.round(x / raster.platz) * raster.platz, y: Math.round(y / raster.hoehe) * raster.hoehe }; }
function imRaster(raster, m) { const r = modRect(m); return Math.abs(r.x / raster.platz - Math.round(r.x / raster.platz)) < 1e-6 && Math.abs(r.y / raster.hoehe - Math.round(r.y / raster.hoehe)) < 1e-6; }

/* Brackets automatisch legen. Jede Spalte hängt mit ihrem obersten Modul an einem Bracket in genau dieser Höhe
   (gestellt: steht mit dem untersten auf einem Stacking-Bracket). Nebeneinanderliegende Spalten mit gleicher
   Ober- bzw. Unterkante bilden eine Gruppe; je Gruppe volle Brackets + Rest. Ragt der leere Teil eines halb
   belegten Brackets in eine Nachbarspalte (versetzte Oberkanten), wird immer das kleine Bracket genommen. */
function bracketBelegung(s) {
  const r = riggingStandard(s);
  const raster = bracketRaster(s);
  if (!raster || !s.module.length) return { brackets: [], raster, hinweise: [] };
  const haupt = eintrag(r.lib), n = bracketPlaetze(haupt);
  const klein = bracketPasst(s, eintrag(r.lib2)) ? eintrag(r.lib2) : null, n2 = klein ? bracketPlaetze(klein) : 0;
  const geflogen = s.bauart === "geflogen";
  // je Platz: Anschlagkante (oberstes Modul bzw. unterste Kante)
  const kante = new Map();
  for (const m of s.module) {
    const q = modRect(m);
    for (let k = Math.floor(q.x / raster.platz + 1e-6); k * raster.platz < q.x + q.b - 1e-6; k++) {
      const y = geflogen ? q.y : q.y + q.h, alt = kante.get(k);
      kante.set(k, alt == null ? y : geflogen ? Math.min(alt, y) : Math.max(alt, y));
    }
  }
  const plaetze = [...kante.keys()].sort((a, b) => a - b);
  const laeufe = [];
  for (const k of plaetze) { const l = laeufe[laeufe.length - 1]; if (l && k === l.b + 1 && Math.abs(kante.get(k) - l.y) < 1) l.b = k; else laeufe.push({ a: k, b: k, y: kante.get(k) }); }
  const brackets = [], hinweise = [];
  for (const { a, b, y } of laeufe) {
    const L = b - a + 1, voll = Math.floor(L / n), rest = L % n;
    const teile = [];
    for (let i = 0; i < voll; i++) teile.push({ e: haupt, n });
    if (rest) {
      // leerer Teil eines halben großen Brackets läge außen neben der Gruppe – dort steht ggf. eine Nachbarspalte
      const leer = r.seite === "links" ? [...Array(n - rest)].map((_, i) => a - 1 - i) : [...Array(n - rest)].map((_, i) => b + 1 + i);
      // versetzte Spalten (Nachbargruppe mit anderer Kante) bekommen immer kleine Brackets
      const stoesst = leer.some(k => kante.has(k)) || kante.has(a - 1) || kante.has(b + 1);
      const kleinGeht = klein && n2 <= rest && rest % n2 === 0;
      if ((r.rest === "ergaenzen" || stoesst) && kleinGeht) for (let i = 0; i < rest / n2; i++) teile.push({ e: klein, n: n2 });
      else {
        if (stoesst) hinweise.push("Versetzte Spalten brauchen ein kleines Bracket (Ergänzungs-Bracket wählen) – großes Bracket ragt in die Nachbarspalte.");
        else if (r.rest === "ergaenzen") hinweise.push("Ergänzungs-Bracket fehlt oder passt nicht – großes Bracket halb belegt.");
        teile.push({ e: haupt, n, halb: true, belegt: rest });
      }
    }
    // Rest an der gewählten Seite
    const geordnet = r.seite === "links" ? [...teile.filter(t => t.e !== haupt || t.halb), ...teile.filter(t => t.e === haupt && !t.halb)] : teile;
    let k = a;
    for (const t of geordnet) {
      const nutz = t.halb ? t.belegt : t.n;
      const start = t.halb && r.seite === "links" ? k - (t.n - nutz) : k;   // leerer Platz außen
      brackets.push({ lib: t.e, x: start * raster.platz, b: t.n * raster.platz, plaetze: t.n, belegt: nutz, halb: !!t.halb, anschlag: y });
      k += nutz;
    }
  }
  brackets.sort((p, q) => p.x - q.x || p.anschlag - q.anschlag).forEach((br, i) => br.nr = i + 1);
  return { brackets, raster, hinweise: [...new Set(hinweise)] };
}

function riggingDaten(s) {
  riggingStandard(s);
  const erg = { rahmen: [], punkte: [], gesamtKg: 0, unbekannt: [], lib: null, spaltenKg: [], hinweise: [], raster: null };
  if (!s.module.length) return erg;
  // Spalten (linke Kante) mit Gewicht
  const spalten = new Map();
  for (const m of s.module) {
    const r = modRect(m); const k = Math.round(r.x);
    const sp = spalten.get(k) || { x: r.x, b: r.b, kg: 0, anzahl: 0, unbekannt: false };
    const kg = eintrag(m.lib)?.attribute?.gewicht;
    if (Number.isFinite(kg)) sp.kg += kg; else sp.unbekannt = true;
    sp.anzahl++; sp.b = Math.max(sp.b, r.b);
    spalten.set(k, sp);
  }
  erg.spaltenKg = [...spalten.values()].sort((a, b) => a.x - b.x);
  if (erg.spaltenKg.some(x => x.unbekannt)) erg.unbekannt.push("Modulgewicht");
  const bel = bracketBelegung(s);
  erg.lib = bel.brackets.length ? eintrag(s.rigging.lib) : null;
  erg.hinweise = bel.hinweise; erg.raster = bel.raster;
  if (!bel.brackets.length) { erg.gesamtKg = erg.spaltenKg.reduce((a, x) => a + x.kg, 0); return erg; }
  for (const br of bel.brackets) {
    const led = br.lib.attribute.led || {};
    const eigen = br.lib.attribute.gewicht;
    if (!Number.isFinite(eigen) && !erg.unbekannt.includes("Bracket-Gewicht")) erg.unbekannt.push("Bracket-Gewicht");
    const unter = erg.spaltenKg.filter(sp => sp.x + sp.b / 2 >= br.x && sp.x + sp.b / 2 < br.x + br.b);
    const kg = unter.reduce((a, sp) => a + sp.kg, 0) + (Number.isFinite(eigen) ? eigen : 0);
    erg.rahmen.push({ ...br, y: br.anschlag, kg, spalten: unter.length, lastMaxKg: led.lastMaxKg ?? null });
    erg.gesamtKg += kg;
    if (s.bauart !== "geflogen") continue;
    const vorlage = Array.isArray(led.punkte) && led.punkte.length ? led.punkte
      : br.plaetze >= 2 ? [{ xMm: br.b * 0.25 }, { xMm: br.b * 0.75 }] : [{ xMm: br.b / 2 }];
    for (const p of vorlage) erg.punkte.push({ rahmen: br.nr, x: br.x + p.xMm, y: br.anschlag, kg: kg / vorlage.length, lastMaxKg: p.lastMaxKg ?? null });
  }
  return erg;
}

/* Lücken: Loch innerhalb einer Spalte (zwischen Modulen). Spalten dürfen unterschiedlich hoch beginnen –
   sie hängen dann an eigenen Brackets in ihrer Höhe. */
function riggingLuecken(s, raster) {
  if (!raster || !s.module.length) return [];
  const spalten = new Map();
  for (const m of s.module) { const r = modRect(m); const k = Math.round(r.x / raster.platz); spalten.set(k, [...(spalten.get(k) || []), r]); }
  const luecken = [];
  for (const [k, rs] of spalten) {
    rs.sort((a, b) => a.y - b.y);
    if (rs.some((r, i) => i && r.y - (rs[i - 1].y + rs[i - 1].h) > 1)) luecken.push({ spalte: k, x: k * raster.platz });
  }
  return luecken;
}

/* Module eines Screens ins Bracket-Raster setzen */
function insRaster(s) {
  const raster = bracketRaster(s); if (!raster) return;
  const neu = s.module.map(m => ({ m, ...aufRaster(raster, m.x, m.y) }));
  const rects = neu.map(({ m, x, y }) => ({ ...modRect(m), x, y }));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (schneidet(rects[i], rects[j])) return toast("Ausrichten nicht möglich – Module würden sich überlappen. Bitte einzeln verschieben.", "fehler");
  for (const { m, x, y } of neu) { m.x = x; m.y = y; }
  aenderung();
  toast("Module sitzen jetzt auf den Bracket-Plätzen.", "ok");
}

/* SVG-Zusatz: Brackets (oben bzw. unten), Punkte, leere Plätze gestrichelt */
function riggingSvg(s) {
  const d = riggingDaten(s);
  if (!d.rahmen.length || !s.rigging.anzeigen) return "";
  const g = grenzen(s.module);
  const mm = Math.max(g.b, g.h, 1000);
  const h = mm * 0.035, st = Math.max(4, mm / 900), fs = mm * 0.022;
  const oben = s.bauart === "geflogen";
  const yBr = r => oben ? r.y - h - st : r.y + st;   // je Bracket an seiner Anschlagkante (versetzte Spalten)
  const yZug = g.y - h - st - mm * 0.09;               // Aufhängehöhe: alle Punkte enden auf derselben Höhe
  let t = `<g class="rigging" pointer-events="none">`;
  for (const r of d.rahmen) {
    const y = yBr(r);
    const ueber = r.lastMaxKg && r.kg > r.lastMaxKg;
    const farbe = ueber ? "#d29922" : "#e8e8e8";
    t += `<rect x="${r.x + st}" y="${y}" width="${r.b - 2 * st}" height="${h}" fill="none" stroke="${farbe}" stroke-width="${st * 1.4}"/>`;
    if (r.halb) {
      const leerX = s.rigging.seite === "links" ? r.x : r.x + r.belegt * (r.b / r.plaetze);
      t += `<rect x="${leerX + st * 3}" y="${y + st * 3}" width="${(r.plaetze - r.belegt) * r.b / r.plaetze - st * 6}" height="${h - st * 6}" fill="none" stroke="#9a9a9a" stroke-width="${st}" stroke-dasharray="${st * 5} ${st * 4}"/>`;
    }
    t += `<text x="${r.x + r.b / 2}" y="${oben ? y - st * 2 : y + h + fs * 1.1}" font-size="${fs}" fill="#e8e8e8" text-anchor="middle">${fmt(r.kg, 1)} kg</text>`;
  }
  if (oben) {
    for (const p of d.punkte) {
      const ueber = p.lastMaxKg && p.kg > p.lastMaxKg;
      const y = yBr(d.rahmen.find(r => r.nr === p.rahmen)), y1 = yZug;
      t += `<line x1="${p.x}" y1="${y}" x2="${p.x}" y2="${y1}" stroke="#9a9a9a" stroke-width="${st}" stroke-dasharray="${st * 6} ${st * 4}"/>
        <circle cx="${p.x}" cy="${y1}" r="${mm * 0.008}" fill="#141414" stroke="${ueber ? "#d29922" : "#e8e8e8"}" stroke-width="${st * 1.2}"/>
        <text x="${p.x}" y="${y1 - mm * 0.016}" font-size="${fs * 0.85}" fill="#9a9a9a" text-anchor="middle">${fmt(p.kg, 1)}</text>`;
    }
    t += `<text x="${g.x}" y="${yZug - mm * 0.06}" font-size="${fs}" fill="#9a9a9a">Aufhängepunkte · Last je Punkt in kg (Richtwert, gleichmäßig verteilt)</text>`;
  }
  return t + "</g>";
}

function riggingKarte(s) {
  const r = riggingStandard(s);
  const d = riggingDaten(s);
  const serien = [...new Set(s.module.map(m => eintrag(m.lib)?.attribute?.led?.serie))];
  const passend = libListe("rigging").filter(e => bracketPasst(s, e));
  const option = (e, wert) => `<option value="${e.id}"${wert === e.id ? " selected" : ""}${eintragNutzbar(e) ? "" : " disabled"}>${esc(e.name)}${eintragNutzbar(e) ? "" : " (Pflicht fehlt)"}${(e.attribute.led.serien || []).some(x => serien.includes(x)) ? "" : " – andere Serie"}</option>`;
  const haupt = eintrag(r.lib), n = bracketPlaetze(haupt);
  const raster = bracketRaster(s);
  const ausserhalb = raster ? s.module.filter(m => !imRaster(raster, m)).length : 0;
  const zaehl = new Map(); for (const x of d.rahmen) zaehl.set(x.lib.name, (zaehl.get(x.lib.name) || 0) + 1);
  const halb = d.rahmen.filter(x => x.halb).length;
  const maxPunkt = Math.max(0, ...d.punkte.map(p => p.kg));
  return `<div class="karte"><div class="label">Rigging · ${s.bauart}</div>
    <label class="feld"><span>${s.bauart === "geflogen" ? "Bracket / Flugrahmen" : "Stacking-Bracket"}</span><select data-rig="lib"><option value="">— keins (Module frei) —</option>${passend.map(e => option(e, r.lib)).join("")}</select></label>
    ${haupt && n >= 2 ? `<div class="zwei"><label class="feld"><span>Rest (z.B. ungerade)</span><select data-rig="rest"><option value="ergaenzen"${r.rest !== "halb" ? " selected" : ""}>kleines Bracket ergänzen</option><option value="halb"${r.rest === "halb" ? " selected" : ""}>großes halb belegt</option></select></label>
      <label class="feld"><span>Seite</span><select data-rig="seite"><option value="rechts"${r.seite !== "links" ? " selected" : ""}>rechts</option><option value="links"${r.seite === "links" ? " selected" : ""}>links</option></select></label></div>
      ${r.rest !== "halb" ? `<label class="feld"><span>Ergänzungs-Bracket</span><select data-rig="lib2"><option value="">— keins —</option>${passend.filter(e => bracketPlaetze(e) < n).map(e => option(e, r.lib2)).join("")}</select></label>` : ""}` : ""}
    <label class="feld check"><input type="checkbox" data-rig="anzeigen" ${r.anzeigen !== false ? "checked" : ""}><span>In der Zeichnung anzeigen</span></label>
    ${raster ? `<p class="klein leise">Module sitzen fest an Bracket-Plätzen (${fmt(raster.platz)} mm). Ziehen und Einfügen rasten nur dort ein.</p>` : ""}
    ${ausserhalb ? `<div class="hinweis warn">${ausserhalb} Module nicht auf Bracket-Plätzen.</div><button data-rig-a="raster" style="margin-bottom:8px">Ins Bracket-Raster setzen</button>` : ""}
    <table class="werte">${[...zaehl.entries()].map(([name, a]) => `<tr><td>${esc(name)}</td><td>${a}${halb && name === haupt?.name ? ` (${halb} halb belegt)` : ""}</td></tr>`).join("")}
      ${s.bauart === "geflogen" && d.punkte.length ? `<tr><td>Aufhängepunkte</td><td>${d.punkte.length}</td></tr><tr><td>Max. Last je Punkt</td><td>${fmt(maxPunkt, 1)} kg</td></tr>` : ""}
      <tr><td>${s.bauart === "geflogen" ? "Gesamtlast" : "Bodenlast gesamt"}</td><td>${fmt(d.gesamtKg, 1)} kg${d.unbekannt.length ? " + ?" : ""}</td></tr>
      ${s.bauart === "gestellt" ? `<tr><td>Max. je Spalte</td><td>${fmt(Math.max(0, ...d.spaltenKg.map(x => x.kg)), 1)} kg</td></tr>` : ""}</table>
    <p class="klein leise">Richtwerte. Ersetzt keine Statik – Freigabe ${P.regeln.riggingFreigabe === "extern" ? "extern" : "intern"} durch fachkundige Person.</p></div>`;
}

function riggingPruefungen() {
  const liste = [];
  for (const s of P.screens.filter(s => s.module.length)) {
    const d = riggingDaten(s); const z = "screen:" + s.id;
    const gewaehlt = eintrag(s.rigging.lib);
    if (gewaehlt && !bracketPasst(s, gewaehlt)) liste.push({ art: "warn", text: `${s.name}: „${gewaehlt.name}“ passt nicht zur Bauart ${s.bauart} – Bracket neu wählen.`, ziel: z });
    else if (!d.lib) liste.push({ art: "info", text: `${s.name}: kein Bracket gewählt – Module frei, Lasten je Punkt nicht berechnet.`, ziel: z });
    if (d.raster) {
      const aus = s.module.filter(m => !imRaster(d.raster, m)).length;
      if (aus) liste.push({ art: "warn", text: `${s.name}: ${aus} Module nicht auf Bracket-Plätzen – „Ins Bracket-Raster setzen“.`, ziel: z });
      const l = riggingLuecken(s, d.raster);
      if (l.length) liste.push({ art: "warn", text: `${s.name}: Lücke in ${l.length} Spalte${l.length === 1 ? "" : "n"} – Module ${s.bauart === "geflogen" ? "hängen nicht durchgehend am Bracket" : "stehen nicht durchgehend auf dem Bracket"}.`, ziel: z });
      for (const h of d.hinweise) liste.push({ art: "warn", text: `${s.name}: ${h}`, ziel: z });
    }
    if (d.unbekannt.length) liste.push({ art: "warn", text: `${s.name}: Rigging-Last unvollständig (${d.unbekannt.join(", ")} fehlt).`, ziel: z });
    for (const r of d.rahmen) if (r.lastMaxKg && r.kg > r.lastMaxKg) liste.push({ art: "warn", text: `${s.name}: Bracket ${r.nr} trägt ${fmt(r.kg, 1)} kg, zulässig ${fmt(r.lastMaxKg)} kg.`, ziel: z });
    for (const p of d.punkte) if (p.lastMaxKg && p.kg > p.lastMaxKg) liste.push({ art: "warn", text: `${s.name}: Punkt an Bracket ${p.rahmen} mit ${fmt(p.kg, 1)} kg über ${fmt(p.lastMaxKg)} kg.`, ziel: z });
    if (d.lib && d.rahmen.some(r => !r.lastMaxKg)) liste.push({ art: "warn", text: `${s.name}: zulässige Last des Brackets unbekannt – nicht geprüft.`, ziel: "library:" + d.lib.id });
  }
  return liste;
}

function riggingEreignisse() {
  $("#rechts").addEventListener("change", e => {
    if (ui.reiter !== "aufbau") return;
    const f = e.target.dataset.rig; if (!f) return;
    const s = aktuellerScreen(); const r = riggingStandard(s);
    if (f === "lib" || f === "lib2") { r[f] = e.target.value || null; if (r[f]) nutzeEintrag(r[f]); }
    if (f === "rest" || f === "seite") r[f] = e.target.value;
    if (f === "anzeigen") r.anzeigen = e.target.checked;
    aenderung();
    if (f === "lib" && r.lib) { const raster = bracketRaster(s); if (raster && s.module.some(m => !imRaster(raster, m))) toast("Einige Module sitzen nicht auf Bracket-Plätzen – rechts „Ins Bracket-Raster setzen“.", "fehler"); }
  });
  $("#rechts").addEventListener("click", e => {
    if (ui.reiter !== "aufbau" || e.target.closest("[data-rig-a]")?.dataset.rigA !== "raster") return;
    insRaster(aktuellerScreen());
  });
}
