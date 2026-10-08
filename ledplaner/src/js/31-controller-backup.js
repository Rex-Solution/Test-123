/* Controller-Backup: ein ganzer Prozessor als Backup eines anderen.
   prozessor.backupController = <Prozessor-ID> | null. Dann speist Port N des Backup-Controllers am Ende von Strang N ein
   (strang.backupGeraet = Backup-Controller, strang.backupPort = N); Port-Backups am Haupt-Controller entfallen.
   Der Backup-Controller speist über eigene Kabel (direkt), eine eigene Stagebox/Multicore oder freie Adern am
   Multicore des Haupt-Controllers (weg.backupPorts) ein. */

function backupController(g) { return g?.backupController ? geraetById(g.backupController) : null; }
function hauptVon(b) { return b ? P.geraete.find(x => x.art === "prozessor" && x.backupController === b.id) || null : null; }
function backupGeraetId(k) { return k.backupGeraet || k.prozessor; }
/* Wer nutzt Port nr an Gerät gId? → { strang, rolle: "haupt" | "backup" } */
function strangeAnPort(gId, nr) {
  for (const k of P.straenge) {
    if (k.prozessor === gId && k.port === nr) return { strang: k, rolle: "haupt" };
    if (Number.isFinite(k.backupPort) && backupGeraetId(k) === gId && k.backupPort === nr) return { strang: k, rolle: "backup" };
  }
  return null;
}
function prozessorKurz(gId) { const ps = P.geraete.filter(g => g.art === "prozessor"); return `Pr${ps.findIndex(p => p.id === gId) + 1}`; }
function backupName(k) {
  if (!Number.isFinite(k.backupPort)) return null;
  const fremd = backupGeraetId(k) !== k.prozessor;
  return (fremd || P.geraete.filter(g => g.art === "prozessor").length > 1 ? prozessorKurz(backupGeraetId(k)) + "·" : "") + "B" + k.backupPort;
}

function controllerBackupSetzen(g, bId) {
  const b = bId ? geraetById(bId) : null;
  if (b) {
    if (b === g) return toast("Ein Controller kann nicht sein eigenes Backup sein.", "fehler");
    if (hauptVon(g)) return toast(`${g.name} ist selbst Backup-Controller von ${hauptVon(g).name}.`, "fehler");
    const anderer = hauptVon(b);
    if (anderer && anderer !== g) return toast(`${b.name} ist schon Backup von ${anderer.name}.`, "fehler");
    if (P.straenge.some(k => k.prozessor === b.id)) return toast(`${b.name} hat eigene Datenstränge – als Backup-Controller nur ein freier Prozessor.`, "fehler");
  }
  g.backupController = b ? b.id : null;
  const portsB = b ? new Set(prozessorPorts(b).map(p => p.nr)) : null;
  let fehlt = 0;
  for (const k of P.straenge.filter(k => k.prozessor === g.id)) {
    if (b) { k.backupGeraet = b.id; k.backupPort = portsB.has(k.port) ? k.port : null; if (!portsB.has(k.port)) fehlt++; }
    else if (k.backupGeraet) { k.backupGeraet = null; k.backupPort = null; }
  }
  aenderung();
  toast(b ? `${b.name} ist Backup-Controller von ${g.name} – Port N speist am Ende von Strang N ein.${fehlt ? ` ${fehlt} Ports fehlen am Backup-Controller.` : ""}`
    : `Controller-Backup von ${g.name} aufgehoben – Port-Backups neu zuweisen (Bereich „Backup“).`, b && !fehlt ? "ok" : "info");
}
function backupControllerAnlegen(g) {
  const b = prozessorAnlegen(g.lib);
  b.name = g.name + " Backup"; b.standort = g.standort; b.portKabel = g.portKabel; b.portLaengeM = g.portLaengeM;
  ui.sel.prozessor = g.id;
  controllerBackupSetzen(g, b.id);
}

/* Karte (Prozessor) und Zeile (Bereich Backup) */
function controllerBackupHtml(g) {
  const haupt = hauptVon(g);
  if (haupt) return `<div class="hinweis info">Backup-Controller von <b>${esc(haupt.name)}</b>: Port N speist am Ende von dessen Strang N ein.</div>
    <button data-cb-aufheben="${haupt.id}">Controller-Backup aufheben</button>`;
  const andere = P.geraete.filter(x => x.art === "prozessor" && x !== g && !hauptVon(x) && !x.backupController && !P.straenge.some(k => k.prozessor === x.id));
  const b = backupController(g);
  return `<label class="feld"><span>Backup-Controller (ganzer Prozessor)</span><select data-cb-wahl="${g.id}"><option value="">— keiner (Port-Backup) —</option>
    ${[...(b ? [b] : []), ...andere].map(x => `<option value="${x.id}"${b === x ? " selected" : ""}>${esc(x.name)}${x.lib !== g.lib ? " – anderer Typ" : ""}</option>`).join("")}</select></label>
    ${b ? "" : `<button data-cb-neu="${g.id}">+ Backup-Controller anlegen (${esc(eintrag(g.lib)?.name || "gleicher Typ")})</button>`}`;
}
function controllerBackupEreignisse(el) {
  el.addEventListener("change", e => {
    const w = e.target.dataset.cbWahl; if (!w) return;
    controllerBackupSetzen(geraetById(w), e.target.value || null);
  });
  el.addEventListener("click", e => {
    const neu = e.target.closest("[data-cb-neu]"); if (neu) return backupControllerAnlegen(geraetById(neu.dataset.cbNeu));
    const auf = e.target.closest("[data-cb-aufheben]"); if (auf) return controllerBackupSetzen(geraetById(auf.dataset.cbAufheben), null);
  });
}

function controllerBackupPruefungen() {
  const liste = [];
  for (const g of P.geraete.filter(x => x.art === "prozessor" && x.backupController)) {
    const b = backupController(g); const z = "prozessor:" + g.id;
    if (!b) { liste.push({ art: "fehler", text: `${g.name}: Backup-Controller fehlt.`, ziel: z }); continue; }
    if (b.lib !== g.lib) liste.push({ art: "warn", text: `${b.name}: anderer Typ als ${g.name} – Kapazität und Receiving Cards prüfen.`, ziel: "prozessor:" + b.id });
    const ohne = P.straenge.filter(k => k.prozessor === g.id && !Number.isFinite(k.backupPort));
    if (ohne.length) liste.push({ art: "warn", text: `${b.name}: Port ${ohne.map(k => k.port).join(", ")} fehlt – Strang ohne Backup.`, ziel: "prozessor:" + b.id });
    if ((P.outputs || []).some(o => o.prozessor === g.id) && !(P.outputs || []).some(o => o.prozessor === b.id))
      liste.push({ art: "info", text: `${b.name}: braucht dasselbe Videosignal wie ${g.name} – Output im Reiter Ausgabe verbinden.`, ziel: "prozessor:" + b.id });
  }
  return liste;
}
