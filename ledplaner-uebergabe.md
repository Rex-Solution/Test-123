# LED-Planer – Übergabe ins Rex-System (Stand 08.10.2026)

Diese Datei ist die Übergabe an das lokale Claude bzw. das Rex-Team. Sie beschreibt, was der LED-Planer
heute kann, welche Dateien dazugehören und wie er ins Rex-System eingebunden wird.
Repository `Rex-Solution/Test-123`, Branch `claude/sleepy-ride-jbf8ih`. Die Version steht in der
Kopfleiste der Datei („Version xxxxxxx“) und ist der Stempel aus `build.py`.

## 1. Kurzfassung

- **Was:** Modul zur Planung von LED-Wänden: Aufbau inkl. Brackets, Rigging, Kurven und 3D, Strom,
  Signal inkl. Backup, Ausgabe/Mapping, Kabel, Material und Druck.
- **Form:** eine HTML-Datei `ledplaner.html` (ohne Abhängigkeiten, offline, Deutsch). Sie wird aus
  `ledplaner/src/` gebaut.
- **Heute:** läuft **eigenständig** mit eingebauter Beispiel-Library, Browser-Speicher und Dateien.
  Es gibt noch keine echte Rex-Library.
- **Anbindung:** vorbereitet und getestet gegen einen simulierten Datenbank-Agent. Eine Konfiguration
  (`window.REX_KONFIG.API_BASIS_URL`) schaltet sie ein. Die Routen sind **Annahmen** und müssen mit
  dem Datenbank-Agent abgestimmt werden (Abschnitt 4).
- **Signalfluss-Planer:** wird neu gebaut. Der LED-Planer braucht ihn nicht; die Verknüpfung folgt später.

## 2. Dateien

| Datei | Zweck | Für die Einbindung |
| --- | --- | --- |
| `ledplaner.html` | Fertiges Modul (gebaut, nie direkt bearbeiten) | **ausliefern** |
| `ledplaner/src/` | Quellcode: `geruest.html`, `stil.css`, `js/00-…90-*.js` | ändern |
| `ledplaner/build.py` | Baut `ledplaner.html`, setzt den Versionsstempel | `python3 ledplaner/build.py` |
| `ledplaner/test/e2e.mjs` | 163 Ende-zu-Ende-Tests (Playwright/Chromium), inkl. simuliertem Datenbank-Agent | `node ledplaner/test/e2e.mjs` |
| `ledplaner/README.md` | Aufbau des Codes, Datei für Datei, Regeln | lesen |
| `ledplaner-konzept.md` | Konzept; **Abschnitt 2 „Getroffene Entscheidungen“ ist verbindlich** | lesen |
| `ledplaner-library-format.md` | Datenformat der Library (`attribute.led` je Typ) – Grundlage für den Datenbank-Agent | **an Datenbank-Agent** |
| `ledplaner-beispieldaten.md` | Quellen der Beispieldaten (LEDTEK, NovaStar, StageSmarts …) | lesen |
| `rex-styleguide.md` | Oberfläche (Farben, Kopfleiste, Reiter) | lesen |
| `ledplaner/beispiele/beispielprojekt.rex-ledplaner.json` | Echtes Projekt im Speicherformat | Testdaten für `/projekte` |
| `ledplaner/beispiele/beispiel-library.rex-ledplaner-library.json` | Alle eingebauten Library-Einträge | Vorlage für `/material` |
| `ledplaner/beispiele/beispiel-materialliste.rex-materialliste.json` | Material-Rückgabe zum Beispielprojekt | Testdaten für `/material-rueckgabe` |
| `CLAUDE.md` | Kurzhinweise für Claude im Repository | lesen |

Nicht Teil des LED-Planers: `signalplaner.html` (eigenes Modul, wird neu gebaut), `ledraster.html`
(alter Prototyp, nur Referenz), `ledplaner-skizze.html` und der Ordner `replica/`.

## 3. Einbinden

Die Datei liest beim Start einmal `window.REX_KONFIG`. Fehlt sie, läuft der Planer eigenständig.

```html
<!-- vor dem ersten <script> von ledplaner.html einfügen (serverseitig beim Ausliefern) -->
<script>
  window.REX_KONFIG = {
    API_BASIS_URL: "https://rex-server/api",   // Datenbank-Agent; null = eigenständig
    NAS_BASIS_URL: "https://rex-nas/grafik/",  // Präfix für relative Grafikpfade aus der Datenbank
    MODUL: "ledplaner"
  };
</script>
```

Hinweise:

- **Konfiguration einsetzen:** Am einfachsten liefert der Rex-Server `ledplaner.html` aus und setzt
  dabei den Block oben in den `<head>`. Im iframe gilt das genauso, denn `REX_KONFIG` muss im Fenster
  des Planers stehen, bevor dessen Skript läuft.
- **Herkunft:** Die Datei sollte vom selben Server wie die API kommen. Sonst muss der Datenbank-Agent
  CORS erlauben (`Content-Type: application/json`, Methoden GET/POST/PUT).
