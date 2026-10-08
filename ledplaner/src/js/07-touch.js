/* Tablet-Bedienung: Zwei-Finger-Zoom/-Verschieben, Module mit dem Finger aus der Palette ziehen,
   Ersatz für Tastatur-Modifikatoren (Mehrfachauswahl statt Shift, Einrasten aus statt Alt),
   ausklappbare Seitenspalten bei schmalem Bildschirm. */

const beruehrung = { punkte: new Map(), geste: null };

/* Beim ersten Fingerkontakt: Touch-Knöpfe einblenden (per CSS, ohne neu zu zeichnen) */
function touchErkannt() {
  if (ui.touch) return;
  ui.touch = true;
  document.body.classList.add("touch");
}

function gestenMitte() {
  const [a, b] = [...beruehrung.punkte.values()];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
}

function touchEreignisse() {
  if (matchMedia("(pointer: coarse)").matches) { ui.touch = true; document.body.classList.add("touch"); }
  const el = $("#zeichnung");
  // Capture-Phase: Gesten werden abgefangen, bevor Auswahl, Verschieben oder Pinsel reagieren
  el.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") return;
    beruehrung.punkte.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (beruehrung.punkte.size === 2) {
      e.stopPropagation(); e.preventDefault();
      // laufende Ein-Finger-Aktion (Ziehen, Rahmen, Pinselstrich) verwerfen
      if (historie.stand && JSON.stringify(P) !== historie.stand) P = JSON.parse(historie.stand);
      beruehrung.geste = gestenMitte();
      render();
    } else if (beruehrung.punkte.size > 2 || beruehrung.geste) e.stopPropagation();
  }, true);
  el.addEventListener("pointermove", e => {
    if (e.pointerType !== "touch" || !beruehrung.punkte.has(e.pointerId)) return;
    beruehrung.punkte.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!beruehrung.geste) return;
    e.stopPropagation();
    const svg = el.querySelector("svg[data-ansicht]");
    if (!svg || beruehrung.punkte.size < 2) return;
    const v = ui.ansicht.get(svg.dataset.ansicht); if (!v) return;
    const neu = gestenMitte(), alt = beruehrung.geste;
    const z = alt.d / neu.d;                                  // Finger auseinander → hineinzoomen
    const p = svgPunkt(svg, { clientX: neu.x, clientY: neu.y });
    v.x = p.x - (p.x - v.x) * z; v.y = p.y - (p.y - v.y) * z; v.b *= z; v.h *= z;
    svg.setAttribute("viewBox", vbText(v));
    const f = mmJePixel(svg);
    v.x -= (neu.x - alt.x) * f; v.y -= (neu.y - alt.y) * f;
    svg.setAttribute("viewBox", vbText(v));
    beruehrung.geste = neu;
    zoomAnzeige(el, svg);
  }, true);
  const ende = e => {
    if (e.pointerType !== "touch") return;
    beruehrung.punkte.delete(e.pointerId);
    if (beruehrung.geste) { e.stopPropagation(); if (!beruehrung.punkte.size) beruehrung.geste = null; }
  };
  el.addEventListener("pointerup", ende, true);
  el.addEventListener("pointercancel", ende, true);
  document.addEventListener("pointerdown", e => { if (e.pointerType === "touch") touchErkannt(); }, true);

  // Module mit dem Finger aus der Palette in die Zeichnung ziehen (HTML-Drag & Drop geht auf Tablets nicht)
  $("#palette").addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch" || ui.reiter !== "aufbau") return;
    const it = e.target.closest('[data-lib][draggable="true"]'); if (!it) return;
    const start = { x: e.clientX, y: e.clientY };
    let geist = null;
    const bewegen = ev => {
      if (ev.pointerId !== e.pointerId) return;
      if (!geist && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 10) {
        geist = it.cloneNode(true);
        geist.className = "palette-item geist";
        document.body.appendChild(geist);
      }
      if (geist) { geist.style.left = ev.clientX + "px"; geist.style.top = ev.clientY + "px"; }
    };
    const loslassen = ev => {
      if (ev.pointerId !== e.pointerId) return;
      document.removeEventListener("pointermove", bewegen); document.removeEventListener("pointerup", loslassen); document.removeEventListener("pointercancel", loslassen);
      if (!geist) return;
      geist.remove();
      ui.klickSperre = Date.now();
      const svg = $("#zeichnung svg[data-ansicht]"); const s = aktuellerScreen();
      if (ev.type !== "pointerup" || !svg || !s) return;
      const r = svg.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
      modulAbsetzen(svg, s, it.dataset.lib, ev.clientX, ev.clientY, !ui.einrasten);
    };
    document.addEventListener("pointermove", bewegen);
    document.addEventListener("pointerup", loslassen);
    document.addEventListener("pointercancel", loslassen);
  });

  // Zoom-Knöpfe in der Zeichnung (Finger und Maus)
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-zoom]"); if (!b) return;
    const svg = el.querySelector("svg[data-ansicht]"); if (!svg) return;
    if (b.dataset.zoom === "fit") return einpassen();
    const v = ui.ansicht.get(svg.dataset.ansicht); if (!v) return;
    const f = b.dataset.zoom === "+" ? 1 / 1.4 : 1.4;
    const cx = v.x + v.b / 2, cy = v.y + v.h / 2;
    v.b *= f; v.h *= f; v.x = cx - v.b / 2; v.y = cy - v.h / 2;
    svg.setAttribute("viewBox", vbText(v));
    zoomAnzeige(el, svg);
  });

  // Seitenspalten ein-/ausklappen (schmaler Bildschirm, z.B. Tablet hochkant)
  $("#unterleiste").addEventListener("click", e => {
    const b = e.target.closest("[data-spalte]"); if (!b) return;
    const k = "zeige-" + b.dataset.spalte;
    const an = !document.body.classList.contains(k);
    document.body.classList.remove("zeige-links", "zeige-rechts");
    document.body.classList.toggle(k, an);
  });
}
