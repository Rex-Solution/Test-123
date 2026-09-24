# Signalfluss-Planer – Konzept & Übergabe (Stand: Grundgerüst)

Modul im Rex-System. Schwesterprojekt zum Rack-Planer und nach denselben
Grundsätzen gebaut. Aktuell als **eigenständige Datei** `signalplaner.html`
(HTML + CSS + JavaScript, keine Abhängigkeiten, kein Server, kein Build).
Öffnen per Doppelklick im Browser (Chrome, Edge, Firefox).

## Grundidee

Signalflusspläne (Video, Ton, Licht, Netzwerk) werden aus Geräten der
eigenen Library zusammengestellt: Geräte auf die Zeichenfläche ziehen,
Anschlüsse verbinden, in Gruppen/Bereiche ordnen. Das Ergebnis wird als
Plan (PDF/PNG/SVG mit Schriftfeld) sowie als Kabel-, Geräte- und
Stückliste exportiert.

## Übernommene Grundsätze (aus dem Rack-Planer-Konzept)

- Baut auf dem bestehenden **Datenbank-Agent** auf (REST-API, Hauptgruppe
  "Material"). Geräte und ihre Eigenschaften kommen aus der Datenbank,
  nicht aus dem Code.
- Zusätzliche Geräteeigenschaften liegen im **flexiblen JSON-Feld**
  (`attribute`) des Material-Eintrags.
- **Fehlende Daten werden abgefangen**: Gerät ohne Anschlüsse → Platzhalter
  mit Warnhinweis; unbekannter Signaltyp → graue Farbe + Warnung.
- **Grafik-Phasenmodell**: Phase 1 generischer Geräteblock (Platzhalter),
  Phase 2 optionale Grafik (`grafik`) im Blockkopf. Beides gemischt möglich;
  lädt eine Grafik nicht, bleibt der Platzhalter.
- **Dateien liegen auf dem NAS**, die Datenbank speichert nur Pfade.
- Fokus zuerst auf dem Kern (Datenmodell, Zeichenfläche, Drag & Drop).

## Datenmodell

### Material-Eintrag (Gerät) – wie vom Datenbank-Agent erwartet

```jsonc
{
  "id": "1578",                        // = Artikelnummer aus dem Rex-System
  "name": "Pixelhue P20",
  "kategorie": "Video · Bildmischer",  // Gruppierung in der Library
  "attribute": {
    "anschluesse": [
      { "name": "HDMI In 1", "typ": "HDMI", "richtung": "in" },
      { "name": "HDMI Out 1", "typ": "HDMI", "richtung": "out" },
      { "name": "LAN 1", "typ": "LAN", "richtung": "bidi" }
    ],
    "grafik": "grafiken/pixelhue_p20.svg",   // optional, Pfad auf dem NAS
    "gewicht": 10.66,                        // kg, optional
    "stromverbrauch": 140,                   // W (Wirkleistung), optional
    "hersteller": "Pixelhue",
    "warengruppe": "Videotechnik/System/Grafikmischer/"
  }
}
```

- `richtung`: `in` (Eingang, links am Block), `out` (Ausgang, rechts),
  `bidi` (bidirektional, z.B. LAN/USB/Fiber, rechts).
- Anschlussnamen müssen je Gerät eindeutig sein (Doppelte werden automatisch
  mit ′ ergänzt).
- **Neu gegenüber den Stammdaten**: `anschluesse` und `grafik` gibt es in der
  Artikelliste noch nicht – sie müssen im JSON-Feld gepflegt werden.

### Signaltypen

Bestimmen Farbe der Kabel und welche Anschlüsse zusammenpassen
(nur gleicher Typ darf verbunden werden). Sollen später ebenfalls aus der
Datenbank kommen.

| id | Name | Farbe |
|---|---|---|
| SDI | SDI | #2f9e44 |
| HDMI | HDMI / DVI | #3b5bdb |
| DP | DisplayPort | #c2255c |
| Fiber | Fiber / SFP | #e8590c |
| LAN | LAN / RJ45 | #868e96 |
| USB | USB | #1098ad |
| Audio | Audio analog | #e0a800 |
| AES | AES/EBU | #9c36b5 |
| Speaker | Lautsprecher (NL4) | #5c3d2e |
| DMX | DMX | #0ca678 |
| Intercom | Intercom | #d6336c |

