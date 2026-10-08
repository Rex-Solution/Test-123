/* Ende-zu-Ende-Tests für ledplaner.html (Playwright, Chromium).
   Aufruf:  node ledplaner/test/e2e.mjs            (vorher: python3 ledplaner/build.py)
   Playwright: `npm i -D playwright` im Repository oder PLAYWRIGHT_MODULE=/pfad/zu/playwright/index.mjs setzen.
   Bildschirmfotos landen in ledplaner/test/ausgabe/ (nicht eingecheckt). */

import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const DATEI = pathToFileURL(path.resolve(HIER, "../../ledplaner.html")).href;
const AUSGABE = path.join(HIER, "ausgabe");
fs.mkdirSync(AUSGABE, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
const p = await ctx.newPage();
const fehler = [];
let ok = 0;
const beob = pg => {
  pg.on("console", m => { if (m.type() === "error") fehler.push("Konsole: " + m.text()); });
  pg.on("pageerror", e => fehler.push("Seitenfehler: " + e.message));
  pg.on("dialog", d => d.accept());
};
beob(p);
function pruefe(name, bedingung, info = "") {
  if (bedingung) { ok++; console.log("PASS", name); }
  else { fehler.push(name + (info ? " – " + info : "")); console.log("FAIL", name, info); }
}
const ev = (f, a) => p.evaluate(f, a);
async function dialog(felder) {
  for (const [n, v] of Object.entries(felder)) {
    const el = p.locator(`#dialog [name="${n}"]`);
    if (await el.evaluate(e => e.tagName) === "SELECT") await el.selectOption(String(v)); else await el.fill(String(v));
  }
  await p.click('#dialog button[value="ok"]');
  await p.waitForTimeout(80);
}
const modulBox = async id => p.locator(`[data-mod="${id}"] rect`).first().boundingBox();

await p.goto(DATEI);
await ev(() => localStorage.clear());
await p.reload();
await p.waitForTimeout(200);

/* ---------- Aufbau ---------- */
await p.click('[data-aktion="screen-neu"]');
await dialog({ name: "Bühne Mitte", ukM: "2,5" });
pruefe("Screen angelegt", await ev(() => P.screens.length === 1 && P.screens[0].ukM === 2.5));

await p.click('[data-a="raster"]');
await dialog({ lib: "beispiel-ledtek-p4wh-pro-v3", spalten: 4, reihen: 2, x: 0, y: 0 });
pruefe("Raster 4 × 2", await ev(() => P.screens[0].module.length === 8));

// Drag & Drop aus der Palette rechts neben das Raster → rastet bündig ein
const ziel = await p.locator("#zeichnung svg").boundingBox();
await ev(() => { ui.ansicht.set(P.screens[0].id, { x: -500, y: -500, b: 4000, h: 3000 }); render(); });
const mmZuPx = await ev(() => { const s = document.querySelector("#zeichnung svg"); const m = s.getScreenCTM(); return { a: m.a, e: m.e, f: m.f }; });
const dt = await p.evaluateHandle(() => new DataTransfer());
await ev(dt => dt.setData("text/lib", "beispiel-ledtek-p4wh-pro-v3"), dt);
const px = (x, y) => ({ clientX: mmZuPx.e + x * mmZuPx.a, clientY: mmZuPx.f + y * mmZuPx.a });
await p.dispatchEvent("#zeichnung svg", "drop", { dataTransfer: dt, ...px(2270, 520) });
const neu = await ev(() => P.screens[0].module.at(-1));
pruefe("Drag & Drop rastet an Nachbarn ein", neu.x === 2000 && neu.y === 0, JSON.stringify(neu));
await p.dispatchEvent("#zeichnung svg", "drop", { dataTransfer: dt, ...px(600, 600) });
pruefe("Überlappung wird abgelehnt", await ev(() => P.screens[0].module.length === 9));

// Verschieben per Maus mit Einrasten
await ev(() => { ui.auswahl.clear(); render(); });
const b9 = await modulBox(neu.id);
await p.mouse.move(b9.x + b9.width / 2, b9.y + b9.height / 2);
await p.mouse.down();
await p.mouse.move(b9.x + b9.width / 2 + 3, b9.y + b9.height / 2 + 1000 * mmZuPx.a + 4, { steps: 8 });
await p.mouse.up();
const verschoben = await ev(id => P.screens[0].module.find(m => m.id === id), neu.id);
pruefe("Verschieben rastet ein (y = 1000)", verschoben.x === 2000 && verschoben.y === 1000, JSON.stringify(verschoben));

// Rückgängig / Wiederholen
await p.waitForTimeout(350);
await p.keyboard.press("Control+z"); await p.waitForTimeout(100);
pruefe("Strg+Z macht Verschieben rückgängig", await ev(id => P.screens[0].module.find(m => m.id === id).y === 0, neu.id));
await p.keyboard.press("Control+y"); await p.waitForTimeout(100);
pruefe("Strg+Y stellt es wieder her", await ev(id => P.screens[0].module.find(m => m.id === id).y === 1000, neu.id));

// Entfernen, Erweitern, Spiegeln
await ev(id => { ui.auswahl = new Set([id]); render(); }, neu.id);
await p.keyboard.press("Delete");
pruefe("Entf entfernt Modul", await ev(() => P.screens[0].module.length === 8));
await p.click('[data-a="erweitern"]');
await dialog({ aktion: "plus", seite: "rechts", anzahl: 2 });
pruefe("Erweitern um 2 Spalten", await ev(() => P.screens[0].module.length === 12 && grenzen(P.screens[0].module).b === 3000));
await p.click('[data-a="erweitern"]');
await dialog({ aktion: "minus", seite: "unten", anzahl: 1 });
pruefe("Kürzen um 1 Reihe", await ev(() => P.screens[0].module.length === 6));
await p.click('[data-a="raster"]');
await dialog({ lib: "beispiel-ledtek-p4swh-pro-v3", spalten: 6, reihen: 1, x: 0, y: 1000 });
await ev(() => { ui.auswahl.clear(); });
await p.click('[data-a="spiegel-y"]');
pruefe("Spiegeln ↕ legt sWH-Reihe nach oben", await ev(() => P.screens[0].module.filter(m => m.lib.includes("p4swh")).every(m => m.y === 0)));
await p.click('[data-a="spiegel-y"]');
await p.screenshot({ path: path.join(AUSGABE, "aufbau.png") });

/* ---------- Beispielprojekt: Strom, Signal, Kabel ---------- */
await p.click('[data-haupt="einstellungen"]');
await p.click('[data-einst="datei"]');
await p.click('[data-e="beispiel"]');
await p.waitForTimeout(200);
const strom = await ev(() => ({ n: P.kreise.length, w: P.kreise.map(k => Math.round(kreisLast(k))), phasen: [...stromBilanz().values()].map(b => PHASEN.map(x => +b.phasen[x].toFixed(2))) }));
pruefe("Beispiel: 6 Kreise à 1.226 W", strom.n === 6 && strom.w.every(w => w === 1226), JSON.stringify(strom));
pruefe("Beispiel: Phasen ausgewogen (+ MX30 auf L1, CVT10 auf L2)", Math.abs(strom.phasen[1][2] - 10.66) < 0.01 && Math.abs(strom.phasen[1][0] - 10.9) < 0.05 && Math.abs(strom.phasen[1][1] - 10.76) < 0.01, JSON.stringify(strom.phasen));
const cvt = await ev(() => { const d = P.geraete.find(g => g.art === "stagebox"); return { lib: d.lib, ports: d.ports, zul: d.zuleitung.laengeM, kabel: kabelListe().filter(z => z.von.startsWith("Stagebox 1 · Ausgang")).length, fiber: kabelListe().find(z => z.key === "weg:" + d.id)?.laengeM, offen: wegePruefungen().filter(x => x.art !== "info").length }; });
pruefe("Beispiel: MX30 → 60 m Glasfaser → CVT10 → 4 Cat-Ports", cvt.lib === "beispiel-novastar-cvt10" && JSON.stringify(cvt.ports) === "[1,2,3,4]" && cvt.zul === 60 && cvt.fiber === 60 && cvt.kabel === 4 && cvt.offen === 0, JSON.stringify(cvt));
const sig = await ev(() => P.straenge.map(k => [k.port, k.backupPort, strangPixel(k)]));
pruefe("Beispiel: 2 Stränge à 454.272 px mit Backup 3/4", JSON.stringify(sig) === JSON.stringify([[1, 3, 454272], [2, 4, 454272]]), JSON.stringify(sig));

// Strom-Vorschlag „so wenige wie möglich“
await p.click('[data-reiter="strom"]');
await p.selectOption('[data-s-feld="verteilung"]', "minimal");
await p.click('[data-s="vorschlag"]'); await p.waitForTimeout(100);
pruefe("Vorschlag minimal: 3 Kreise", await ev(() => P.kreise.length === 3 && P.kreise.every(k => Math.round(kreisLast(k)) === 2452)));

// Pinsel: Kanal 10 wählen und zwei Module übermalen
await p.selectOption('[data-s-feld="pinselziel"]', await ev(() => `${P.geraete.find(g => g.art === "verteiler").id}|10`));
const [m1, m2] = await ev(() => P.screens[0].module.slice(0, 2).map(m => m.id));
const a = await modulBox(m1), bb = await modulBox(m2);
await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 6 }); await p.mouse.up();
const k10 = await ev(() => P.kreise.find(k => k.kanal === 10)?.module.length);
pruefe("Pinsel malt Kreis an Kanal 10", k10 === 2, String(k10));
pruefe("Pinsel nimmt Module aus anderen Kreisen", await ev(([a]) => P.kreise.filter(k => k.module.includes(a)).length === 1, [m1]));
await ev(() => { ui.werkzeug = "auswahl"; });
await p.screenshot({ path: path.join(AUSGABE, "strom.png") });
await p.click('[data-s="modus"][data-wert="verteiler"]');
pruefe("Übersicht aller Verteiler", await p.locator(".uebersicht .karte").count() >= 2);