- **Anmeldung:** Der Planer schickt keine Anmeldedaten selbst. Cookies derselben Herkunft gehen mit.
  Ist ein Token nötig, wird das in `Datenquelle.anfrage` in `src/js/00-datenquelle.js` ergänzt.
- **Logo:** In der Kopfleiste ist ein Platzhalter. Erwartet werden `rex-symbol.png` (Favicon) und
  `rex-zeichen-weiss.png` (30 px) neben der Datei; die Stelle steht in `src/geruest.html`.
- **Browser-Speicher:** `localStorage` mit den Schlüsseln `rex-ledplaner-aktuell` (Autosave),
  `rex-ledplaner-library` (lokal geänderte Einträge), `rex-ledplaner-live`, `rex-ledplaner-druck`
  und `rex-oeffnen`.

## 4. Schnittstelle zum Datenbank-Agent (Annahmen – bitte abstimmen)

Alle Aufrufe stehen nur in `src/js/00-datenquelle.js` (`Datenquelle`). Wird eine Route anders, ist
das die einzige Datei, die sich ändert; danach bauen und testen. Der simulierte Agent steht in
`test/e2e.mjs`, Funktion `rexSeite`.

| Aufruf | Antwort | Wofür |
| --- | --- | --- |
| `GET {API}/material` | `[Materialeintrag]` – nur Einträge mit `attribute.led.typ` werden genutzt | Library |
| `GET {API}/freischaltung` | `{ module: ["ledplaner", "signalplaner"?] }` | ohne `"ledplaner"`: nur ansehen |
| `GET {API}/projekte?modul=ledplaner` | `[{ id, titel, geaendert }]` | Öffnen-Liste |
| `GET {API}/projekte/{id}` | Projektdatei (`format: "rex-ledplaner"`) | Öffnen |
| `POST {API}/projekte` (Body: Projektdatei) | `{ id }` | erstes Speichern; `id` landet in `projekt.rexId` |
| `PUT {API}/projekte/{id}` (Body: Projektdatei) | `{ id }` | weiteres Speichern |
| `POST {API}/material-rueckgabe` (Body: Materialliste) | `{ ok }` | Material an Rex zurückgeben |

**Materialeintrag:** Das ist der Rex-Rahmen `{ id, name, kategorie, attribute: { hersteller, gewicht,
stromverbrauch, anschluesse, …, led: {…} } }`. Die Felder je Typ (`modul`, `prozessor`, `stagebox`,
`multicore`, `verteiler`, `laka`, `spinne`, `rigging`, `kabel`) stehen in `ledplaner-library-format.md`.
Ein vollständiges Beispiel ist `beispiele/beispiel-library.rex-ledplaner-library.json`.
Fehlende Pflichtwerte setzt der Planer nie selbst: Er zeigt sie als Warnung bzw. Badge im
Library-Manager.

**Projektdatei:** `format: "rex-ledplaner"`, `formatVersion: 1`. Das Datenmodell ist oben in
`src/js/03-projekt.js` beschrieben. Das Projekt enthält eine **Kopie** der benutzten Library-Einträge
(`projekt.library`), damit es auch dann aufgeht, wenn sich die Library später ändert.
Der Datenbank-Agent speichert die Datei als Ganzes; er muss sie nicht auswerten.

**Materialliste:** `format: "rex-materialliste"`, `positionen: [{ gruppe, materialId, name, kategorie,
anzahl, laengeM, gewichtKg, herkunft }]`. `herkunft` ist `"rex"`, `"beispiel"`, `"lokal"` oder `"projekt"`.
Positionen, die nicht aus Rex stammen, meldet der Planer vor der Rückgabe.

Noch offen für die Abstimmung:

1. Routen, Anmeldung/Token und Fehlerformat.
2. Mehrbenutzer: Laut Entscheidung bearbeiten Nutzer nacheinander mit Sperre („wird gerade von X
   bearbeitet“). Die Sperre gibt es noch nicht; der Agent muss sie liefern.
3. Firmenweite Hausregeln (heute je Projekt in `projekt.regeln`).
4. Ob die Beispiel-Einträge (`beispiel-*`) bei Anbindung ausgeblendet werden sollen. Heute bleiben sie
   neben den Rex-Einträgen sichtbar.

## 5. Arbeitsweise am Code

```bash
python3 ledplaner/build.py        # → ledplaner.html, gibt „Version xxxxxxx“ aus
node ledplaner/test/e2e.mjs       # 163 Tests; Playwright fehlt → npm i -D playwright
                                  # oder PLAYWRIGHT_MODULE=/pfad/playwright/index.mjs node …
```

- Nur `src/` ändern, dann bauen. `ledplaner.html` wird mit eingecheckt.
- Alle JS-Teile bilden **ein** Skript mit gemeinsamem Gültigkeitsbereich (keine Imports). Der Aufbau
  eines Reiters und die Regeln stehen in `ledplaner/README.md`.
