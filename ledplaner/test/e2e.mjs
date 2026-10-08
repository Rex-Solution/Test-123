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
pruefe("Beispiel: Phasen ausgewogen (+ Prozessor auf L1)", Math.abs(strom.phasen[1][1] - 10.66) < 0.01 && Math.abs(strom.phasen[1][0] - 10.9) < 0.05, JSON.stringify(strom.phasen));
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

console.log(`\n${ok} bestanden, ${fehler.length} Fehler`);
if (fehler.length) { console.log(fehler.join("\n")); process.exitCode = 1; }
await browser.close();
