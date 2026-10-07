# LED-Planer – Konzept & Fahrplan (Stand: Konzeptphase)

Modul im Rex-System zur vollständigen Planung von LED-Wänden: Aufbau, Strom,
Signal und Mapping in einem Projekt. **Dieses Dokument ist reine Konzeptarbeit –
es wird noch nichts gebaut.** Grundlage sind die Abstimmung vom 07.10.2026 und
die Erfahrungen aus dem Prototyp `ledraster.html` (LED-Raster-Generator v2).

## 1. Getroffene Entscheidungen

| Thema | Entscheidung |
| --- | --- |
| Plattform | Erst **eigenständige Datei** (wie Signalfluss-Planer) mit eingebauter Library; Datenstrukturen von Anfang an so, dass Library und Projekte später aus dem **Datenbank-Agent** kommen |
| Geräte | Prozessoren, Stageboxen, Stromverteiler gehören zum **Projekt** und können **mehrere Wände** versorgen |
| Bedienung | **Freie Reiter** Aufbau · Strom · Signal · Mapping, jeder mit **Ampel** (ok / Warnung / fehlt) |
| Nutzer | Planung im Büro, Techniker vor Ort, Kunde/Angebot |
| Library LED-Modul | Grunddaten, Mechanik, Daten-/Strom-Grenzen, Grafik |
| Aufbau | Material **+ Lasten + Riggingplan** |
| Bauformen | Gerade Fläche, unregelmäßig/Lücken, Kurven/Winkel |
| 3D | Später, nicht im Kern – Kurven zunächst als Abwicklung + Draufsicht |
| Strom | Drehstrom mit **Phasenverteilung** (L1/L2/L3), Reserve je Kreis, **Einschaltstrom**-Prüfung; Wege **automatisch + von Hand** |
| Signal | **Prozessor → Stagebox → Wand**; Redundanz, Kabelarten/-längen, Prozessor-Übersicht, später Hersteller-Dateien |
| Signalfluss-Planer | Beide Module **eigenständig nutzbar**; sind **beide freigeschaltet**, lassen sie sich **verknüpfen** |
| Mapping | Testbilder + Live-Ausgabe (weitere Mapping-Funktionen als Option für später) |
| Hauptmenü | **Dem Rex-System angepasst** (Vorgaben noch einzuholen) |
| Ausgaben | Pläne (PDF), Listen, Kundenansicht, Rückgabe ans Rex-System |
| Erste Version | **Wand + Strom + Mapping**; Aufbau und Signal in Phase 2 |
| Werkzeugleiste | Duplizieren/Spiegeln, Erweitern/Kürzen, Module auswählen, Ausrichten/Maße |
| Freischaltung | Über die **Benutzerverwaltung des Rex-Systems**; bis zur DB-Anbindung ein einfacher Schalter |

## 2. Aufbau der Oberfläche

```
┌──────────────────────────────────────────────────────────────────────┐
│ Hauptmenü (nach Rex-Vorgabe): Projekt · Bearbeiten · Ansicht ·       │
│   Library · Wand · Ausgabe · Hilfe                                   │
├──────────────────────────────────────────────────────────────────────┤
│ Reiter: [Aufbau ●] [Strom ●] [Signal ●] [Mapping ●]   (Ampel je Reiter)│
├─────────────┬────────────────────────────────────────┬───────────────┤
│ Projekt-    │ Werkzeugleiste des aktiven Reiters      │ Eigenschaften │
│ baum:       │ (Duplizieren, Spiegeln, Erweitern …)    │ der Auswahl   │
│ · Wände     ├────────────────────────────────────────┤ (Wand, Modul, │
│ · Geräte    │                                        │  Gerät, Kreis,│
│ · Library   │          Zeichenfläche                 │  Port)        │
│   (ziehen)  │   (Ansicht je nach Reiter)             │               │
│             │                                        │ Prüfungen /   │
│             │                                        │ Warnungen     │
└─────────────┴────────────────────────────────────────┴───────────────┘
```

### Hauptmenü (Inhalte; Form nach Rex-System)
- **Projekt**: Neu, Öffnen, Speichern, Speichern unter, Importieren, Exportieren,
  Drucken/PDF, Projekteinstellungen (Kunde, Veranstaltung, Ersteller, Datum,
  Revision – wie Schriftfeld im Signalfluss-Planer)
- **Bearbeiten**: Rückgängig/Wiederholen, Kopieren/Einfügen, Löschen, Auswahl
- **Ansicht**: Zoom, Einpassen, Raster, Vorder-/Rückansicht, Draufsicht
- **Library**: öffnen, durchsuchen, eigene Einträge (bis DB-Anbindung)
- **Wand**: neue Wand, Wand-Vorlagen, duplizieren, löschen
- **Ausgabe**: Pläne, Listen, Kundenansicht, Live-Ausgabe, an Rex übergeben
- **Hilfe**

