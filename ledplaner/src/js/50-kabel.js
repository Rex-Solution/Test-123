/* Reiter Kabel: alle Verbindungen des Projekts (automatisch aus Strom/Signal + von Hand),
   Typ und Länge bearbeitbar, Packliste nach Typ und Länge, CSV. */

const GEWERK_KUERZEL = { strom: "S", signal: "D", video: "V" };
const GEWERK_NAME = { strom: "Strom", signal: "Signal", video: "Video" };

function kabelLibPassend(gewerk, stecker) {
  const k = libListe("kabel").filter(e => e.attribute.led.gewerk === gewerk);
  return (stecker && k.find(e => e.attribute.led.steckerA === stecker)) || null;
}
function modulAnschluss(m, rolle) {
  return (eintrag(m.lib)?.attribute?.anschluesse || []).find(a => a.rolle === rolle && a.richtung === "in")?.typ || null;
}
function libName(id) { return eintrag(id)?.name || "—"; }
function libFarbe(id) {
  const led = eintrag(id)?.attribute?.led || {};
  if (led.typ === "laka" || led.typ === "spinne") return kabelFarbe(/socapex/i.test(led.stecker || led.steckerEin || "") ? "Socapex" : "Multicore (Harting)");
  if (led.typ === "multicore") return kabelFarbe("LAN");
  return kabelFarbe(led.farbsystem);
}

