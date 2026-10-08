# LED-Planer – Library-Datenformat (Version 1, Stand 08.10.2026)

Verbindliche Festlegung, wie Einträge der Library aufgebaut sind. Gilt für die
eingebaute Library (jetzt, ohne Datenbank) und später unverändert für die
Material-Einträge aus dem Rex-System (Datenbank-Agent). Konzept:
`ledplaner-konzept.md`, Beispielwerte und Quellen: `ledplaner-beispieldaten.md`.

## 1. Grundsätze

1. **Ein Eintrag = ein Rex-Material-Eintrag** – derselbe Aufbau wie beim
   Signalfluss-Planer: `id`, `name`, `kategorie`, `attribute` (flexibles JSON-Feld).
2. **Gemeinsame Felder werden geteilt** (`hersteller`, `gewicht`,
   `stromverbrauch`, `grafik`, `anschluesse`, `warengruppe`), damit ein Gerät in
   LED-Planer **und** Signalfluss-Planer dieselben Daten nutzt.
3. **LED-Planer-eigene Felder** liegen gesammelt unter `attribute.led`. So
   stören sie andere Module nicht, und der LED-Planer erkennt seine Einträge an
   `attribute.led.typ`.
4. **Einheiten stehen im Feldnamen**, Zahlen immer als Zahl (Punkt als
   Dezimaltrenner im JSON, Anzeige deutsch): `mm`, `kg`, `W`, `A`, `V`, `px`,
   `Hz`, `m`.
5. **Unbekannt ≠ nicht zutreffend**: `null` heißt „Wert fehlt (Datenblatt)“ und
   zählt im Badge als offen; ein **fehlendes Feld** heißt „trifft nicht zu“.
6. **Leere Texte bleiben leer**, nie `"0"` oder `"-"` (Styleguide).
7. Jede Datei bzw. jeder Export trägt `formatVersion: 1`; ältere Versionen
   werden beim Laden migriert.

## 2. Rahmen eines Eintrags

```jsonc
{
  "id": "1578",                     // Pflicht. Rex: Artikelnummer. Eigene Einträge ohne DB: "lokal-<kurzname>"
  "name": "LEDTEK P4+WH PRO V3",    // Pflicht. Anzeigename
  "kategorie": "Video · LED-Modul", // Gruppierung in der Library-Liste (frei, wie im Signalfluss-Planer)
  "attribute": {
    "hersteller": "LEDTEK",         // gemeinsam
    "warengruppe": "Videotechnik/LED/Module/",
    "gewicht": 13.9,                // gemeinsam, kg
    "stromverbrauch": 175,          // gemeinsam, W (Maximalwert)
    "grafik": null,                 // gemeinsam, Pfad auf dem NAS (Vorderansicht)
    "anschluesse": [ … ],           // gemeinsam, wie Signalfluss-Planer (siehe 4.)
    "quelle": "Datenblatt V3 2024", // Herkunft der Werte, frei
    "led": { "typ": "modul", … }    // LED-Planer-Daten, je Typ unten festgelegt
  }
}
```

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `id` | Text | ✔ | eindeutig; Rex-Artikelnummer |
| `name` | Text | ✔ | |
| `kategorie` | Text | – | nur zur Gruppierung |
| `attribute.hersteller` | Text | ✔ | |
| `attribute.warengruppe` | Text | – | aus dem Rex-System |
| `attribute.gewicht` | Zahl kg | ✔/Prüf | Pflicht bei Modul, Rigging; sonst Prüffeld |
| `attribute.stromverbrauch` | Zahl W | Prüf | Maximalwert; bei passiven Teilen fehlt das Feld |
| `attribute.grafik` | Text | – | ohne Grafik zeichnet der Planer einen Platzhalter |
| `attribute.anschluesse` | Liste | je Typ | siehe Abschnitt 4 |
| `attribute.quelle` | Text | – | Datenblatt, Händler, eigene Messung |
| `attribute.led.typ` | Auswahl | ✔ | `modul` · `prozessor` · `stagebox` · `multicore` · `verteiler` · `laka` · `spinne` · `rigging` · `kabel` |

