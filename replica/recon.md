# Recon map: pixl Grid (Windows / macOS, Video Walrus)

Scope: der komplette Kern – LED-Testbilder (Raster pro Kachel) für frei
definierbare LED-Wände erzeugen, als PNG exportieren und live ausgeben.
For: Rex-System, als eigenständiges Modul (eine HTML-Datei, wie der
Signalfluss-Planer). Interner Einsatz bei Veranstaltungen, kein Verkauf.
Date: 2026-10-06

## Sources

Store- und Herstellerseiten sind aus der Build-Umgebung nicht erreichbar
(Egress-Proxy). Die Recon stützt sich auf die öffentlichen Beschreibungen,
wie Suchmaschinen sie wiedergeben, plus allgemeines Fachwissen über
LED-Testbilder. Keine Screenshots, kein Binary, kein Code des Originals.

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Microsoft Store listing | https://apps.microsoft.com/detail/9nr4d7pwxbfr | Feature-Liste, Win10 14393+, kostenlos, 4,9 ★ |
| 2 | Hersteller-Projektseite | https://videowalrus.com/projects/pixl-grid | Changelog-Auszüge (v2.213 Default-Grids, v2.219.2 halbe Spalte links/rechts) |
| 3 | Mac App Store listing | https://apps.apple.com/app/pixl-grid/id1445330973 | gleiche Feature-Liste |
| 4 | AppAgg / Appx4Fun | https://appagg.com/windows/photoandvideo/pixl-grid-32986675.html | Exporte für Millumin, After Effects, Resolume; halbe Kachelhöhe |

Öffentliche Feature-Liste (sinngemäß): PNG-Raster für LED-Wände beliebiger
Größe speichern · Live-Ausgabe mit wandernden Cursorn · mehrere Raster auf
einer Leinwand · Versatz-Marker · After-Effects-Skript · Millumin- und
Resolume-Output-Setup-Export · Leinwand-Maske · viele Farbpaletten ·
halbe Kachelhöhe · halbe Spalte (links/rechts) · Standard-Raster beim Start.

## Core loop

LED-Wand als Kachelraster beschreiben (Kachelgröße in Pixeln × Spalten ×
Zeilen, Position auf der Ausgabeleinwand) → Testbild sehen → als PNG
exportieren oder direkt live auf den Ausgang des LED-Prozessors schicken.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Hauptfenster / Vorschau | Start | Leinwand mit allen Rastern, Auswahl, Verschieben | Vorschau-Canvas, Kopfleiste | leer (kein Screen), gefüllt, Screen außerhalb der Leinwand |
| S02 | Leinwand-Einstellungen | linke Leiste | Ausgabeauflösung, Hintergrund, Maske | Zahlenfelder, Presets | gültig, ungültig (0 / zu groß) |
| S03 | Screen-Liste | linke Leiste | Raster anlegen, wählen, duplizieren, löschen | Liste, Buttons | leer, mehrere |
| S04 | Screen-Eigenschaften | rechte Leiste (Auswahl) | Kachelgröße, Spalten/Zeilen, Position, halbe Zeile/Spalte, Farbe | Formular | nichts gewählt, gewählt |
| S05 | Darstellungs-Optionen | rechte Leiste | Palette, Farbmodus, Beschriftung, Linien, Kreis, Diagonalen, Versatz-Marker | Selects, Checkboxen | – |
| S06 | Live-Ausgabe | eigenes Fenster | 1:1-Ausgabe, Vollbild, wandernde Cursor | Canvas, Tastatur | läuft, pausiert, Vollbild |
| S07 | Export | Kopfleiste | PNG gesamt / je Screen / Maske, AE-Skript, Slice-Liste, Projekt | Buttons | – |

## Flows

```
F01 Testbild für eine LED-Wand exportieren
    S04 Kachel 128×128, 10×6 eintragen -> S07 PNG gesamt
    happy path clicks: ~4 (Werte + Export)
    edge: Wand größer als Leinwand, Kachelgröße 0, 8K-Leinwand (Speicher)

F02 Mehrere Wände auf einer Leinwand
    S03 + Screen -> S04 Position/Größe -> S01 per Maus verschieben
    edge: Überlappung, Versatz außerhalb, Andocken an Nachbarwand

F03 Live-Test an der Wand
    S06 öffnen -> auf Ausgang ziehen -> Vollbild -> Cursor laufen
    edge: Fenster zu, Einstellungen ändern während Ausgabe läuft

F04 Standard-Raster beim Start
    Einstellungen -> "als Standard speichern" -> Neustart lädt sie
F05 Projekt speichern/laden (JSON)
F06 Zuspieler-Setup: AE-Skript / Slice-Liste exportieren
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | normal, gefahr, primär | default, hover, focus, disabled | alle |
| Zahlenfeld | px, Anzahl | gültig, ungültig | S02, S04 |
| Select | Palette, Modus, Beschriftung | – | S04, S05 |
| Checkbox-Zeile | – | an/aus | S02, S05 |
| Screen-Listeneintrag | – | normal, gewählt, Warnung | S03 |

## Inferred data model

```
Leinwand   breite, hoehe, hintergrund, maske(bool)
           evidence: "custom size", "canvas mask"   confidence: high
Screen     name, x, y, kachelB, kachelH, spalten, zeilen,
           halbeZeile (keine|oben|unten), halbeSpalte (keine|links|rechts), farbe
           evidence: "multiple grids", "offset markers", "half height tile",
           changelog v2.219.2                          confidence: high/medium
Optionen   palette, farbmodus, beschriftung, linien, kreis, diagonalen,
           versatzMarker, cursor{tempo,…}              confidence: medium (guess bei Details)
```

Relationships: Projekt 1-1 Leinwand, Projekt 1-n Screen.

## Feature matrix

See `features.csv`. Must: 14, should: 9, could: 4, skip: 2.

## Out of scope (cannot or should not be cloned)

- Resolume-Advanced-Output-XML und Millumin-Setup: Dateiformate sind nicht
  öffentlich spezifiziert und hier nicht prüfbar; ohne Test in der echten
  Software würde ein fehlerhafter Import ausgeliefert. Ersatz: Slice-Liste
  (CSV/JSON) mit allen Koordinaten zum Abtippen/Importieren.
- Name, Logo, Texte, Icons und Paletten-Farbwerte des Originals.

## Size

Screens 7, flows 6, entities 3. Hard parts: pixelgenaue 1:1-Ausgabe im
zweiten Fenster, flüssige Cursor-Animation bei 4K/8K, große PNG-Exporte im
Browser. Size: S.
