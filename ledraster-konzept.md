# LED-Raster-Generator – Konzept & Übergabe (Stand: Version 1)

Modul im Rex-System. Erzeugt Testbilder für LED-Wände: jede Kachel farbig,
nummeriert und umrandet, damit beim Aufbau sofort sichtbar ist, ob Mapping,
Verkabelung und Prozessor-Einstellungen stimmen. Funktional nachgebaut nach
dem Vorbild „pixl Grid“ (Video Walrus), Clean-Room: kein Code, keine Texte,
keine Grafiken des Originals. Recon, Feature-Matrix und Testergebnisse liegen
in `replica/`.

Wie der Signalfluss-Planer eine **eigenständige Datei** `ledraster.html`
(HTML + CSS + JavaScript, keine Abhängigkeiten, kein Server, kein Build).
Öffnen per Doppelklick im Browser (Chrome oder Edge empfohlen).

## Bedienung in Kürze

1. **Leinwand** = Ausgangsauflösung des Zuspielers (z.B. 1920 × 1080).
2. **Wand** anlegen: Kachelgröße in Pixeln, Spalten × Zeilen, optional
   halbe Spalte (links/rechts) und halbe Zeile (oben/unten), Versatz X/Y.
   Mehrere Wände auf einer Leinwand; per Maus ziehen (rastet an Kanten
   ein, `Alt` = frei), Pfeiltasten 1 px, `Shift` + Pfeil = eine Kachel.
3. **Darstellung**: Palette, Farbmodus, Beschriftung (3.2 / C2 / Nummer /
   Pixelposition, Zählung von oben oder unten), Linien, Kreis, Mittelkreuz,
   Diagonalen, Versatz-Marker, Wand-Info, Leinwand-Maske.
4. **Ausgabe**:
   - PNG gesamt (Originalauflösung), PNG je Wand, Masken-PNG.
   - **Live-Ausgabe**: eigenes Fenster, 1:1 ab oben links, mit wandernden
     Cursorn (Tempo, Breite, Richtung, je Wand oder ganze Leinwand).
     `F` / Doppelklick = Vollbild, Leertaste = Pause, `E` = einpassen
     (nur zur Kontrolle), `H` = Hilfe. Mit „Bildschirme erkennen“
     (Chrome/Edge) öffnet die Ausgabe direkt auf dem gewählten Ausgang.
   - **After-Effects-Skript** (.jsx): Leinwand-Komposition mit je einer
     Unterkomposition pro Wand an ihrer Position.
   - **Slice-Liste** CSV (Excel, Semikolon) / JSON mit allen Koordinaten –
     zum Übertragen in Resolume, Millumin, Pixera usw.

## Speicherformat `.ledraster.json`

```json
{
  "format": "rex-ledraster",
  "version": 1,
  "gespeichert": "2026-10-06T12:00:00.000Z",
  "projekt": {
    "name": "Halle 3 · Bühnenwand",
    "leinwand": { "b": 1920, "h": 1080 },
    "optionen": {
      "palette": "regenbogen", "farbmodus": "schach",
      "beschriftung": "sz", "zaehlung": "oben",
      "linie": 2, "linienfarbe": "#ffffff",
      "maske": true, "marker": true, "info": true,
      "kreis": true, "kreuz": true, "diagonalen": false,
      "cursor": { "an": true, "richtung": "beide", "bereich": "wand", "tempo": 240, "breite": 4 }
    },
    "waende": [
      { "uid": "w1", "name": "Wand 1", "x": 0, "y": 0, "kb": 128, "kh": 128,
        "spalten": 10, "zeilen": 6, "halbeSpalte": "keine", "halbeZeile": "unten", "farbe": 0 }
    ]
  }
}
```

- Fehlende oder ungültige Werte werden beim Laden durch Standardwerte ersetzt.
- „Als Standard“ speichert die aktuelle Leinwand im Browser; „Neu“ lädt sie.
  Die laufende Sitzung wird zusätzlich automatisch im Browser gesichert.

## Offene Punkte / nächste Schritte

- **Kachel-Vorlagen aus der Datenbank**: LED-Kacheln als Material-Einträge
  mit `attribute.pixelB` / `attribute.pixelH` (und optional `pitch`,
  `masseMm`) – dann statt fester Liste die echten Rex-Artikel wählbar.
- **Resolume-/Millumin-Export**: deren Setup-Formate sind nicht öffentlich
  dokumentiert. Erst mit einer Beispieldatei aus der eigenen Installation
  umsetzen und dort testen. Bis dahin: Slice-Liste.
- **After-Effects-Skript** einmal in echtem AE testen.
- Verknüpfung mit dem Signalfluss-Planer (Wand ↔ LED-Prozessor-Ausgang).