### Werkzeugleiste über der Wand
Sie zeigt die Werkzeuge des aktiven Reiters. Gemeinsam für alle Reiter:

| Werkzeug | Wirkung |
| --- | --- |
| Duplizieren | Wand oder Auswahl kopieren (mit/ohne Strom- und Signalzuordnung) |
| Spiegeln ↔ / ↕ | z.B. linke Seitenwand → rechte Seitenwand; Startecken spiegeln mit |
| Erweitern / Kürzen | Spalte/Zeile an einer gewählten Seite hinzufügen oder entfernen |
| Module auswählen | Einzelne Module oder Rechteck-Bereich markieren → löschen (Lücke), Typ tauschen, Kreis/Port zuweisen |
| Ausrichten / Maße | Wände zueinander ausrichten, Abstände, Maßketten ein-/ausblenden |

Zusätzlich je Reiter: *Aufbau* – geflogen/gestellt, Aufhängepunkte setzen;
*Strom* – Kreis zuweisen, Weg neu legen, Verteiler zuordnen; *Signal* – Port
zuweisen, Backup-Weg, Stagebox einfügen; *Mapping* – Testbild-Optionen,
Live-Ausgabe.

## 3. Library

Eine Library mit Kategorien. Bis zur DB-Anbindung eingebaut (plus eigene
Einträge im Projekt), danach Material-Einträge des Rex-Systems mit dem
flexiblen JSON-Feld `attribute` – wie beim Signalfluss-Planer.

| Kategorie | Wichtige Eigenschaften |
| --- | --- |
| **LED-Modul** | Pixel B×H, Maße mm, Pitch, Gewicht, Leistung max./Ø, Einschaltstrom; Anschlüsse Strom/Daten (ein/aus, Steckertyp); max. Module je Strombrücke und je Datenstrang; max. Anzahl geflogen untereinander / gestellt übereinander; Verbindungsart, mögliche Winkel; Grafik vorne/hinten; halbe Varianten als eigene Einträge |
| **Prozessor** | Eingänge (Typ, Auflösung), Ausgangs-Ports (Anzahl, Pixel je Port), Backup-Fähigkeit, Leistung, HE/Gewicht |
| **Stagebox** | Eingänge (z.B. Glasfaser), Ausgangs-Ports, Kapazität, Leistung |
| **Stromverteiler** | Einspeisung (CEE 16/32/63/125 A), Abgänge (Anzahl, Typ, Absicherung, Charakteristik B/C, Phase), FI |
| **Bracket / Bumper / Stacking** | Typ (Flugrahmen, Bodenstütze, Stacking-Rahmen), passende Module, Breite in Modulen, Eigengewicht, zulässige Last, Aufhängepunkte |
| **Kabel** (implizit) | Art (Cat6/Ethercon, Glasfaser, PowerCON TRUE1, CEE), verfügbare Längen |

Fehlende Daten werden wie im Signalfluss-Planer abgefangen: Platzhalter mit
Warnung statt Abbruch.

## 4. Datenmodell (Skizze)

```
Projekt
 ├─ Einstellungen (Kunde, Veranstaltung, Ersteller, Revision, Datum …)
 ├─ Geräte[]          projektweit: Prozessor, Stagebox, Stromverteiler, Einspeisung
 ├─ Wände[]
 │   ├─ Modultyp (Library-Referenz), Raster Spalten × Zeilen,
 │   │  Zellen[] (Modul / leer / Sondertyp) – für Lücken und Mischungen
 │   ├─ Aufbau:  Art (geflogen | gestellt), Brackets[], Aufhängepunkte[] / Stützen[],
 │   │           Lage im Raum (Position, Höhe, Winkel – später Kurven)
 │   ├─ Strom:   Kreise[] (Module, Abgang am Verteiler, Phase, Weg)
 │   ├─ Signal:  Stränge[] (Module, Port an Prozessor/Stagebox, Backup-Port, Weg)
 │   └─ Mapping: Lage im Inhalt / am Ausgang, Testbild-Optionen
 ├─ Verbindungen[]     Einspeisung → Verteiler, Prozessor → Stagebox → Wand (mit Kabelart/-länge)
 └─ Verknüpfung        optional: Referenz auf Signalfluss-Plan (nur wenn freigeschaltet)
```

Speicherformat als JSON wie die übrigen Module (`format`, `version`,
`gespeichert`, `projekt`) mit Versionsnummer und Migration.

## 5. Die vier Bereiche

