/* Projektbaum links: Überschriften öffnen die Übersicht (alle Screens, alle Verteiler/Einspeisungen, alle Prozessoren),
   Rechtsklick (Tablet: lange drücken) öffnet ein Kontextmenü zum Hinzufügen, Duplizieren und Löschen. */

const BAUM_GRUPPEN = {
  screens: () => { ui.reiter = "aufbau"; ui.modus.aufbau = "alle"; },
  strom: () => { ui.reiter = "strom"; ui.modus.strom = "verteiler"; },
  prozessoren: () => { ui.reiter = "signal"; ui.modus.signal = "prozessoren"; },
};

/* ---------- Kontextmenü ---------- */
function kontextMenue(x, y, eintraege) {
  kontextMenueZu();
  const m = document.createElement("div");
  m.className = "kontextmenue"; m.id = "kontextmenue";
  m.innerHTML = eintraege.map((e, i) => e.kopf ? `<div class="kopf">${esc(e.kopf)}</div>`
    : `<button data-km="${i}" class="${e.gefahr ? "gefahr" : ""}" ${e.aus ? "disabled" : ""}>${esc(e.t)}</button>`).join("");
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 8) + "px";
  m.style.top = Math.min(y, innerHeight - r.height - 8) + "px";
  m.addEventListener("click", e => {
    const b = e.target.closest("[data-km]"); if (!b) return;
    kontextMenueZu();
    eintraege[Number(b.dataset.km)].f();
  });
}
function kontextMenueZu() { $("#kontextmenue")?.remove(); }

function geraetDuplizieren(g) {
  const n = klon(g);
  n.id = neueId({ verteiler: "v", einspeisung: "e", prozessor: "p", stagebox: "sb", multicore: "mc" }[g.art] || "g");
  n.name = g.name + " (Kopie)";
  if (g.art === "prozessor" || g.art === "stagebox") n.strom = null;   // Kanal ist schon belegt
  if (istWeg(g)) { n.ports = []; n.pos = null; }
  P.geraete.splice(P.geraete.indexOf(g) + 1, 0, n);
  if (istWeg(n)) { ui.sel.prozessor = n.prozessor; ui.sel.weg = n.id; }
  else if (n.art === "prozessor") ui.sel.prozessor = n.id; else ui.sel.verteiler = n.id;
  aenderung();
  toast(`„${n.name}“ angelegt – ohne Kreise, Stränge und Zuweisungen.`, "ok");
}

function baumEintraege(li) {
  const libAuswahl = (typ, f) => libListe(typ).map(e => ({ t: e.name, aus: !eintragNutzbar(e), f: () => f(e.id) }));
  const gruppe = li.dataset.gruppe;
  if (gruppe === "screens") return [{ t: "Screen hinzufügen …", f: screenAnlegen }, { t: "Alle Screens anzeigen", f: () => { BAUM_GRUPPEN.screens(); render(); } }];
  if (gruppe === "strom") return [{ t: "Einspeisung hinzufügen …", f: () => { ui.reiter = "strom"; einspeisungAnlegen(); } }, { kopf: "Stromverteiler hinzufügen" },
    ...libAuswahl("verteiler", id => { ui.reiter = "strom"; ui.modus.strom = "wand"; verteilerAnlegen(id); }), { t: "Alle Verteiler anzeigen", f: () => { BAUM_GRUPPEN.strom(); render(); } }];
  if (gruppe === "prozessoren") return [{ kopf: "Prozessor hinzufügen" }, ...libAuswahl("prozessor", id => { ui.reiter = "signal"; ui.modus.signal = "wand"; prozessorAnlegen(id); }),
    { t: "Alle Prozessoren anzeigen", f: () => { BAUM_GRUPPEN.prozessoren(); render(); } }];
  if (li.dataset.screen) {
    const s = screenById(li.dataset.screen);
    return [{ t: "Bearbeiten …", f: () => screenBearbeiten(s) }, { t: "Duplizieren", f: () => screenDuplizieren(s) }, { t: "Löschen", gefahr: true, f: () => screenLoeschen(s) }];
  }
  const g = geraetById(li.dataset.geraet); if (!g) return [];
  const basis = [{ t: "Duplizieren", f: () => geraetDuplizieren(g) }, { t: "Löschen", gefahr: true, f: () => istWeg(g) ? wegLoeschen(g) : geraetLoeschen(g) }];
  if (g.art === "prozessor") return [...basis,
    { kopf: "Stagebox hinzufügen" }, ...libAuswahl("stagebox", id => { ui.reiter = "signal"; wegAnlegen("stagebox", id, g.id); }),
    { kopf: "Multicore hinzufügen" }, ...libAuswahl("multicore", id => { ui.reiter = "signal"; wegAnlegen("multicore", id, g.id); })];
  return basis;
}

