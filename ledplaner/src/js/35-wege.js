/* Signalwege zur Wand: Stagebox (aktiv, braucht Strom) und Multicore (passiv) als eigene Geräte.
   Jedes Gerät hängt an einem Prozessor und führt bestimmte Prozessor-Ports (Haupt oder Backup).
   Ports, die keinem Gerät zugeordnet sind, gehen direkt per Cat vom Prozessor zur Wand. */

const WEG_ARTEN = { stagebox: "Stagebox", multicore: "Multicore" };
const WEG_MEHRZAHL = { stagebox: "Stageboxen", multicore: "Multicores" };

function istWeg(g) { return !!g && g.art in WEG_ARTEN; }
function wegGeraete(gId) { return P.geraete.filter(d => istWeg(d) && d.prozessor === gId); }
/* Weg eines Ports: eigene Stagebox/Multicore des Geräts oder Adern am Multicore des Haupt-Controllers (d.backupPorts) */
function portWeg(gId, nr) {
  return P.geraete.find(d => istWeg(d) && ((d.prozessor === gId && d.ports.includes(nr))
    || ((d.backupPorts || []).includes(nr) && backupController(geraetById(d.prozessor))?.id === gId))) || null;
}
/* Belegung eines Wegs in Reihenfolge: eigene Ports, dann Ports des Backup-Controllers */
function wegBelegung(d) {
  const bc = backupController(geraetById(d.prozessor));
  return [...d.ports.map(nr => ({ g: d.prozessor, nr })), ...(bc ? (d.backupPorts || []).map(nr => ({ g: bc.id, nr })) : [])];
}
function wegLed(d) { return eintrag(d.lib)?.attribute?.led || {}; }
function wegKapazitaet(d) { const led = wegLed(d); return (d.art === "stagebox" ? led.ports : led.adern) ?? null; }
function wegKurz(d) { return (d.art === "stagebox" ? "SB" : "MC") + (P.geraete.filter(x => x.art === d.art).indexOf(d) + 1); }
/* Ausgang des Wegs, an dem ein Port an der Wand ankommt (1-basiert, Reihenfolge der Zuordnung) */
function wegAusgang(d, nr, gId = d.prozessor) { return wegBelegung(d).findIndex(e => e.g === gId && e.nr === nr) + 1; }

/* Belegte Ports eines Prozessors in Port-Reihenfolge */
function genutztePorts(gId) { return [...belegtePorts(gId)].sort((a, b) => a - b); }

function wegAnlegen(art, libId, gId) {
  const g = geraetById(gId);
  if (!g || g.art !== "prozessor") return toast("Zuerst einen Prozessor wählen.", "fehler");
  nutzeEintrag(libId);
  const n = P.geraete.filter(x => x.art === art).length + 1;
  const cat = libListe("kabel").find(e => e.attribute.led.farbsystem === "LAN")?.id || null;
  const fiber = libListe("kabel").find(e => e.attribute.led.farbsystem === "Fiber")?.id || null;
  for (const id of [cat, fiber]) if (id) nutzeEintrag(id);
  const d = { id: neueId(art === "stagebox" ? "sb" : "mc"), art, lib: libId, name: `${WEG_ARTEN[art]} ${n}`, prozessor: gId, ports: [],
    standort: "an der Wand", ausgangKabel: cat, ausgangLaengeM: null };
  if (art === "stagebox") Object.assign(d, { zuleitung: { kabel: fiber, laengeM: g.portLaengeM ?? null, anzahl: 1 }, strom: null });
  P.geraete.push(d);
  wegPortsAuffuellen(d);
  ui.sel.prozessor = gId; ui.sel.weg = d.id;
  aenderung();
  toast(`${d.name} an ${g.name} angelegt${d.ports.length ? ` – Ports ${d.ports.join(", ")}` : ""}.`, "ok");
  return d;
}

/* Freie (belegte, aber noch keinem Weg zugeordnete) Ports bis zur Kapazität übernehmen */
function wegPortsAuffuellen(d) {
  const kap = wegKapazitaet(d) ?? Infinity;
  const blk = portBloecke(geraetById(d.prozessor)).find(b => b.box === d);   /* Prozessor ohne eigene Ports: nur Ports der eigenen Stagebox */
  for (const nr of genutztePorts(d.prozessor)) {
    if (d.ports.length >= kap) break;
    if (blk && (nr < blk.von || nr > blk.bis)) continue;
    if (!portWeg(d.prozessor, nr)) d.ports.push(nr);
  }
}

