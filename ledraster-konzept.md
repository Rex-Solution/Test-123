# LED-Raster-Generator – Konzept & Übergabe (Stand: Version 2)

Modul im Rex-System. Erzeugt Testbilder für LED-Wände: jede Kachel farbig,
nummeriert und umrandet, damit beim Aufbau sofort sichtbar ist, ob Mapping,
Verkabelung und Prozessor-Einstellungen stimmen. Seit Version 2 auch
**LED-Planung**: Kabinette mit Maßen, Gewicht und Leistung, getrennte Lage im
Inhalt und am Ausgang, Datenwege und Stromkreise, Bericht als PDF.

Funktional nachgebaut nach dem Vorbild „pixl Grid“ (Video Walrus, v1) und
„LED Planner“ (ledplanner.pro, v2), Clean-Room: kein Code, keine Texte,
keine Grafiken der Originale. Recon, Feature-Matrix und Testergebnisse liegen
in `replica/` bzw. `replica/ledplanner/`.

Wie der Signalfluss-Planer eine **eigenständige Datei** `ledraster.html`
(HTML + CSS + JavaScript, keine Abhängigkeiten, kein Server, kein Build).
Öffnen per Doppelklick im Browser (Chrome oder Edge empfohlen).

## Bedienung in Kürze

Oben umschalten zwischen **Karte** (Ausgang = Output des Zuspielers,
Inhalt = Komposition/Input) und **Ansicht** (Testbild, Daten, Strom).
Rückgängig/Wiederholen mit ↶ ↷ bzw. `Strg+Z` / `Strg+Y` (60 Schritte).

1. **Leinwand** = Ausgangsauflösung des Zuspielers (z.B. 1920 × 1080).
2. **Wand** anlegen: Kabinett (Vorlage oder eigene Werte: Pixel, mm, kg,
   W max./Ø), Spalten × Zeilen, optional halbe Spalte (links/rechts) und
   halbe Zeile (oben/unten). Position getrennt für Ausgang und Inhalt –
   jeweils in der gewählten Karte ziehen (rastet an Kanten ein, `Alt` =
   frei), Pfeiltasten 1 px, `Shift` + Pfeil = eine Kachel, `Leertaste` +
   Ziehen verschiebt die Ansicht, `Strg` + Mausrad zoomt am Mauszeiger.
   Die Inhalts-Größe ergibt sich automatisch aus den Wänden oder wird fest
   eingetragen.
3. **Verkabelung** je Wand:
   - *Daten*: Verlauf zeilen- oder spaltenweise, Startecke, Pixel je Port
     (z.B. 655.360 für 1 Gbit), Zuleitungslänge.
   - *Strom*: Verlauf, Startecke, Absicherung (A), Spannung (V), Reserve
     (%), Zuleitungslänge. Kapazität je Kreis = A × V × (1 − Reserve).
   - Die Kabinette werden als Schlangenlinie in möglichst wenige,
     zusammenhängende und gleich ausgelastete Abschnitte geteilt; keiner
     überschreitet die Kapazität. Je Abschnitt eine Zuleitung, sonst
     Brücken von Kabinett zu Kabinett.
   - Summen (m², kg, kW, Ports, Kreise) stehen links.
4. **Darstellung**: Palette, Farbmodus, Beschriftung (3.2 / C2 / Nummer /
   Pixelposition, Zählung von oben oder unten), Linien, Kreis, Mittelkreuz,
   Diagonalen, Versatz-Marker, Wand-Info, Leinwand-Maske.