// Port-Regel: fremde Serie darf nicht auf denselben Port
await p.click('[data-reiter="signal"]');
await ev(() => {
  const fremd = klon(LIB.eintraege.get("beispiel-ledtek-p4swh-pro-v3"));
  fremd.id = "test-fremd"; fremd.name = "Fremdmodul"; fremd.attribute.led.serie = "Andere Serie";
  LIB.eintraege.set(fremd.id, fremd); nutzeEintrag(fremd.id);
  P.screens[0].module.push({ id: "m-fremd", lib: "test-fremd", x: 6000, y: 3000 });
  render();
});
await p.selectOption('[data-d-feld="pinselziel"]', await ev(() => { const g = P.geraete.find(x => x.art === "prozessor"); return `${g.id}|1`; }));
const fm = await modulBox("m-fremd");
await p.mouse.move(fm.x + fm.width / 2, fm.y + fm.height / 2); await p.mouse.down(); await p.mouse.up();
pruefe("Port-Regel: fremde Serie nicht auf Port 1", await ev(() => !P.straenge.find(k => k.port === 1).module.includes("m-fremd")));
await ev(() => { ui.werkzeug = "auswahl"; P.screens[0].module = P.screens[0].module.filter(m => m.id !== "m-fremd"); aenderung(); });
await p.screenshot({ path: path.join(AUSGABE, "signal.png") });