/* Nach neuen Strängen: nicht mehr genutzte Ports entfernen, freie Ports auffüllen */
function wegeAbgleichen(gId) {
  const genutzt = belegtePorts(gId);
  const wege = wegGeraete(gId);
  for (const d of wege) d.ports = d.ports.filter(nr => genutzt.has(nr));
  for (const d of wege) wegPortsAuffuellen(d);
}

function wegLoeschen(d) {
  if (!confirm(`„${d.name}“ löschen? Die Ports gehen dann direkt vom Prozessor zur Wand.`)) return;
  P.geraete = P.geraete.filter(x => x !== d);
  ui.sel.weg = null;
  aenderung();
}

/* Freie Kanäle aller Verteiler für ein Gerät (eigener Kanal bleibt wählbar) */
function kanalAuswahl(g) {
  const liste = [];
  for (const v of P.geraete.filter(x => x.art === "verteiler")) {
    const belegt = belegteKanaele(v.id);
    for (const ka of verteilerLed(v).kanaele || []) if (!belegt.has(ka.nr) || (g.strom?.verteiler === v.id && g.strom.kanal === ka.nr)) liste.push([`${v.id}|${ka.nr}`, `${v.name} · Kanal ${ka.nr}`]);
  }
  return liste;
}
function kanalSelect(g, attr) {
  return `<select ${attr}><option value="">— nicht zugeordnet —</option>${kanalAuswahl(g).map(([w, t]) => `<option value="${w}"${g.strom && `${g.strom.verteiler}|${g.strom.kanal}` === w ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
}

/* Port-Liste „1, 2, 5-7“ lesen */
function lesePortListe(text) {
  const erg = [];
  for (const teil of String(text).split(/[,;\s]+/).filter(Boolean)) {
    const m = teil.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return null;
    const a = Number(m[1]), b = Number(m[2] || m[1]);
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (!erg.includes(i)) erg.push(i);
  }
  return erg;
}

/* ---------- Oberfläche (rechte Spalte im Reiter Signal) ---------- */
function wegeKarte(g) {
  const wege = wegGeraete(g.id);
  const direkt = genutztePorts(g.id).filter(nr => !portWeg(g.id, nr));
  const sb = libListe("stagebox"), mc = libListe("multicore");
  return `<div class="karte"><div class="label">Wege zur Wand · ${esc(g.name)}</div>
    <table class="werte">${wege.map(d => `<tr class="klickbar${ui.sel.weg === d.id ? " sel" : ""}" data-weg-sel="${d.id}"><td>${esc(d.name)}</td><td>${d.ports.length ? "Ports " + d.ports.join(", ") : '<span class="leise">keine Ports</span>'}</td></tr>`).join("")}
    <tr><td>direkt (Cat)</td><td>${direkt.length ? "Ports " + direkt.join(", ") : '<span class="leise">—</span>'}</td></tr></table>
    <div style="display:grid;gap:6px;margin-top:8px"><select data-w-neu="stagebox"><option value="">+ Stagebox …</option>${sb.map(e => `<option value="${e.id}" ${eintragNutzbar(e) ? "" : "disabled"}>${esc(e.name)}${eintragNutzbar(e) ? "" : " (Pflichtfeld fehlt)"}</option>`).join("")}</select>
    <select data-w-neu="multicore"><option value="">+ Multicore …</option>${mc.map(e => `<option value="${e.id}" ${eintragNutzbar(e) ? "" : "disabled"}>${esc(e.name)}${eintragNutzbar(e) ? "" : " (Pflichtfeld fehlt)"}</option>`).join("")}</select></div></div>`;
}

function wegKarte(d) {
  const led = wegLed(d); const kap = wegKapazitaet(d);
  const kabel = art => libListe("kabel").filter(e => e.attribute.led.gewerk === "signal" && (!art || e.attribute.led.farbsystem === art));
  const kabelSel = (feld, wert, liste) => `<select data-w-feld="${feld}"><option value="">—</option>${liste.map(e => `<option value="${e.id}"${wert === e.id ? " selected" : ""}>${esc(e.name)}</option>`).join("")}</select>`;
  let html = `<div class="karte"><div class="label">${esc(d.name)} · ${esc(eintrag(d.lib)?.name || "Library-Eintrag fehlt")}</div>
    <label class="feld"><span>Name *</span><input data-w-feld="name" value="${esc(d.name)}"></label>
    <label class="feld"><span>Standort</span><input data-w-feld="standort" value="${esc(d.standort || "")}"></label>
    <label class="feld"><span>Ports des Prozessors (z.B. 1-4, 6)</span><input data-w-feld="ports" value="${d.ports.join(", ")}"></label>
    ${d.art === "multicore" && backupController(geraetById(d.prozessor)) ? `<label class="feld"><span>Adern für Backup-Controller ${esc(backupController(geraetById(d.prozessor)).name)} (Ports)</span><input data-w-feld="backupPorts" value="${(d.backupPorts || []).join(", ")}"></label>
      <div class="knopfreihe" style="margin:-4px 0 8px"><button data-w="backup-spiegeln">Backup-Ports übernehmen</button></div>` : ""}
    <div class="knopfreihe" style="margin:-4px 0 8px"><button data-w="auffuellen" ${kap && d.ports.length >= kap ? "disabled" : ""}>Freie Ports übernehmen</button><span class="klein leise">${d.ports.length} / ${fmt(kap)} ${d.art === "stagebox" ? "Ausgänge" : "Adern"}</span></div>`;
  if (d.art === "stagebox") {
    html += `<div class="abschnitt">Zuleitung vom Prozessor</div>
      <label class="feld"><span>Kabel</span>${kabelSel("zuleitung.kabel", d.zuleitung?.kabel, kabel())}</label>
      <div class="zwei"><label class="feld"><span>Länge (m)</span><input data-w-feld="zuleitung.laengeM" value="${d.zuleitung?.laengeM ?? ""}" inputmode="decimal"></label>
      <label class="feld"><span>Anzahl</span><input data-w-feld="zuleitung.anzahl" value="${d.zuleitung?.anzahl ?? 1}" inputmode="numeric"></label></div>
      <label class="feld"><span>Strom für die Stagebox</span>${kanalSelect(d, 'data-w-feld="strom"')}</label>`;
  } else {
    html += `<table class="werte"><tr><td>Länge Multicore</td><td>${led.laengeM != null ? fmtFlex(led.laengeM) + " m" : "—"}</td></tr><tr><td>Auflösung</td><td>${esc(led.aufloesung || "—")}</td></tr></table>`;
  }
  html += `<div class="abschnitt">${d.art === "stagebox" ? "Ausgänge" : "Auflösung"} → Wand</div>
    <label class="feld"><span>Kabel</span>${kabelSel("ausgangKabel", d.ausgangKabel, kabel("LAN"))}</label>
    <label class="feld"><span>Länge (m) – leer: aus Position in der Wand</span><input data-w-feld="ausgangLaengeM" value="${d.ausgangLaengeM ?? ""}" inputmode="decimal"></label>
    <div class="knopfreihe" style="margin-top:8px"><button data-w="loeschen" class="gefahr">${WEG_ARTEN[d.art]} löschen</button></div></div>`;
  return html;
}

function wegAendern(d, feld, w) {
  if (feld === "name") { if (!w.trim()) { toast("Name: darf nicht leer sein.", "fehler"); return render(); } d.name = w; }
  else if (feld === "standort") d.standort = w;
  else if (feld === "backupPorts") {
    const bc = backupController(geraetById(d.prozessor)); const liste = lesePortListe(w);
    if (!bc || !liste) { toast("Ports: Zahlen mit Komma, Bereiche mit Bindestrich.", "fehler"); return render(); }
    const fremd = liste.find(nr => !prozessorPorts(bc).some(p => p.nr === nr) || (portWeg(bc.id, nr) && portWeg(bc.id, nr) !== d));
    if (fremd != null) { toast(`Port ${fremd} des Backup-Controllers gibt es nicht oder läuft schon über einen anderen Weg.`, "fehler"); return render(); }
    d.backupPorts = liste;
  }
  else if (feld === "ports") {
    const liste = lesePortListe(w);
    const g = geraetById(d.prozessor); const vorhanden = new Set(prozessorPorts(g).map(p => p.nr));
    if (!liste) { toast("Ports: Zahlen mit Komma, Bereiche mit Bindestrich (z.B. 1-4, 6).", "fehler"); return render(); }
    const fremd = liste.find(nr => !vorhanden.has(nr));
    if (fremd != null) { toast(`Port ${fremd} gibt es an ${g.name} nicht.`, "fehler"); return render(); }
    const doppelt = liste.find(nr => { const x = portWeg(d.prozessor, nr); return x && x !== d; });
    if (doppelt != null) { toast(`Port ${doppelt} läuft schon über ${portWeg(d.prozessor, doppelt).name}.`, "fehler"); return render(); }
    d.ports = liste;
  }
  else if (feld === "strom") d.strom = w ? { verteiler: w.split("|")[0], kanal: Number(w.split("|")[1]) } : null;
  else if (feld === "ausgangLaengeM" || feld === "zuleitung.laengeM" || feld === "zuleitung.anzahl") {
    const z = w.trim() === "" ? null : leseZahl(w);
    if (Number.isNaN(z) || (z != null && z < (feld === "zuleitung.anzahl" ? 1 : 0))) { toast(feld === "zuleitung.anzahl" ? "Anzahl: ganze Zahl ab 1." : "Länge: Zahl in Metern.", "fehler"); return render(); }
    setzePfad(d, feld, feld === "zuleitung.anzahl" ? Math.round(z ?? 1) : z);
  }
  else if (feld === "ausgangKabel" || feld === "zuleitung.kabel") { if (w) nutzeEintrag(w); setzePfad(d, feld, w || null); }
  aenderung();
}

/* ---------- Prüfungen ---------- */
function wegePruefungen() {
  const liste = [];
  for (const g of P.geraete.filter(x => x.art === "prozessor" && prozessorLed(x).portsUeberStagebox)) {
    const vorhanden = new Set(prozessorPorts(g).map(p => p.nr));
    const ohne = [...belegtePorts(g.id)].filter(nr => !vorhanden.has(nr)).sort((a, b) => a - b);
    if (ohne.length) liste.push({ art: "fehler", text: `${g.name}: Port ${ohne.join(", ")} belegt, aber keine Stagebox liefert diese Ports – Stagebox anlegen oder Stränge verschieben.`, ziel: "prozessor:" + g.id });
    else if (!vorhanden.size) liste.push({ art: "info", text: `${g.name}: Ports kommen von einer Stagebox – zuerst eine anlegen.`, ziel: "prozessor:" + g.id });
  }
  for (const d of P.geraete.filter(istWeg)) {
    const g = geraetById(d.prozessor); const z = "weg:" + d.id;
    if (!g) { liste.push({ art: "fehler", text: `${d.name}: Prozessor fehlt.`, ziel: z }); continue; }
    const e = eintrag(d.lib);
    if (!e) liste.push({ art: "warn", text: `${d.name}: Library-Eintrag fehlt – Gerät aus der Library wählen.`, ziel: z });
    else if (!eintragNutzbar(e)) liste.push({ art: "warn", text: `${d.name}: Pflichtfelder im Library-Eintrag „${e.name}“ fehlen.`, ziel: "library:" + d.lib });
    const kap = wegKapazitaet(d);
    const belegung = wegBelegung(d).length;
    if (kap != null && belegung > kap) liste.push({ art: "warn", text: `${d.name}: ${belegung} Ports, aber nur ${kap} ${d.art === "stagebox" ? "Ausgänge" : "Adern"}.`, ziel: z });
    const genutzt = belegtePorts(g.id);
    const leer = d.ports.filter(nr => !genutzt.has(nr));
    if (leer.length) liste.push({ art: "info", text: `${d.name}: Port ${leer.join(", ")} ohne Strang.`, ziel: z });
    if (!wegBelegung(d).length) liste.push({ art: "info", text: `${d.name}: keine Ports zugeordnet – wird es gebraucht?`, ziel: z });
    for (const nr of d.ports) for (const x of wegGeraete(g.id)) if (x !== d && x.ports.includes(nr) && P.geraete.indexOf(x) > P.geraete.indexOf(d)) liste.push({ art: "fehler", text: `${g.name} · Port ${nr}: in ${d.name} und ${x.name} zugeordnet.`, ziel: z });
    if (d.art === "stagebox") {
      if (!d.strom) liste.push({ art: "warn", text: `${d.name}: Stromversorgung nicht zugeordnet (aktives Gerät).`, ziel: z });
      if (!Number.isFinite(d.zuleitung?.laengeM)) liste.push({ art: "warn", text: `${d.name}: Länge der Zuleitung vom Prozessor fehlt.`, ziel: z });
      const pxMax = wegLed(d).pxJePort;
      for (const k of P.straenge.filter(k => k.prozessor === g.id && d.ports.includes(k.port))) {
        if (pxMax && strangPixel(k) > pxMax) liste.push({ art: "warn", text: `${d.name}: ${strangName(k)} mit ${fmt(strangPixel(k))} px über ${fmt(pxMax)} px je Ausgang.`, ziel: z });
      }
    } else {
      const lang = (wegLed(d).laengeM || 0) + (d.ausgangLaengeM || 0);
      if (lang > P.regeln.catMax) liste.push({ art: "warn", text: `${d.name}: Cat-Strecke ${fmtFlex(lang)} m über ${fmt(P.regeln.catMax)} m.`, ziel: z });
    }
  }
  for (const g of P.geraete.filter(x => x.art === "prozessor")) {
    if (!wegGeraete(g.id).length) continue;
    const direkt = genutztePorts(g.id).filter(nr => !portWeg(g.id, nr));
    if (direkt.length) liste.push({ art: "info", text: `${g.name}: Port ${direkt.join(", ")} direkt per Cat (nicht über Stagebox/Multicore).`, ziel: "prozessor:" + g.id });
  }
  return liste;
}
