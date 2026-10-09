/* Hauptreiter Library: Manager-Ansicht (Liste links, Formular rechts) nach Rex-Styleguide. */

let libEntwurf = null; // bearbeitete Kopie des gewählten Eintrags

function renderLibrary() {
  const filter = ui.libFilter.toLowerCase();
  const eintraege = libListe().filter(e => (!filter || e.name.toLowerCase().includes(filter) || (e.attribute.hersteller || "").toLowerCase().includes(filter))
    && (!ui.libNurOffen || vollstaendigkeit(e).offen.length || vollstaendigkeit(e).pflichtFehlt.length));
  const abw = new Set(libraryAbweichungen());
  const gruppen = Object.entries(LIB_TYPEN).map(([typ, titel]) => {
    const liste = eintraege.filter(e => libTyp(e) === typ);
    if (!liste.length) return "";
    return `<div class="label">${titel}</div>` + liste.map(e => `<div class="eintrag${ui.libSel === e.id ? " sel" : ""}" data-lib-sel="${e.id}">
      <span>${esc(e.name)}${{ beispiel: ` <span class="leise klein">· Beispiel</span>`, rex: ` <span class="leise klein">· Rex</span>` }[LIB.herkunft.get(e.id)] || ""}${abw.has(e.id) ? ` <span class="badge teil" title="Projektkopie weicht ab">≠ Projekt</span>` : ""}</span>${badgeHtml(e)}</div>`).join("");
  }).join("");
  $("#lib-liste").innerHTML = `<div class="knopfreihe" style="justify-content:space-between"><h2 style="margin:0">Library</h2><button data-l="neu" class="primaer">+ Neu</button></div>
    <input type="search" id="lib-suche" placeholder="Suchen …" value="${esc(ui.libFilter)}" style="width:100%;margin:12px 0 8px">
    <label class="klein"><input type="checkbox" id="lib-offen" ${ui.libNurOffen ? "checked" : ""}> nur unvollständige</label>
    ${gruppen || `<p class="leise klein">Keine Einträge.</p>`}
    <div class="label">Datei</div><div class="knopfreihe"><button data-l="import">Importieren …</button><button data-l="export">Exportieren</button></div>
    <p class="klein leise">Ohne Datenbank liegen eigene Einträge im Browser und in der Library-Datei. Beispiele lassen sich bearbeiten; die Änderung wird als eigener Eintrag gespeichert.</p>`;
  renderLibraryFormular();
}