/* ---------- Ausgabe: Outputs & Layer ---------- */
await p.click('[data-reiter="ausgabe"]');
await p.click('[data-m="modus"][data-wert="mapping"]'); await p.waitForTimeout(100);
const map = await ev(() => ({ o: P.outputs.length, l: P.layer.length, raum: pixelraumBloecke(P.outputs[0].prozessor).map(b => [b.x, b.y, b.b, b.h]) }));
pruefe("Mapping: 1 Output, 1 Layer, Screen bei 0/0", map.o === 1 && map.l === 1 && JSON.stringify(map.raum) === "[[0,0,1248,728]]", JSON.stringify(map));
const blk = await p.locator("[data-raum]").first().boundingBox();
await p.mouse.move(blk.x + blk.width / 2, blk.y + blk.height / 2); await p.mouse.down();
await p.mouse.move(blk.x + blk.width / 2 + 80, blk.y + blk.height / 2 + 60, { steps: 6 }); await p.mouse.up();
const raumNeu = await ev(() => pixelraumBloecke(P.outputs[0].prozessor)[0]);
pruefe("Mapping: Screen im Pixelraum verschiebbar", raumNeu.x > 0 && raumNeu.y > 0, JSON.stringify([raumNeu.x, raumNeu.y]));
pruefe("Mapping: Layer wandert mit dem Screen", await ev(() => { const l = P.layer[0], b = pixelraumBloecke(l.prozessor)[0]; return l.zx === b.x && l.zy === b.y && !mappingPruefungen().some(x => x.art !== "info"); }));
pruefe("Mapping: Output-Testbild 3840 × 2160", await ev(() => { const c = outputCanvas(P.outputs[0]); return c.width === 3840 && c.height === 2160; }));
pruefe("Kabel: Videokabel Output → Prozessor", await ev(() => kabelListe().some(z => z.gewerk === "video")));
await p.screenshot({ path: path.join(AUSGABE, "mapping.png") });
await p.keyboard.press("Control+z"); await p.waitForTimeout(100);
pruefe("Mapping: Verschieben rückgängig", await ev(() => pixelraumBloecke(P.outputs[0].prozessor)[0].x === 0 && P.layer[0].zx === 0));
await ev(() => { P.layer[0].zb = 600; });
pruefe("Mapping: Teilabdeckung wird gemeldet", await ev(() => mappingPruefungen().some(x => x.text.includes("abgedeckt"))));
await ev(() => { P.layer[0].zb = 1248; });
await ev(() => { ui.modus.ausgabe = "screen"; render(); });

