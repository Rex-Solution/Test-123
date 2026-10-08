# LED-Planer – Quellcode

Modul im Rex-System zur Planung von LED-Wänden (Aufbau, Strom, Signal, Ausgabe, Kabel).
Konzept: `../ledplaner-konzept.md` · Datenformat Library: `../ledplaner-library-format.md` ·
Beispieldaten/Quellen: `../ledplaner-beispieldaten.md` · Oberfläche: `../rex-styleguide.md`.

## Bauen und Testen

```bash
python3 ledplaner/build.py                 # erzeugt ../ledplaner.html (eine Datei, ohne Abhängigkeiten)
node ledplaner/test/e2e.mjs                # Ende-zu-Ende-Tests (Playwright/Chromium)
# Playwright fehlt?  npm i -D playwright   oder   PLAYWRIGHT_MODULE=/pfad/playwright/index.mjs node …
```

`ledplaner.html` nie direkt bearbeiten – immer `src/` ändern und neu bauen. Die
fertige Datei wird mit eingecheckt (Doppelklick genügt, kein Server, offline).
Test-Bildschirmfotos landen in `test/ausgabe/` (nicht eingecheckt).

## Aufbau des Codes (`src/`)

Alle JS-Teile werden in Dateinamen-Reihenfolge zu **einem** Skript zusammengefügt
(gemeinsamer Gültigkeitsbereich, keine Module/Imports).

| Datei | Inhalt |
| --- | --- |
| `geruest.html` | HTML-Gerüst mit Platzhaltern `/*CSS*/`, `/*JS*/` |
| `stil.css` | Stil nach Rex-Styleguide (nur Farb-Variablen) |
| `js/00-datenquelle.js` | Rex-Anbindung: `KONFIG` (`API_BASIS_URL`, per `window.REX_KONFIG` beim Einbetten setzbar) und `Datenquelle` – einzige Stelle für den Datenbank-Agent (Library, Freischaltung, Projekte, Material-Rückgabe) |
| `js/01-grund.js` | DOM-Helfer, deutsche Zahlen (`fmt`, `leseZahl`), Toast, Dialoge, Dateien, Farben |
| `js/02-library.js` | Library-Schema je Typ (`SCHEMA`), Vollständigkeit/Badge, Beispieleinträge, Library-Speicher |
| `js/03-projekt.js` | Projekt-Datenmodell (Kommentar oben!), Laden/Speichern/Migration, Rückgängig, Autosave |
| `js/04-geometrie.js` | Grenzen, Modulnamen (A1 …), Einrasten, Schlangenlinie, Segmentierung, Pixel-Lage, Summen |
| `js/05-ui.js` | Oberflächen-Zustand `ui`, Reiter-Gerüst `REITER`, Projektbaum, Prüfhinweise, Tastenkürzel |
| `js/06-zeichnen.js` | Screen als SVG (1 Einheit = 1 mm), Wege/Pfeile, Zoom/Verschieben |
| `js/10-aufbau.js` | Reiter Aufbau: Drag & Drop, Auswahl, Raster, Erweitern/Kürzen, Spiegeln, Duplizieren |
| `js/12-kurve.js` | Kurven/Winkel: Knick an senkrechten Fugen (`s.winkel`), Winkel oder Radius, Draufsicht mit Sehne/Stich/Radius, Prüfungen (Library-Winkel, Flugrahmen über Knick) |
| `js/15-rigging.js` | Rigging: Flugrahmen/Stacking aus der Library, Last je Rahmen und Punkt, Riggingplan, Prüfungen |
| `js/20-strom.js` | Reiter Strom: Verteiler, Einspeisungen, Lakas, Kreise (Vorschlag + Pinsel), Phasen, Übersicht |
| `js/30-signal.js` | Reiter Signal: Prozessoren, Stränge (Vorschlag + Pinsel), Backup, Port-Regel, Übersicht |
| `js/35-wege.js` | Stagebox/Multicore als eigene Geräte am Prozessor: Port-Zuordnung, Zuleitung, Strom, Kabel zur Wand, Prüfungen |
| `js/40-ausgabe.js` | Reiter Ausgabe: Umschalter Testbild Screen / Outputs & Layer, Testbild, PNG, Live-Ausgabe 1:1 |
| `js/45-mapping.js` | Ausgabe „Outputs & Layer“: Zuspieler-Outputs → Prozessor-Eingänge, Pixelraum je Prozessor (Screens ziehen), Layer (Ausschnitt → Fläche), Output-Testbild, Prüfungen |
| `js/50-kabel.js` | Reiter Kabel: automatische + manuelle Kabel, Bearbeiten, Packliste, CSV |
| `js/60-library-ui.js` | Hauptreiter Library (Manager-Ansicht, Formular aus `SCHEMA`) |
| `js/70-einstellungen.js` | Hauptreiter Einstellungen, Hausregeln, Beispielprojekt |
| `js/75-material.js` | Materialliste (Module, Rigging, Geräte, Kabel), CSV, Datei `rex-materialliste`, Rückgabe an Rex |
| `js/80-druck.js` | Bericht A4 hoch, Großformat A3/A4 quer, Kundenansicht |
| `js/90-start.js` | Start und Verdrahtung |