**Pflicht (✔)**: fehlt der Wert, ist der Eintrag **nicht verwendbar** (Prüfhinweis
„Fehler“, Speichern im Library-Manager gesperrt). **Prüffeld (Prüf)**: darf `null`
sein, zählt im Badge und erzeugt eine **Warnung** an der Stelle, wo er gebraucht
wird (z.B. Einschaltstrom im Reiter Strom).

## 3. Felder je Typ (`attribute.led`)

### 3.1 `modul` – LED-Modul / Kabinett

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `serie` | Text | ✔ | Port-Regel: gleiche Serie + gleiche RC auf einem Port |
| `receivingCard` | Text | ✔ | z.B. `"NovaStar A8s"` |
| `pixelB`, `pixelH` | Zahl px | ✔ | |
| `mmB`, `mmH` | Zahl mm | ✔ | |
| `mmT` | Zahl mm | Prüf | Tiefe |
| `pitchMm` | Zahl mm | – | wird aus `mmB / pixelB` berechnet, falls leer |
| `wTyp` | Zahl W | Prüf | typische Leistung; Maximalwert steht in `attribute.stromverbrauch` |
| `einschaltstromA` | Zahl A | Prüf | |
| `strom.maxJeBruecke` | Zahl | Prüf | max. Module je Strombrücke |
| `daten.maxJeStrang` | Zahl | Prüf | max. Module je Datenstrang (zusätzlich zur Portkapazität) |
| `mechanik.maxGeflogen` | Zahl | Prüf | max. Module untereinander |
| `mechanik.maxGestellt` | Zahl | Prüf | max. Module übereinander |
| `mechanik.kurve` | ja/nein | – | |
| `mechanik.winkelGrad` | Liste Zahlen | – | mögliche Winkel, z.B. `[-10,-5,0,5,10]` |
| `ip` | Text | – | z.B. `"IP65"` |
| `grafikHinten` | Text | – | Rückansicht (Vorderansicht = `attribute.grafik`) |

Anschlüsse (`attribute.anschluesse`): Strom ein/aus, Daten ein/aus – siehe 4.

### 3.2 `prozessor`

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `familie` | Text | – | z.B. `"COEX"` |
| `receivingCards` | Liste Text | ✔ | Kompatibilität; nur diese Prozessoren werden im Reiter Signal angeboten |
| `pxJePort` | Zahl px | ✔ | Kapazität je Ausgangsport bei 60 Hz / 8 bit |
| `pxGesamt` | Zahl px | ✔ | Gesamtkapazität |
| `layer` | Zahl | ✔ | Prüfung im Reiter Ausgabe |
| `backup` | ja/nein | – | Backup-Ports möglich |
| `he` | Zahl | Prüf | Höheneinheiten |

Anschlüsse: Eingänge (mit `maxB`, `maxH`, `maxHz`, `loop`) und Ausgangs-Ports (Daten), optional Glasfaser.

### 3.3 `stagebox` (aktiv)

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `pxJePort` | Zahl px | Prüf | falls die Box selbst begrenzt |
| `he` | Zahl | – | |

Anschlüsse: Eingang (z.B. Glasfaser), Ausgangs-Ports (Daten), Strom ein (`attribute.stromverbrauch` Pflicht → erscheint im Reiter Strom).

### 3.4 `multicore` (passiv)

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `adern` | Zahl | ✔ | Anzahl Datenstrecken |
| `laengeM` | Zahl m | ✔ | |
| `aufloesung` | Text | – | Stecker an der Wand, z.B. `"4 × etherCON"` |

### 3.5 `verteiler` – Stromverteiler

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `einspeisung.typ` | Text | ✔ | z.B. `"CEE 63 A 5-pol"`, `"Harting 4P+PE"`, `"Powerlock"` |
| `einspeisung.ampere` | Zahl A | ✔ | |
| `einspeisung.netz` | Text | – | z.B. `"TN-S 230/400 V"` |
| `kanaele` | Liste | ✔ | je Kanal: `nr`, `ampere`, `charakteristik` (`B`/`C`/`D`), `fi` (z.B. `"30 mA Typ A"`), `phase` (`L1`/`L2`/`L3`/`null`), `ausgang` (Name des Ausgangs) |
| `ausgaenge` | Liste | ✔ | je Ausgang: `name`, `stecker`, `kanaele` (Liste der Kanalnummern) |
| `messung` | ja/nein | – | Lastmessung je Kanal vorhanden |
| `he` | Zahl | – | |