function baumEreignisse() {
  const baum = $("#baum");
  baum.addEventListener("contextmenu", e => {
    const li = e.target.closest("li[data-gruppe], li[data-screen], li[data-geraet]"); if (!li) return;
    e.preventDefault();
    const eintraege = baumEintraege(li);
    if (eintraege.length) kontextMenue(e.clientX, e.clientY, eintraege);
  });
  // Tablet: lange drücken = Kontextmenü
  let lang = null;
  baum.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") return;
    const li = e.target.closest("li[data-gruppe], li[data-screen], li[data-geraet]"); if (!li) return;
    const start = { x: e.clientX, y: e.clientY };
    lang = { start, t: setTimeout(() => { lang.offen = true; const ein = baumEintraege(li); if (ein.length) kontextMenue(start.x, start.y, ein); }, 550) };
  });
  const abbrechen = e => { if (lang && (e.type !== "pointermove" || Math.hypot(e.clientX - lang.start.x, e.clientY - lang.start.y) > 10)) clearTimeout(lang.t); };
  baum.addEventListener("pointermove", abbrechen); baum.addEventListener("pointercancel", abbrechen);
  baum.addEventListener("pointerup", e => { abbrechen(e); if (lang?.offen) { e.preventDefault(); ui.klickSperre = Date.now(); } });
  // Überschrift anklicken = Übersicht
  baum.addEventListener("click", e => {
    if (Date.now() - ui.klickSperre < 500) { e.stopImmediatePropagation(); return; }
    const gr = e.target.closest("li[data-gruppe]");
    if (gr && !e.target.closest("[data-aktion]")) { BAUM_GRUPPEN[gr.dataset.gruppe](); ui.werkzeug = "auswahl"; render(); e.stopImmediatePropagation(); }
  }, true);
  document.addEventListener("pointerdown", e => { if (!e.target.closest("#kontextmenue")) kontextMenueZu(); }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") kontextMenueZu(); });
  window.addEventListener("blur", kontextMenueZu);
}

/* ---------- Übersicht aller Screens (Reiter Aufbau) ---------- */
function screenUebersicht(el) {
  el.classList.add("liste-modus");
  if (!P.screens.length) return void (el.innerHTML = `<p class="leise">Noch keine Screens – links bei „Screens“ mit + anlegen.</p>`);
  el.innerHTML = `<div class="uebersicht">${P.screens.map(s => {
    const x = screenSummen(s); const pl = pixelLage(s); const g = grenzen(s.module);
    const rand = Math.max(g.b, g.h, 1000) * 0.06;
    const svg = s.module.length ? `<svg viewBox="${g.x - rand} ${g.y - rand} ${g.b + 2 * rand} ${g.h + 2 * rand}" style="width:100%;height:140px;background:#141414;border-radius:6px" preserveAspectRatio="xMidYMid meet">${screenSvgInhalt(s, { masse: false })}</svg>` : `<p class="leise klein">keine Module</p>`;
    const kreise = P.kreise.filter(k => k.screen === s.id).length, st = P.straenge.filter(k => k.screen === s.id).length;
    return `<div class="karte klickbar${s.id === ui.screen ? " sel" : ""}" data-screen-karte="${s.id}" style="cursor:pointer"><div class="knopfreihe"><h2 style="margin:0">${esc(s.name)}</h2><span class="fueller"></span><span class="leise klein">${esc(s.beschreibung || "")}</span></div>
      ${svg}<table class="werte" style="margin-top:6px"><tr><td>Größe</td><td>${fmtFlex(x.bM, 2)} × ${fmtFlex(x.hM, 2)} m · ${fmt(pl.b)} × ${fmt(pl.h)} px</td></tr>
      <tr><td>Module · Gewicht</td><td>${x.anzahl} · ${fmt(x.kg, 1)} kg</td></tr><tr><td>Leistung max.</td><td>${fmt(x.wMax)} W</td></tr>
      <tr><td>Bauart</td><td>${s.bauart}${s.ukM != null ? " · UK " + fmtFlex(s.ukM) + " m" : ""}</td></tr><tr><td>Kreise · Stränge</td><td>${kreise} · ${st}</td></tr></table></div>`;
  }).join("")}</div>`;
  el.onclick = e => {
    if (ui.reiter !== "aufbau" || ui.modus.aufbau !== "alle") return;
    const k = e.target.closest("[data-screen-karte]"); if (!k) return;
    ui.screen = k.dataset.screenKarte; ui.modus.aufbau = "wand"; ui.auswahl.clear(); render();
  };
}
