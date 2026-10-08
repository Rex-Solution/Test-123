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

// Kanal 10 der Wand zuweisen (Verteiler-Karte), dann unten in der Liste wählen und zwei Module übermalen
const vz = await ev(() => { const v = P.geraete.find(g => g.art === "verteiler"); ui.sel.verteiler = v.id; ui.sel.kreis = null; render(); return v.id; });
await p.click(`#rechts [data-zuweisen="${vz}|10"]`); await p.waitForTimeout(50);
pruefe("Zuweisung: Kanal 10 erscheint unten als freier Kanal", await p.locator(`#liste [data-ziel="${vz}|10"]`).count() === 1 && await ev(v => zugewieseneKanaele(P.screens[0]).some(x => x.v.id === v && x.nr === 10 && !x.kreis), vz));
pruefe("Zuweisung: alle Kanäle des Laka-Ausgangs gelistet (1–6 + 10)", await ev(() => zugewieseneKanaele(P.screens[0]).map(x => x.nr).join(",")) === "1,2,3,4,5,6,10");
await p.click(`#liste [data-ziel="${vz}|10"]`); await p.waitForTimeout(50);
pruefe("Zuweisung: Klick auf Zeile wählt den Pinsel", await ev(v => ui.werkzeug === "pinsel" && ui.pinsel.strom === v + "|10", vz));
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
await p.click(`#liste [data-ziel="${await ev(() => P.geraete.find(x => x.art === "prozessor").id)}|1"]`); await p.waitForTimeout(50);
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
pruefe("Multicore: Kabellänge zur Wand aus der Position berechnet", await ev(() => kabelListe().filter(z => z.von.startsWith("Multicore 1 · Ader")).every(z => Number.isFinite(z.laengeM) && z.bemerkung.includes("aus Position"))));
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
pruefe("Library: Badge-Zählung P4+WH 9/13", await ev(() => { const v = vollstaendigkeit(LIB.eintraege.get("beispiel-ledtek-p4wh-pro-v3")); return v.gefuellt === 9 && v.gesamt === 13; }));
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

/* ---------- 3D-Ansicht ---------- */
await p.click('[data-a="3d"]'); await p.waitForTimeout(100);
const d3 = await ev(() => { const svg = $("#zeichnung svg[data-dreid]"); const s = P.screens[0]; return { svg: !!svg, poly: svg?.querySelectorAll("polygon").length, vorne: [...(svg?.querySelectorAll("polygon") || [])].filter(x => x.getAttribute("fill") === "#1d3a5c").length,
  soll: s.module.reduce((a, m) => { const r = modRect(m); return a + 1 + Object.keys(s.winkel).map(Number).filter(x => x > r.x && x < r.x + r.b).length; }, 0) + riggingDaten(s).rahmen.length }; });