### Verbindungsregeln

- gleicher Signaltyp (sonst Hinweis „Konverter einplanen“)
- nicht zwei Eingänge / nicht zwei Ausgänge
- jeder Anschluss nur einmal belegt
- Richtung wird automatisch gesetzt (Quelle → Ziel), egal in welche
  Richtung gezogen wird

### Plan (Speicherformat `.signalplan.json`)

```json
{
  "format": "rex-signalplan",
  "version": 1,
  "gespeichert": "2026-09-24T12:00:00.000Z",
  "plan": {
    "geraete": [
      { "uid": "p20", "geraetId": "1578", "x": 940, "y": 60,
        "label": "Pixelhue P20", "felder": ["192.168.10.20", "Regie Rack 1"] }
    ],
    "verbindungen": [
      { "uid": "k1",
        "von":  { "uid": "nb1", "port": "HDMI Out" },
        "nach": { "uid": "p20", "port": "HDMI In 1" },
        "route": [[576, 95.5], [576, 105.5]] }
    ],
    "gruppen": [
      { "uid": "gr1", "titel": "Zuspieler", "x": 10, "y": 10, "b": 230, "h": 480 }
    ],
    "einstellungen": {
      "titel": "", "projekt": "", "kunde": "", "ersteller": "", "firma": "",
      "revision": "1.0", "datum": "2026-09-24", "notizen": "",
      "feldnamen": ["Feld 1", "Feld 2"], "raster": 10, "rasterAnzeigen": true
    }
  }
}
```

- `geraetId` verweist auf die Artikelnummer (Material-`id`).
- `label` = Bezeichnung im Plan (z.B. „PPT Main“), `felder` = zwei freie
  Felder je Gerät (Namen in `einstellungen.feldnamen`).
- `route` (optional) = manuell angepasster Kabelverlauf (Zwischenpunkte,
  abwechselnd waagerechte/senkrechte Abschnitte). Fehlt sie, wird der
  Verlauf automatisch berechnet.
- Beim Laden werden Geräte/Verbindungen verworfen, deren Artikel oder
  Anschluss es in der Library nicht (mehr) gibt.
- Zusätzlich Autosave im Browser (localStorage, Schlüssel
  `signalplaner.plan.v1`).

## Funktionsumfang (Stand jetzt)

- Geräte-Library mit Suche (Name, Nummer, Hersteller, Kategorie)
- Drag & Drop auf die Zeichenfläche, Verschieben im Raster
- Verbindungen per Drag vom Anschluss, mit Prüfung und Hervorhebung
  passender Anschlüsse
- Orthogonale Kabelführung, farbig nach Signaltyp; Abschnitte manuell
  verschiebbar, Einrasten auf Nachbarabschnitte, Zusammenführen zu einer
  Linie, „Verlauf zurücksetzen“
- Gruppen (gestrichelte Bereiche) mit Titel, verschieben (Geräte wandern
  mit), Größe ändern
- Zwei freie Felder je Gerät (z.B. IP, Standort), im Block angezeigt
- Detailbereich: Stammdaten, Anschlussbelegung („→ Gerät · Anschluss“),
  Legende mit Kabelanzahl je Signaltyp, Summe Gewicht/Leistung
- Zoom (Mausrad), Pan, Einpassen; Löschen mit Entf
- **Plan & Einstellungen** (Dialog): Plan-Angaben für das Schriftfeld,
  Raster, Feldnamen, Speichern/Laden (.json, Strg+S), Neuer Plan, Beispiel
- **Export**: PDF/Drucken (A3), PNG, SVG – jeweils mit Schriftfeld und
  Legende; Kabelliste, Geräteliste, Stückliste als CSV (Semikolon, UTF-8,
  Excel-tauglich)

## Integration ins Rex-System – was anzupassen ist

Alle Stellen stehen in `signalplaner.html` im Abschnitt **KONFIGURATION**
bzw. **DATENQUELLE**:

