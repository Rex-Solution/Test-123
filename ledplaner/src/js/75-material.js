/* Materialliste des Projekts: LED-Module, Rigging, Geräte und Kabel (aus der Packliste) je Library-Eintrag.
   Rückgabe ans Rex-System (Datenbank-Agent) oder als Datei. */

const MATERIAL_GRUPPEN = ["LED-Module", "Rigging", "Geräte", "Kabel"];

function materialListe() {
  const pos = new Map();
  const add = (gruppe, lib, anzahl, laengeM = null, bemerkung = "") => {
    if (!anzahl) return;
    const k = `${gruppe}|${lib || "?"}|${laengeM ?? ""}|${lib ? "" : bemerkung}`;
    const e = eintrag(lib);
    const p = pos.get(k) || { gruppe, materialId: lib || null, name: e?.name || bemerkung || "ohne Library-Eintrag", kategorie: e?.kategorie || "",
      anzahl: 0, laengeM, gewichtKg: null, herkunft: lib ? LIB.herkunft.get(lib) || "projekt" : null };
    p.anzahl += anzahl;
    const kg = e?.attribute?.gewicht;
    p.gewichtKg = Number.isFinite(kg) ? kg * p.anzahl : null;
    pos.set(k, p);
  };
  for (const s of P.screens) {
    const n = new Map();
    for (const m of s.module) n.set(m.lib, (n.get(m.lib) || 0) + 1);
    for (const [lib, a] of n) add("LED-Module", lib, a);
    const r = riggingDaten(s);
    for (const ra of r.rahmen) add("Rigging", ra.lib.id, 1);
  }
  for (const g of P.geraete) {
    if (g.art === "einspeisung" || g.art === "multicore") continue; // Multicore steht als Kabel in der Packliste
    add("Geräte", g.lib, 1, null, `${g.name} (${g.art})`);
  }
  for (const z of packliste(kabelListe())) add("Kabel", z.lib, z.anzahl, z.laengeM, "Kabeltyp fehlt");
  const ordnung = g => MATERIAL_GRUPPEN.indexOf(g);
  return [...pos.values()].sort((a, b) => ordnung(a.gruppe) - ordnung(b.gruppe) || a.name.localeCompare(b.name, "de") || (a.laengeM ?? 0) - (b.laengeM ?? 0));
}

function materialDokument() {
  return { format: "rex-materialliste", formatVersion: 1, modul: KONFIG.MODUL, erstellt: new Date().toISOString(),
    projekt: { rexId: P.rexId || null, ...P.daten }, positionen: materialListe() };
}

function materialHinweise(liste) {
  const h = [];
  const ohne = liste.filter(p => !p.materialId);
  if (ohne.length) h.push({ art: "warn", text: `${ohne.length} Positionen ohne Library-Eintrag (z.B. Kabeltyp fehlt) – im Reiter Kabel ergänzen.` });
  if (liste.some(p => p.gruppe === "Kabel" && p.laengeM == null)) h.push({ art: "warn", text: "Kabel ohne Länge – im Reiter Kabel ergänzen." });
  if (Datenquelle.verbunden()) {
    const fremd = liste.filter(p => p.materialId && p.herkunft !== "rex");
    if (fremd.length) h.push({ art: "warn", text: `${fremd.length} Positionen nicht aus der Rex-Library (Beispiel oder lokal) – Rex kennt sie nicht.` });
  }
  return h;
}

function materialHtml() {
  const liste = materialListe();
  const kg = liste.reduce((a, p) => a + (p.gewichtKg || 0), 0);
  const kgOffen = liste.some(p => p.gruppe !== "Kabel" && p.gewichtKg == null);
  const hinweise = materialHinweise(liste);
  return `<div class="karte"><div class="knopfreihe"><h2 style="margin:0">Materialliste</h2><span class="fueller"></span>
      <button data-e="material-csv">CSV</button><button data-e="material-datei">Datei für Rex</button>
      <button data-e="material-rex" class="primaer" ${Datenquelle.verbunden() && !nurLesen() ? "" : "disabled"} title="${Datenquelle.verbunden() ? "An den Datenbank-Agent senden" : "Erst mit Rex-Anbindung möglich"}">An Rex übergeben</button></div>
    <p class="klein leise">Alles, was das Projekt braucht: Module, Rigging, Geräte und Kabel (wie Packliste). Gewicht ${fmt(kg, 1)} kg${kgOffen ? " + unbekannte Gewichte" : ""}.</p>
    ${hinweise.map(x => `<div class="hinweis ${x.art}">${esc(x.text)}</div>`).join("")}
    <table><tr><th>Gruppe</th><th>Material</th><th>Nr.</th><th class="zahl">Länge</th><th class="zahl">Anzahl</th><th class="zahl">Gewicht</th></tr>
    ${liste.map(p => `<tr><td>${esc(p.gruppe)}</td><td>${esc(p.name)}${p.herkunft === "beispiel" ? ' <span class="leise klein">· Beispiel</span>' : ""}</td><td class="klein leise">${esc(p.materialId || "—")}</td>
      <td class="zahl">${p.laengeM != null ? fmtFlex(p.laengeM) + " m" : "—"}</td><td class="zahl">${fmt(p.anzahl)}</td><td class="zahl">${p.gewichtKg != null ? fmt(p.gewichtKg, 1) + " kg" : "—"}</td></tr>`).join("")
      || `<tr><td colspan="6" class="leise">Noch kein Material im Projekt.</td></tr>`}</table></div>`;
}

async function materialAktion(a) {
  if (a === "material-csv") {
    const zeilen = materialListe().map(p => [p.gruppe, p.name, p.materialId || "", p.laengeM ?? "", p.anzahl, p.gewichtKg != null ? +p.gewichtKg.toFixed(2) : ""]);
    herunterladen(csvText(["Gruppe", "Material", "Materialnummer", "Länge (m)", "Anzahl", "Gewicht (kg)"], zeilen), dateiname(`${P.daten.titel}_material`, ".csv"), "text/csv");
  }
  if (a === "material-datei") herunterladen(JSON.stringify(materialDokument(), null, 2), dateiname(`${P.daten.titel}_material`, ".rexmaterial.json"));
  if (a === "material-rex") {
    if (nurLesen()) return toast("Nur ansehen – der LED-Planer ist für diesen Benutzer nicht freigeschaltet.", "fehler");
    try { await Datenquelle.materialZurueckgeben(materialDokument()); toast("Materialliste an Rex übergeben.", "ok"); }
    catch (e) { toast("Übergabe fehlgeschlagen: " + e.message, "fehler"); }
  }
}