/* Alle Kabel des Projekts als Zeilen */
function kabelListe() {
  const zeilen = [];
  const add = z => {
    const anp = P.kabelAnpassung[z.key] || {};
    zeilen.push({ herkunft: "automatisch", bemerkung: "", anzahl: 1, ...z, ...(anp.lib !== undefined ? { lib: anp.lib } : {}),
      ...(anp.laengeM !== undefined ? { laengeM: anp.laengeM } : {}), ...(anp.bemerkung !== undefined ? { bemerkung: anp.bemerkung } : {}) });
  };
  // Strom: Einspeisungen der Verteiler
  for (const v of P.geraete.filter(g => g.art === "verteiler")) {
    add({ key: "speisung:" + v.id, gewerk: "strom", lib: v.speisung?.kabel || null, laengeM: v.speisung?.laengeM ?? null, quelleBearbeiten: true,
      von: geraetById(v.speisung?.von)?.name || "— Einspeisung nicht festgelegt", nach: `${v.name} · Einspeisung`, screen: null });
  }
  // Strom: Lakas und Spinnen
  for (const l of P.lakas) {
    const v = geraetById(l.verteiler); const s = screenById(l.screen);
    add({ key: "laka:" + l.id, gewerk: "strom", lib: l.lib, laengeM: l.laengeM, quelleBearbeiten: true, von: `${v?.name || "—"} · ${l.ausgang}`, nach: `Spinne · ${s?.name || "—"}`, screen: l.screen });
    const stecker = eintrag(l.lib)?.attribute?.led?.stecker;
    const spinne = libListe("spinne").find(e => e.attribute.led.steckerEin === stecker);
    add({ key: "spinne:" + l.id, gewerk: "strom", lib: spinne?.id || null, laengeM: spinne?.attribute?.led?.laengeM ?? null, von: `Laka · ${l.ausgang}`, nach: `${s?.name || "—"} · Kreisanfänge`, screen: l.screen });
  }
  // Strom: Kreise ohne Laka (direkt), Brücken je Screen
  for (const s of P.screens) {
    const namen = modulNamen(s);
    const kreise = P.kreise.filter(k => k.screen === s.id);
    for (const k of kreise) {
      if (lakaFuerKreis(k)) continue;
      const m = kreisModule(k)[0]; const v = geraetById(k.verteiler);
      add({ key: "kreis:" + k.id, gewerk: "strom", lib: kabelLibPassend("strom", m && modulAnschluss(m, "strom"))?.id || null, laengeM: null,
        von: `${v?.name || "—"} · Kanal ${k.kanal}`, nach: `${s.name} · ${namen.get(m?.id) || "—"} (${kreisName(k)})`, screen: s.id });
    }
    const brStrom = kreise.reduce((a, k) => a + Math.max(0, k.module.length - 1), 0);
    if (brStrom) {
      const m = s.module[0]; const lib = kabelLibPassend("strom", modulAnschluss(m, "strom"));
      add({ key: "bruecke-strom:" + s.id, gewerk: "strom", lib: lib?.id || null, laengeM: lib?.attribute?.led?.brueckeLaengeM ?? null, anzahl: brStrom, bruecke: true,
        von: "Modul", nach: `Modul · ${s.name} (Brücken ${kreise.map(kreisName).join(", ")})`, screen: s.id });
    }
    // Signal
    const st = P.straenge.filter(k => k.screen === s.id);
    for (const k of st) {
      const g = geraetById(k.prozessor); if (!g) continue;
      const ms = strangModule(k);
      // je Port: direkt vom Prozessor oder vom Ausgang der Stagebox / Auflösung des Multicores
      const quelle = nr => {
        const d = portWeg(g.id, nr);
        if (!d) return { lib: g.portKabel, laengeM: g.portLaengeM ?? null, von: `${g.name} · Port ${nr}` };
        return { lib: d.ausgangKabel, laengeM: d.ausgangLaengeM ?? null, von: `${d.name} · ${d.art === "stagebox" ? "Ausgang" : "Ader"} ${wegAusgang(d, nr)} (Port ${nr})` };
      };
      add({ key: "port:" + k.id, gewerk: "signal", ...quelle(k.port), nach: `${s.name} · ${namen.get(ms[0]?.id) || "—"} (Daten ein)`, screen: s.id });
      if (Number.isFinite(k.backupPort)) { const q = quelle(k.backupPort); add({ key: "backup:" + k.id, gewerk: "signal", ...q, von: q.von + " Backup", nach: `${s.name} · ${namen.get(ms[ms.length - 1]?.id) || "—"} (Strangende)`, screen: s.id }); }
    }
    const brDaten = st.reduce((a, k) => a + Math.max(0, k.module.length - 1), 0);
    if (brDaten) {
      const lib = kabelLibPassend("signal", modulAnschluss(s.module[0], "daten"));
      add({ key: "bruecke-daten:" + s.id, gewerk: "signal", lib: lib?.id || null, laengeM: lib?.attribute?.led?.brueckeLaengeM ?? null, anzahl: brDaten, bruecke: true,
        von: "Modul", nach: `Modul · ${s.name} (Brücken ${st.map(strangName).join(", ")})`, screen: s.id });
    }
  }
  // Signal: Prozessor → Stagebox (Zuleitung) bzw. Multicore
  for (const d of P.geraete.filter(istWeg)) {
    const g = geraetById(d.prozessor); if (!g || !d.ports.length) continue;
    if (d.art === "stagebox") add({ key: "weg:" + d.id, gewerk: "signal", lib: d.zuleitung?.kabel || null, laengeM: d.zuleitung?.laengeM ?? null, anzahl: d.zuleitung?.anzahl || 1,
      von: `${g.name} · Glasfaser`, nach: `${d.name} (${d.standort || "—"})`, screen: null });
    else add({ key: "weg:" + d.id, gewerk: "signal", lib: d.lib, laengeM: wegLed(d).laengeM ?? null,
      von: `${g.name} · Port ${d.ports.join(", ")}`, nach: `${d.name} · Auflösung (${d.standort || "—"})`, screen: null });
  }
  // Video: Outputs → Prozessor-Eingänge
  for (const o of P.outputs || []) {
    if (!o.prozessor) continue;
    const typ = { HDMI: "HDMI", SDI: "BNC", DP: "DisplayPort", DVI: "DVI" }[o.anschluss];
    const lib = libListe("kabel").find(e => e.attribute.led.gewerk === "video" && e.attribute.led.steckerA === typ);
    add({ key: "video:" + o.id, gewerk: "video", lib: lib?.id || null, laengeM: null, von: `${o.zuspieler || "Zuspieler"} · ${o.name}`, nach: `${geraetById(o.prozessor)?.name || "—"} · ${o.eingang}`, screen: null });
  }
  // Strom für Geräte
  for (const g of P.geraete.filter(x => x.strom?.verteiler)) {
    const v = geraetById(g.strom.verteiler);
    add({ key: "geraetstrom:" + g.id, gewerk: "strom", lib: libListe("kabel").find(e => /kaltger/i.test(e.name))?.id || null, laengeM: null,
      von: `${v?.name || "—"} · Kanal ${g.strom.kanal}`, nach: g.name, screen: null });
  }
  // Von Hand
  for (const k of P.kabel) zeilen.push({ key: "hand:" + k.id, herkunft: "von Hand", gewerk: k.gewerk || libGewerk(k.lib) || "strom", lib: k.lib, laengeM: k.laengeM, anzahl: k.anzahl || 1, von: k.von, nach: k.nach, bemerkung: k.bemerkung || "", screen: null, hand: true });
  // Nach Gewerk ordnen (Strom, Signal, Video) und je Gewerk nummerieren
  const ordnung = { strom: 0, signal: 1, video: 2 };
  zeilen.sort((a, b) => ordnung[a.gewerk] - ordnung[b.gewerk]);
  const zaehler = {};
  for (const z of zeilen) { zaehler[z.gewerk] = (zaehler[z.gewerk] || 0) + 1; z.nr = GEWERK_KUERZEL[z.gewerk] + zaehler[z.gewerk]; }
  return zeilen;
}
function libGewerk(id) { const led = eintrag(id)?.attribute?.led; return led?.typ === "kabel" ? led.gewerk : led?.typ === "laka" || led?.typ === "spinne" ? "strom" : null; }

