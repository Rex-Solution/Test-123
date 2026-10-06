# Build-Log: LED-Raster-Generator (Nachbau von pixl Grid)

| ID | Datum | Status | fehlt | schwieriger als gedacht |
| --- | --- | --- | --- | --- |
| S01 Vorschau | 2026-10-06 | done | – | Zoom/Auswahlrahmen über skalierter Canvas; Einrasten an Kanten |
| S02 Leinwand | 2026-10-06 | done | – | Grenze für Canvas-Größe im Browser (120 Mio. Pixel) |
| S03 Wand-Liste | 2026-10-06 | done | – | – |
| S04 Wand-Eigenschaften | 2026-10-06 | done | – | halbe Spalte/Zeile vorne oder hinten |
| S05 Darstellung | 2026-10-06 | done | – | Beschriftung der ersten Kachel kollidierte mit Versatz-Marker |
| S06 Live-Ausgabe | 2026-10-06 | done | Bildschirmwahl nur Chrome/Edge | Uhr des Popups ≠ Uhr des Hauptfensters; 1:1 trotz Windows-Skalierung |
| S07 Export | 2026-10-06 | partial | Resolume-/Millumin-Format; AE-Skript nicht in echtem AE getestet | Dateinamen mit Umlauten wurden von Chromium verworfen → ASCII |

Tests: 26 automatische Browser-Prüfungen (Playwright/Chromium), alle grün,
keine Konsolenfehler. Parity: 95,1 / 100, Must-haves 14 von 14.
Rebrand-Sweep: sauber.