`phase: null` = Phasenzuordnung unbekannt (Prüffeld, z.B. StageSmarts C24).

### 3.6 `laka` – Lastmulticore

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `stecker` | Text | ✔ | z.B. `"Harting 16-pol"` |
| `kreise` | Zahl | ✔ | Anzahl Stromkreise |
| `ampereJeKreis` | Zahl A | ✔ | |
| `laengeM` | Zahl m | ✔ | |

### 3.7 `spinne` – Auflösung

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `steckerEin` | Text | ✔ | passt zur Laka |
| `abgaenge` | Zahl | ✔ | |
| `steckerAus` | Text | ✔ | z.B. `"PowerCON TRUE1"` |
| `laengeM` | Zahl m | – | Länge der Abgänge |

### 3.8 `rigging` – Bumper, Flugrahmen, Stacking, Bodenstütze

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `art` | Auswahl | ✔ | `flugrahmen` · `stacking` · `bodenstuetze` · `zubehoer` |
| `serien` | Liste Text | ✔ | passende Modulserien |
| `breiteModule` | Zahl | ✔ | Breite in Modulen (z.B. 2) |
| `lastMaxKg` | Zahl kg | Prüf | zulässige Last |
| `punkte` | Liste | Prüf | Aufhängepunkte: `xMm` (Abstand von links), `lastMaxKg` |

Gewicht des Teils in `attribute.gewicht` (Pflicht).

### 3.9 `kabel` – Kabeltyp

| Feld | Typ | Pflicht | Bemerkung |
| --- | --- | --- | --- |
| `gewerk` | Auswahl | ✔ | `strom` · `signal` · `video` |
| `farbsystem` | Auswahl | ✔ | Name aus dem Kabel-Farbsystem des Styleguides: `Strom`, `LAN`, `Fiber`, `Multicore (Harting)`, `Socapex`, `HDMI`, `SDI`, `DisplayPort` … |
| `steckerA`, `steckerB` | Text | ✔ | |
| `laengenM` | Liste Zahlen | Prüf | verfügbare Längen aus dem Bestand |
| `brueckeLaengeM` | Zahl m | – | Standardlänge, wenn der Typ als Brücke zwischen Modulen genutzt wird |
| `maxLaengeM` | Zahl m | – | z.B. 100 bei Cat |

## 4. Anschlüsse (gemeinsam mit dem Signalfluss-Planer)

Gleiches Format wie im Signalfluss-Planer (`name`, `typ`, `richtung`), ergänzt um
optionale LED-Felder. Der Signalfluss-Planer ignoriert die Ergänzungen.

```jsonc
"anschluesse": [
  { "name": "HDMI 2.0", "typ": "HDMI", "richtung": "in",
    "maxB": 4096, "maxH": 2160, "maxHz": 60, "loop": true },          // Prozessor-Eingang
  { "name": "Port 1", "typ": "LAN", "richtung": "out", "rolle": "port" }, // Datenport
  { "name": "Strom ein", "typ": "PowerCON TRUE1", "richtung": "in", "rolle": "strom" },
  { "name": "Daten ein", "typ": "etherCON", "richtung": "in", "rolle": "daten" }
]
```

| Feld | Werte | Bemerkung |
| --- | --- | --- |
| `name` | Text | je Gerät eindeutig |
| `typ` | Signaltyp des Signalfluss-Planers (`HDMI`, `SDI`, `DP`, `LAN`, `Fiber` …) bzw. Steckertyp bei Strom | |
| `richtung` | `in` · `out` · `bidi` | wie Signalfluss-Planer |
| `rolle` | `port` · `daten` · `strom` · `video` · `glasfaser` | LED-Ergänzung, sagt dem Planer, wofür der Anschluss dient |
| `maxB`, `maxH`, `maxHz`, `loop` | Zahlen / ja-nein | nur Videoeingänge |

Gleichartige Ports dürfen kurz angegeben werden: `{ "name": "Port", "typ": "LAN",
"richtung": "out", "rolle": "port", "anzahl": 10 }` → Port 1 … Port 10.

## 5. Vollständigkeit (Badge im Library-Manager)

