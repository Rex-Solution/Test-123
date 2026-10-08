# LED-Planer – Beispieldaten für die Library (Stand: 08.10.2026)

Beispieleinträge, solange es noch keine Datenbank gibt. Sie zeigen das
geplante **Library-Datenformat** (später Material-Eintrag mit flexiblem JSON-Feld
`attribute`, wie beim Signalfluss-Planer) und dienen als Testdaten für Phase 0/1.

**Wichtig:** Alle Werte stammen aus öffentlichen Hersteller- und Händlerangaben
(Quellen unten). Wo Angaben fehlen oder sich widersprechen, ist das markiert:

- ✅ Herstellerangabe
- ⚠️ abweichende Angaben bzw. Händlerangabe – vor Einsatz mit Datenblatt prüfen
- ❓ fehlt – muss aus dem Datenblatt / vom Hersteller kommen
- 🔢 abgeleitet bzw. geschätzt (z.B. halbes Modul = halbe Leistung)

## 1. LED-Module (Serie LEDTEK P4+ PRO V3)

Beide Module gehören zur **selben Serie mit derselben Receiving Card (NovaStar
A8s)** → sie dürfen laut Port-Regel **auf denselben Datenport**.

| Eigenschaft | P4+WH PRO V3 | P4+sWH PRO V3 |
| --- | --- | --- |
| Hersteller / Serie | LEDTEK · P4+ PRO V3 | LEDTEK · P4+ PRO V3 |
| Einsatz | Outdoor (IP65) ⚠️ Rückseite teils IP54 angegeben | Outdoor (IP65) ⚠️ |
| Maße B × H × T | 500 × 1000 × 85 mm ✅ | 500 × 500 mm ✅, Tiefe ❓ |
| Pixel B × H | 104 × 208 ✅ | 104 × 104 🔢 (aus Pitch und Maß) |
| Pixelpitch | 4,81 mm ✅ | 4,81 mm ✅ |
| Gewicht | 13,9 kg ⚠️ (V3, Händler; älteres Datenblatt 13,5 kg) | 8,5 kg ⚠️ (älteres Datenblatt, V3 ❓) |
| Leistung max. / typ. | 175 W / 90 W ⚠️ (Richtwerte) | ca. 88 W / 45 W 🔢 (halbes Modul) |
| Einschaltstrom | ❓ | ❓ |
| Receiving Card | NovaStar **A8s** ✅ | NovaStar **A8s** 🔢 (gleiche Serie) |
| Anschlüsse Strom | PowerCON TRUE1 ein/aus ✅ | PowerCON TRUE1 ein/aus 🔢 |
| Anschlüsse Daten | etherCON (NE8) ein/aus ✅ | etherCON (NE8) ein/aus 🔢 |
| Max. Module je Strombrücke | ❓ | ❓ |
| Max. Module je Datenstrang | ❓ (begrenzt durch Portkapazität des Prozessors) | ❓ |
| Max. Module geflogen untereinander | ❓ | ❓ |
| Max. Module gestellt übereinander | ❓ | ❓ |
| Bauformen | gerade oder gebogen ✅ (Winkel ❓) | gerade oder gebogen 🔢 |
| Helligkeit | 4.500 ⚠️ bzw. 5.000 nits | ❓ |
| Wiederholrate | > 3.840 Hz ⚠️ | ❓ |
| Sonstiges | LED SMD 1921 Whiteface, IC MBI5252, Module werkzeuglos von hinten tauschbar | „kleine Schwester“ der P4+WH PRO |

### Library-Einträge (geplantes Format)