/* ---------- Stagebox und Multicore ---------- */
await p.click('[data-reiter="signal"]');
await ev(() => { P.geraete = P.geraete.filter(g => g.art !== "stagebox"); ui.sel.prozessor = P.geraete.find(g => g.art === "prozessor").id; P.geraete.find(g => g.art === "prozessor").portLaengeM = 60; render(); });
await p.click('[data-d="weg-neu"][data-lib="beispiel-multicore-cat4-25"]');
const mc = await ev(() => { const d = P.geraete.find(g => g.art === "multicore"); return { ports: d.ports, zeilen: kabelListe().filter(z => /Multicore 1/.test(z.von + z.nach)).map(z => z.von) }; });
pruefe("Multicore: übernimmt die 4 belegten Ports", JSON.stringify(mc.ports) === "[1,2,3,4]", JSON.stringify(mc));
pruefe("Multicore: Kabel ab Auflösung + Multicore selbst", mc.zeilen.filter(v => v.includes("Ader")).length === 4 && mc.zeilen.some(v => v.includes("Port 1, 2, 3, 4")), JSON.stringify(mc.zeilen));
pruefe("Multicore: Prüfung Länge zur Wand", await ev(() => signalPruefungen().some(x => x.text.includes("Multicore 1: Kabellänge zur Wand fehlt"))));
await p.fill('[data-w-feld="ausgangLaengeM"]', "90"); await p.press('[data-w-feld="ausgangLaengeM"]', "Tab"); await p.waitForTimeout(100);
pruefe("Multicore: Cat-Strecke über 100 m gemeldet", await ev(() => signalPruefungen().some(x => x.text.includes("Cat-Strecke 115 m"))));
pruefe("CVT10 in der Library wählbar", !(await p.locator('[data-d="weg-neu"][data-lib="beispiel-novastar-cvt10"]').isDisabled()));
await ev(() => { P.geraete = P.geraete.filter(g => g.art !== "multicore"); aenderung(); });
await p.selectOption('[data-w-neu="stagebox"]', "beispiel-novastar-cvt10"); await p.waitForTimeout(100);
await p.fill('[data-w-feld="ports"]', "1-2, 11"); await p.press('[data-w-feld="ports"]', "Tab"); await p.waitForTimeout(100);
pruefe("Stagebox: unbekannter Port abgelehnt", await ev(() => P.geraete.find(g => g.art === "stagebox").ports.length === 4));
await p.fill('[data-w-feld="ports"]', "1-2"); await p.press('[data-w-feld="ports"]', "Tab"); await p.waitForTimeout(100);
const wVorher = await ev(() => stromBilanz().get(P.geraete.find(g => g.art === "verteiler").id).w);
await p.selectOption('[data-w-feld="strom"]', await ev(() => `${P.geraete.find(g => g.art === "verteiler").id}|8`)); await p.waitForTimeout(100);
const sb = await ev(() => { const d = P.geraete.find(g => g.art === "stagebox"); const v = P.geraete.find(g => g.art === "verteiler"); return { ports: d.ports, w: stromBilanz().get(v.id).w, kabel: kabelListe().filter(z => z.key.startsWith("port:") || z.key.startsWith("backup:")).map(z => z.von) }; });
pruefe("Stagebox: Ports 1-2, Rest direkt", JSON.stringify(sb.ports) === "[1,2]" && sb.kabel.filter(v => v.startsWith("Stagebox 1")).length === 2 && sb.kabel.filter(v => v.startsWith("Prozessor 1")).length === 2, JSON.stringify(sb));
pruefe("Stagebox: CVT10 im Strom (+22 W)", Math.round(sb.w - wVorher) === 22, String(sb.w - wVorher));
pruefe("Projektbaum zeigt Stagebox", (await p.locator('#baum [data-geraet]', { hasText: "Stagebox 1" }).count()) === 1);
await ev(() => { $("#toasts").innerHTML = ""; });
await p.screenshot({ path: path.join(AUSGABE, "stagebox.png") });
await p.locator("#rechts").screenshot({ path: path.join(AUSGABE, "stagebox-rechts.png") });
pruefe("Migration: alter Weg am Prozessor → Gerät", await ev(() => {
  const alt = klon(P); const g = alt.geraete.find(x => x.art === "prozessor");
  alt.geraete = alt.geraete.filter(x => x.art !== "stagebox"); g.weg = "multicore"; g.wegLib = null;
  const n = normalisiereProjekt(alt); const d = n.geraete.find(x => x.art === "multicore");
  return d && d.prozessor === g.id && d.ports.length === 4 && !("weg" in n.geraete.find(x => x.art === "prozessor"));
}));