### 5.1 Aufbau (Phase 2)
- Geflogen: Bumper/Flugrahmen automatisch je Modulbreite, Aufhängepunkte, **Last je Punkt** (Module + Bumper + Kabelanteil), Prüfung gegen max. Module untereinander und zulässige Last.
- Gestellt: Stacking/Bodenstützen, **Bodenlast**, Prüfung max. Höhe.
- **Riggingplan**: Ansicht mit Punkten, Abständen, Lasten; Draufsicht. Für Rigger und Statiker.
- Kurven/Winkel: Winkel zwischen Spalten, Darstellung als Abwicklung + Draufsicht (Phase 4).
- Hinweis im Plan: *Ersetzt keine Statik; Freigabe durch fachkundige Person.*

### 5.2 Strom (Phase 1)
- Einspeisung → Stromverteiler (Library) → Abgänge → Kreise in der Wand.
- Automatische Kreisbildung (Schlangenlinie, Startecke, ausgewogen – aus dem Prototyp), danach **von Hand** anpassen.
- Grenzen: Leistung je Kreis (A × V × (1 − Reserve)) **und** max. Module je Strombrücke laut Hersteller.
- **Phasenverteilung** L1/L2/L3 automatisch mit Schieflast-Anzeige; Geräte (Prozessor, Stagebox) als Verbraucher.
- **Einschaltstrom**: Warnung, wenn Summe am Automaten zu hoch → Hinweis auf C-Charakteristik oder gestaffeltes Einschalten.
- Ausgaben: Stromplan, Phasenübersicht, Kabelliste Strom.

### 5.3 Signal (Phase 2)
- Prozessor → (Stagebox) → Datenstränge in der Wand; Kapazität je Port aus der Library.
- Automatische Strangbildung wie beim Strom, plus Grenze „max. Module je Strang“; manuelles Umlegen.
- **Redundanz**: Backup-Strang (z.B. von der letzten Kachel zurück), eigener Port, eigenes Kabel.
- **Kabelarten und Längen** je Strecke, Längen aus dem Aufbau (Höhe, Position der Geräte) statt geschätzt.
- **Prozessor-Übersicht**: je Port Startposition x/y, Modulreihenfolge, Auflösung – zum Abtippen in die Prozessor-Software.
- **Hersteller-Dateien** (NovaLCT, Colorlight …): erst mit Beispieldateien, Phase 4.

### 5.4 Mapping (Phase 1)
- Testbilder je Wand (aus dem Prototyp: Paletten, Nummern, Kreis, Marker …), PNG-Export.
- Live-Ausgabe 1:1 mit wandernden Cursorn, Bildschirmwahl.
- Später optional: mehrere Ausgänge, Inhalt vs. Ausgang mit Drehung, Medienserver-Exporte.

## 6. Prüfungen (Ampel je Reiter)

| Reiter | Beispiele für Warnungen / Fehler |
| --- | --- |
| Aufbau | Last je Punkt überschritten · zu viele Module untereinander · Bracket passt nicht zum Modul |
| Strom | Kreis überlastet · zu viele Module an einer Brücke · Schieflast > x % · Einschaltstrom zu hoch · Wand ohne Verteiler |
| Signal | Port überlastet · Strang zu lang · kein Backup trotz Vorgabe · Kabel länger als zulässig (z.B. Cat > 100 m) |
| Mapping | Wand außerhalb des Ausgangs · Überlappung · Auflösung des Prozessor-Eingangs überschritten |

## 7. Ausgaben

| Ausgabe | Inhalt | Für |
| --- | --- | --- |
| Aufbau-/Riggingplan (PDF) | Ansicht, Punkte, Lasten, Maße | Rigger, Statiker, Techniker |
| Stromplan (PDF) | Kreise, Verteiler, Phasen | Elektrofachkraft, Techniker |
| Signalplan (PDF) | Prozessor, Stagebox, Ports, Stränge, Backup | Techniker |
| Mapping (PDF/PNG) | Testbilder, Lage am Ausgang | Techniker, Medienserver |
| Listen | Material/Packliste, Kabelliste, Lastenliste, Phasenübersicht, Prozessor-Übersicht | Büro, Lager, Techniker |
| Kundenansicht | Ansicht, Maße, Auflösung, Fläche, Leistung – ohne Technikdetails | Angebot, Freigabe |
| Rückgabe ans Rex-System | Material als Auftragsposition/Reservierung | Disposition (Phase 3) |

Alle Pläne mit Schriftfeld (Projekt, Kunde, Ersteller, Revision, Datum) wie im
Signalfluss-Planer.

## 8. Verknüpfung mit dem Signalfluss-Planer & Freischaltung