```jsonc
{
  "id": "ledtek-p4wh-pro-v3",
  "name": "LEDTEK P4+WH PRO V3",
  "kategorie": "LED-Modul",
  "attribute": {
    "hersteller": "LEDTEK",
    "serie": "P4+ PRO V3",
    "receivingCard": "NovaStar A8s",
    "pixelB": 104, "pixelH": 208,
    "mmB": 500, "mmH": 1000, "mmT": 85,
    "pitch": 4.81,
    "kg": 13.9,
    "wMax": 175, "wTyp": 90,
    "einschaltstromA": null,              // ❓
    "strom": { "ein": "PowerCON TRUE1", "aus": "PowerCON TRUE1", "maxJeBruecke": null },
    "daten": { "ein": "etherCON", "aus": "etherCON", "maxJeStrang": null },
    "mechanik": { "maxGeflogen": null, "maxGestellt": null, "kurve": true, "winkel": null },
    "ip": "IP65",
    "grafik": null,
    "quelle": "LEDTEK / Händler, Stand 10/2026 – Werte ⚠️ prüfen"
  }
}
```

```jsonc
{
  "id": "ledtek-p4swh-pro-v3",
  "name": "LEDTEK P4+sWH PRO V3",
  "kategorie": "LED-Modul",
  "attribute": {
    "hersteller": "LEDTEK",
    "serie": "P4+ PRO V3",
    "receivingCard": "NovaStar A8s",
    "pixelB": 104, "pixelH": 104,
    "mmB": 500, "mmH": 500, "mmT": null,
    "pitch": 4.81,
    "kg": 8.5,
    "wMax": 88, "wTyp": 45,               // 🔢 geschätzt
    "einschaltstromA": null,
    "strom": { "ein": "PowerCON TRUE1", "aus": "PowerCON TRUE1", "maxJeBruecke": null },
    "daten": { "ein": "etherCON", "aus": "etherCON", "maxJeStrang": null },
    "mechanik": { "maxGeflogen": null, "maxGestellt": null, "kurve": true, "winkel": null },
    "ip": "IP65",
    "grafik": null,
    "quelle": "LEDTEK / Händler, Stand 10/2026 – Werte ⚠️ prüfen"
  }
}
```

## 2. Prozessor: NovaStar MX30

| Eigenschaft | Wert |
| --- | --- |
| Hersteller / Familie | NovaStar · COEX (MX-Serie) ✅ |
| Videoeingänge | 1 × HDMI 2.0 (mit Loop), 1 × HDMI 1.4 (mit Loop), 1 × DP 1.1, 2 × 3G-SDI (mit Loop) ✅ |
| Max. Eingangsauflösung | 4096 × 2160 @ 60 Hz (HDMI 2.0) ✅; Sonderformate bis 8192 × 1080 ⚠️ (Handbuch nennt für HDMI 1.4 max. 4096 × 1080) |
| Farbtiefe / HDR | 8 / 10 bit, HDR10, HLG, HDCP 2.2 ✅ |
| Ausgänge | **10 × Gigabit-Ethernet** ✅ |
| Kapazität je Port | **659.722 Pixel** @ 60 Hz ✅ (8 bit; bei 10 bit bzw. höherer Bildrate geringer ❓) |
| Gesamtkapazität | ca. **6,5 Mio. Pixel** ✅ (leere Pixel zählen nicht) |
| Glasfaser | 2 × 10G optisch: 1 Haupt, 1 Backup ✅ |
| Layer | 3 ✅ |
| Genlock | BNC ein + Loop ✅ |
| Steuerung | 2 × RJ45 Control, RS-232, USB; VMP-Software, SNMP, Art-Net ✅ |
| Leistung | max. 55 W, 100–240 V AC ✅ |
| Unterstützte Receiving Cards | NovaStar Armor-Serie, u.a. **A8s** 🔢 (COEX-Familie – mit NovaStar-Kompatibilitätsliste prüfen) |
| Bauform | 19″, Höhe ❓, Gewicht ❓ |

