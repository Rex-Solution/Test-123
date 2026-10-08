/* Reiter Ausgabe (Phase 1): Testbild je Screen aus der Pixel-Lage der Module, PNG, Live-Ausgabe 1:1.
   Die Zuordnung Zuspieler-Output → Prozessor-Eingang → Layer folgt in Phase 2. */

const TESTBILD_PALETTEN = {
  regenbogen: ["#d94848", "#e8892b", "#d9c32b", "#4fae3f", "#2b9fb3", "#3f62d1", "#8a4fd1", "#c94a9a"],
  pastell: ["#f2a7a7", "#f6c99a", "#efe39a", "#b5dfa4", "#9fd6dd", "#a9b9ef", "#c7aaee", "#eba9cf"],
  grau: ["#3a3a3a", "#6a6a6a", "#9a9a9a", "#cacaca"],
  kontrast: ["#ffffff", "#000000"],
};
function ausgabeOptionen() {
  P.ausgabe = { palette: "regenbogen", beschriftung: "modul", linie: 2, kreis: true, kreuz: true, info: true, cursorTempo: 240, cursorBreite: 4, ...(P.ausgabe || {}) };
  return P.ausgabe;
}
function helligkeitHex(hex) {
  const n = parseInt(hex.slice(1), 16); const k = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}
