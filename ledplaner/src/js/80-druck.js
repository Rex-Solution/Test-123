/* Druck: Bericht A4 hoch, Großformat (A3/A4 quer) und Kundenansicht – Druckansicht im neuen Fenster,
   PDF über den Druckdialog des Browsers. Papier weiß, Zeichnungen behalten den dunklen Grund (Styleguide 9). */

async function druckDialog() {
  if (!P.screens.length) return toast("Noch kein Screen zum Drucken.", "fehler");
  const zusatz = P.regeln.druckZusatz;
  const erg = await formularDialog("Drucken / PDF", [
    { name: "art", label: "Was drucken?", art: "auswahl", wert: "bericht", optionen: [
      ["bericht", "Bericht A4 hoch (Deckblatt, Pläne, Listen)"],
      ["gross", `Großformat – alle Pläne ${zusatz === "A4" ? "A4" : "A3"} quer`],
      ["kunde", "Kundenansicht (1 Blatt je Screen)"]] },
    { name: "hinweis", art: "hinweis", label: "Es öffnet sich eine Druckansicht. Dort „Drucken / als PDF speichern“ wählen." },
  ], "Öffnen");
  if (!erg) return;
  const html = erg.art === "bericht" ? berichtHtml() : erg.art === "gross" ? grossformatHtml(zusatz === "A4" ? "A4" : "A3") : kundenHtml();
  const f = window.open("", "rex-ledplaner-druck");
  if (!f) return toast("Popup wurde blockiert – bitte Popups erlauben.", "fehler");
  f.document.open(); f.document.write(html); f.document.close();
}

const DRUCK_CSS = `
  body { font:10pt/1.4 "Segoe UI",system-ui,sans-serif; color:#111; background:#3a3a3a; margin:0; }
  .blatt { background:#fff; margin:12px auto; padding:12mm; box-sizing:border-box; break-after:page; }
  .blatt:last-child { break-after:auto; }
  .kopfzeile { display:flex; justify-content:space-between; align-items:center; font-size:8pt; color:#666; border-bottom:1px solid #bbb; padding-bottom:4px; margin-bottom:10px; }
  .kopfzeile b { color:#111; letter-spacing:.08em; }
  h1 { font-size:30pt; margin:0 0 6px; } h2 { font-size:15pt; text-transform:uppercase; margin:14px 0 6px; } h3 { font-size:11pt; text-transform:uppercase; margin:12px 0 4px; }
  .unter { font-size:12pt; color:#666; }
  .marke { font-size:9pt; letter-spacing:.3em; color:#666; margin-bottom:24mm; }
  .eckdaten { display:grid; grid-template-columns:max-content 1fr; gap:4px 16px; margin-top:12mm; font-size:11pt; }
  .eckdaten span { color:#666; } .eckdaten b { font-weight:600; }
  table { width:100%; border-collapse:collapse; font-size:9pt; margin:4px 0 8px; }
  th { text-align:left; font-weight:normal; color:#666; border-bottom:1px solid #bbb; padding:3px 5px; }
  td { border-bottom:1px solid #ddd; padding:3px 5px; }
  td.z, th.z { text-align:right; font-variant-numeric:tabular-nums; }
  svg { width:100%; display:block; background:#141414; border-radius:4px; }
  .punkt { display:inline-block; width:9px; height:9px; border-radius:2px; margin-right:5px; vertical-align:-1px; }
  .hinweis { border-left:3px solid #d29922; padding:2px 6px; margin:2px 0; font-size:9pt; }
  .hinweis.fehler { border-left-color:#f85149; } .hinweis.info { border-left-color:#4da3ff; }
  .druck { position:fixed; top:12px; right:12px; padding:8px 14px; font:inherit; font-size:12pt; border-radius:6px; border:1px solid #2d6aa8; background:#1f4f80; color:#fff; cursor:pointer; }
  .schriftfeld { display:grid; grid-template-columns:repeat(6, auto); gap:2px 12px; border-top:2px solid #111; margin-top:6px; padding-top:4px; font-size:8pt; }
  .schriftfeld span { color:#666; display:block; }
  @media print { body { background:#fff; } .blatt { margin:0; box-shadow:none; } .druck { display:none; } }`;