```jsonc
{
  "id": "novastar-mx30",
  "name": "NovaStar MX30",
  "kategorie": "Prozessor",
  "attribute": {
    "hersteller": "NovaStar",
    "familie": "COEX",
    "receivingCards": ["NovaStar A8s"],      // 🔢 prüfen, ggf. weitere Armor-Karten
    "eingaenge": [
      { "name": "HDMI 2.0", "typ": "HDMI", "maxB": 4096, "maxH": 2160, "maxHz": 60, "loop": true },
      { "name": "HDMI 1.4", "typ": "HDMI", "maxB": 4096, "maxH": 1080, "maxHz": 60, "loop": true },
      { "name": "DP 1.1",   "typ": "DP",   "maxB": null, "maxH": null, "maxHz": 60 },       // ❓
      { "name": "SDI 1",    "typ": "3G-SDI", "maxB": 1920, "maxH": 1080, "maxHz": 60, "loop": true },
      { "name": "SDI 2",    "typ": "3G-SDI", "maxB": 1920, "maxH": 1080, "maxHz": 60, "loop": true }
    ],
    "ports": { "anzahl": 10, "typ": "etherCON/RJ45 1G", "pxJePort": 659722 },
    "optisch": { "anzahl": 2, "typ": "10G", "rolle": ["haupt", "backup"] },
    "gesamtPx": 6500000,
    "layer": 3,
    "backup": true,
    "wMax": 55,
    "quelle": "NovaStar Handbuch MX30 V1.0.1 + Händler, Stand 10/2026"
  }
}
```

## 3. Platzhalter für die übrigen Kategorien

Für diese Kategorien wurden keine konkreten Geräte genannt. Die Einträge sind
**generische Beispiele** (keine Herstellerdaten), damit Strom und Signal schon
durchgespielt werden können. Später durch euren Bestand ersetzen.

| Kategorie | Beispiel | Wichtige Werte |
| --- | --- | --- |
| Stromverteiler | „Verteiler 32 A → 6 × 16 A“ | Einspeisung CEE 32 A 5-pol; 6 Abgänge 16 A (PowerCON TRUE1), je 2 pro Phase, Charakteristik C, FI 30 mA |
| Stromverteiler | „Verteiler 63 A → 2 × 32 A + 6 × 16 A“ | Einspeisung CEE 63 A; Unterverteiler-Abgänge 2 × CEE 32 A |
| Laka + Spinne | „Laka 16-pol, 6 Kreise“ | 6 × 16 A, Längen 10/25/50 m, Spinne 6 × PowerCON TRUE1 |
| Stagebox (aktiv) | „Glasfaser-Konverter 10G → 10 × 1G“ (z.B. NovaStar CVT10-Klasse) | 1 × 10G optisch ein, 10 × etherCON aus, eigener Stromanschluss ❓ W |
| Multicore (passiv) | „Cat-Multicore 4-fach“ | 4 × etherCON, Längen 25/50 m, Cat max. 100 m je Strecke |
| Bracket / Bumper | „Flugrahmen 1 m“ | für 2 × 500er Module nebeneinander, Eigengewicht ❓, zul. Last ❓, 2 Aufhängepunkte |

## 4. Durchgerechnetes Beispiel

**Screen „Bühne Mitte“**, geflogen, Unterkante 2,50 m: 12 Spalten × 3 Reihen
**P4+WH PRO V3** (500 × 1000), darunter 1 Reihe **P4+sWH PRO V3** (500 × 500).

| Größe | Rechnung | Ergebnis |
| --- | --- | --- |
| Maße | 12 × 0,5 m · 3 × 1,0 m + 0,5 m | **6,00 × 3,50 m = 21,0 m²** |
| Auflösung | 12 × 104 · (3 × 208 + 104) | **1248 × 728 px** (908.544 px) |
| Module | 36 × WH + 12 × sWH | **48 Module** |
| Gewicht Module | 36 × 13,9 + 12 × 8,5 | **602,4 kg** (ohne Flugrahmen/Kabel) |
| Last je Spalte | 3 × 13,9 + 8,5 | **50,2 kg** + Rahmenanteil |
| Leistung max. / typ. | 36 × 175 + 12 × 88 / 36 × 90 + 12 × 45 | **7.356 W / 3.780 W** 🔢 |