function renderLibraryFormular() {
  const el = $("#lib-formular");
  const e = LIB.eintraege.get(ui.libSel);
  if (!e) { libEntwurf = null; el.innerHTML = `<div class="karte"><p class="leise">Links einen Eintrag wählen oder mit „+ Neu“ anlegen.</p></div>`; return; }
  if (!libEntwurf || libEntwurf.id !== e.id) libEntwurf = klon(e);
  const d = libEntwurf;
  const typ = libTyp(d);
  const v = vollstaendigkeit(d);
  const geaendert = JSON.stringify(d) !== JSON.stringify(e);
  const projektKopie = P.library[e.id];
  const abweichung = projektKopie && JSON.stringify(projektKopie) !== JSON.stringify(e);
  const feldHtml = f => {
    if (f.abschnitt) return `<div class="abschnitt" style="grid-column:1/-1">${f.abschnitt}</div>`;
    const wert = holePfad(d.attribute, f.p);
    const fehlt = (f.pf === "pflicht" || f.pf === "pruef") && !gefuellt(f, d.attribute);
    const klasse = fehlt ? (f.pf === "pflicht" ? " pflicht-fehlt" : " fehlt") : "";
    const titel = `${f.label}${f.einheit ? " (" + f.einheit + ")" : ""}${f.pf === "pflicht" ? " *" : ""}`;
    const geaendertFeld = JSON.stringify(wert) !== JSON.stringify(holePfad(e.attribute, f.p)) || (f.paar && JSON.stringify(holePfad(d.attribute, f.paar)) !== JSON.stringify(holePfad(e.attribute, f.paar)));
    const stil = geaendertFeld ? ` style="border-left:3px solid var(--akzent)"` : "";
    let input;
    if (f.art === "ja") input = `<select data-pfad="${f.p}" data-art="ja"${stil}><option value="">—</option><option value="ja"${wert === true ? " selected" : ""}>ja</option><option value="nein"${wert === false ? " selected" : ""}>nein</option></select>`;
    else if (f.art === "auswahl") input = `<select data-pfad="${f.p}" data-art="text"${stil}><option value="">—</option>${f.optionen.map(([w, t]) => `<option value="${esc(w)}"${wert === w ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
    else if (f.art === "json") input = `<textarea data-pfad="${f.p}" data-art="json"${stil}>${esc(wert == null ? "" : JSON.stringify(wert, null, 1))}</textarea>${f.generator ? `<button data-l="gen-${f.generator}" type="button">Kanäle und Ausgänge erzeugen …</button>` : ""}`;
    else if (f.paar) input = `<div class="zwei"><input data-pfad="${f.p}" data-art="zahl" value="${wert ?? ""}" placeholder="—"${stil}><input data-pfad="${f.paar}" data-art="zahl" value="${holePfad(d.attribute, f.paar) ?? ""}" placeholder="—"${stil}></div>`;
    else {
      const anzeige = f.art === "liste" || f.art === "textliste" ? (Array.isArray(wert) ? wert.join(", ") : "") : f.art === "zahl" ? (wert == null ? "" : fmtFlex(wert, 4)) : (wert ?? "");
      input = `<input data-pfad="${f.p}" data-art="${f.art}" value="${esc(anzeige)}" placeholder="${f.pf === "pruef" ? "— aus Datenblatt" : "—"}"${f.art === "zahl" ? ' inputmode="decimal"' : ""}${stil}>`;
    }
    return `<label class="feld${klasse}"${f.art === "json" ? ' style="grid-column:1/-1"' : ""}><span>${esc(titel)}</span>${input}</label>`;
  };
  el.innerHTML = `<div class="karte">
    <div class="knopfreihe"><h2 style="margin:0">${esc(d.name || "—")}</h2>${badgeHtml(d)}<span class="leise klein">${LIB_TYPEN[typ] || typ} · ${esc(d.id)}</span><span class="fueller"></span>
      <button data-l="verwerfen" ${geaendert ? "" : "disabled"}>Verwerfen</button><button data-l="dup">Duplizieren</button>
      <button data-l="loeschen" class="gefahr" ${LIB.herkunft.get(e.id) === "beispiel" ? "disabled title='Beispiele sind eingebaut'" : LIB.herkunft.get(e.id) === "rex" ? "disabled title='Kommt aus dem Rex-System'" : ""}>Löschen</button>
      <button data-l="speichern" class="primaer" ${geaendert && !v.pflichtFehlt.length ? "" : "disabled"} title="${v.pflichtFehlt.length ? "Pflicht fehlt: " + esc(v.pflichtFehlt.join(", ")) : ""}">Speichern</button></div>
    ${v.pflichtFehlt.length ? `<div class="hinweis fehler" style="margin-top:12px">Pflichtangaben fehlen: ${esc(v.pflichtFehlt.join(", "))}. Der Eintrag ist in der Planung nicht wählbar.</div>` : ""}
    ${v.offen.length ? `<div class="hinweis warn" style="margin-top:12px">Datenblatt fehlt: ${esc(v.offen.join(", "))}. Planung möglich, Prüfungen dazu bleiben offen.</div>` : ""}
    ${abweichung ? `<div class="hinweis info" style="margin-top:12px">Das Projekt nutzt eine ältere Kopie dieses Eintrags. <button data-l="projekt-aktualisieren">Projektkopie aktualisieren</button></div>` : ""}
    <div class="drei">
      <div class="abschnitt" style="grid-column:1/-1">Eintrag</div>
      <label class="feld${d.name ? "" : " pflicht-fehlt"}"><span>Name *</span><input data-pfad="name" data-art="name" value="${esc(d.name)}"></label>
      <label class="feld"><span>Kategorie (Gruppierung)</span><input data-pfad="kategorie" data-art="kategorie" value="${esc(d.kategorie || "")}"></label>
      <label class="feld"><span>ID (Rex-Artikelnummer)</span><input value="${esc(d.id)}" disabled></label>
      ${(SCHEMA[typ] || []).map(feldHtml).join("")}
    </div></div>`;
}

function libFeldUebernehmen(t) {
  const d = libEntwurf; if (!d) return;
  const pfad = t.dataset.pfad, art = t.dataset.art;
  let w = t.value;
  if (art === "name") { d.name = w.trim(); return; }
  if (art === "kategorie") { d.kategorie = w; return; }
  if (art === "zahl") { w = leseZahl(w); if (Number.isNaN(w)) { toast("Bitte eine Zahl eingeben.", "fehler"); return false; } }
  else if (art === "ja") w = w === "" ? null : w === "ja";
  else if (art === "liste") { w = w.trim() ? w.split(/[;,]\s*|\s+/).map(leseZahl).filter(x => Number.isFinite(x)) : null; }
  else if (art === "textliste") { w = w.trim() ? w.split(/\s*[,;]\s*/).filter(Boolean) : null; }
  else if (art === "json") { if (!w.trim()) w = null; else { try { w = JSON.parse(w); } catch (e) { toast("JSON ungültig: " + e.message, "fehler"); return false; } } }
  else if (w === "" && pfad !== "hersteller") w = null;
  setzePfad(d.attribute, pfad, w);
  if (/^led\.(mmB|pixelB)$/.test(pfad) && d.attribute.led.mmB && d.attribute.led.pixelB) d.attribute.led.pitchMm = Math.round(d.attribute.led.mmB / d.attribute.led.pixelB * 100) / 100;
}

async function libNeu() {
  const erg = await formularDialog("Neuer Library-Eintrag", [
    { name: "typ", label: "Typ", art: "auswahl", wert: "modul", optionen: Object.entries(LIB_TYPEN) },
    { name: "name", label: "Name *", wert: "" },
    { name: "id", label: "ID / Rex-Artikelnummer (leer = automatisch)", wert: "" },
  ], "Anlegen");
  if (!erg) return;
  if (!erg.name.trim()) return toast("Name: darf nicht leer sein.", "fehler");
  const id = erg.id.trim() || "lokal-" + dateiname(erg.name, "").toLowerCase() + "-" + Date.now().toString(36).slice(-4);
  if (LIB.eintraege.has(id)) return toast("Diese ID gibt es schon.", "fehler");
  const e = { id, name: erg.name.trim(), kategorie: LIB_TYPEN[erg.typ], attribute: { hersteller: "", led: { typ: erg.typ } } };
  LIB.eintraege.set(id, e); LIB.herkunft.set(id, "lokal"); libSichern();
  ui.libSel = id; libEntwurf = null;
  renderLibrary();
}

function libraryEreignisse() {
  $("#lib-liste").addEventListener("click", async e => {
    const sel = e.target.closest("[data-lib-sel]");
    if (sel) {
      if (libEntwurf && JSON.stringify(libEntwurf) !== JSON.stringify(LIB.eintraege.get(libEntwurf.id)) && !confirm("Ungespeicherte Änderungen am Eintrag verwerfen?")) return;
      ui.libSel = sel.dataset.libSel; libEntwurf = null; return renderLibrary();
    }
    const a = e.target.closest("[data-l]")?.dataset.l;
    if (a === "neu") libNeu();
    if (a === "export") herunterladen(libExport(), "ledplaner_library.ledlibrary.json");
    if (a === "import") {
      const f = await waehleDatei($("#datei-library")); if (!f) return;
      try { const n = libImport(f.text); toast(`${n} Einträge importiert.`, "ok"); renderLibrary(); }
      catch (err) { toast("Import fehlgeschlagen: " + err.message, "fehler"); }
    }
  });
  $("#lib-liste").addEventListener("input", e => {
    if (e.target.id === "lib-suche") { ui.libFilter = e.target.value; const pos = e.target.selectionStart; renderLibrary(); const s = $("#lib-suche"); s.focus(); s.setSelectionRange(pos, pos); }
  });
  $("#lib-liste").addEventListener("change", e => { if (e.target.id === "lib-offen") { ui.libNurOffen = e.target.checked; renderLibrary(); } });
  $("#lib-formular").addEventListener("change", e => {
    if (!e.target.dataset.pfad) return;
    if (libFeldUebernehmen(e.target) === false) return;
    renderLibrary();
  });
  $("#lib-formular").addEventListener("click", async e => {
    const a = e.target.closest("[data-l]")?.dataset.l; if (!a) return;
    const orig = LIB.eintraege.get(ui.libSel);
    if (a === "verwerfen") { libEntwurf = null; renderLibrary(); }
    if (a === "speichern") {
      const v = vollstaendigkeit(libEntwurf);
      if (v.pflichtFehlt.length) return toast("Pflicht fehlt: " + v.pflichtFehlt.join(", "), "fehler");
      LIB.eintraege.set(libEntwurf.id, klon(libEntwurf)); LIB.herkunft.set(libEntwurf.id, "lokal");
      libSichern();
      toast("Eintrag gespeichert.", "ok");
      if (P.library[libEntwurf.id] && confirm("Das Projekt nutzt diesen Eintrag. Projektkopie jetzt aktualisieren?")) { P.library[libEntwurf.id] = klon(libEntwurf); aenderung(); }
      renderLibrary();
    }
    if (a === "dup") {
      const n = klon(libEntwurf); n.id = "lokal-" + Date.now().toString(36); n.name = libEntwurf.name + " (Kopie)";
      LIB.eintraege.set(n.id, n); LIB.herkunft.set(n.id, "lokal"); libSichern();
      ui.libSel = n.id; libEntwurf = null; renderLibrary();
    }
    if (a === "loeschen") {
      if (P.library[orig.id] && !confirm("Das Projekt nutzt diesen Eintrag (Kopie bleibt im Projekt). Trotzdem aus der Library löschen?")) return;
      if (!P.library[orig.id] && !confirm(`„${orig.name}“ aus der Library löschen?`)) return;
      LIB.eintraege.delete(orig.id); LIB.herkunft.delete(orig.id); libSichern();
      ui.libSel = null; libEntwurf = null; renderLibrary();
    }
    if (a === "projekt-aktualisieren") { P.library[orig.id] = klon(orig); aenderung(); }
    if (a === "gen-kanaele") {
      const erg = await formularDialog("Kanäle und Ausgänge erzeugen", [
        { name: "anzahl", label: "Anzahl Kanäle", art: "zahl", wert: 24 },
        { name: "je", label: "Kanäle je Ausgang", art: "zahl", wert: 6 },
        { name: "stecker", label: "Stecker der Ausgänge", wert: "Harting 16-pol" },
        { name: "ampere", label: "Absicherung je Kanal (A)", art: "zahl", wert: 16 },
        { name: "char", label: "Charakteristik", art: "auswahl", wert: "C", optionen: [["B", "B"], ["C", "C"], ["D", "D"]] },
        { name: "phasen", label: "Phasen", art: "auswahl", wert: "unbekannt", optionen: [["unbekannt", "unbekannt (später ergänzen)"], ["reihum", "L1/L2/L3 reihum"]] },
      ], "Erzeugen");
      if (!erg || !(erg.anzahl > 0 && erg.je > 0)) return;
      const k = kanaeleErzeugen(Math.round(erg.anzahl), Math.round(erg.je), erg.ampere || 16, erg.char, "30 mA Typ A", erg.phasen === "reihum" ? i => "L" + (((i - 1) % 3) + 1) : null);
      k.ausgaenge.forEach(a => { a.stecker = erg.stecker; a.name = a.name.replace("Harting", erg.stecker.split(" ")[0]); });
      k.kanaele.forEach(x => { x.ausgang = x.ausgang.replace("Harting", erg.stecker.split(" ")[0]); });
      libEntwurf.attribute.led.kanaele = k.kanaele; libEntwurf.attribute.led.ausgaenge = k.ausgaenge;
      libEntwurf.attribute.led.phasenBekannt = erg.phasen === "reihum";
      renderLibrary();
    }
  });
}