pruefe("3D: alle Module (+ Flugrahmen) als Flächen, Vorderseite zur Kamera", d3.svg && d3.poly === d3.soll && d3.vorne >= 36, JSON.stringify(d3));
const fl = await p.locator("#zeichnung .dreid-flaeche").boundingBox();
const yaw0 = await ev(() => ui.dreid.yaw);
await p.mouse.move(fl.x + fl.width / 2, fl.y + fl.height / 2); await p.mouse.down();
await p.mouse.move(fl.x + fl.width / 2 + 200, fl.y + fl.height / 2, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(50);
pruefe("3D: Ziehen dreht die Ansicht", await ev(y => Math.abs(ui.dreid.yaw - (y + 80)) < 1, yaw0));
await p.mouse.move(fl.x + fl.width / 2, fl.y + fl.height / 2); await p.mouse.wheel(0, -200); await p.waitForTimeout(50);
await p.click('[data-zoom="+"]'); await p.waitForTimeout(50);
pruefe("3D: Mausrad und Zoom-Knopf", await ev(() => Math.abs(ui.dreid.zoom - 1.15 * 1.4) < 0.01));
await ev(() => { $("#toasts").innerHTML = ""; });
await p.screenshot({ path: path.join(AUSGABE, "dreid.png") });
await p.click('[data-zoom="fit"]'); await p.waitForTimeout(50);
pruefe("3D: ⤢ setzt die Ansicht zurück", await ev(() => ui.dreid.zoom === 1 && ui.dreid.yaw === -28));
await ev(() => { ui.modus.strom = "wand"; });
await p.click('[data-reiter="strom"]'); await p.waitForTimeout(50);
pruefe("3D: andere Reiter zeichnen normal", await p.locator("#zeichnung svg[data-ansicht]").count() === 1);
await p.click('[data-reiter="aufbau"]'); await p.click('[data-a="vorne"]'); await p.waitForTimeout(50);
pruefe("3D: zurück zur Vorderansicht", await p.locator("#zeichnung svg[data-ansicht]").count() === 1 && await p.locator("#zeichnung svg[data-dreid]").count() === 0);
pruefe("3D: Kundenansicht mit 3D-Bild", await ev(() => kundenHtml().includes("data-dreid")));

/* ---------- Brackets: Module fest an Bracket-Plätzen ---------- */
{
await ev(() => { P.screens[0].winkel = {}; ui.auswahl.clear(); aenderung(); });
const br = () => ev(() => riggingDaten(P.screens[0]).rahmen.map(r => [r.lib.id.replace("beispiel-", ""), r.x, r.belegt, r.plaetze]));
pruefe("Bracket: Raster 500 mm aktiv, 6 × 1 m", await ev(() => bracketRaster(P.screens[0])?.platz === 500) && JSON.stringify((await br()).map(x => x[0])) === JSON.stringify(Array(6).fill("flugrahmen-1m")));
// Ziehen: rastet nur auf Bracket-Plätze (300 mm nach rechts → nächster Platz 500 mm)
const ziel = await ev(() => { const s = P.screens[0]; const m = s.module.find(m => m.x === 5500 && m.y === 3000); return m.id; });
const zb = await modulBox(ziel);
const pxJeMm = await ev(() => 1 / mmJePixel($("#zeichnung svg")));
await p.mouse.move(zb.x + zb.width / 2, zb.y + zb.height / 2); await p.mouse.down();
await p.mouse.move(zb.x + zb.width / 2 + 330 * pxJeMm, zb.y + zb.height / 2 + 120 * pxJeMm, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(80);
pruefe("Bracket: Ziehen rastet auf den nächsten Platz (6000/3000)", await ev(id => { const m = P.screens[0].module.find(m => m.id === id); return m.x === 6000 && m.y === 3000; }, ziel));
const anschlag = () => ev(() => riggingDaten(P.screens[0]).rahmen.map(r => [r.lib.id.replace("beispiel-", ""), r.x, r.y]));
pruefe("Bracket: versetzte Spalte hängt an eigenem 50-cm-Bracket in ihrer Höhe", JSON.stringify((await anschlag()).slice(-1)) === JSON.stringify([["flugrahmen-05m", 6000, 3000]]) && (await br()).length === 7, JSON.stringify(await anschlag()));
pruefe("Bracket: versetzt ist keine Lücke", await ev(() => !riggingPruefungen().some(x => x.text.includes("Lücke"))));
await p.selectOption('[data-rig="rest"]', "halb"); await p.waitForTimeout(50);
pruefe("Bracket: versetzt → auch bei „halb belegt“ kleines Bracket", JSON.stringify((await br()).slice(-1)) === JSON.stringify([["flugrahmen-05m", 6000, 1, 1]]));
// 13. Spalte oben auffüllen → 13 Spalten mit gleicher Oberkante
const neu13 = await ev(() => { const s = P.screens[0]; const ids = [0, 1000, 2000].map(y => { const m = { id: neueId("m"), lib: "beispiel-ledtek-p4wh-pro-v3", x: 6000, y }; s.module.push(m); return m.id; }); aenderung(); return ids; });
pruefe("Bracket: ungerade, halb belegt → 7 × 1 m, letztes 1/2", JSON.stringify((await br()).slice(-1)) === JSON.stringify([["flugrahmen-1m", 6000, 1, 2]]) && (await br()).length === 7, JSON.stringify(await br()));
await p.selectOption('[data-rig="seite"]', "links"); await p.waitForTimeout(50);
pruefe("Bracket: Seite links → halbes Bracket ragt links über", JSON.stringify((await br())[0]) === JSON.stringify(["flugrahmen-1m", -500, 1, 2]), JSON.stringify(await br()));
await p.selectOption('[data-rig="rest"]', "ergaenzen"); await p.selectOption('[data-rig="seite"]', "rechts"); await p.waitForTimeout(50);
pruefe("Bracket: ungerade, ergänzen → 6 × 1 m + 50 cm rechts", JSON.stringify((await br()).slice(-2)) === JSON.stringify([["flugrahmen-1m", 5000, 2, 2], ["flugrahmen-05m", 6000, 1, 1]]));
await ev(([id]) => { const s = P.screens[0]; s.module = s.module.filter(m => m.id !== id); aenderung(); }, [neu13[1]]);
pruefe("Bracket: Loch in einer Spalte als Lücke gemeldet", await ev(() => riggingPruefungen().some(x => x.text.includes("Lücke in 1 Spalte "))));
await ev(ids => { const s = P.screens[0]; s.module = s.module.filter(m => !ids.includes(m.id)); ui.auswahl.clear(); aenderung(); }, neu13);
// Pfeiltaste: ein Platz
await ev(id => { ui.auswahl = new Set([id]); render(); }, ziel);
await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(50);
pruefe("Bracket: Pfeiltaste verschiebt um einen Platz (6000 → 5500)", await ev(id => P.screens[0].module.find(m => m.id === id).x === 5500, ziel));
// außerhalb des Rasters → Hinweis und „Ins Bracket-Raster setzen“
await ev(id => { const m = P.screens[0].module.find(m => m.id === id); m.x = 6130; m.y = 3000; aenderung(); }, ziel);
pruefe("Bracket: Modul außerhalb des Rasters gemeldet", await ev(() => riggingPruefungen().some(x => x.text.includes("1 Module nicht auf Bracket-Plätzen"))));
await p.click('[data-rig-a="raster"]'); await p.waitForTimeout(50);
pruefe("Bracket: „Ins Bracket-Raster setzen“", await ev(id => P.screens[0].module.find(m => m.id === id).x === 6000, ziel));
await ev(id => { const s = P.screens[0]; const m = s.module.find(m => m.id === id); m.x = 5500; aenderung(); }, ziel);
// gestellt: Stacking-Bracket unten, keine Aufhängepunkte
await ev(() => { const s = P.screens[0]; s.bauart = "gestellt"; for (const id of ["beispiel-stacking-1m", "beispiel-stacking-05m"]) { nutzeEintrag(id); P.library[id].attribute.gewicht = 9; } s.rigging.lib = "beispiel-stacking-1m"; s.rigging.lib2 = "beispiel-stacking-05m"; aenderung(); });
const st = await ev(() => { const d = riggingDaten(P.screens[0]); return { n: d.rahmen.length, punkte: d.punkte.length, kg: +d.gesamtKg.toFixed(1), unten: riggingSvg(P.screens[0]).includes("rect") }; });
pruefe("Bracket gestellt: 6 Stacking-Brackets unten, Bodenlast", st.n === 6 && st.punkte === 0 && st.kg === 602.4 + 54 && st.unten, JSON.stringify(st));
await ev(() => { $("#toasts").innerHTML = ""; });
await p.screenshot({ path: path.join(AUSGABE, "bracket-gestellt.png") });
await ev(() => { const s = P.screens[0]; s.bauart = "geflogen"; s.rigging.lib = "beispiel-flugrahmen-1m"; s.rigging.lib2 = "beispiel-flugrahmen-05m"; aenderung(); });
}

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

/* ---------- Projektbaum: Übersichten und Kontextmenü ---------- */
await p.click('[data-haupt="planen"]');
await p.click('#baum li[data-gruppe="strom"]'); await p.waitForTimeout(50);
pruefe("Baum: Klick „Stromverteiler“ → alle Verteiler", await ev(() => ui.reiter === "strom" && ui.modus.strom === "verteiler") && await p.locator(".uebersicht .karte").count() >= 2);
await p.click('#baum li[data-gruppe="prozessoren"]'); await p.waitForTimeout(50);
pruefe("Baum: Klick „Prozessoren“ → alle Prozessoren", await ev(() => ui.reiter === "signal" && ui.modus.signal === "prozessoren"));
await p.click('#baum li[data-gruppe="screens"]'); await p.waitForTimeout(50);
pruefe("Baum: Klick „Screens“ → Übersicht aller Screens", await ev(() => ui.reiter === "aufbau" && ui.modus.aufbau === "alle") && await p.locator("[data-screen-karte]").count() === await ev(() => P.screens.length));
await p.click("[data-screen-karte]"); await p.waitForTimeout(50);
pruefe("Baum: Karte öffnet die Wand", await ev(() => ui.modus.aufbau === "wand"));
const nV = await ev(() => P.geraete.filter(g => g.art === "verteiler").length);
await p.click(`#baum [data-geraet="${await ev(() => P.geraete.find(g => g.art === "verteiler").id)}"]`, { button: "right" }); await p.waitForTimeout(50);
await p.click("#kontextmenue button:text-is('Duplizieren')"); await p.waitForTimeout(50);
pruefe("Kontextmenü: Verteiler duplizieren", await ev(n => P.geraete.filter(g => g.art === "verteiler").length === n + 1 && P.geraete.some(g => g.name.endsWith("(Kopie)")), nV));
await p.click('#baum li[data-gruppe="prozessoren"]', { button: "right" }); await p.waitForTimeout(50);
await p.screenshot({ path: path.join(AUSGABE, "kontextmenue.png") });
await p.click("#kontextmenue button:text-is('NovaStar MX30')"); await p.waitForTimeout(50);
pruefe("Kontextmenü: Prozessor über Überschrift hinzufügen", await ev(() => P.geraete.filter(g => g.art === "prozessor").length === 2));
const kopie = await ev(() => P.geraete.find(g => g.name.endsWith("(Kopie)")).id);
await p.click(`#baum [data-geraet="${kopie}"]`, { button: "right" }); await p.waitForTimeout(50);
await p.click("#kontextmenue button:text-is('Löschen')"); await p.waitForTimeout(50);
pruefe("Kontextmenü: Löschen", await ev(id => !geraetById(id), kopie));
await ev(() => { const g = P.geraete.filter(g => g.art === "prozessor")[1]; P.geraete = P.geraete.filter(x => x !== g); ui.sel.prozessor = null; aenderung(); });
await p.click(`#baum [data-geraet="${await ev(() => P.geraete.find(g => g.art === "verteiler").id)}"]`, { button: "right" }); await p.keyboard.press("Escape");
pruefe("Kontextmenü: Escape schließt", await p.locator("#kontextmenue").count() === 0);

/* ---------- Spinne und Stagebox als Symbol in der Wand ---------- */
{
  await ev(() => { window.confirm = () => true; beispielProjektLaden(); ui.reiter = "strom"; ui.modus.strom = "wand"; ui.werkzeug = "auswahl"; $("#toasts").innerHTML = ""; render(); });
  const laka = await ev(() => P.lakas[0].id);
  pruefe("Symbol: Spinne in der Strom-Zeichnung mit Linien zu 6 Kreisanfängen", await p.locator(`#zeichnung [data-symbol="laka:${laka}"]`).count() === 1 && await ev(() => spinneZiele(P.screens[0], P.lakas[0]).length === 6));
  pruefe("Spinne: automatisch die kürzeste, die reicht (5 m)", await ev(() => spinneLib(P.lakas[0]).id === "beispiel-spinne-h16-true1-5m" && !stromPruefungen().some(x => x.text.includes("Spinne an Harting 1"))));
  await ev(() => { P.lakas[0].spinne = "beispiel-spinne-h16-true1"; aenderung(); });
  pruefe("Spinne: gewählte 1,5-m-Spinne zu kurz gemeldet", await ev(() => stromPruefungen().some(x => x.text.includes("Spinne an Harting 1") && x.text.includes("gewählte Spinne hat 1,5 m"))));
  pruefe("Spinne: Kabelliste nutzt die gewählte Spinne", await ev(() => kabelListe().find(z => z.key === "spinne:" + P.lakas[0].id).lib === "beispiel-spinne-h16-true1"));
  const sp = await p.locator(`#zeichnung [data-symbol="laka:${laka}"]`).boundingBox();
  const pxMm = await ev(() => 1 / mmJePixel($("#zeichnung svg")));
  const vorher = await ev(() => spinnePos(P.screens[0], P.lakas[0]));
  await p.mouse.move(sp.x + sp.width / 2, sp.y + sp.height / 2); await p.mouse.down();
  await p.mouse.move(sp.x + sp.width / 2 + 1000 * pxMm, sp.y + sp.height / 2, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(80);
  pruefe("Symbol: Spinne verschoben (≈ 1 m nach rechts), keine Kreise verändert", await ev(v => { const l = P.lakas[0]; return l.pos && Math.abs(l.pos.x - (v.x + 1000)) <= 20 && P.kreise.length === 6; }, vorher));
  // Stagebox: Länge aus Position
  await ev(() => { ui.reiter = "signal"; ui.modus.signal = "wand"; const d = P.geraete.find(g => g.art === "stagebox"); d.ausgangLaengeM = null; aenderung(); });
  pruefe("Symbol: CVT10 in der Signal-Zeichnung", await p.locator(`#zeichnung [data-symbol^="weg:"]`).count() === 1);
  const sb = await ev(() => kabelListe().filter(z => z.von.startsWith("Stagebox 1 · Ausgang")).map(z => z.laengeM));
  pruefe("Symbol: Port-Kabel ab Stagebox mit berechneter Länge", sb.length === 4 && sb.every(Number.isFinite), JSON.stringify(sb));
  await ev(() => { const s = P.screens[0], d = P.geraete.find(g => g.art === "stagebox"), k = P.straenge.find(x => x.port === 1); const m = modulMitte(s, k.module[0]); d.pos = { screen: s.id, ...m }; aenderung(); });
  pruefe("Symbol: Stagebox direkt am Strangstart → 1 m (nur Reserve)", await ev(() => kabelListe().find(z => z.von.includes("(Port 1)") && !z.von.includes("Backup")).laengeM === 1));
  const gz = await ev(() => { const g = P.geraete.find(x => x.art === "prozessor"); ui.sel.prozessor = g.id; ui.sel.weg = null; render(); return g.id; });
  await p.click(`#rechts [data-zuweisen="${gz}|5"]`); await p.waitForTimeout(50);
  pruefe("Zuweisung: Port 5 der Wand zugewiesen → unten als frei gelistet", await p.locator(`#liste [data-ziel="${gz}|5"]`).count() === 1);
  await p.click(`#liste [data-ziel="${gz}|5"]`); await p.waitForTimeout(50);
  pruefe("Zuweisung: Klick auf freien Port wählt den Pinsel", await ev(g => ui.werkzeug === "pinsel" && ui.pinsel.signal === g + "|5", gz));
  await ev(() => { ui.werkzeug = "auswahl"; $("#toasts").innerHTML = ""; render(); });
  await p.screenshot({ path: path.join(AUSGABE, "symbole-signal.png") });
  await ev(() => { ui.reiter = "strom"; render(); });
  await p.screenshot({ path: path.join(AUSGABE, "symbole-strom.png") });
}

/* ---------- Rückmeldung 2: Brackets bei neuem Screen, Pinsel-Tasten, Sortieren, Ausgänge, Stagebox-Strom, Backup ---------- */
{
  await ev(() => { window.confirm = () => true; beispielProjektLaden(); ui.reiter = "aufbau"; ui.modus.aufbau = "wand"; $("#toasts").innerHTML = ""; render(); });
  // neuer Screen übernimmt die Brackets
  await p.click('#baum [data-aktion="screen-neu"]'); await p.waitForTimeout(50);
  await dialog({ name: "Seite links" });
  pruefe("Brackets: neuer Screen übernimmt Bracket (Module sofort fest)", await ev(() => { const s = P.screens[P.screens.length - 1]; return s.name === "Seite links" && s.rigging.lib === "beispiel-flugrahmen-1m" && s.rigging.lib2 === "beispiel-flugrahmen-05m"; }));
  pruefe("Brackets: auch ohne Gewicht wählbar", await ev(() => { const h = riggingKarte(P.screens[0]); return h.includes('value="beispiel-flugrahmen-1m"') && !/value="beispiel-flugrahmen-1m"[^>]*disabled/.test(h); }));
  await ev(() => { const s = P.screens[P.screens.length - 1]; s.bauart = "geflogen"; bauartWechseln(s, "gestellt"); });
  pruefe("Brackets: Wechsel auf gestellt wählt Stacking-Bracket", await ev(() => P.screens[P.screens.length - 1].rigging.lib === "beispiel-stacking-1m"));
  // Projektbaum sortieren: Hausanschluss vor Verteiler ziehen
  const [vli, eli] = [await p.locator('#baum li[data-geraet^="v"]').first().boundingBox(), await p.locator('#baum li[data-geraet^="e"]').first().boundingBox()];
  await p.mouse.move(eli.x + 40, eli.y + eli.height / 2); await p.mouse.down();
  await p.mouse.move(vli.x + 40, vli.y + 3, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(50);
  pruefe("Baum: Einspeisung per Ziehen vor den Verteiler", await ev(() => { const st = P.geraete.filter(g => g.art === "verteiler" || g.art === "einspeisung"); return st[0].art === "einspeisung"; }));
  // Pinsel-Tasten im Strom
  await ev(() => { ui.screen = P.screens[0].id; ui.reiter = "strom"; ui.modus.strom = "wand"; render(); });
  const v1 = await ev(() => P.geraete.find(g => g.art === "verteiler").id);
  await p.click(`#liste [data-ziel="${v1}|1"]`); await p.waitForTimeout(30);
  await p.keyboard.press("Backspace"); await p.waitForTimeout(30);
  pruefe("Pinsel: Backspace nimmt ein Modul zurück", await ev(v => P.kreise.find(k => k.verteiler === v && k.kanal === 1).module.length === 7, v1));
  await p.keyboard.press("Delete"); await p.waitForTimeout(30);
  pruefe("Pinsel: Entf löscht den ganzen Kreis", await ev(v => !P.kreise.some(k => k.verteiler === v && k.kanal === 1), v1));
  await p.keyboard.press("Control+z"); await p.keyboard.press("Control+z"); await p.waitForTimeout(50);
  pruefe("Pinsel: Rückgängig stellt den Kreis wieder her", await ev(v => P.kreise.find(k => k.verteiler === v && k.kanal === 1)?.module.length === 8, v1));
  // Stagebox mit dem Pinsel versorgen (Kanal 1 → über das Symbol streichen)
  await ev(() => { const d = P.geraete.find(g => g.art === "stagebox"); d.strom = null; aenderung(); });
  await p.click(`#liste [data-ziel="${v1}|1"]`); await p.waitForTimeout(30);
  const sbs = await p.locator('#zeichnung [data-strom-geraet]').boundingBox();
  const m0 = await modulBox(await ev(() => P.kreise.find(k => k.kanal === 1).module[0]));
  await p.mouse.move(m0.x + m0.width / 2, m0.y + m0.height / 2); await p.mouse.down();
  await p.mouse.move(sbs.x + sbs.width / 2, sbs.y + sbs.height / 2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(50);
  pruefe("Stagebox im Stromplan: mit dem Pinsel aus Kanal 1 versorgt", await ev(v => { const d = P.geraete.find(g => g.art === "stagebox"); return d.strom?.verteiler === v && d.strom.kanal === 1; }, v1));
  pruefe("Stagebox im Stromplan: 22 W zählen zum Kreis", await ev(() => { const k = P.kreise.find(k => k.kanal === 1); return Math.round(kreisLast(k) - kreisModule(k).reduce((a, m) => a + modulLast(m), 0)) === 22; }));
  await ev(() => { ui.werkzeug = "auswahl"; render(); });
  // Ausgänge tauschen per Drag & Drop (Harting 1 → Harting 3)
  await ev(() => { ui.sel.verteiler = P.geraete.find(g => g.art === "verteiler").id; ui.sel.kreis = null; render(); });
  await p.locator(`#rechts [data-ausgang="${v1}|Harting 1"]`).dragTo(p.locator(`#rechts [data-ausgang="${v1}|Harting 3"]`)); await p.waitForTimeout(50);
  pruefe("Ausgang tauschen: Kreise und Laka auf Harting 3 (Kanäle 13–18)", await ev(() => P.lakas[0].ausgang === "Harting 3" && P.kreise.map(k => k.kanal).sort((a, b) => a - b).join(",") === "13,14,15,16,17,18" && P.geraete.find(g => g.art === "stagebox").strom.kanal === 13));
  // Schieflast sichtbar
  await ev(() => { P.kreise = P.kreise.filter(k => k.kanal === 13 || k.kanal === 16); aenderung(); });
  pruefe("Schieflast: Warnung in der Verteiler-Karte", (await p.locator("#rechts .hinweis.warn", { hasText: "Schieflast" }).count()) >= 1);
  await p.keyboard.press("Control+z"); await p.waitForTimeout(50);
  // Signal: Backup-Bereich und Stagebox-Karten
  await ev(() => { ui.reiter = "signal"; ui.modus.signal = "backup"; render(); });
  pruefe("Backup: Bereich listet alle Stränge", await p.locator("#zeichnung [data-backup-strang]").count() === 2);
  const k1 = await ev(() => P.straenge.find(k => k.port === 1).id);
  await p.selectOption(`[data-backup-port="${k1}"]`, "7"); await p.waitForTimeout(50);
  pruefe("Backup: Port 7 als Backup zu P1 gesetzt (anderer Weg markiert)", await ev(id => P.straenge.find(k => k.id === id).backupPort === 7, k1) && (await p.locator(`[data-backup-strang="${k1}"] .badge`).count()) === 1);
  await p.selectOption(`[data-backup-port="${k1}"]`, ""); await p.waitForTimeout(30);
  await p.click("[data-d='backup-auto']"); await p.waitForTimeout(50);
  pruefe("Backup: automatisch über denselben Weg (Port 3 via SB1)", await ev(id => P.straenge.find(k => k.id === id).backupPort === 3, k1));
  await ev(() => { $("#toasts").innerHTML = ""; });
  await p.screenshot({ path: path.join(AUSGABE, "backup.png") });
  await p.click('[data-d="modus"][data-wert="prozessoren"]'); await p.waitForTimeout(50);
  pruefe("Alle Prozessoren: Stagebox als eigene Karte mit Ausgängen", await p.locator(".weg-karte").count() === 1 && await p.locator(".weg-karte .port").count() === 10);
  await p.screenshot({ path: path.join(AUSGABE, "alle-prozessoren.png") });
}

/* ---------- Brackets: versetzte Spalte ohne gewähltes Ergänzungs-Bracket (Fehlerbild aus der Rückmeldung) ---------- */
{
  const lage = await ev(() => {
    window.confirm = () => true; beispielProjektLaden();
    const s = P.screens[0]; const WH = "beispiel-ledtek-p4wh-pro-v3", SWH = "beispiel-ledtek-p4swh-pro-v3";
    s.module = []; const add = (lib, x, y) => s.module.push({ id: neueId("m"), lib, x, y });
    add(SWH, 0, 1500); add(WH, 0, 2000); add(WH, 0, 3000); add(WH, 0, 4000);            // Spalte A tiefer
    for (let x = 500; x <= 5500; x += 500) { add(SWH, x, 0); add(WH, x, 500); add(WH, x, 1500); add(WH, x, 2500); }
    s.rigging.lib2 = null; s.rigging.rest = "ergaenzen"; s.rigging.seite = "rechts"; aenderung();
    return riggingDaten(s).rahmen.map(r => [r.lib.id.replace("beispiel-flugrahmen-", ""), r.x, r.y, r.belegt, r.plaetze]);
  });
  pruefe("Bracket ohne Ergänzung: versetzte Spalte A bekommt automatisch 0,5 m in ihrer Höhe", JSON.stringify(lage[0]) === JSON.stringify(["05m", 0, 1500, 1, 1]), JSON.stringify(lage));
  pruefe("Bracket ohne Ergänzung: kein Bracket ragt über eine Nachbarspalte", await ev(() => { const s = P.screens[0]; const d = riggingDaten(s); return d.rahmen.every(r => !r.halb) && !riggingPruefungen().some(x => x.text.includes("Nachbarspalte")); }));
  const ohneKlein = await ev(() => {
    const ids = ["beispiel-flugrahmen-05m"]; const alt = ids.map(id => [id, LIB.eintraege.get(id), P.library[id]]);
    for (const id of ids) { LIB.eintraege.delete(id); delete P.library[id]; }
    const erg = riggingDaten(P.screens[0]).rahmen.filter(r => r.halb).map(r => [r.x, r.leerLinks]);
    for (const [id, e, pe] of alt) { LIB.eintraege.set(id, e); if (pe) P.library[id] = pe; }
    return erg;
  });
  pruefe("Bracket ohne kleines Bracket: leere Hälfte auf die freie Seite (A links außen, L rechts außen)", JSON.stringify(ohneKlein) === JSON.stringify([[-500, true], [5500, false]]), JSON.stringify(ohneKlein));
  await ev(() => { ui.reiter = "aufbau"; ui.modus.aufbau = "wand"; ui.ansicht3d = false; ui.ansicht.clear(); $("#toasts").innerHTML = ""; render(); });
  await p.locator("#zeichnung").screenshot({ path: path.join(AUSGABE, "bracket-versetzt.png") });
}

/* ---------- Controller-Backup (ganzer Prozessor als Backup) ---------- */
{
  await ev(() => { window.confirm = () => true; beispielProjektLaden(); ui.reiter = "signal"; ui.modus.signal = "wand"; ui.sel.prozessor = P.geraete.find(g => g.art === "prozessor").id; ui.sel.weg = null; ui.werkzeug = "auswahl"; $("#toasts").innerHTML = ""; render(); });
  const pid = await ev(() => ui.sel.prozessor);
  await p.click(`#rechts [data-cb-neu="${pid}"]`); await p.waitForTimeout(80);
  const cb = await ev(id => { const g = geraetById(id); const b = backupController(g); return b && { b: b.id, name: b.name, st: P.straenge.map(k => [k.port, k.backupGeraet === b.id, k.backupPort]), belegt: [...belegtePorts(id)].sort(), belegtB: [...belegtePorts(b.id)].sort() }; }, pid);
  pruefe("Controller-Backup: anlegen spiegelt Port N → Port N am Backup-Controller", cb && cb.name === "Prozessor 1 Backup" && JSON.stringify(cb.st) === "[[1,true,1],[2,true,2]]", JSON.stringify(cb));
  pruefe("Controller-Backup: Port-Backups am Haupt-Controller entfallen (nur 1, 2 belegt)", cb && JSON.stringify(cb.belegt) === "[1,2]" && JSON.stringify(cb.belegtB) === "[1,2]");
  pruefe("Controller-Backup: Kabel vom Backup-Controller zum Strangende", await ev(() => kabelListe().filter(z => z.key.startsWith("backup:")).every(z => z.von.startsWith("Prozessor 1 Backup · Port ") && z.nach.includes("Strangende"))));
  pruefe("Controller-Backup: Zeichnung zeigt Pr2·B1", await ev(() => signalSvgInhalt(P.screens[0]).includes("Pr2·B1")));
  // eigene Stagebox für den Backup-Controller
  await ev(id => { wegAnlegen("stagebox", "beispiel-novastar-cvt10", id); }, cb.b);
  pruefe("Controller-Backup: eigene Stagebox übernimmt Backup-Ports 1, 2", await ev(id => { const d = wegGeraete(id)[0]; return JSON.stringify(d.ports) === "[1,2]" && kabelListe().filter(z => z.key.startsWith("backup:")).every(z => z.von.startsWith(d.name + " · Ausgang")); }, cb.b));
  // statt dessen: Adern am Multicore des Haupt-Controllers
  await ev(id => { P.geraete = P.geraete.filter(d => !(istWeg(d) && d.prozessor === id)); aenderung(); }, cb.b);
  await ev(id => { const mc = wegAnlegen("multicore", "beispiel-multicore-cat4-25", id); }, pid);
  await p.click('#rechts [data-w="backup-spiegeln"]'); await p.waitForTimeout(50);
  pruefe("Controller-Backup: Adern am Multicore des Haupt-Controllers", await ev(([pid, bid]) => { const mc = P.geraete.find(d => d.art === "multicore"); return JSON.stringify(mc.backupPorts) === "[1,2]" && portWeg(bid, 1) === mc && kabelListe().some(z => z.von.includes("Ader 1 (Prozessor 1 Backup Port 1)")); }, [pid, cb.b]));
  // Vorschlag am Haupt-Controller spiegelt wieder, am Backup-Controller verweigert
  await ev(() => { ui.sel.prozessor = P.geraete.find(g => g.art === "prozessor").id; signalVorschlag(); });
  pruefe("Controller-Backup: neuer Vorschlag spiegelt, keine Port-Backups", await ev(id => P.straenge.every(k => k.backupGeraet === id && k.backupPort === k.port), cb.b));
  pruefe("Controller-Backup: Vorschlag am Backup-Controller verweigert", await ev(id => { ui.sel.prozessor = id; const n = P.straenge.length; signalVorschlag(); return P.straenge.length === n && P.straenge.every(k => k.prozessor !== id); }, cb.b));
  await ev(() => { ui.modus.signal = "backup"; $("#toasts").innerHTML = ""; render(); });
  pruefe("Controller-Backup: Bereich Backup zeigt Controller und Ports", (await p.locator("#zeichnung").innerText()).includes("Controller-Backup") && (await p.locator("[data-backup-strang]").first().innerText()).includes("Prozessor 1 Backup"));
  await p.screenshot({ path: path.join(AUSGABE, "controller-backup.png") });
  await ev(() => { ui.modus.signal = "prozessoren"; render(); });
  pruefe("Controller-Backup: Übersicht markiert den Backup-Controller", (await p.locator(".uebersicht .karte", { hasText: "Backup von Prozessor 1" }).count()) === 1);
  await p.screenshot({ path: path.join(AUSGABE, "controller-backup-alle.png") });
  // Backup-Controller löschen
  await ev(id => { geraetLoeschen(geraetById(id)); }, cb.b);
  pruefe("Controller-Backup: Löschen hebt das Backup auf", await ev(id => !geraetById(P.geraete.find(g => g.art === "prozessor").id).backupController && P.straenge.every(k => !k.backupGeraet && !Number.isFinite(k.backupPort)), cb.b));
}

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

/* ---------- Tablet (Fingerbedienung, simulierte Touch-Ereignisse) ---------- */
{
  const c = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const pg = await c.newPage(); beob(pg);
  const e = (f, a) => pg.evaluate(f, a);
  await pg.goto(DATEI); await e(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(150);
  await e(() => { window.confirm = () => true; beispielProjektLaden(); $("#toasts").innerHTML = ""; });
  const cdp = await c.newCDPSession(pg);
  const finger = (type, punkte) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: punkte.map(([x, y], id) => ({ x, y, id })) });
  const box = async sel => pg.locator(sel).first().boundingBox();
  const mitte = b => [b.x + b.width / 2, b.y + b.height / 2];
  const pause = () => pg.waitForTimeout(40);

  // Tippen auf ein Modul: Touch erkannt, Modul gewählt
  const [mx, my] = mitte(await box(`[data-mod="${await e(() => P.screens[0].module[0].id)}"] rect`));
  await finger("touchStart", [[mx, my]]); await pause(); await finger("touchEnd", []); await pause();
  pruefe("Tablet: Fingerbedienung erkannt, Touch-Knöpfe sichtbar", await e(() => ui.touch && document.body.classList.contains("touch")) && await pg.locator('[data-a="mehrfach"]').isVisible());

  // Zwei Finger auseinander: hineinzoomen, nichts verschoben
  const vorher = await e(() => JSON.stringify(P));
  const [cx, cy] = mitte(await box("#zeichnung"));
  const b0 = await e(() => ui.ansicht.get(P.screens[0].id).b);
  await finger("touchStart", [[cx - 60, cy]]); await pause();
  await finger("touchStart", [[cx - 60, cy], [cx + 60, cy]]); await pause();
  for (let i = 1; i <= 6; i++) { await finger("touchMove", [[cx - 60 - 10 * i, cy], [cx + 60 + 10 * i, cy]]); await pause(); }
  await finger("touchEnd", []); await pause();
  const b1 = await e(() => ui.ansicht.get(P.screens[0].id).b);
  pruefe("Tablet: Zwei-Finger-Zoom (Abstand ×2 → halbe Breite)", Math.abs(b1 / b0 - 0.5) < 0.03 && await e(v => JSON.stringify(P) === v, vorher), `${b0} → ${b1}`);

  // Zwei Finger, Start auf einem Modul: Verschieben der Ansicht, Modul bleibt liegen
  await pg.click('[data-zoom="fit"]'); await pause();
  const [ax, ay] = mitte(await box(`[data-mod="${await e(() => P.screens[0].module[5].id)}"] rect`));
  const x0 = await e(() => ui.ansicht.get(P.screens[0].id).x);
  await finger("touchStart", [[ax, ay]]); await pause();
  await finger("touchMove", [[ax + 30, ay]]); await pause();
  await finger("touchStart", [[ax + 30, ay], [ax + 130, ay]]); await pause();
  for (let i = 1; i <= 5; i++) { await finger("touchMove", [[ax + 30 + 20 * i, ay], [ax + 130 + 20 * i, ay]]); await pause(); }
  await finger("touchEnd", []); await pause();
  pruefe("Tablet: Zwei-Finger-Verschieben bricht Modul-Ziehen ab", await e(v => JSON.stringify(P) === v, vorher) && await e(x => ui.ansicht.get(P.screens[0].id).x < x - 1, x0));

  // Zoom-Knöpfe
  const b2 = await e(() => ui.ansicht.get(P.screens[0].id).b);
  await pg.click('[data-zoom="+"]'); await pause();
  pruefe("Tablet: Zoom-Knopf +", await e(b => Math.abs(ui.ansicht.get(P.screens[0].id).b - b / 1.4) < 1, b2));
  await pg.click('[data-zoom="fit"]'); await pause();

  // Modul mit dem Finger aus der Palette ziehen
  const n0 = await e(() => P.screens[0].module.length);
  const [px, py] = mitte(await box('#palette [data-lib="beispiel-ledtek-p4swh-pro-v3"]'));
  const wand = await box(`[data-mod="${await e(() => { const s = P.screens[0]; const g = grenzen(s.module); return s.module.find(m => m.x + 500 === g.x + g.b && m.y === 3000).id; })}"] rect`);
  const zx = wand.x + wand.width * 1.5, zy = wand.y + wand.height / 2;
  await finger("touchStart", [[px, py]]); await pause();
  for (let i = 1; i <= 8; i++) { await finger("touchMove", [[px + (zx - px) * i / 8, py + (zy - py) * i / 8]]); await pause(); }
  await finger("touchEnd", []); await pg.waitForTimeout(100);
  pruefe("Tablet: Modul mit dem Finger aus der Palette gesetzt (rastet ein)", await e(n => { const s = P.screens[0]; const m = s.module[s.module.length - 1]; return s.module.length === n + 1 && m.x === 6000 && m.y === 3000; }, n0));

  // Mehrfachauswahl per Antippen
  await pg.click('[data-a="mehrfach"]');
  const ids = await e(() => P.screens[0].module.slice(0, 3).map(m => m.id));
  await e(() => { ui.auswahl.clear(); render(); });
  for (const id of ids) { const [tx, ty] = mitte(await box(`[data-mod="${id}"] rect`)); await finger("touchStart", [[tx, ty]]); await pause(); await finger("touchEnd", []); await pause(); }
  pruefe("Tablet: Mehrfachauswahl durch Antippen", await e(() => ui.auswahl.size === 3));
  await pg.click('[data-a="mehrfach"]');

  // Pinsel im Reiter Strom mit einem Finger
  await e(() => { ui.reiter = "strom"; render(); });
  await pg.click('[data-s="pinsel"]');
  const vz12 = await e(() => { const v = P.geraete.find(g => g.art === "verteiler"); ui.sel.verteiler = v.id; render(); return v.id; });
  await pg.click(`#rechts [data-zuweisen="${vz12}|12"]`); await pause();
  await pg.click(`#liste [data-ziel="${vz12}|12"]`); await pause();
  const [q1, q2] = await e(() => P.screens[0].module.slice(0, 2).map(m => m.id));
  const [p1x, p1y] = mitte(await box(`[data-mod="${q1}"] rect`)), [p2x, p2y] = mitte(await box(`[data-mod="${q2}"] rect`));
  await finger("touchStart", [[p1x, p1y]]); await pause();
  for (let i = 1; i <= 5; i++) { await finger("touchMove", [[p1x + (p2x - p1x) * i / 5, p1y + (p2y - p1y) * i / 5]]); await pause(); }
  await finger("touchEnd", []); await pause();
  pruefe("Tablet: Pinsel mit dem Finger", await e(() => P.kreise.find(k => k.kanal === 12)?.module.length === 2));
  await e(() => { ui.werkzeug = "auswahl"; ui.reiter = "aufbau"; $("#toasts").innerHTML = ""; render(); });
  await pg.screenshot({ path: path.join(AUSGABE, "tablet-quer.png") });
  await e(() => { ui.ansicht3d = true; ui.dreid = dreidStandard(); render(); }); await pause();
  const [dx, dy] = mitte(await box("#zeichnung .dreid-flaeche"));
  await finger("touchStart", [[dx - 50, dy]]); await pause();
  await finger("touchStart", [[dx - 50, dy], [dx + 50, dy]]); await pause();
  for (let i = 1; i <= 5; i++) { await finger("touchMove", [[dx - 50 - 10 * i, dy], [dx + 50 + 10 * i, dy]]); await pause(); }
  await finger("touchEnd", []); await pause();
  pruefe("Tablet: 3D mit zwei Fingern zoomen", await e(() => Math.abs(ui.dreid.zoom - 2) < 0.05), String(await e(() => ui.dreid.zoom)));
  await e(() => { ui.ansicht3d = false; render(); });

  // Hochkant: Seitenspalten ausklappbar
  await pg.setViewportSize({ width: 820, height: 1180 }); await pause();
  const rechtsVorher = await pg.locator("#rechts").isVisible();
  await pg.click('[data-spalte="rechts"]'); await pause();
  pruefe("Tablet hochkant: Details per ⓘ ausklappbar", !rechtsVorher && await pg.locator("#rechts").isVisible());
  await pg.screenshot({ path: path.join(AUSGABE, "tablet-hochkant.png") });
  await pg.click('[data-spalte="links"]'); await pause();
  pruefe("Tablet hochkant: ☰ zeigt Projekt/Library, ⓘ schließt sich", await pg.locator("#palette").isVisible() && !(await pg.locator("#rechts").isVisible()));
  await c.close();
}

console.log(`\n${ok} bestanden, ${fehler.length} Fehler`);
if (fehler.length) { console.log(fehler.join("\n")); process.exitCode = 1; }
await browser.close();