**Signal (NovaStar MX30)**
- 908.544 px ÷ 659.722 px je Port → **2 Ports** (Auslastung je ca. 69 %), mit gespiegeltem Backup **4 Ports** von 10.
- WH und sWH dürfen auf denselben Port (gleiche Serie, A8s) → z.B. Port 1 = linke 6 Spalten inkl. unterer sWH-Reihe, Port 2 = rechte 6 Spalten.
- Gesamtkapazität 6,5 Mio. px → Prozessor zu ca. 14 % ausgelastet; reicht auch für weitere Screens.
- Eingang: 1248 × 728 passt in jeden Eingang inkl. 3G-SDI (1920 × 1080).
- Offen ❓: max. Module je Datenstrang laut LEDTEK.

**Strom** (Hausregel-Vorschlag: 16 A, 230 V, 20 % Reserve → 2.944 W je Kreis)
- 7.356 W ÷ 2.944 W → **mindestens 3 Kreise**; gleichmäßig verteilt je ca. 2.452 W ≈ **10,7 A** → je Kreis eine Phase (L1/L2/L3), keine Schieflast.
- Einspeisung: CEE 32 A reicht rechnerisch (je Phase 10,7 A) – mit Prozessor und Reserve für Erweiterung eher **CEE 63 A** über Verteiler.
- Offen ❓: Einschaltstrom und max. Module je PowerCON-Brücke laut LEDTEK – davon hängt ab, ob 3 Kreise wirklich reichen oder mehr Kreise wegen der Brückengrenze nötig sind.

**Aufbau**
- 12 Spalten → z.B. 6 Flugrahmen à 1 m (je 2 Spalten) → Last je Rahmen ca. 100,4 kg + Rahmen.
- Offen ❓: zulässige Anzahl Module untereinander (hier 3 × WH + 1 × sWH), Rahmengewicht und -last.

## 5. Was für echte Planungen noch fehlt

1. LEDTEK-Datenblatt V3 (aktuell): Gewicht V3, Einschaltstrom, max. Module je Strom- und Datenbrücke, Rigging-Grenzen, Tiefe sWH.
2. NovaStar: offizielle Kompatibilitätsliste MX30 ↔ A8s, Kapazität je Port bei 10 bit / 50 Hz.
3. Eigene Stromverteiler, Lakas/Spinnen, Stageboxen, Multicores und Flugrahmen aus dem Bestand.

## Quellen

- NovaStar MX30 Benutzerhandbuch V1.0.1: https://oss.novastar.tech/uploads/2023/07/MX30-LED-Display-Controller-User-Manual-V1.0.1.pdf
- NovaStar MX30 bei B&H: https://www.bhphotovideo.com/c/product/1865470-REG/novastar_mx30_controller.html
- NovaStar MX30 bei Farralane (10 Ports, 6,5 Mio. Pixel): https://www.farralane.com/novastar-mx30-led-display-controller-with-10-ethernet-ports-and-6-5-million-pixel-load-capacity.html
- LEDTEK – Die neue P4+WH PRO V3: https://www.led-tek.de/en/2024/08/the-new-p4-wh-pro-v3/
- LEDTEK – Unsere PRO Outdoor im Vergleich: https://www.led-tek.de/2024/05/unsere-pro-outdoor/
- LEDTEK Datenblatt P4+WH PRO (ältere Version): https://led-tek.de/wp-content/uploads/2020/DATENBLATT_P4_WHPRO.pdf
- hd-event – LEDTEK P4+WH PRO v3: https://hd-event.de/produkt/ledtek-p4wh-pro-v3-1000x500mm-modul-p4/
- Gebrauchtangebot P4+sWH PRO V3: https://gebrauchte-veranstaltungstechnik.de/ad-942735-LEDTEK+P4sWH+PRO+V3+Professionelle+LEDWand+fr+Outdooranwendung

Die Herstellerseiten waren aus der Arbeitsumgebung nicht direkt abrufbar; die
Werte stammen aus Suchergebnissen dieser Seiten.