/* ---------- Kabel ---------- */
await p.click('[data-reiter="kabel"]');
const zeilen = await ev(() => kabelListe().map(z => [z.nr, z.gewerk, z.anzahl, z.bruecke || false]));
pruefe("Kabel: Brücken Strom und Daten gezählt", zeilen.some(z => z[1] === "strom" && z[3]) && zeilen.some(z => z[1] === "signal" && z[3] && z[2] === 46), JSON.stringify(zeilen));
const laka = p.locator(`[data-kabel="laka:${await ev(() => P.lakas[0].id)}"] input[data-kabel-feld="laengeM"]`);
await laka.fill("50"); await laka.press("Tab"); await p.waitForTimeout(100);
pruefe("Kabel: Laka-Länge ändert die Quelle", await ev(() => P.lakas[0].laengeM === 50));
await p.click('[data-k="neu"]');
await dialog({ laengeM: "10", anzahl: "2", von: "FOH", nach: "Bühne" });
pruefe("Kabel von Hand", await ev(() => P.kabel.length === 1 && kabelListe().some(z => z.hand && z.anzahl === 2)));
const [csv] = await Promise.all([p.waitForEvent("download"), p.click('[data-k="csv"]')]);
pruefe("Kabelliste CSV", (await csv.suggestedFilename()).endsWith(".csv"));
await p.screenshot({ path: path.join(AUSGABE, "kabel.png") });

/* ---------- Library ---------- */
await p.click('[data-haupt="library"]');
await p.click('[data-lib-sel="beispiel-flugrahmen-1m"]');
pruefe("Library: Pflicht fehlt → Speichern gesperrt", await p.locator('[data-l="speichern"]').isDisabled());
await p.fill('[data-pfad="gewicht"]', "12,5"); await p.press('[data-pfad="gewicht"]', "Tab"); await p.waitForTimeout(100);
await p.click('[data-l="speichern"]'); await p.waitForTimeout(100);
pruefe("Library: Eintrag gespeichert (lokal)", await ev(() => LIB.eintraege.get("beispiel-flugrahmen-1m").attribute.gewicht === 12.5 && LIB.herkunft.get("beispiel-flugrahmen-1m") === "lokal"));
pruefe("Library: Badge-Zählung P4+WH 9/14", await ev(() => { const v = vollstaendigkeit(LIB.eintraege.get("beispiel-ledtek-p4wh-pro-v3")); return v.gefuellt === 9 && v.gesamt === 14; }));
await p.screenshot({ path: path.join(AUSGABE, "library.png") });

/* ---------- Rigging (Flugrahmen mit Gewicht 12,5 kg aus der Library) ---------- */
await p.click('[data-haupt="planen"]'); await p.click('[data-reiter="aufbau"]');
const rig = await ev(() => { const d = riggingDaten(P.screens[0]); return { n: d.rahmen.length, kg: d.rahmen.map(r => +r.kg.toFixed(2)), punkt: +Math.max(...d.punkte.map(x => x.kg)).toFixed(2) }; });
pruefe("Rigging: 6 Flugrahmen à 112,9 kg, 56,45 kg je Punkt", rig.n === 6 && rig.kg.every(k => k === 112.9) && rig.punkt === 56.45, JSON.stringify(rig));
await p.screenshot({ path: path.join(AUSGABE, "rigging.png") });