- **Badge** = gefüllte Felder / alle Pflicht- und Prüffelder des Typs, z.B. „9/14“; alles gefüllt → „vollständig“.
  Gezählt werden die Datenfelder ohne `id`, `name` und `led.typ`; Paare wie
  Pixel B × H oder Maße B × H zählen als **ein** Feld.
  LED-Modul: 6 Pflichtfelder (Hersteller, Gewicht, Serie, Receiving Card, Pixel,
  Maße) + 8 Prüffelder (Leistung max., Tiefe, Leistung typ., Einschaltstrom,
  max. je Brücke, max. je Strang, max. geflogen, max. gestellt) = 14.
- **Tooltip** nennt die offenen Felder.
- Fehlt ein **Pflichtfeld**, ist der Eintrag rot markiert und in den Reitern nicht wählbar.
- Filter „nur unvollständige“ zeigt alle Einträge mit offenen Feldern.

## 6. Verhältnis Projekt ↔ Library

- Das Projekt verweist per `id` auf Library-Einträge **und speichert eine Kopie
  der verwendeten Einträge** (Stand beim Einfügen). So bleibt ein Projekt
  nachvollziehbar, auch wenn sich die Library später ändert.
- Weicht der Library-Eintrag später ab, meldet der Planer das als Hinweis
  („LEDTEK P4+WH PRO V3: Gewicht in der Library geändert – übernehmen?“).
- **Eigene Einträge** ohne Datenbank: `id` beginnt mit `lokal-`, werden in der
  Projektdatei und in einer Library-Datei (`.ledlibrary.json`) gespeichert und
  lassen sich später ins Rex-System übernehmen.

## 7. Library-Datei (ohne Datenbank)

```jsonc
{
  "format": "rex-ledplaner-library",
  "formatVersion": 1,
  "gespeichert": "2026-10-08T12:00:00.000Z",
  "eintraege": [ { "id": "...", "name": "...", "kategorie": "...", "attribute": { ... } } ]
}
```

## 8. Beispiele im festgelegten Format

### LED-Modul

```jsonc
{
  "id": "lokal-ledtek-p4wh-pro-v3",
  "name": "LEDTEK P4+WH PRO V3",
  "kategorie": "Video · LED-Modul",
  "attribute": {
    "hersteller": "LEDTEK",
    "gewicht": 13.9,
    "stromverbrauch": 175,
    "grafik": null,
    "quelle": "LEDTEK / Händler, Stand 10/2026",
    "anschluesse": [
      { "name": "Strom ein",  "typ": "PowerCON TRUE1", "richtung": "in",  "rolle": "strom" },
      { "name": "Strom aus",  "typ": "PowerCON TRUE1", "richtung": "out", "rolle": "strom" },
      { "name": "Daten ein",  "typ": "etherCON",       "richtung": "in",  "rolle": "daten" },
      { "name": "Daten aus",  "typ": "etherCON",       "richtung": "out", "rolle": "daten" }
    ],
    "led": {
      "typ": "modul",
      "serie": "P4+ PRO V3",
      "receivingCard": "NovaStar A8s",
      "pixelB": 104, "pixelH": 208,
      "mmB": 500, "mmH": 1000, "mmT": 85,
      "pitchMm": 4.81,
      "wTyp": 90,
      "einschaltstromA": null,
      "strom": { "maxJeBruecke": null },
      "daten": { "maxJeStrang": null },
      "mechanik": { "maxGeflogen": null, "maxGestellt": null, "kurve": true, "winkelGrad": null },
      "ip": "IP65"
    }
  }
}
```

Badge: 9/14 – offen: Einschaltstrom, max. je Strombrücke, max. je Datenstrang,
max. geflogen, max. gestellt.

### Prozessor