/* Typ/Länge eines Kabels ändern: bei Einspeisung und Laka an der Quelle, sonst als Anpassung */
function kabelSetzen(key, feld, wert) {
  const [art, id] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
  if (wert && feld === "lib") nutzeEintrag(wert);
  if (art === "hand") { const k = P.kabel.find(x => x.id === id); if (k) k[feld] = wert; return; }
  if (art === "speisung") { const v = geraetById(id); if (v && feld !== "bemerkung") { v.speisung = v.speisung || {}; v.speisung[feld === "lib" ? "kabel" : "laengeM"] = wert; return; } }
  if (art === "laka" && feld !== "bemerkung") { const l = P.lakas.find(x => x.id === id); if (l) { l[feld] = wert; return; } }
  P.kabelAnpassung[key] = { ...(P.kabelAnpassung[key] || {}), [feld]: wert };
}

function packliste(zeilen) {
  const gruppen = new Map();
  for (const z of zeilen) {
    const k = `${z.lib || "?"}|${z.laengeM ?? "?"}`;
    const g = gruppen.get(k) || { lib: z.lib, laengeM: z.laengeM, anzahl: 0, gewerk: z.gewerk, bruecke: false };
    g.anzahl += z.anzahl || 1; g.bruecke = g.bruecke || !!z.bruecke;
    gruppen.set(k, g);
  }
  return [...gruppen.values()].sort((a, b) => a.gewerk.localeCompare(b.gewerk) || libName(a.lib).localeCompare(libName(b.lib)) || (a.laengeM ?? 0) - (b.laengeM ?? 0));
}

function kabelGefiltert() {
  const f = ui.kabelFilter;
  return kabelListe().filter(z => (f.gewerk === "alle" || z.gewerk === f.gewerk) && (f.screen === "alle" || z.screen === f.screen) && (!f.ohneLaenge || z.laengeM == null));
}

