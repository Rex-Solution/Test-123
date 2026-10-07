# Recon map: LED Planner (ledplanner.pro/app, Web)

Scope: was LED Planner über den LED-Raster-Generator (pixl-Grid-Nachbau)
hinaus kann – physische Planung, Inhalt/Ausgang getrennt, Daten- und
Stromverkabelung, Bericht – als Erweiterung von `ledraster.html`.
For: Rex-System, interner Einsatz.
Date: 2026-10-07

## Sources

ledplanner.pro ist aus der Build-Umgebung gesperrt (Egress-Proxy). Gleichnamiges,
öffentliches Projekt mit passender Beschreibung: README des GitHub-Repos
„LEDPlanner“ (HDRG Creative Partner). Ob es exakt die App hinter
ledplanner.pro ist, ist **nicht bestätigt**. Gelesen wurde nur die README,
kein Quellcode.

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | App | https://ledplanner.pro/app | gesperrt |
| 2 | README | https://github.com/hdrgcreativepartner-del/LEDPlanner | Feature-Liste, Workflow, Grenzen |

## Core loop

Kabinett wählen (mm + Pixel) → Spalten × Zeilen → Wand im **Inhalt** (Input)
und am **Ausgang** (Output) getrennt platzieren → Daten- und Stromwege
(Schlangenlinie, Startecke, Kapazität je Port/Kreis) berechnen lassen →
Karten, Masken, Verkabelungsbilder, Bericht exportieren.

## Neue Screens (zusätzlich zu S01–S07 aus ../recon.md)

| ID | screen | purpose | states |
| --- | --- | --- | --- |
| S08 | Karte Inhalt/Ausgang | gleiche Wände, zwei Positionen | auto-Größe, feste Größe |
| S09 | Ansicht Daten | Ports, Reihenfolge, Pfeile | ok, Port überlastet |
| S10 | Ansicht Strom | Stromkreise, Reihenfolge | ok, Kreis überlastet |
| S11 | Kabinett/Physik | mm, kg, W, Pitch, m² | Vorlage, eigene Werte |
| S12 | Bericht (PDF) | Karten + Tabellen + Kabelliste | – |

## Flows

```
F07 Wand physisch planen: Kabinett-Vorlage → Spalten/Zeilen → m², kg, W, A ablesen
F08 Inhalt ≠ Ausgang: Karte „Inhalt“ wählen → Wand verschieben → AE/Slices nutzen Inhalt
F09 Datenwege: Ansicht „Daten“ → Richtung/Startecke/px je Port → Ports + Brücken
F10 Stromkreise: Ansicht „Strom“ → A je Kreis, Reserve → Kreise + Brücken
F11 Bericht drucken/PDF
F12 Rückgängig/Wiederholen
```

## Inferred data model (Ergänzungen)

```
Wand.ix, Wand.iy            Position im Inhalt         evidence: README "input and output placed independently"
Wand.kab {mmB, mmH, kg, wMax, wAvg}                    evidence: "physical and pixel dimensions"; kg/W = eigene Ergänzung
Wand.daten {richtung, start, pxProPort, zuleitung}     evidence: "zig-zag orientation, start corner"
Wand.strom {richtung, start, ampere, spannung, reserve, zuleitung}
```

Abweichung bewusst: Das Original bemisst Daten/Strom in m² je Port/Kreis
(Planungswert). Wir rechnen fachlich genauer: **Pixel je Port** (z.B.
655.360 bei 1-GbE) und **Watt je Stromkreis** (A × V × (1 − Reserve)).

## Out of scope

- Resolume-XML (im Original selbst „Beta“, Import ungetestet) – weiter offen.
- Drehung von Wänden, Ausrichten mehrerer Wände, Logo im Bericht – `could`.
- NovaLCT/Colorlight – auch im Original nicht vorhanden.

## Size

Neue Screens 5, Flows 6. Hard parts: ausgewogene Schlangen-Segmentierung,
zwei Karten ohne doppelte Logik, Bericht als PDF ohne Bibliothek. Size: S–M.