```jsonc
{
  "id": "lokal-novastar-mx30",
  "name": "NovaStar MX30",
  "kategorie": "Video · LED-Prozessor",
  "attribute": {
    "hersteller": "NovaStar",
    "gewicht": null,
    "stromverbrauch": 55,
    "anschluesse": [
      { "name": "HDMI 2.0", "typ": "HDMI", "richtung": "in", "maxB": 4096, "maxH": 2160, "maxHz": 60, "loop": true, "rolle": "video" },
      { "name": "HDMI 1.4", "typ": "HDMI", "richtung": "in", "maxB": 4096, "maxH": 1080, "maxHz": 60, "loop": true, "rolle": "video" },
      { "name": "DP 1.1",   "typ": "DP",   "richtung": "in", "maxB": null, "maxH": null, "maxHz": 60, "rolle": "video" },
      { "name": "SDI",      "typ": "SDI",  "richtung": "in", "maxB": 1920, "maxH": 1080, "maxHz": 60, "loop": true, "rolle": "video", "anzahl": 2 },
      { "name": "Port",     "typ": "LAN",  "richtung": "out", "rolle": "port", "anzahl": 10 },
      { "name": "OPT",      "typ": "Fiber","richtung": "out", "rolle": "glasfaser", "anzahl": 2 },
      { "name": "Strom ein","typ": "Kaltgeräte", "richtung": "in", "rolle": "strom" }
    ],
    "led": {
      "typ": "prozessor",
      "familie": "COEX",
      "receivingCards": ["NovaStar A8s"],
      "pxJePort": 659722,
      "pxGesamt": 6500000,
      "layer": 3,
      "backup": true,
      "he": null
    }
  }
}
```

### Stromverteiler (gekürzt: 24 Kanäle, 4 Ausgänge)

```jsonc
{
  "id": "lokal-stagesmarts-c24-4h6",
  "name": "StageSmarts C24 (4 × Harting)",
  "kategorie": "Strom · Verteiler",
  "attribute": {
    "hersteller": "StageSmarts",
    "gewicht": 18,
    "led": {
      "typ": "verteiler",
      "einspeisung": { "typ": "Harting 4P+PE / CEE 63 A", "ampere": 63, "netz": "TN-S 230/400 V" },
      "kanaele": [
        { "nr": 1, "ampere": 16, "charakteristik": "C", "fi": "30 mA Typ A", "phase": null, "ausgang": "Harting 1" }
        // … Kanal 2–24 entsprechend
      ],
      "ausgaenge": [
        { "name": "Harting 1", "stecker": "Harting 16-pol", "kanaele": [1, 2, 3, 4, 5, 6] },
        { "name": "Harting 2", "stecker": "Harting 16-pol", "kanaele": [7, 8, 9, 10, 11, 12] },
        { "name": "Harting 3", "stecker": "Harting 16-pol", "kanaele": [13, 14, 15, 16, 17, 18] },
        { "name": "Harting 4", "stecker": "Harting 16-pol", "kanaele": [19, 20, 21, 22, 23, 24] }
      ],
      "messung": true,
      "he": 6
    }
  }
}
```

### Laka, Spinne, Kabeltyp

```jsonc
{ "id": "lokal-laka-h16-25", "name": "Laka Harting 16-pol · 25 m", "kategorie": "Strom · Laka",
  "attribute": { "hersteller": "", "led": { "typ": "laka", "stecker": "Harting 16-pol", "kreise": 6, "ampereJeKreis": 16, "laengeM": 25 } } }

{ "id": "lokal-spinne-h16-true1", "name": "Spinne Harting → 6 × TRUE1", "kategorie": "Strom · Spinne",
  "attribute": { "hersteller": "", "led": { "typ": "spinne", "steckerEin": "Harting 16-pol", "abgaenge": 6, "steckerAus": "PowerCON TRUE1", "laengeM": 1.5 } } }

{ "id": "lokal-cat6-ethercon", "name": "Cat6 etherCON", "kategorie": "Signal · Kabel",
  "attribute": { "hersteller": "", "led": { "typ": "kabel", "gewerk": "signal", "farbsystem": "LAN",
    "steckerA": "etherCON", "steckerB": "etherCON", "laengenM": [1.2, 5, 10, 20, 30, 60, 90],
    "brueckeLaengeM": 1.2, "maxLaengeM": 100 } } }
```

`hersteller: ""` ist bei Eigenbau/Konfektion erlaubt (leerer Text, Pflichtfeld
gilt als „bewusst leer“). Die übrigen Beispiele (P4+sWH, Flugrahmen) folgen
demselben Schema; die zugehörigen Werte stehen in `ledplaner-beispieldaten.md`.

## 9. Offene Punkte zum Format

Keine blockierenden. Später zu ergänzen, sobald Daten vorliegen:
Einschaltstrom-Kurve statt Einzelwert, Kurvenwinkel je Modulkombination,
Stagebox-/Multicore-Einträge aus dem Bestand.
