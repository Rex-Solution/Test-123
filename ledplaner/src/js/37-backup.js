/* Signal: Bereich „Backup“ (jedem Haupt-Port sein Backup zuweisen) und Karten für Stageboxen/Multicores
   in der Übersicht „Alle Prozessoren“. */

/* ---------- Backup ---------- */
/* Mögliche Backup-Ports eines Strangs: freie Ports desselben Prozessors (nicht anderen Wänden zugewiesen) + der eigene */
function backupKandidaten(k) {
  const g = geraetById(k.prozessor); if (!g) return [];
  const belegt = belegtePorts(g.id);
  return prozessorPorts(g).map(p => p.nr).filter(n => n === k.backupPort || (!belegt.has(n) && (portScreen(g.id, n) || k.screen) === k.screen));
}
function backupSetzen(k, nr) {
  if (nr != null && !backupKandidaten(k).includes(nr)) return toast(`Port ${nr} ist nicht frei.`, "fehler");
  k.backupPort = nr;
  if (nr != null) { const s = screenById(k.screen); const z = zuweisung(s); const t = zielText(k.prozessor, nr); if (!z.signal.includes(t) && portScreen(k.prozessor, nr) !== s.id) z.signal.push(t); }
  aenderung();
}
/* Allen Strängen ohne Backup automatisch einen freien Port geben (zugewiesene der Wand zuerst, sonst von hinten) */
function backupAutomatisch() {
  let n = 0;
  for (const k of P.straenge.filter(k => !Number.isFinite(k.backupPort))) {
    const s = screenById(k.screen);
    const frei = backupKandidaten(k).filter(x => x !== k.port);
    // Reihenfolge: über dieselbe Stagebox/denselben Multicore wie der Haupt-Port, dann der Wand zugewiesen, dann von hinten
    const weg = portWeg(k.prozessor, k.port);
    const gleicherWeg = frei.filter(n => portWeg(k.prozessor, n) === weg);
    const eigen = freieZugewiesenePorts(s).filter(x => x.g.id === k.prozessor && frei.includes(x.nr)).map(x => x.nr);
    const nr = gleicherWeg[gleicherWeg.length - 1] ?? eigen[eigen.length - 1] ?? frei[frei.length - 1];
    if (nr != null) { k.backupPort = nr; n++; }
  }
  aenderung();
  toast(n ? `${n} Backup-Ports zugewiesen.` : "Kein freier Port für Backups gefunden.", n ? "ok" : "fehler");
}
function backupUebersicht(el) {
  el.classList.add("liste-modus");
  const st = [...P.straenge].sort((a, b) => P.screens.indexOf(screenById(a.screen)) - P.screens.indexOf(screenById(b.screen)) || P.geraete.indexOf(geraetById(a.prozessor)) - P.geraete.indexOf(geraetById(b.prozessor)) || a.port - b.port);
  if (!st.length) return void (el.innerHTML = `<p class="leise">Noch keine Datenstränge – im Bereich „Wand“ anlegen.</p>`);
  el.innerHTML = `<div class="karte" style="max-width:980px"><div class="knopfreihe"><h2 style="margin:0">Backup</h2><span class="fueller"></span>
      <button data-d="backup-auto">Fehlende automatisch zuweisen</button></div>
    <p class="klein leise">Jedem Haupt-Port einen Backup-Port zuweisen. Das Backup läuft denselben Weg und speist am Strangende ein.</p>
    <table><tr><th>Screen</th><th>Strang</th><th>Prozessor</th><th>Haupt-Port</th><th>Weg</th><th>Backup-Port</th><th>Weg Backup</th></tr>
    ${st.map(k => {
      const g = geraetById(k.prozessor);
      const wegH = portWeg(k.prozessor, k.port), wegB = Number.isFinite(k.backupPort) ? portWeg(k.prozessor, k.backupPort) : null;
      return `<tr data-backup-strang="${k.id}"><td>${esc(screenById(k.screen)?.name || "—")}</td><td><span class="punkt" style="background:${strangFarbe(k)}"></span>${strangName(k)}</td><td>${esc(g?.name || "—")}</td><td>${k.port}</td>
        <td>${esc(wegH ? wegH.name : "direkt")}</td>
        <td><select data-backup-port="${k.id}"><option value="">— kein Backup —</option>${backupKandidaten(k).filter(n => n !== k.port).map(n => `<option value="${n}"${k.backupPort === n ? " selected" : ""}>Port ${n}</option>`).join("")}</select></td>
        <td>${Number.isFinite(k.backupPort) ? esc(wegB ? wegB.name : "direkt") + (wegB !== wegH ? ' <span class="badge teil">anderer Weg</span>' : "") : "—"}</td></tr>`;
    }).join("")}</table></div>`;
}

/* ---------- Stageboxen/Multicores in „Alle Prozessoren“ ---------- */
function wegKarteUebersicht(d) {
  const g = geraetById(d.prozessor); const kap = wegKapazitaet(d) || d.ports.length;
  const farbe = d.art === "stagebox" ? "#4da3ff" : "#63e6be";
  const zellen = [];
  for (let i = 0; i < Math.max(kap, d.ports.length); i++) {
    const nr = d.ports[i];
    const k = nr != null ? portStrang(d.prozessor, nr) : null;
    if (nr == null) { zellen.push(`<div class="port frei"><b>${d.art === "stagebox" ? "Aus" : "Ader"} ${i + 1}</b><br>frei</div>`); continue; }
    const backup = k && k.backupPort === nr;
    zellen.push(`<div class="port" style="border-color:${k ? strangFarbe(k) : "var(--linie)"}${backup ? ";border-style:dashed" : ""}"><b>${d.art === "stagebox" ? "Aus" : "Ader"} ${i + 1}</b><br>← Port ${nr}${k ? `<br>${backup ? "Backup " + strangName(k) : strangName(k)} · ${esc(screenById(k.screen)?.name || "")}` : "<br>ohne Strang"}</div>`);
  }
  return `<div class="karte weg-karte" style="border-left:4px solid ${farbe}"><div class="knopfreihe"><h2 style="margin:0">${esc(wegKurz(d))} · ${esc(d.name)}</h2><span class="fueller"></span><span class="badge" style="border-color:${farbe};color:${farbe}">${d.art === "stagebox" ? "Stagebox" : "Multicore"}</span></div>
    <p class="klein leise">${esc(eintrag(d.lib)?.name || "Library-Eintrag fehlt")} · an ${esc(g?.name || "—")} · ${esc(d.standort || "")}${d.art === "stagebox" ? ` · Strom: ${d.strom ? esc(geraetById(d.strom.verteiler)?.name || "") + " K" + d.strom.kanal : '<span style="color:var(--warnung)">nicht versorgt</span>'}` : ""}</p>
    <div class="label">${d.art === "stagebox" ? "Ausgänge" : "Adern"} (${d.ports.length} / ${fmt(kap)} belegt)</div><div class="portgitter">${zellen.join("")}</div></div>`;
}
