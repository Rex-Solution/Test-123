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
| Unterstützte Receiving Cards | NovaStar **A8s** ✅ (Kompatibilität vom Anwender bestätigt, 08.10.2026) |
| Bauform | 19″, Höhe ❓, Gewicht ❓ |

```jsonc
{
  "id": "novastar-mx30",
  "name": "NovaStar MX30",
  "kategorie": "Prozessor",
  "attribute": {
    "hersteller": "NovaStar",
    "familie": "COEX",
    "receivingCards": ["NovaStar A8s"],      // ✅ vom Anwender bestätigt
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

## 3. Stromverteiler: StageSmarts C24

24-Kanal-Stromverteiler im 19″-Rack, typisch für LED-Wände – passt zum
Konzept „Laka mit Spinne“: je Harting-Ausgang eine Laka, an der Wand eine Spinne.

| Eigenschaft | Wert |
| --- | --- |
| Bauform | 19″, 6 HE, 483 × 266 × 359 mm ✅ |
| Gewicht | 18 kg ⚠️ (ältere Angaben 23 kg) |
| Einspeisung | Harting 4-pol + PE, **63 A**, 230/400 V TN-S ✅; Zuleitung fest oder steckbar mit **CEE 32 A oder 63 A** ✅ (ältere Version: ILME 80 A ⚠️) |
| Hauptschalter | Lasttrenner 4-pol 63 A ✅ |
| Kanäle | **24 × 16 A**, je Kanal **FI/LS 16 A / 30 mA, C-Charakteristik**, FI Typ A ✅ |
| Ausgänge (Varianten) | **4 × Harting 16-pol, je 6 Kanäle** ✅ · 3 × Harting 16-pol, je 8 Kanäle ✅ · 4 × Socapex 19-pol (je 6 Kanäle) ⚠️ |
| Phasenzuordnung | ❓ (vermutlich gleichmäßig 8 Kanäle je Phase – aus Handbuch prüfen) |
| Messung | Spannungen, Ströme (inkl. Neutralleiter), Leistungsfaktor, Frequenz; Last je Kanal in Echtzeit ✅; Webserver optional ✅ |
| Hinweis | Ein Handbuch beschreibt eine abweichende Variante (Powerlock 500 A, 20 Ausgänge) ⚠️ – Variante bei Bestellung beachten |

```jsonc
{
  "id": "stagesmarts-c24-4h6",
  "name": "StageSmarts C24 (4 × Harting, 6 Kanäle)",
  "kategorie": "Stromverteiler",
  "attribute": {
    "hersteller": "StageSmarts",
    "einspeisung": { "typ": "Harting 4P+PE / CEE", "ampere": 63, "netz": "TN-S 230/400 V" },
    "hauptschalter": { "ampere": 63, "pole": 4 },
    "kanaele": { "anzahl": 24, "ampere": 16, "charakteristik": "C", "fi": "30 mA Typ A", "phasen": null },  // ❓ Zuordnung
    "ausgaenge": [
      { "typ": "Harting 16-pol", "anzahl": 4, "kanaeleJeAusgang": 6 }
    ],
    "messung": ["Spannung", "Strom je Kanal", "Neutralleiter", "Leistungsfaktor"],
    "he": 6, "kg": 18,
    "quelle": "StageSmarts Datenblatt / Händler, Stand 10/2026"
  }
}
```

Passende Laka/Spinne (generisch, nicht vom Hersteller):

| Eintrag | Werte |
| --- | --- |
| Laka „Harting 16-pol, 6 Kreise“ | 6 × 16 A, Längen 10/25/50 m (Bestand ❓) |
| Spinne „Harting 16-pol → 6 × PowerCON TRUE1“ | 6 Abgänge, Kreise 1–6 der Laka |

## 4. Platzhalter für die übrigen Kategorien

Für diese Kategorien wurden keine konkreten Geräte genannt. Die Einträge sind
**generische Beispiele** (keine Herstellerdaten), damit Strom und Signal schon
durchgespielt werden können. Später durch euren Bestand ersetzen.

| Kategorie | Beispiel | Wichtige Werte |
| --- | --- | --- |
| Hauptverteiler | „Verteiler 125 A → 2 × CEE 63 A“ | für mehrere C24 bzw. Powerlock/Aggregat davor |
| Stagebox (aktiv) | „Glasfaser-Konverter 10G → 10 × 1G“ (z.B. NovaStar CVT10-Klasse) | 1 × 10G optisch ein, 10 × etherCON aus, eigener Stromanschluss ❓ W |
| Multicore (passiv) | „Cat-Multicore 4-fach“ | 4 × etherCON, Längen 25/50 m, Cat max. 100 m je Strecke |
| Bracket / Bumper | „Flugrahmen 1 m“ | für 2 × 500er Module nebeneinander, Eigengewicht ❓, zul. Last ❓, 2 Aufhängepunkte |

## 5. Durchgerechnetes Beispiel

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
- MX30 und A8s sind kompatibel ✅.
- 908.544 px ÷ 659.722 px je Port → **2 Ports** (Auslastung je ca. 69 %), mit gespiegeltem Backup **4 Ports** von 10.
- WH und sWH dürfen auf denselben Port (gleiche Serie, A8s) → z.B. Port 1 = linke 6 Spalten inkl. unterer sWH-Reihe, Port 2 = rechte 6 Spalten.
- Gesamtkapazität 6,5 Mio. px → Prozessor zu ca. 14 % ausgelastet; reicht auch für weitere Screens.
- Eingang: 1248 × 728 passt in jeden Eingang inkl. 3G-SDI (1920 × 1080).
- Offen ❓: max. Module je Datenstrang laut LEDTEK.

**Strom** (Hausregel-Vorschlag: 16 A, 230 V, 20 % Reserve → 2.944 W je Kreis)
- 7.356 W ÷ 2.944 W → rechnerisch **mindestens 3 Kreise**.
- Mit **StageSmarts C24**: eine Laka (Harting-Ausgang 1, 6 Kreise) mit Spinne an der Wand → **6 Kreise à 8 Module**, z.B. je Kreis 2 Spalten (6 × WH + 2 × sWH = 1.050 + 176 = **1.226 W ≈ 5,3 A**, Auslastung 42 % von 2.944 W). Viel Reserve für Einschaltstrom und Brückengrenze.
- Je 2 Kreise auf L1/L2/L3 → je Phase ca. 2.452 W ≈ **10,7 A**, keine Schieflast (Phasenzuordnung der C24-Kanäle ❓).
- Einspeisung C24: **CEE 32 A** reicht rechnerisch, **63 A** lässt Platz für weitere Screens (3 freie Harting-Ausgänge = 18 Kreise).
- Offen ❓: Einschaltstrom und max. Module je PowerCON-Brücke laut LEDTEK.

**Aufbau**
- 12 Spalten → z.B. 6 Flugrahmen à 1 m (je 2 Spalten) → Last je Rahmen ca. 100,4 kg + Rahmen.
- Offen ❓: zulässige Anzahl Module untereinander (hier 3 × WH + 1 × sWH), Rahmengewicht und -last.

## 6. Was für echte Planungen noch fehlt

1. LEDTEK-Datenblatt V3 (aktuell): Gewicht V3, Einschaltstrom, max. Module je Strom- und Datenbrücke, Rigging-Grenzen, Tiefe sWH.
2. NovaStar: Kapazität je Port bei 10 bit / 50 Hz.
3. StageSmarts: Phasenzuordnung der 24 Kanäle, genaue Variante im Bestand.
4. Eigene Lakas/Spinnen (Längen), Stageboxen, Multicores und Flugrahmen aus dem Bestand.

## Quellen

- StageSmarts C24: https://www.stagesmarts.com/products/c24/
- StageSmarts C24 Datenblatt (Trendco): https://www.trendco.de/wp-content/uploads/2019/09/StageSmarts_C24_en.pdf
- C24 bei Gobo (Varianten): https://gobo.se/produkter/pdus-cables/smart-pdus/c24-pdu-all-versions
- soundlightup – StageSmarts C24: https://en.soundlightup.com/news/stagesmarts-c24-distro-experts-with-brains.html
- LEDTEK – The C24: https://www.led-tek.de/en/2021/06/c24-power-distribution-stagesmarts/

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