/* ---------- Materialliste ---------- */
const mat = await ev(() => Object.fromEntries(materialListe().filter(x => x.gruppe !== "Kabel").map(x => [x.materialId, [x.anzahl, x.gewichtKg != null ? +x.gewichtKg.toFixed(1) : null]])));
pruefe("Material: 36 WH, 12 sWH, 6 Flugrahmen, C24, MX30", JSON.stringify(mat["beispiel-ledtek-p4wh-pro-v3"]) === "[36,500.4]" && mat["beispiel-ledtek-p4swh-pro-v3"][0] === 12
  && JSON.stringify(mat["beispiel-flugrahmen-1m"]) === "[6,75]" && mat["beispiel-stagesmarts-c24"][0] === 1 && mat["beispiel-novastar-mx30"][0] === 1, JSON.stringify(mat));
pruefe("Material: Kabel aus der Packliste", await ev(() => { const k = materialListe().filter(x => x.gruppe === "Kabel"); const pk = packliste(kabelListe()); return k.reduce((a, x) => a + x.anzahl, 0) === pk.reduce((a, x) => a + x.anzahl, 0); }));
await p.click('[data-haupt="einstellungen"]'); await p.click('[data-einst="material"]');
const [mcsv] = await Promise.all([p.waitForEvent("download"), p.click('[data-e="material-csv"]')]);
pruefe("Material: CSV", (await mcsv.suggestedFilename()).endsWith("_material.csv"));
pruefe("Material: „An Rex übergeben“ ohne Anbindung gesperrt", await p.locator('[data-e="material-rex"]').isDisabled());
await p.screenshot({ path: path.join(AUSGABE, "material.png") });
await p.click('[data-haupt="planen"]');

/* ---------- Kurven und Winkel ---------- */
await p.click('[data-reiter="aufbau"]');
await ev(() => { ui.auswahl.clear(); render(); });
pruefe("Kurve: 11 durchgehende Fugen", await ev(() => screenFugen(P.screens[0]).filter(f => f.durchgehend).length === 11));
await p.click('[data-a="winkel"]');
await dialog({ modus: "winkel", wert: "5", richtung: "konkav" });
const kv = await ev(() => { const d = kurveDaten(P.screens[0]); return { n: d.knicke.length, ges: d.gesamtGrad, sehne: d.sehneMm, stich: d.stichMm, r: d.radiusMm, ende: d.punkte[0][1], mitte: d.punkte[6][1] }; });
const sehneSoll = Array.from({ length: 12 }, (_, i) => 500 * Math.cos((-27.5 + 5 * i) * Math.PI / 180)).reduce((a, b) => a + b, 0);
pruefe("Kurve: 11 × 5° konkav → 55°, Sehne und Radius", kv.n === 11 && kv.ges === 55 && Math.abs(kv.sehne - sehneSoll) < 0.5 && Math.abs(kv.r - 500 / (2 * Math.sin(2.5 * Math.PI / 180))) < 0.5, JSON.stringify(kv));
pruefe("Kurve: konkav – Enden zum Publikum", kv.ende > kv.mitte && kv.mitte === 0);
pruefe("Kurve: Flugrahmen über Knick gemeldet", await ev(() => kurvePruefungen(P.screens[0]).some(x => x.text.includes("6 Flugrahmen über einem Knick"))));
pruefe("Kurve: erlaubte Winkel unbekannt (Info)", await ev(() => kurvePruefungen(P.screens[0]).some(x => x.art === "info" && x.text.includes("mögliche Winkel"))));
await p.click('[data-a="winkel"]');
await dialog({ modus: "radius", wert: "10", richtung: "konvex" });
pruefe("Kurve: Radius 10 m konvex → je −2,9°", await ev(() => kurveDaten(P.screens[0]).knicke.every(f => f.grad === -2.9)));
// nur an den Rahmenstößen knicken: Fugen bei 1000, 2000 … per Klick auf die Marke
await p.click('[data-a="winkel"]');
await dialog({ modus: "gerade" });
for (const x of [1000, 2000, 3000, 4000, 5000]) {
  await p.locator(`[data-fuge="${x}"]`).dispatchEvent("pointerdown", { button: 0 });
  await p.waitForTimeout(50);
  await dialog({ grad: "7,5", richtung: "konkav" });
}
const k2 = await ev(() => ({ w: P.screens[0].winkel, h: kurvePruefungen(P.screens[0]).filter(x => x.art === "warn").map(x => x.text) }));
pruefe("Kurve: Winkel per Klick auf die Fuge, Rahmen nicht über Knick", Object.keys(k2.w).length === 5 && Object.values(k2.w).every(w => w === 7.5) && !k2.h.length, JSON.stringify(k2));
await ev(() => { const e = P.library["beispiel-ledtek-p4wh-pro-v3"]; e.attribute.led.mechanik.winkelGrad = [0, 2.5, 5, 10]; });
pruefe("Kurve: 7,5° nicht in der Library-Liste", await ev(() => kurvePruefungen(P.screens[0]).some(x => x.text.includes("erlaubt 0°, 2,5°, 5°, 10°"))));
await ev(() => { P.library["beispiel-ledtek-p4wh-pro-v3"].attribute.led.mechanik.winkelGrad = null; });
await ev(() => { $("#toasts").innerHTML = ""; });
await p.screenshot({ path: path.join(AUSGABE, "kurve.png") });
await p.click('[data-a="spiegel-x"]');
pruefe("Kurve: Spiegeln ↔ nimmt die Winkel mit", await ev(() => JSON.stringify(Object.keys(P.screens[0].winkel).map(Number).sort((a, b) => a - b)) === "[1000,2000,3000,4000,5000]" && P.screens[0].module.length === 48));
pruefe("Kurve: Draufsicht im Bericht", await ev(() => berichtHtml().includes("Draufsicht (Kurve)")));