5. **Ausgabe**:
   - PNG der aktuellen Karte und Ansicht (Testbild, Datenwege, Stromkreise)
     in Originalauflösung, PNG je Wand, Masken-PNG.
   - **Bericht / PDF**: Summen, Karten Ausgang/Inhalt, Daten- und
     Strombild, Wandtabelle, Materialliste (Zuleitungen nach Länge,
     Brücken), alle Ports/Kreise – über „Drucken / als PDF speichern“.
   - **Kabelliste** CSV: jeder Port/Kreis mit erstem Kabinett, Anzahl,
     Last, Auslastung, Zuleitung, Brücken.
   - **Live-Ausgabe** (immer Testbild des Ausgangs): eigenes Fenster, 1:1 ab oben links, mit wandernden
     Cursorn (Tempo, Breite, Richtung, je Wand oder ganze Leinwand).
     `F` / Doppelklick = Vollbild, Leertaste = Pause, `E` = einpassen
     (nur zur Kontrolle), `H` = Hilfe. Mit „Bildschirme erkennen“
     (Chrome/Edge) öffnet die Ausgabe direkt auf dem gewählten Ausgang.
   - **After-Effects-Skript** (.jsx): Inhalts-Komposition mit je einer
     Unterkomposition pro Wand an ihrer Position im Inhalt.
   - **Slice-Liste** CSV (Excel, Semikolon) / JSON mit Inhalts- und
     Ausgangskoordinaten –
     zum Übertragen in Resolume, Millumin, Pixera usw.

## Speicherformat `.ledraster.json`

```jsonc
{
  "format": "rex-ledraster",
  "version": 2,
  "gespeichert": "2026-10-07T12:00:00.000Z",
  "projekt": {
    "name": "Halle 3 · Bühnenwand",
    "leinwand": { "b": 1920, "h": 1080 },
    "inhalt": { "auto": true, "b": 1920, "h": 1080 },
    "optionen": {
      "palette": "regenbogen", "farbmodus": "schach",
      "beschriftung": "sz", "zaehlung": "oben",
      "linie": 2, "linienfarbe": "#ffffff",
      "maske": true, "marker": true, "info": true,
      "kreis": true, "kreuz": true, "diagonalen": false,
      "cursor": { "an": true, "richtung": "beide", "bereich": "wand", "tempo": 240, "breite": 4 }
    },
    "waende": [
      { "uid": "w1", "name": "Wand 1",
        "x": 0, "y": 0,          // Ausgang
        "ix": 0, "iy": 0,        // Inhalt
        "kb": 128, "kh": 128, "spalten": 10, "zeilen": 6,
        "halbeSpalte": "keine", "halbeZeile": "unten", "farbe": 0,
        "kab":   { "mmB": 500, "mmH": 500, "kg": 7.5, "wMax": 160, "wAvg": 55 },
        "daten": { "richtung": "h", "start": "ol", "pxProPort": 655360, "zuleitung": 20 },
        "strom": { "richtung": "h", "start": "ol", "ampere": 16, "spannung": 230, "reserve": 20, "zuleitung": 20 } }
    ]
  }
}
```

- Fehlende oder ungültige Werte werden beim Laden durch Standardwerte ersetzt.
- Version-1-Dateien laden weiter: Inhalt = Ausgang, Kabinett/Daten/Strom mit
  Standardwerten.
- `richtung`: `h` zeilenweise, `v` spaltenweise; `start`: `ol`, `or`, `ul`, `ur`.
- „Als Standard“ speichert die aktuelle Leinwand im Browser; „Neu“ lädt sie.
  Die laufende Sitzung wird zusätzlich automatisch im Browser gesichert.

## Offene Punkte / nächste Schritte

- **Kabinett-Vorlagen aus der Datenbank**: Die eingebaute Liste sind
  Richtwerte. Besser: LED-Kabinette als Material-Einträge mit
  `attribute.pixelB`, `pixelH`, `mmB`, `mmH`, `kg`, `wMax`, `wAvg` – dann
  sind die echten Rex-Artikel wählbar und Gewicht/Leistung stimmen.
- **Prozessor**: Ports je Sendekarte/Prozessor als Gerät (z.B. aus dem
  Signalfluss-Planer) statt nur „Pixel je Port“; Zuordnung Port → Ausgang.
- Drehung von Wänden im Inhalt, Ausrichten mehrerer Wände, Logo im Bericht.
- **Resolume-/Millumin-Export**: deren Setup-Formate sind nicht öffentlich
  dokumentiert. Erst mit einer Beispieldatei aus der eigenen Installation
  umsetzen und dort testen. Bis dahin: Slice-Liste.
- **After-Effects-Skript** einmal in echtem AE testen.
- Verknüpfung mit dem Signalfluss-Planer (Wand ↔ LED-Prozessor-Ausgang).