REITER.kabel = {
  titelPalette: "Kabeltypen",
  werkzeuge() {
    const f = ui.kabelFilter;
    return `<div class="umschalter">${[["alle", "Alle"], ["strom", "Strom"], ["signal", "Signal"], ["video", "Video"]].map(([w, t]) => `<button data-k="gewerk" data-wert="${w}" aria-selected="${f.gewerk === w}">${t}</button>`).join("")}</div>
      <select data-k-feld="screen"><option value="alle">Screen: alle</option>${P.screens.map(s => `<option value="${s.id}"${f.screen === s.id ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
      <label class="klein"><input type="checkbox" data-k-feld="ohneLaenge" ${f.ohneLaenge ? "checked" : ""}> nur ohne Länge</label>
      <span class="trenner"></span><button data-k="neu">+ Kabel von Hand</button><button data-k="csv">Kabelliste CSV</button><button data-k="pack-csv">Packliste CSV</button>`;
  },
  palette() {
    return `<p class="klein leise">Kabel entstehen automatisch aus Strom und Signal (Zuleitungen, Lakas, Spinnen, Port- und Backup-Kabel, Brücken). Typ und Länge hier in der Liste oder rechts ändern. Kabel von Hand mit „+ Kabel von Hand“.</p>
      ${libListe("kabel").map(e => `<div class="palette-item" style="cursor:default"><span class="kabelpunkt" style="background:${libFarbe(e.id)}"></span><span class="name">${esc(e.name)}</span></div>`).join("")}`;
  },
  zeichnung(el) {
    el.classList.add("liste-modus");
    const zeilen = kabelGefiltert();
    const typen = libListe().filter(e => ["kabel", "laka", "spinne", "multicore"].includes(libTyp(e)));
    if (!zeilen.length) return void (el.innerHTML = `<p class="leise">Keine Kabel${ui.kabelFilter.gewerk !== "alle" || ui.kabelFilter.screen !== "alle" || ui.kabelFilter.ohneLaenge ? " für diesen Filter" : " – sie entstehen aus Strom und Signal"}.</p>`);
    el.innerHTML = `<table class="tabelle-edit"><tr><th>Nr.</th><th>Gewerk</th><th>Kabeltyp</th><th class="zahl">Länge (m)</th><th class="zahl">Anzahl</th><th>Von (Gerät · Anschluss)</th><th>Nach (Gerät · Anschluss)</th><th>Herkunft</th></tr>
      ${zeilen.map(z => `<tr class="klickbar${ui.sel.kabel === z.key ? " sel" : ""}" data-kabel="${esc(z.key)}"><td>${z.nr}</td><td>${GEWERK_NAME[z.gewerk]}</td>
        <td><span class="kabelpunkt" style="background:${libFarbe(z.lib)}"></span><select data-kabel-feld="lib"><option value="">— Typ wählen</option>${typen.map(e => `<option value="${e.id}"${z.lib === e.id ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select></td>
        <td class="zahl${z.laengeM == null ? " fehlt" : ""}"><input class="laenge" data-kabel-feld="laengeM" value="${z.laengeM == null ? "" : fmtFlex(z.laengeM)}" placeholder="—" inputmode="decimal"></td>
        <td class="zahl">${z.hand ? `<input class="anzahl" data-kabel-feld="anzahl" value="${z.anzahl}" inputmode="numeric">` : z.anzahl}</td>
        <td>${esc(z.von)}</td><td>${esc(z.nach)}</td><td class="leise">${z.herkunft}${z.bruecke ? " · Brücke" : ""}</td></tr>`).join("")}</table>`;
  },
  liste() {
    const p = packliste(kabelGefiltert());
    return `<div class="kopf"><b>Packliste nach Typ und Länge</b><span class="leise klein">Brücken mit Standardlänge aus der Library</span></div>
      <table><tr><th>Kabeltyp</th><th class="zahl">Länge</th><th class="zahl">Anzahl</th><th>Gewerk</th></tr>
      ${p.map(g => `<tr><td><span class="kabelpunkt" style="background:${libFarbe(g.lib)}"></span>${esc(libName(g.lib))}${g.bruecke ? " <span class='leise'>(Brücke)</span>" : ""}</td>
        <td class="zahl">${g.laengeM == null ? "—" : fmtFlex(g.laengeM) + " m"}</td><td class="zahl">${g.anzahl}</td><td>${GEWERK_NAME[g.gewerk]}</td></tr>`).join("") || `<tr><td colspan="4" class="leise">—</td></tr>`}</table>`;
  },
  rechts() {
    const alle = kabelListe();
    const z = alle.find(x => x.key === ui.sel.kabel);
    const ohneBruecke = alle.filter(x => !x.bruecke);
    const summeM = ohneBruecke.reduce((a, x) => a + (x.laengeM || 0) * (x.anzahl || 1), 0);
    let html = "";
    if (z) {
      html += `<div class="karte"><div class="label">Kabel ${z.nr}</div><table class="werte"><tr><td>Typ</td><td>${esc(libName(z.lib))}</td></tr>
        <tr><td>Länge</td><td>${z.laengeM == null ? "—" : fmtFlex(z.laengeM) + " m"}</td></tr><tr><td>Anzahl</td><td>${z.anzahl}</td></tr></table>
        ${z.hand ? `<label class="feld"><span>Von</span><input data-kabel-hand="von" value="${esc(z.von)}"></label><label class="feld"><span>Nach</span><input data-kabel-hand="nach" value="${esc(z.nach)}"></label>`
          : `<p class="klein"><span class="leise">Von</span> ${esc(z.von)}<br><span class="leise">Nach</span> ${esc(z.nach)}</p>`}
        <label class="feld"><span>Bemerkung</span><input data-kabel-hand="bemerkung" value="${esc(z.bemerkung)}" placeholder="z.B. über Traverse links"></label>
        ${z.hand ? `<button data-k="loeschen" class="gefahr">Kabel löschen</button>` : z.key in P.kabelAnpassung ? `<button data-k="zuruecksetzen">Anpassung zurücksetzen</button>` : ""}</div>`;
    }
    html += `<div class="karte"><div class="label">Summe</div><table class="werte"><tr><td>Verbindungen</td><td>${alle.length}</td></tr>
      <tr><td>Kabel gesamt</td><td>${alle.reduce((a, x) => a + (x.anzahl || 1), 0)}</td></tr><tr><td>davon Brücken</td><td>${alle.filter(x => x.bruecke).reduce((a, x) => a + x.anzahl, 0)}</td></tr>
      <tr><td>Länge ohne Brücken</td><td>${fmtFlex(summeM, 1)} m${ohneBruecke.some(x => x.laengeM == null) ? " + offen" : ""}</td></tr></table></div>`;
    return html;
  },
  pruefungen() {
    const liste = [];
    for (const z of kabelListe()) {
      if (!z.lib) liste.push({ art: "warn", text: `${z.nr}: Kabeltyp fehlt (${z.von} → ${z.nach}).`, ziel: "kabel:" + z.key });
      if (z.laengeM == null && !z.bruecke) liste.push({ art: "warn", text: `${z.nr}: Länge fehlt (${z.von} → ${z.nach}).`, ziel: "kabel:" + z.key });
      const max = eintrag(z.lib)?.attribute?.led?.maxLaengeM ?? (eintrag(z.lib)?.attribute?.led?.farbsystem === "LAN" ? P.regeln.catMax : null);
      if (max && z.laengeM > max) liste.push({ art: "warn", text: `${z.nr}: ${fmtFlex(z.laengeM)} m über der max. Länge ${fmt(max)} m.`, ziel: "kabel:" + z.key });
    }
    return liste;
  },
};

function kabelEreignisse() {
  $("#werkzeuge").addEventListener("click", async e => {
    if (ui.reiter !== "kabel") return;
    const b = e.target.closest("[data-k]"); if (!b) return;
    const a = b.dataset.k;
    if (a === "gewerk") { ui.kabelFilter.gewerk = b.dataset.wert; render(); }
    if (a === "neu") kabelVonHand();
    if (a === "csv") {
      const z = kabelListe();
      herunterladen(csvText(["Nr.", "Gewerk", "Kabeltyp", "Länge (m)", "Anzahl", "Von", "Nach", "Herkunft", "Bemerkung"],
        z.map(x => [x.nr, GEWERK_NAME[x.gewerk], libName(x.lib), x.laengeM ?? "", x.anzahl, x.von, x.nach, x.herkunft + (x.bruecke ? " (Brücke)" : ""), x.bemerkung])),
        dateiname(P.daten.titel + "_kabelliste", ".csv"), "text/csv;charset=utf-8");
    }
    if (a === "pack-csv") {
      herunterladen(csvText(["Kabeltyp", "Länge (m)", "Anzahl", "Gewerk"], packliste(kabelListe()).map(g => [libName(g.lib), g.laengeM ?? "", g.anzahl, GEWERK_NAME[g.gewerk]])),
        dateiname(P.daten.titel + "_packliste_kabel", ".csv"), "text/csv;charset=utf-8");
    }
  });
  $("#werkzeuge").addEventListener("change", e => {
    if (ui.reiter !== "kabel") return;
    const f = e.target.dataset.kFeld;
    if (f === "screen") ui.kabelFilter.screen = e.target.value;
    if (f === "ohneLaenge") ui.kabelFilter.ohneLaenge = e.target.checked;
    render();
  });
  $("#zeichnung").addEventListener("change", e => {
    if (ui.reiter !== "kabel") return;
    const tr = e.target.closest("[data-kabel]"); const f = e.target.dataset.kabelFeld; if (!tr || !f) return;
    let w = e.target.value;
    if (f === "laengeM" || f === "anzahl") { w = leseZahl(w); if (Number.isNaN(w) || (w !== null && w < 0)) return toast(`${f === "anzahl" ? "Anzahl" : "Länge"}: bitte eine Zahl ≥ 0.`, "fehler"); }
    if (f === "anzahl") w = Math.max(1, Math.round(w || 1));
    kabelSetzen(tr.dataset.kabel, f, w === "" ? null : w);
    ui.sel.kabel = tr.dataset.kabel;
    aenderung();
  });
  $("#zeichnung").addEventListener("click", e => {
    if (ui.reiter !== "kabel" || e.target.closest("input, select")) return;
    const tr = e.target.closest("[data-kabel]"); if (!tr) return;
    ui.sel.kabel = tr.dataset.kabel; render();
  });
  $("#rechts").addEventListener("change", e => {
    if (ui.reiter !== "kabel") return;
    const f = e.target.dataset.kabelHand; if (!f || !ui.sel.kabel) return;
    kabelSetzen(ui.sel.kabel, f, e.target.value);
    aenderung();
  });
  $("#rechts").addEventListener("click", e => {
    if (ui.reiter !== "kabel") return;
    const a = e.target.closest("[data-k]")?.dataset.k;
    if (a === "loeschen") { P.kabel = P.kabel.filter(k => "hand:" + k.id !== ui.sel.kabel); ui.sel.kabel = null; aenderung(); }
    if (a === "zuruecksetzen") { delete P.kabelAnpassung[ui.sel.kabel]; aenderung(); }
  });
}

async function kabelVonHand() {
  const typen = libListe().filter(e => ["kabel", "laka", "spinne", "multicore"].includes(libTyp(e)));
  const erg = await formularDialog("Kabel von Hand", [
    { name: "lib", label: "Kabeltyp", art: "auswahl", wert: typen[0]?.id, optionen: typen.map(e => [e.id, e.name]) },
    { name: "laengeM", label: "Länge (m)", art: "zahl", wert: "" },
    { name: "anzahl", label: "Anzahl", art: "zahl", wert: 1 },
    { name: "von", label: "Von (Gerät · Anschluss)", wert: "" },
    { name: "nach", label: "Nach (Gerät · Anschluss)", wert: "" },
    { name: "bemerkung", label: "Bemerkung", wert: "" },
  ], "Hinzufügen");
  if (!erg) return;
  if (Number.isNaN(erg.laengeM) || Number.isNaN(erg.anzahl)) return toast("Länge und Anzahl als Zahl eingeben.", "fehler");
  nutzeEintrag(erg.lib);
  const k = { id: neueId("h"), lib: erg.lib, gewerk: libGewerk(erg.lib) || "strom", laengeM: erg.laengeM, anzahl: Math.max(1, Math.round(erg.anzahl || 1)), von: erg.von, nach: erg.nach, bemerkung: erg.bemerkung };
  P.kabel.push(k);
  ui.sel.kabel = "hand:" + k.id;
  aenderung();
}