/* ---------- Speichern / Laden / Autosave ---------- */
await p.click('[data-haupt="planen"]');
const [dl] = await Promise.all([p.waitForEvent("download"), p.keyboard.press("Control+s")]);
const gespeichert = path.join(AUSGABE, "projekt.ledplaner.json");
await dl.saveAs(gespeichert);
const json = JSON.parse(fs.readFileSync(gespeichert, "utf8"));
pruefe("Speichern: Format und Inhalt", json.format === "rex-ledplaner" && json.screens.length === 1 && json.library["beispiel-ledtek-p4wh-pro-v3"]);
await p.reload(); await p.waitForTimeout(200);
pruefe("Autosave nach Neuladen", await ev(() => P.screens.length === 1 && P.kabel.length === 1));
await ev(() => { P = neuesProjekt(); render(); });
const waehler = p.waitForEvent("filechooser");
const oeffnen = ev(() => projektOeffnen());
await (await waehler).setFiles(gespeichert);
await oeffnen;
await p.waitForTimeout(200);
pruefe("Öffnen einer Projektdatei", await ev(() => P.screens.length === 1 && P.kreise.length > 0));

/* ---------- Druck und Live ---------- */
for (const art of ["bericht", "gross", "kunde"]) {
  await p.click("#btn-drucken");
  await p.selectOption('#dialog select[name="art"]', art);
  const [w] = await Promise.all([p.waitForEvent("popup"), p.click('#dialog button[value="ok"]')]);
  beob(w); await w.waitForTimeout(300);
  pruefe(`Druck ${art}`, (await w.locator(".blatt").count()) >= 1);
  await w.screenshot({ path: path.join(AUSGABE, `druck-${art}.png`), fullPage: true });
  await w.close();
}
const [lw] = await Promise.all([p.waitForEvent("popup"), p.click("#btn-live")]);
beob(lw); await lw.waitForTimeout(300);
const h1 = await lw.evaluate(() => [...document.getElementById("c").getContext("2d").getImageData(0, 0, 400, 400).data].reduce((a, v, i) => (a * 31 + v * (i % 7 + 1)) % 1000003, 7));
await lw.waitForTimeout(300);
const h2 = await lw.evaluate(() => [...document.getElementById("c").getContext("2d").getImageData(0, 0, 400, 400).data].reduce((a, v, i) => (a * 31 + v * (i % 7 + 1)) % 1000003, 7));
pruefe("Live-Ausgabe 1248 × 728 mit wandernden Cursorn", (await lw.evaluate(() => document.getElementById("c").width)) === 1248 && h1 !== h2);
await lw.close();