function druckSeite(titel, format, inhalt) {
  const groesse = { "A4hoch": ["A4 portrait", "210mm", "297mm"], "A4quer": ["A4 landscape", "297mm", "210mm"], "A3quer": ["A3 landscape", "420mm", "297mm"] }[format];
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(titel)}</title><style>${DRUCK_CSS}
    @page { size:${groesse[0]}; margin:0; } .blatt { width:${groesse[1]}; min-height:${groesse[2]}; }</style></head>
    <body><button class="druck" onclick="print()">Drucken / als PDF speichern</button>${inhalt}</body></html>`;
}
function kopfzeile(titel, seite) {
  return `<div class="kopfzeile"><span><b>REX</b> · ${esc(P.daten.titel)} · ${esc(titel)}</span><span>${esc(P.daten.datum || "")} · Rev. ${esc(P.daten.revision || "—")}${seite ? " · " + seite : ""}</span></div>`;
}
function druckSvg(s, opt, hoeheMm) {
  const v = einpassAnsicht(s);
  return `<svg viewBox="${vbText(v)}" style="max-height:${hoeheMm}mm" preserveAspectRatio="xMidYMid meet">${screenSvgInhalt(s, { ...opt, masse: true })}</svg>`;
}
function stromDruckOpt(s) {
  const kreise = kreiseVon(s.id); const farbe = new Map(); kreise.forEach((k, i) => k.module.forEach(id => farbe.set(id, wegFarbe(i))));
  return { fuellung: m => farbe.has(m.id) ? farbe.get(m.id) + "2e" : "transparent", wege: kreise.map((k, i) => ({ farbe: wegFarbe(i), module: k.module, start: kreisName(k) })) };
}
function signalDruckOpt(s) {
  const st = straengeVon(s.id); const farbe = new Map(); st.forEach((k, i) => k.module.forEach(id => farbe.set(id, wegFarbe(i))));
  return { fuellung: m => farbe.has(m.id) ? farbe.get(m.id) + "2e" : "transparent", wege: st.map((k, i) => ({ farbe: wegFarbe(i), module: k.module, start: strangName(k), ende: Number.isFinite(k.backupPort) ? "B" + k.backupPort : null })) };
}
function projektSummen() {
  const sum = { module: 0, m2: 0, kg: 0, wMax: 0, wTyp: 0, px: 0 };
  for (const s of P.screens) { const x = screenSummen(s); sum.module += x.anzahl; sum.m2 += x.m2; sum.kg += x.kg; sum.wMax += x.wMax; sum.wTyp += x.wTyp; sum.px += x.px; }
  return sum;
}
function alleHinweise() {
  return ["aufbau", "strom", "signal", "kabel"].flatMap(r => REITER[r].pruefungen().filter(h => h.art !== "ok").map(h => ({ ...h, reiter: r })));
}

function berichtHtml() {
  const sum = projektSummen();
  const blaetter = [];
  const d = P.daten;
  blaetter.push(`<div class="blatt"><div class="marke">R E X &nbsp; S O L U T I O N</div><h1>${esc(d.titel)}</h1><div class="unter">LED-Planung${d.veranstaltung ? " · " + esc(d.veranstaltung) : ""}</div>
    <div class="eckdaten"><span>Kunde</span><b>${esc(d.kunde || "—")}</b><span>Ort</span><b>${esc(d.ort || "—")}</b><span>Ersteller</span><b>${esc(d.ersteller || "—")}</b>
    <span>Revision · Datum</span><b>${esc(d.revision || "—")} · ${esc(d.datum || "—")}</b>
    <span>Screens</span><b>${P.screens.length}</b><span>Module</span><b>${fmt(sum.module)}</b><span>Fläche</span><b>${fmt(sum.m2, 2)} m²</b><span>Pixel</span><b>${fmt(sum.px)}</b>
    <span>Gewicht Module</span><b>${fmt(sum.kg, 1)} kg</b><span>Leistung max. / Ø</span><b>${fmt(sum.wMax / 1000, 2)} / ${fmt(sum.wTyp / 1000, 2)} kW</b>
    <span>Stromkreise</span><b>${P.kreise.length}</b><span>Datenports (inkl. Backup)</span><b>${P.straenge.reduce((a, k) => a + 1 + (Number.isFinite(k.backupPort) ? 1 : 0), 0)}</b></div></div>`);
  let nr = 1;
  for (const s of P.screens) {
    const x = screenSummen(s); const pl = pixelLage(s);
    const typen = [...x.typen.entries()].map(([lib, n]) => `<tr><td>${esc(eintrag(lib)?.name)}</td><td class="z">${n}</td><td class="z">${fmt(n * (eintrag(lib)?.attribute?.gewicht || 0), 1)} kg</td><td class="z">${fmt(n * (eintrag(lib)?.attribute?.stromverbrauch || 0))} W</td></tr>`).join("");
    blaetter.push(`<div class="blatt">${kopfzeile("Aufbau " + s.name, "Blatt " + (++nr))}<h2>Aufbau · ${esc(s.name)}</h2>
      <p>${esc(s.beschreibung || "")} · ${s.bauart}${s.ukM != null ? " · Unterkante " + fmtFlex(s.ukM) + " m" : ""} · ${fmtFlex(x.bM, 2)} × ${fmtFlex(x.hM, 2)} m · ${fmt(pl.b)} × ${fmt(pl.h)} px</p>
      ${druckSvg(s, {}, 120)}<h3>Module</h3><table><tr><th>Typ</th><th class="z">Anzahl</th><th class="z">Gewicht</th><th class="z">Leistung max.</th></tr>${typen}
      <tr><td><b>Summe</b></td><td class="z"><b>${x.anzahl}</b></td><td class="z"><b>${fmt(x.kg, 1)} kg</b></td><td class="z"><b>${fmt(x.wMax)} W</b></td></tr></table></div>`);
    const kreise = kreiseVon(s.id);
    if (kreise.length) blaetter.push(`<div class="blatt">${kopfzeile("Strom " + s.name, "Blatt " + (++nr))}<h2>Strom · ${esc(s.name)}</h2>${druckSvg(s, stromDruckOpt(s), 120)}
      <h3>Kreise</h3><table><tr><th>Kreis</th><th>Verteiler</th><th>Kanal</th><th>Phase</th><th>Zuleitung</th><th class="z">Module</th><th class="z">Last max.</th><th class="z">Last Ø</th></tr>
      ${kreise.map((k, i) => { const v = geraetById(k.verteiler); const l = lakaFuerKreis(k); const ph = kanalPhase(v, k.kanal);
        return `<tr><td><span class="punkt" style="background:${wegFarbe(i)}"></span>${kreisName(k)}</td><td>${esc(v?.name)}</td><td>${k.kanal}</td><td>${ph.phase}${ph.angenommen ? " ?" : ""}</td><td>${l ? esc(kanalVon(v, k.kanal)?.ausgang) + " · Laka " + fmtFlex(l.laengeM) + " m" : "direkt"}</td>
        <td class="z">${k.module.length}</td><td class="z">${fmt(kreisLast(k, "max"))} W</td><td class="z">${fmt(kreisLast(k, "durchschnitt"))} W</td></tr>`; }).join("")}</table></div>`);
    const st = straengeVon(s.id);
    if (st.length) blaetter.push(`<div class="blatt">${kopfzeile("Signal " + s.name, "Blatt " + (++nr))}<h2>Signal · ${esc(s.name)}</h2>${druckSvg(s, signalDruckOpt(s), 120)}
      <p style="font-size:8pt;color:#666">● Start Hauptweg · ▢ Einspeisung Backup am Strangende (gleicher Weg)</p>
      <h3>Ports</h3><table><tr><th>Strang</th><th>Prozessor</th><th>Port</th><th>Backup</th><th class="z">Module</th><th class="z">Pixel</th><th class="z">Auslastung</th></tr>
      ${st.map((k, i) => { const g = geraetById(k.prozessor); const px = strangPixel(k);
        return `<tr><td><span class="punkt" style="background:${wegFarbe(i)}"></span>${strangName(k)}</td><td>${esc(g?.name)}</td><td>${k.port}</td><td>${Number.isFinite(k.backupPort) ? k.backupPort : "—"}</td><td class="z">${k.module.length}</td><td class="z">${fmt(px)}</td><td class="z">${fmt(px / (portKapazitaet(g) || 1) * 100)} %</td></tr>`; }).join("")}</table></div>`);
  }
  // Verteiler und Prozessoren
  const bilanz = stromBilanz();
  const vs = P.geraete.filter(g => g.art === "verteiler" || g.art === "einspeisung");
  const ps = P.geraete.filter(g => g.art === "prozessor");
  blaetter.push(`<div class="blatt">${kopfzeile("Geräte", "Blatt " + (++nr))}<h2>Stromverteiler und Einspeisungen</h2>
    <table><tr><th>Gerät</th><th>Typ</th><th>Standort</th><th>Gespeist von</th><th class="z">L1</th><th class="z">L2</th><th class="z">L3</th><th class="z">Absicherung</th><th class="z">Schieflast</th></tr>
    ${vs.map(g => { const b = bilanz.get(g.id); return `<tr><td>${esc(g.name)}</td><td>${esc(g.art === "verteiler" ? eintrag(g.lib)?.name : g.stecker)}</td><td>${esc(g.standort || "—")}</td><td>${esc(geraetById(g.speisung?.von)?.name || "—")}</td>
      ${PHASEN.map(p => `<td class="z">${fmt(b.phasen[p], 1)} A</td>`).join("")}<td class="z">${fmt(einspeisungAmpere(g))} A</td><td class="z">${fmt(schieflast(b.phasen) * 100)} %</td></tr>`; }).join("") || `<tr><td colspan="9">—</td></tr>`}</table>
    <h2>Prozessoren</h2><table><tr><th>Gerät</th><th>Typ</th><th>Standort</th><th>Weg</th><th class="z">Ports</th><th class="z">Pixel</th><th>Strom</th></tr>
    ${ps.map(g => { const st = P.straenge.filter(k => k.prozessor === g.id); return `<tr><td>${esc(g.name)}</td><td>${esc(eintrag(g.lib)?.name)}</td><td>${esc(g.standort || "—")}</td><td>${esc(g.weg)}</td>
      <td class="z">${belegtePorts(g.id).size} / ${prozessorPorts(g).length}</td><td class="z">${fmt(st.reduce((a, k) => a + strangPixel(k), 0))}</td><td>${g.strom ? esc(geraetById(g.strom.verteiler)?.name) + " · K" + g.strom.kanal : "—"}</td></tr>`; }).join("") || `<tr><td colspan="7">—</td></tr>`}</table></div>`);
  // Kabel
  const kabel = kabelListe();
  blaetter.push(`<div class="blatt">${kopfzeile("Kabel", "Blatt " + (++nr))}<h2>Kabelliste</h2>
    <table><tr><th>Nr.</th><th>Kabeltyp</th><th class="z">Länge</th><th class="z">Anz.</th><th>Von</th><th>Nach</th></tr>
    ${kabel.map(z => `<tr><td>${z.nr}</td><td>${esc(libName(z.lib))}</td><td class="z">${z.laengeM == null ? "—" : fmtFlex(z.laengeM) + " m"}</td><td class="z">${z.anzahl}</td><td>${esc(z.von)}</td><td>${esc(z.nach)}</td></tr>`).join("")}</table>
    <h2>Packliste Kabel</h2><table><tr><th>Kabeltyp</th><th class="z">Länge</th><th class="z">Anzahl</th></tr>
    ${packliste(kabel).map(g => `<tr><td>${esc(libName(g.lib))}${g.bruecke ? " (Brücke)" : ""}</td><td class="z">${g.laengeM == null ? "—" : fmtFlex(g.laengeM) + " m"}</td><td class="z">${g.anzahl}</td></tr>`).join("")}</table></div>`);
  // Offene Punkte
  const h = alleHinweise();
  blaetter.push(`<div class="blatt">${kopfzeile("Offene Punkte", "Blatt " + (++nr))}<h2>Offene Punkte und Hinweise</h2>
    ${h.map(x => `<div class="hinweis ${x.art}">${esc(x.text)}</div>`).join("") || "<p>Keine.</p>"}
    <p style="font-size:8pt;color:#666;margin-top:12px">Gewicht, Leistung und Stromstärke sind Richtwerte aus der Library. Kapazitäten sind Planungswerte – Herstellerangaben, Netzform und Vorschriften gehen vor. Die Planung ersetzt keine Statik und keine Freigabe durch eine Elektrofachkraft.</p></div>`);
  return druckSeite(`${P.daten.titel} – Bericht`, "A4hoch", blaetter.join(""));
}

function schriftfeld(planTitel, blatt) {
  const d = P.daten;
  return `<div class="schriftfeld"><div><span>Projekt</span>${esc(d.titel)}</div><div><span>Plan</span>${esc(planTitel)}</div><div><span>Kunde</span>${esc(d.kunde || "—")}</div>
    <div><span>Ersteller</span>${esc(d.ersteller || "—")}</div><div><span>Rev. · Datum</span>${esc(d.revision || "—")} · ${esc(d.datum || "—")}</div><div><span>Blatt</span>${blatt}</div></div>`;
}
function grossformatHtml(format) {
  const blaetter = [];
  const hoehe = format === "A3" ? 230 : 150;
  let nr = 0;
  const plaene = [];
  for (const s of P.screens) {
    plaene.push(["Aufbau · " + s.name, druckSvg(s, {}, hoehe)]);
    if (kreiseVon(s.id).length) plaene.push(["Strom · " + s.name, druckSvg(s, stromDruckOpt(s), hoehe)]);
    if (straengeVon(s.id).length) plaene.push(["Signal · " + s.name, druckSvg(s, signalDruckOpt(s), hoehe)]);
  }
  for (const [titel, svg] of plaene) blaetter.push(`<div class="blatt">${kopfzeile(titel, "")}<h2>${esc(titel)}</h2>${svg}${schriftfeld(titel, `${++nr} / ${plaene.length}`)}</div>`);
  return druckSeite(`${P.daten.titel} – Pläne ${format} quer`, format + "quer", blaetter.join(""));
}
function kundenHtml() {
  const blaetter = P.screens.filter(s => s.module.length).map(s => {
    const x = screenSummen(s); const pl = pixelLage(s);
    const pitches = [...new Set(s.module.map(m => fmtFlex(eintrag(m.lib)?.attribute?.led?.pitchMm, 2)))].join(" / ");
    return `<div class="blatt"><div class="marke">R E X &nbsp; S O L U T I O N</div><h1 style="font-size:24pt">${esc(s.name)}</h1><div class="unter">${esc(P.daten.titel)}${P.daten.kunde ? " · " + esc(P.daten.kunde) : ""}</div>
      <div style="margin:10mm 0">${druckSvg(s, { masse: true }, 130)}</div>
      <div class="eckdaten"><span>Größe</span><b>${fmtFlex(x.bM, 2)} × ${fmtFlex(x.hM, 2)} m (${fmt(x.m2, 2)} m²)</b><span>Auflösung</span><b>${fmt(pl.b)} × ${fmt(pl.h)} Pixel</b>
      <span>Pixelabstand</span><b>${pitches} mm</b><span>Module</span><b>${x.anzahl}</b><span>Bauart</span><b>${s.bauart}${s.ukM != null ? ", Unterkante " + fmtFlex(s.ukM) + " m" : ""}</b>
      <span>Leistung max. / typ.</span><b>${fmt(x.wMax / 1000, 1)} / ${fmt(x.wTyp / 1000, 1)} kW</b><span>Gewicht Module</span><b>${fmt(x.kg)} kg</b></div></div>`;
  });
  return druckSeite(`${P.daten.titel} – Kundenansicht`, "A4hoch", blaetter.join("") || `<div class="blatt">Keine Screens mit Modulen.</div>`);
}