- Nach jeder Datenänderung `aenderung()` aufrufen (Rückgängig, Autosave, neu zeichnen).
- Oberfläche: kurz, aktiv, deutsch; Zahlen deutsch; fehlende Werte nie raten; keine externen
  Bibliotheken oder Webfonts.
- Neue Funktionen in `test/e2e.mjs` abdecken.

## 6. Funktionsumfang (Stand dieser Übergabe)

- **Projekt:** Neu, Öffnen, Speichern (Datei oder Rex), Autosave, Rückgängig/Wiederholen,
  Beispielprojekt, Hausregeln.
- **Projektbaum:**
  - Ein Klick auf eine Überschrift zeigt die Übersicht.
  - Kontextmenü mit Rechtsklick (am Tablet lange drücken): hinzufügen, duplizieren, löschen.
  - Reihenfolge per Ziehen.
- **Aufbau:**
  - Module per Drag & Drop.
  - Ein **Klick auf ein Modul in der Palette fragt die Anzahl X × Y**.
  - Raster, Erweitern/Kürzen, Spiegeln, Duplizieren, Rückansicht.
  - Gemischte Typen (gemischter Pitch immer 1:1).
  - Kurven/Winkel an Fugen, 3D-Ansicht.
  - Tablet-Bedienung.
- **Brackets / Rigging:**
  - Module sitzen fest an Bracket-Plätzen, die Brackets setzt der Planer automatisch.
  - Versetzte Spalten bekommen kleine Brackets.
  - Brackets reichen nie über einen Knick.
  - Bracket-Bestand je Wand wählbar.
  - Flugrahmen/Stacking, Last je Punkt, Riggingplan mit Freigabefeld.
- **Strom:**
  - Verteiler-Ebenen und Einspeisungen.
  - Laka mit Spinne als eigenes Gerät.
  - Kanäle der Wand zuweisen, Vorschlag oder Pinsel (⌫ ein Modul zurück, Entf ganzer Kreis).
  - Phasen, Schieflast und Einschaltstrom.
  - Ausgänge per Drag & Drop tauschen.
  - Stageboxen werden mitversorgt.
- **Signal:**
  - Prozessoren mit Receiving-Card-Prüfung.
  - Stagebox (NovaStar CVT10) und Multicore als eigene Geräte.
  - Ports der Wand zuweisen, Vorschlag oder Pinsel.
  - Bereich „Backup“: Port-Backup oder ganzer Controller als Backup.
  - Symbole in der Wand mit Kabellängen.
- **Ausgabe:**
  - Outputs → Prozessor-Eingänge, Pixelraum je Prozessor, Layer.
  - Testbild und Live-Ausgabe.
- **Kabel, Material, Druck:**
  - Automatische und manuelle Kabel, Packliste, CSV.
  - Materialliste.
  - Bericht A4, Großformat A3/A4 quer, Kundenansicht.

## 7. Offene Punkte

1. **Schnittstelle:** Routen, Anmeldung und Sperre mit dem Datenbank-Agent abstimmen (Abschnitt 4).
2. **Echte Library:** Echte Library-Einträge anlegen. Bisher gibt es nur Beispiele, z.B. fehlen
   Gewichte der Brackets, mögliche Winkel der LEDTEK-Module und die Leistung der CVT10.
3. **Bestand und Datenblätter:**
   - Bestandsliste für Lakas, Stageboxen, Multicores und Flugrahmen.
   - Datenblätter: LEDTEK-Grenzwerte, Phasen der StageSmarts C24.
4. **Signalfluss-Planer:** Verknüpfung nach dem Neubau (Konzept, Abschnitt 9).
5. **Hersteller-Dateien und Exporte:**
   - NovaStar/Colorlight-Dateien (Beispieldateien fehlen).
   - Medienserver-Exporte für Resolume (Preset-XML-Beispiel fehlt) und Pixera.
6. **Tablet:** Auf echten Geräten (iPad/Android) ausprobieren.
7. **Logo:** Rex-Logo-Dateien einsetzen.

## 8. Vorgehen für die Einbindung (Checkliste)

1. Repository klonen, Branch `claude/sleepy-ride-jbf8ih`; bauen und Tests laufen lassen (163 grün).
2. `ledplaner-library-format.md` und die drei Dateien in `ledplaner/beispiele/` an den Datenbank-Agent
   geben; Routen und Antwortformate festlegen.
3. Abweichungen nur in `src/js/00-datenquelle.js` umsetzen; den simulierten Agenten in
   `test/e2e.mjs` (`rexSeite`) gleich mitziehen.
4. `ledplaner.html` im Rex-System ausliefern und `window.REX_KONFIG` einsetzen (Abschnitt 3).
5. Freischaltung „ledplaner“ in der Rex-Benutzerverwaltung anlegen. Ohne sie öffnet der Planer nur
   zum Ansehen.
6. Prüfen: Library aus Rex, erstes Speichern (POST) und weiteres Speichern (PUT), Öffnen,
   Material-Rückgabe. Der Status steht unter Einstellungen.