1. **Datenbank-Agent anbinden**
   - `KONFIG.API_BASIS_URL` setzen (z.B. `'http://rex-server/api'`).
   - `Datenquelle.ladeMaterial()` an die echte Route/Antwort anpassen
     (aktuell Platzhalter `GET {API}/material`, erwartet ein Array von
     Material-Einträgen im oben gezeigten Format). Filter auf
     signalführende Artikel ggf. serverseitig.
   - `Datenquelle.ladeSignaltypen()` auf die Datenbank umstellen, sobald
     die Signaltypen dort hinterlegt sind.
   - Danach kann `DEMO_MATERIAL` entfallen.
2. **NAS für Grafiken**
   - `KONFIG.NAS_BASIS_URL` = Präfix, unter dem relative Grafikpfade aus der
     DB erreichbar sind. Absolute URLs/`data:`-URLs werden unverändert
     genutzt.
   - Hinweis PNG-Export: Grafiken von einem anderen Server brauchen
     CORS-Freigabe, sonst schlägt der PNG-Export fehl (SVG/PDF gehen).
3. **Anschlüsse pflegen**: Für jedes Gerät das Attribut `anschluesse` im
   JSON-Feld anlegen. Die 71 Demo-Geräte (aus der Artikelliste
   `articlelist_2.csv`) sind eine Vorlage – ihre Belegung ist aus
   Herstellerangaben abgeleitet und **muss geprüft werden**, insbesondere
   Pixelhue P20 (4× HDMI + 4× DP angenommen), Novastar-Controller,
   grandMA3 light (DMX/LAN-Anzahl), Yamaha-Pulte (I/O). Pixelhue ViewPro 4K
   hat absichtlich keine Anschlüsse (Beispiel für unvollständige Daten).
4. **Speicherort der Pläne**: aktuell Datei-Download/-Upload + Browser-
   Autosave. Später sinnvoll: Pläne im Rex-System speichern (gleiches
   JSON-Format), z.B. verknüpft mit Projekt/Veranstaltung.

## Aufbau der Datei (Abschnitte im Script)

| Abschnitt | Inhalt |
|---|---|
| KONFIGURATION | API-/NAS-URL, Speicher-Schlüssel, Standard-Feldnamen, Geometrie |
| DEMODATEN | Signaltypen, Helfer `a()`/`reihe()`, `DEMO_MATERIAL` (71 Geräte) |
| DATENQUELLE | `ladeMaterial()`, `ladeSignaltypen()`, `grafikUrl()` (NAS) |
| NORMALISIERUNG | `normalisiereGeraet()` – Defaults, Warnungen, Blockhöhe |
| ZUSTAND | `S` (Library, Plan, Ansicht, Auswahl), Laden/Speichern im Browser |
| PLAN-LOGIK | `pruefeVerbindung()`, Hinzufügen/Löschen |
| RENDERING | SVG-Zeichnung, Kabelführung (`autoPunkte`, `kabelPunkte`, Route), Detailbereich |
| KOORDINATEN & ANSICHT | Zoom, Pan, Einpassen, `planGrenzen()` |
| INTERAKTION | Pointer-Events (Maus/Touch): Drag & Drop, Kabel, Abschnitte, Gruppen |
| PLAN & EINSTELLUNGEN | Dialog, Datei speichern/laden, Export SVG/PNG/PDF/CSV, Schriftfeld |
| BEISPIEL | Beispielplan „Signal Auditorium“ mit echten Artikeln |
| START | Daten laden, Autosave wiederherstellen, erstes Rendern |

## Offene Punkte / mögliche nächste Schritte

- Anschlussdaten der meistgenutzten Geräte prüfen und in der DB pflegen
- Anbindung Datenbank-Agent (Route, Authentifizierung, Antwortformat klären)
- Pläne zentral im Rex-System speichern statt als Datei
- Kabelnummern/-längen und Kabeltyp je Verbindung (für die Kabelliste)
- Externe Einspeisungen („Feed from Expo Hall“) als eigene Elemente
- Mehrere Blätter pro Plan
- Echte Gerätegrafiken (Phase 2) nach Nutzungshäufigkeit ergänzen
- Anbindung an den Rack-Planer (gleiche Geräte, gleiche Library)

## Quelle

Repository `rex-solution/test-123`, Branch `claude/test-qb7mrf`,
Dateien `signalplaner.html` und `signalplaner-konzept.md`.