/* ---------- Rex-Anbindung (simulierter Datenbank-Agent) ---------- */
async function rexSeite(module) {
  const c = await browser.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
  await c.addInitScript(() => { window.REX_KONFIG = { API_BASIS_URL: "http://rex.test/api" }; });
  const log = [], projekte = new Map();
  await c.route("http://rex.test/api/**", async route => {
    const r = route.request(); const u = new URL(r.url()); const pfad = u.pathname.replace("/api", "");
    log.push(`${r.method()} ${pfad}${u.search}`);
    const json = d => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(d) });
    if (pfad === "/material") return json([{ id: "4711", name: "NovaStar MX30 (Rex)", kategorie: "Video · LED-Prozessor", attribute: { hersteller: "NovaStar", stromverbrauch: 55,
      anschluesse: [{ name: "Port", typ: "LAN", richtung: "out", rolle: "port", anzahl: 10 }], led: { typ: "prozessor", receivingCards: ["NovaStar A8s"], pxJePort: 659722, pxGesamt: 6500000, layer: 3, backup: true } } },
      { id: "9999", name: "Kein LED-Material", attribute: {} }]);
    if (pfad === "/freischaltung") return json({ module });
    if (pfad === "/projekte" && r.method() === "POST") { projekte.set("p-1", r.postData()); return json({ id: "p-1" }); }
    if (pfad === "/projekte" && r.method() === "GET") return json([...projekte.keys()].map(id => ({ id, titel: JSON.parse(projekte.get(id)).daten.titel })));
    if (pfad.startsWith("/projekte/") && r.method() === "PUT") { projekte.set(pfad.slice(10), r.postData()); return json({ id: pfad.slice(10) }); }
    if (pfad.startsWith("/projekte/")) return json(JSON.parse(projekte.get(pfad.slice(10))));
    if (pfad === "/material-rueckgabe") { log.push(JSON.parse(r.postData())); return json({ ok: true }); }
    return route.fulfill({ status: 404, body: "" });
  });
  const pg = await c.newPage(); beob(pg);
  await pg.goto(DATEI); await pg.waitForTimeout(300);
  return { c, pg, log };
}
{
  const { c, pg, log } = await rexSeite(["ledplaner"]);
  const e = (f, a) => pg.evaluate(f, a);
  pruefe("Rex: Library aus dem Datenbank-Agent (nur LED-Material)", await e(() => LIB.herkunft.get("4711") === "rex" && !LIB.eintraege.has("9999") && LIB.herkunft.get("beispiel-ledtek-p4wh-pro-v3") === "beispiel"));
  await e(() => { window.confirm = () => true; beispielProjektLaden(); });
  await pg.click("#btn-speichern"); await pg.waitForTimeout(150);
  await e(() => { P.daten.titel = "Rex Projekt"; aenderung(); });
  await pg.keyboard.press("Control+s"); await pg.waitForTimeout(150);
  pruefe("Rex: erst POST, dann PUT mit Projekt-Nr.", log.includes("POST /projekte") && log.includes("PUT /projekte/p-1") && await e(() => P.rexId === "p-1" && !istUngespeichert()), JSON.stringify(log.filter(x => typeof x === "string")));
  await e(() => { P = neuesProjekt(); gespeicherterStand = JSON.stringify(P); render(); });
  await pg.click('[data-haupt="einstellungen"]'); await pg.click('[data-einst="datei"]');
  await pg.click('[data-e="rex-oeffnen"]'); await pg.waitForTimeout(150);
  await pg.click('#dialog button[value="ok"]'); await pg.waitForTimeout(200);
  pruefe("Rex: Projekt aus Rex öffnen", await e(() => P.daten.titel === "Rex Projekt" && P.rexId === "p-1" && P.screens[0].module.length === 48));
  await pg.click('[data-einst="material"]'); await pg.click('[data-e="material-rex"]'); await pg.waitForTimeout(150);
  const doc = log.find(x => x.format === "rex-materialliste");
  pruefe("Rex: Materialliste übergeben", doc && doc.projekt.rexId === "p-1" && doc.positionen.some(x => x.materialId === "beispiel-ledtek-p4wh-pro-v3" && x.anzahl === 36));
  pruefe("Rex: Hinweis auf Material, das Rex nicht kennt", (await pg.locator("#einst-inhalt .hinweis", { hasText: "nicht aus der Rex-Library" }).count()) === 1);
  await pg.click('[data-einst="verknuepfung"]');
  pruefe("Rex: Status-Seite", (await pg.locator("#einst-inhalt").innerText()).includes("Datenbank-Agent · http://rex.test/api"));
  await pg.screenshot({ path: path.join(AUSGABE, "rex.png") });
  await c.close();
}
{
  const { c, pg } = await rexSeite([]);
  pruefe("Rex: nicht freigeschaltet → nur ansehen", await pg.locator("#btn-speichern").isDisabled() && (await pg.locator("#status-gespeichert").innerText()).includes("nur ansehen"));
  await c.close();
}

console.log(`\n${ok} bestanden, ${fehler.length} Fehler`);
if (fehler.length) { console.log(fehler.join("\n")); process.exitCode = 1; }
await browser.close();