### Ein Reiter

```js
REITER.name = { titelPalette, werkzeuge(), palette(), zeichnung(el), liste(), rechts(), pruefungen(), taste(e) };
```
Nach jeder Datenänderung `aenderung()` aufrufen (Rückgängig-Schritt, Autosave, neu zeichnen).
Ereignisse werden einmal pro Bereich (`#werkzeuge`, `#palette`, `#zeichnung`, `#liste`, `#rechts`)
registriert und prüfen `ui.reiter`. Prüfhinweise: `{ art: "fehler"|"warn"|"info"|"ok", text, ziel }`
– `ziel` z.B. `screen:<id>`, `modul:<id>`, `kabel:<key>`, `verteiler:<id>`, `library:<id>`.

### Regeln

- Deutsch in Oberfläche und Code-Namen, Zahlen deutsch formatiert, typografische Anführungszeichen.
- Rex-Styleguide einhalten (Farben über Variablen; interne Kreis-/Port-Farben `WEGFARBEN`).
- Keine externen Bibliotheken, keine Webfonts, offline lauffähig.
- Fehlende Library-Werte nie raten: `null` lassen → Prüfhinweis „Warnung“.
- Planungsprobleme = Warnung (sperrt nichts); Fehler nur für ungültige Daten.
- Nach Änderungen: bauen, Tests laufen lassen, neue Funktionen in `test/e2e.mjs` abdecken.

## Stand (08.10.2026)

Fertig (Phase 1 + 2): Projekte (Neu/Öffnen/Speichern, Autosave, Rückgängig),
Library-Manager mit Pflicht-/Prüffeldern, Modul-Editor (Drag & Drop, Einrasten, gemischte Typen,
Raster, Erweitern/Kürzen, Spiegeln, Duplizieren, Rückansicht, Kurven/Winkel mit Abwicklung + Draufsicht), Rigging (Flugrahmen/Stacking,
Last je Punkt, Riggingplan, Freigabefeld), Strom komplett (Verteiler-Ebenen, Einspeisungen,
Laka/Spinne, Vorschlag + Pinsel, Phasen, Schieflast, Einschaltstrom, Übersicht), Signal
(Prozessor-Kompatibilität, Port-Regel Serie + RC, Vorschlag + Pinsel, Backup am Strangende,
Übersicht; Stagebox und Multicore als eigene Geräte mit Port-Zuordnung, Zuleitung, Strom und
Kabeln), Ausgabe (Testbild + Live je Screen; Outputs → Eingänge, Pixelraum, Layer-Vorschlag,
Layer wandern beim Verschieben mit, Abdeckungs-Prüfung, Testbild + Live je Output), Kabel
(automatisch inkl. Video + von Hand, Packliste, CSV), Druck (Bericht A4 inkl. Ausgabe-Blatt,
Großformat A3/A4 quer, Kundenansicht, Materialliste), Hausregeln, Beispielprojekt.
Rex-Anbindung vorbereitet (Phase 3 ohne Signalfluss-Planer): Library, Freischaltung („nur ansehen“), Projekte
speichern/öffnen und Material-Rückgabe über `Datenquelle`; ohne `API_BASIS_URL` vollständig eigenständig.
73 Ende-zu-Ende-Tests (Rex-Teil gegen einen simulierten Datenbank-Agent).

Offen (siehe Konzept, Abschnitt Fahrplan):
- Routen und Antwortformate mit dem Datenbank-Agent abstimmen (Annahmen oben in `00-datenquelle.js`).
- Verknüpfung Signalfluss-Planer (wird neu gebaut; der LED-Planer funktioniert ohne ihn).
- Hersteller-Dateien (NovaLCT/Colorlight, Beispieldateien nötig), 3D, Tablet-Bedienung.
- Kurven: mögliche Winkel der LEDTEK-Module in der Library eintragen (derzeit unbekannt → nur Info).
- Rex-Logo-Dateien einbinden (derzeit Platzhalter in der Kopfleiste).