- **Nur LED-Planer freigeschaltet**: voll nutzbar; Signal endet am Prozessor-Eingang.
- **Beide freigeschaltet**: Knopf „Mit Signalfluss-Plan verknüpfen“. Prozessoren und Stageboxen erscheinen als Geräte im Signalfluss-Plan; Änderungen werden abgeglichen (Richtung und Konflikte – siehe offene Fragen).
- Freischaltung kommt aus der Rex-Benutzerverwaltung; bis dahin ein Schalter in den Einstellungen.

## 9. Was aus dem Prototyp übernommen wird

`ledraster.html` (v2) hat schon gezeigt, dass folgendes im Browser ohne
Bibliothek funktioniert und wird als Grundlage genutzt:
Testbild-Generator mit Live-Ausgabe · Schlangenlinien-Verteilung mit
ausgewogener Segmentierung · Physik (m², kg, W, A) · Inhalt/Ausgang ·
Rückgängig/Wiederholen · Bericht als Druck/PDF · Projektformat mit Migration.
Neu zu konzipieren sind vor allem: Modul-Raster mit Lücken, projektweite
Geräte, Phasen, Aufbau/Rigging und die Rex-Oberfläche.

## 10. Fahrplan

| Phase | Inhalt | Ergebnis |
| --- | --- | --- |
| **0 · Klärung** | Rex-Bedienvorgaben (Menü, Farben, Dialoge) einholen · Library-Datenformat mit Datenbank-Agent abstimmen · echte Beispieldaten von 2–3 Modulen, 1–2 Prozessoren, 1 Verteiler, Brackets aus dem Bestand · Ampel-Regeln und Grenzwerte festlegen · Klick-Prototyp (Skizzen) der Oberfläche | Freigegebenes Konzept, Datenformat, Skizzen |
| **1 · Erste Version** | Hauptmenü + Projektverwaltung · eingebaute Library (LED-Module, Stromverteiler) · mehrere Wände je Projekt, Modul-Raster mit Lücken · Werkzeugleiste (Duplizieren/Spiegeln, Erweitern/Kürzen, Auswahl, Ausrichten/Maße) · **Strom** komplett (Verteiler, Phasen, Reserve, Einschaltstrom, auto + manuell) · **Mapping** (Testbilder, Live) · Ampeln · Stromplan-PDF, Materialliste, Kundenansicht | Nutzbar für Planung im Büro und Testbild vor Ort |
| **2 · Aufbau & Signal** | Library um Prozessoren, Stageboxen, Brackets erweitern · **Aufbau** (geflogen/gestellt, Lasten, Riggingplan) · **Signal** (Prozessor → Stagebox → Wand, Redundanz, Kabelarten/-längen aus dem Aufbau, Prozessor-Übersicht) · Signal- und Riggingplan-PDF, Kabel- und Lastenliste | Vollständige Planung aller vier Bereiche |
| **3 · Rex-Anbindung** | Library aus dem Datenbank-Agent · Projekte in der Datenbank · Rückgabe Material ans Rex-System · Freischaltung über Benutzerverwaltung · Verknüpfung mit dem Signalfluss-Planer | Integriertes Rex-Modul |
| **4 · Erweiterungen** | Kurven/Winkel (Abwicklung + Draufsicht) · Hersteller-Dateien (NovaLCT, Colorlight – mit Beispieldateien) · weitere Mapping-Funktionen (mehrere Ausgänge, Drehung, Medienserver-Export) · 3D-Ansicht | Nach Bedarf |

## 11. Offene Fragen (für die nächste Runde)

1. **Rex-Oberfläche**: Gibt es einen Styleguide oder Screenshots (Menü, Dialoge, Farben)?
2. **Bestand**: Welche LED-Module, Prozessoren, Stageboxen, Verteiler und Brackets habt ihr konkret? (für Beispieldaten in Phase 0)
3. **Werte**: Woher kommen Einschaltstrom, max. Module je Brücke/Strang, Lasten? Herstellerdatenblätter vorhanden?
4. **Strom**: Welche Netzformen/Einspeisungen sind üblich (CEE 32/63/125 A)? Gibt es Hausregeln (z.B. Reserve, max. Schieflast)?
5. **Aufbau**: Wer gibt Riggingpläne frei? Welche Angaben braucht euer Statiker/Rigger im Plan?
6. **Vor Ort**: Soll der Techniker am Tablet arbeiten (Touch-Bedienung) und offline?
7. **Verknüpfung**: Wer ist „führend“, wenn Prozessor-Daten in beiden Modulen geändert werden?
8. **Mehrbenutzer**: Arbeiten mehrere Personen gleichzeitig am selben Projekt?
9. **Name** des Moduls (Arbeitstitel „LED-Planer“).
10. **Prototyp**: `ledraster.html` als eigenständiges Testbild-Werkzeug behalten oder später im LED-Planer (Reiter Mapping) aufgehen lassen?