function dunkler(hex, f) {
  const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const c = v => Math.round(helligkeitHex(hex) < 0.18 ? v + (255 - v) * f * 0.6 : v * (1 - f)).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

/* Testbild eines Screens auf eine Canvas zeichnen; liefert die Canvas */
function testbildCanvas(s, canvas = document.createElement("canvas")) {
  const o = ausgabeOptionen();
  const pl = pixelLage(s);
  canvas.width = Math.max(1, pl.b); canvas.height = Math.max(1, pl.h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const namen = modulNamen(s);
  const xs = [...new Set(s.module.map(m => Math.round(m.x)))].sort((a, b) => a - b);
  const ys = [...new Set(s.module.map(m => Math.round(m.y)))].sort((a, b) => a - b);
  const pal = TESTBILD_PALETTEN[o.palette] || TESTBILD_PALETTEN.regenbogen;
  const typen = [...new Set(s.module.map(m => m.lib))];
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const m of s.module) {
    const r = pl.lage.get(m.id);
    const c = xs.indexOf(Math.round(m.x)), z = ys.indexOf(Math.round(m.y));
    const basis = pal[typen.indexOf(m.lib) % pal.length];
    const farbe = o.palette === "kontrast" ? pal[(c + z) % 2] : (c + z) % 2 ? dunkler(basis, 0.35) : basis;
    ctx.fillStyle = farbe; ctx.fillRect(r.x, r.y, r.b, r.h);
    if (o.linie > 0) {
      ctx.fillStyle = "#fff"; const d = Math.min(o.linie, r.b / 2, r.h / 2);
      ctx.fillRect(r.x, r.y, r.b, d); ctx.fillRect(r.x, r.y + r.h - d, r.b, d); ctx.fillRect(r.x, r.y, d, r.h); ctx.fillRect(r.x + r.b - d, r.y, d, r.h);
    }
    const text = o.beschriftung === "modul" ? namen.get(m.id) : o.beschriftung === "pixel" ? `${r.x},${r.y}` : "";
    if (text) {
      const fs = Math.max(8, Math.min(r.b, r.h) * 0.22);
      ctx.font = `700 ${fs}px "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = helligkeitHex(farbe) > 0.35 ? "#000" : "#fff";
      ctx.fillText(text, r.x + r.b / 2, r.y + r.h / 2);
    }
  }
  const W = canvas.width, H = canvas.height, st = Math.max(2, o.linie || 2);
  ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff";
  if (o.kreuz) { ctx.fillRect(Math.floor(W / 2 - st / 2), 0, st, H); ctx.fillRect(0, Math.floor(H / 2 - st / 2), W, st); }
  if (o.kreis) { ctx.lineWidth = st; ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - st, 0, Math.PI * 2); ctx.stroke(); }
  if (o.info) {
    const g = grenzen(s.module);
    const zeilen = [s.name, `${W} × ${H} px`, `${fmtFlex(g.b / 1000, 2)} × ${fmtFlex(g.h / 1000, 2)} m · ${s.module.length} Module`];
    const fs = Math.max(10, Math.min(48, Math.round(Math.min(W / 16, H / 9))));
    ctx.font = `700 ${fs}px "Segoe UI", system-ui, sans-serif`;
    const bb = Math.max(...zeilen.map(z => ctx.measureText(z).width)) + fs * 1.2, bh = fs * 3.4;
    if (bb < W * 0.95 && bh < H * 0.9) {
      ctx.fillStyle = "rgba(0,0,0,.72)"; ctx.fillRect(W / 2 - bb / 2, H / 2 - bh / 2, bb, bh);
      ctx.fillStyle = "#fff";
      zeilen.forEach((z, i) => { ctx.font = `${i ? 500 : 700} ${i ? Math.round(fs * 0.7) : fs}px "Segoe UI", system-ui, sans-serif`; ctx.fillText(z, W / 2, H / 2 - bh / 2 + fs * (0.85 + i * 0.95)); });
    }
  }
  return canvas;
}

REITER.ausgabe = {
  titelPalette: "Testbild",
  werkzeuge() {
    const o = ausgabeOptionen(); const s = aktuellerScreen();
    return `<select data-o="palette">${[["regenbogen", "Regenbogen"], ["pastell", "Pastell"], ["grau", "Graustufen"], ["kontrast", "Schwarz / Weiß"]].map(([w, t]) => `<option value="${w}"${o.palette === w ? " selected" : ""}>${t}</option>`).join("")}</select>
      <select data-o="beschriftung">${[["modul", "Modulname (A1)"], ["pixel", "Pixel-Position"], ["keine", "keine Beschriftung"]].map(([w, t]) => `<option value="${w}"${o.beschriftung === w ? " selected" : ""}>${t}</option>`).join("")}</select>
      <label class="klein"><input type="checkbox" data-o="kreis" ${o.kreis ? "checked" : ""}> Kreis</label>
      <label class="klein"><input type="checkbox" data-o="kreuz" ${o.kreuz ? "checked" : ""}> Kreuz</label>
      <label class="klein"><input type="checkbox" data-o="info" ${o.info ? "checked" : ""}> Info</label>
      <span class="trenner"></span><button data-o-a="png" ${s?.module.length ? "" : "disabled"}>PNG exportieren</button><button data-o-a="live" ${s?.module.length ? "" : "disabled"}>▶ Live</button>`;
  },
  palette() {
    return `<p class="klein leise">Testbild des gewählten Screens in seiner Pixel-Lage (jedes Modul in seiner eigenen Auflösung). Live-Ausgabe: 1:1 in eigenem Fenster, <kbd>F</kbd> Vollbild, <kbd>Leertaste</kbd> Cursor anhalten.</p>
      <div class="hinweis info">Zuspieler-Outputs, Prozessor-Eingänge und Layer-Zuordnung folgen in Phase 2.</div>`;
  },
  zeichnung(el) {
    const s = aktuellerScreen();
    if (!s?.module.length) return leerZeichnung(el, "Kein Screen mit Modulen.");
    el.classList.add("liste-modus");
    el.style.display = "grid"; el.style.placeItems = "center";
    const c = testbildCanvas(s);
    c.style.maxWidth = "100%"; c.style.maxHeight = "100%"; c.style.imageRendering = "pixelated"; c.style.boxShadow = "0 0 0 1px #333";
    el.innerHTML = ""; el.appendChild(c);
  },
  liste() {
    const s = aktuellerScreen(); if (!s?.module.length) return "";
    const pl = pixelLage(s); const namen = modulNamen(s);
    const typen = [...new Set(s.module.map(m => eintrag(m.lib)?.attribute?.led?.pitchMm))];
    return `<div class="kopf"><b>Pixel-Lage „${esc(s.name)}“</b><span class="leise klein">${fmt(pl.b)} × ${fmt(pl.h)} px${typen.length > 1 ? " · verschiedene Pitches – Lage je Typ gerechnet" : ""}</span></div>
      <table><tr><th>Modul</th><th>Typ</th><th class="zahl">X</th><th class="zahl">Y</th><th class="zahl">B × H</th></tr>
      ${s.module.slice().sort((a, b) => a.y - b.y || a.x - b.x).map(m => { const r = pl.lage.get(m.id); return `<tr><td>${namen.get(m.id)}</td><td>${esc(eintrag(m.lib)?.name)}</td><td class="zahl">${r.x}</td><td class="zahl">${r.y}</td><td class="zahl">${r.b} × ${r.h}</td></tr>`; }).join("")}</table>`;
  },
  rechts() {
    const o = ausgabeOptionen();
    return `<div class="karte"><div class="label">Live-Cursor</div>
      <div class="zwei"><label class="feld"><span>Tempo (px/s)</span><input data-o="cursorTempo" value="${o.cursorTempo}" inputmode="numeric"></label>
      <label class="feld"><span>Breite (px)</span><input data-o="cursorBreite" value="${o.cursorBreite}" inputmode="numeric"></label></div>
      <label class="feld"><span>Linienbreite (px)</span><input data-o="linie" value="${o.linie}" inputmode="numeric"></label></div>`;
  },
  pruefungen() {
    const liste = [];
    for (const s of P.screens) {
      const pitches = new Set(s.module.map(m => eintrag(m.lib)?.attribute?.led?.pitchMm));
      if (pitches.size > 1) liste.push({ art: "info", text: `${s.name}: verschiedene Pixelpitches – Testbild zeigt die Pixel-Lage je Typ.`, ziel: "screen:" + s.id });
    }
    if (P.screens.some(s => s.module.length)) liste.push({ art: "info", text: "Zuordnung Outputs → Prozessor → Layer folgt in Phase 2." });
    return liste;
  },
};

function ausgabeEreignisse() {
  const setze = e => {
    const f = e.target.dataset.o; if (!f || ui.reiter !== "ausgabe") return;
    const o = ausgabeOptionen();
    if (e.target.type === "checkbox") o[f] = e.target.checked;
    else if (["linie", "cursorTempo", "cursorBreite"].includes(f)) { const z = leseZahl(e.target.value); if (!(z >= 0)) return toast("Bitte eine Zahl ≥ 0.", "fehler"); o[f] = Math.round(z); }
    else o[f] = e.target.value;
    aenderung();
  };
  $("#werkzeuge").addEventListener("change", setze);
  $("#rechts").addEventListener("change", setze);
  $("#werkzeuge").addEventListener("click", e => {
    if (ui.reiter !== "ausgabe") return;
    const a = e.target.closest("[data-o-a]")?.dataset.oA; const s = aktuellerScreen();
    if (a === "png" && s) testbildCanvas(s).toBlob(b => herunterladen(b, dateiname(`${P.daten.titel}_${s.name}_testbild`, ".png"), "image/png"));
    if (a === "live" && s) liveOeffnen(s);
  });
}

/* ---------- Live-Ausgabe ---------- */
const live = { fenster: null };
function liveOeffnen(s) {
  if (!s?.module.length) return toast("Kein Screen mit Modulen gewählt.", "fehler");
  const f = window.open("", "rex-ledplaner-live", "popup,width=1280,height=720");
  if (!f) return toast("Popup wurde blockiert – bitte Popups für diese Seite erlauben.", "fehler");
  f.document.open();
  f.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>LED-Ausgabe – ${esc(s.name)}</title>
    <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}body.versteckt{cursor:none}canvas{position:absolute;left:0;top:0;image-rendering:pixelated}
    #hilfe{position:fixed;right:16px;bottom:16px;padding:10px 14px;border-radius:8px;background:rgba(20,20,20,.9);color:#e8e8e8;font:13px/1.5 "Segoe UI",system-ui,sans-serif;transition:opacity .4s}
    #hilfe.weg{opacity:0}kbd{border:1px solid #555;border-radius:3px;padding:0 4px;font-size:11px}</style></head><body>
    <canvas id="c"></canvas><div id="hilfe"><b>${esc(s.name)}</b> – Ausgabe 1:1 ab oben links<br><kbd>F</kbd> Vollbild · <kbd>Leertaste</kbd> Cursor anhalten · <kbd>E</kbd> einpassen</div></body></html>`);
  f.document.close();
  const c = f.document.getElementById("c"), ctx = c.getContext("2d"), hilfe = f.document.getElementById("hilfe");
  const bild = testbildCanvas(s);
  c.width = bild.width; c.height = bild.height;
  const zustand = { start: performance.now(), pause: false, pausenZeit: 0, einpassen: false };
  const groesse = () => {
    const dpr = f.devicePixelRatio || 1;
    if (zustand.einpassen) { const z = Math.min(f.innerWidth / c.width, f.innerHeight / c.height); c.style.width = c.width * z + "px"; c.style.height = c.height * z + "px"; }
    else { c.style.width = c.width / dpr + "px"; c.style.height = c.height / dpr + "px"; }
  };
  groesse();
  let t = 0;
  const zeigeHilfe = () => { hilfe.classList.remove("weg"); f.document.body.classList.remove("versteckt"); clearTimeout(t); t = setTimeout(() => { hilfe.classList.add("weg"); f.document.body.classList.add("versteckt"); }, 3000); };
  f.addEventListener("mousemove", zeigeHilfe); zeigeHilfe();
  f.addEventListener("resize", groesse);
  f.addEventListener("dblclick", () => f.document.fullscreenElement ? f.document.exitFullscreen() : f.document.documentElement.requestFullscreen().catch(() => {}));
  f.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (k === "f") f.document.fullscreenElement ? f.document.exitFullscreen() : f.document.documentElement.requestFullscreen().catch(() => {});
    if (k === " ") { e.preventDefault(); zustand.pause = !zustand.pause; if (zustand.pause) zustand.pausenZeit = performance.now(); else zustand.start += performance.now() - zustand.pausenZeit; }
    if (k === "e") { zustand.einpassen = !zustand.einpassen; groesse(); }
  });
  live.fenster = f;
  const o = ausgabeOptionen();
  const schleife = () => {
    if (f.closed) return;
    const jetzt = (zustand.pause ? zustand.pausenZeit : performance.now()) - zustand.start;
    const tt = jetzt / 1000, d = Math.max(1, o.cursorBreite);
    ctx.drawImage(bild, 0, 0);
    const x = Math.floor((tt * o.cursorTempo) % (c.width + d)) - d, y = Math.floor((tt * o.cursorTempo) % (c.height + d)) - d;
    ctx.fillStyle = "#000"; ctx.fillRect(x - 1, 0, d + 2, c.height); ctx.fillRect(0, y - 1, c.width, d + 2);
    ctx.fillStyle = "#fff"; ctx.fillRect(x, 0, d, c.height); ctx.fillRect(0, y, c.width, d);
    f.requestAnimationFrame(schleife);
  };
  f.requestAnimationFrame(schleife);
}
