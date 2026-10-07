# LED-Planer – Konzept & Fahrplan (Stand: Konzeptphase, Runde 2)

Modul im Rex-System zur vollständigen Planung von LED-Wänden: Aufbau, Strom,
Signal und Ausgabe in einem Projekt. **Dieses Dokument ist reine
Konzeptarbeit – es wird noch nichts gebaut.** Grundlage sind die
Abstimmungen vom 07.10.2026 und die Erfahrungen aus dem Prototyp
`ledraster.html` (LED-Raster-Generator v2).

## 1. Arbeitsablauf

```
 1 AUFBAU            2 STROM                 3 SIGNAL                 4 AUSGABE
 Screen anlegen  →   Gesamtlast sehen    →   Prozessoren wählen   →   Zuspieler-Outputs anlegen
 Modultypen          Verteiler und            (nur passende zu den      (z.B. 2× 4K, 2× Full HD)
 Position/Höhe       Zuleitungen (Laka        Modulen)                  Outputs ↔ Prozessor-Eingänge
 geflogen/gestellt   + Spinne oder CEE)       Stagebox oder Multicore   Ausschnitt → Fläche auf
 Module per Drag &   Stromwege: Vorschlag     Ports: Vorschlag oder     der Wand (1:1)
 Drop setzen         oder Pinsel              Pinsel, Backup gespiegelt Testbild je Output + Live
                     Liste: Anschlüsse+Last   Liste: Portauslastung
                     Übersicht Verteiler
```

Die vier Bereiche sind **freie Reiter** mit Ampel. Man kann jederzeit
zurückspringen, die Reihenfolge oben ist der empfohlene Weg.

## 2. Getroffene Entscheidungen

| Thema | Entscheidung |
| --- | --- |
| Plattform | Erst **eigenständige Datei** (wie Signalfluss-Planer) mit eingebauter Library; Datenstrukturen von Anfang an so, dass Library und Projekte später aus dem **Datenbank-Agent** kommen |
| Geräte | Prozessoren, Stageboxen, Stromverteiler gehören zum **Projekt** und können **mehrere Wände** versorgen |
| Bedienung | **Freie Reiter** Aufbau · Strom · Signal · Ausgabe, jeder mit **Ampel** (ok / Warnung / fehlt) |
| Nutzer | Planung im Büro, Techniker vor Ort, Kunde/Angebot |
| Wandbau | **Module einzeln per Drag & Drop** (wie NovaStar COEX), **verschiedene Modultypen in einer Wand**, Einrasten **an Nachbarmodulen** (+ feines mm-Raster) |
| Position | Je Screen **Höhe und Beschreibung** (z.B. „Bühne Mitte, UK 2,50 m“); **Kabellängen von Hand** |
| Library LED-Modul | Grunddaten, Mechanik, Daten-/Strom-Grenzen, Grafik, **Receiving Card** |
| Aufbau | Material **+ Lasten + Riggingplan**; Bauformen gerade, unregelmäßig/Lücken, Kurven/Winkel; 3D später |
| Strom | **Mehrere Ebenen** (Einspeisung → Haupt-/Unterverteiler → Laka mit Spinne oder CEE-Kabel → Wand); Phasen L1/L2/L3; Reserve; **Einschaltstrom**-Prüfung |
| Stromwege | **Vorschlag** des Programms oder **Pinsel**: Reihenfolge wird gemalt |
| Verteiler-Übersicht | Last je Phase, Last je Abgang, **Max. und Durchschnitt**; kein automatischer Ausgleich |
| Signal | Prozessor → **Stagebox (aktiv)** oder **Multicore (passiv)** → Wand; Prozessoren nur, wenn **Receiving Card** passt; Standort je Prozessor frei |
| Datenwege | Vorschlag oder Pinsel; **Backup automatisch gespiegelt** mit eigenen Ports |
| Ausgabe | Zuspieler-Outputs mit **Format + Quelle**; Outputs ↔ Prozessor-Eingänge; **Ausschnitt → Fläche, 1:1** |
| Testbild | **Teil der Ausgabe**: Testbild je Output + Live-Ausgabe |
| Prüfungen Ausgabe | Eingangsauflösung, Gesamtkapazität, Anschlussart, Bildrate |
| Signalfluss-Planer | Beide Module **eigenständig nutzbar**; sind **beide freigeschaltet**, lassen sie sich **verknüpfen** (dann kommen Zuspieler aus dem Signalfluss-Plan) |
| Hauptmenü | **Dem Rex-System angepasst** (Vorgaben noch einzuholen) |
| Ausgaben | Pläne (PDF), Listen, Kundenansicht, Rückgabe ans Rex-System |
| Werkzeugleiste | Duplizieren/Spiegeln, Erweitern/Kürzen, Module auswählen, Ausrichten/Maße |
| Freischaltung | Über die **Benutzerverwaltung des Rex-Systems**; bis zur DB-Anbindung ein einfacher Schalter |

## 3. Aufbau der Oberfläche

```
┌──────────────────────────────────────────────────────────────────────┐
│ Hauptmenü (nach Rex-Vorgabe): Projekt · Bearbeiten · Ansicht ·       │
│   Library · Wand · Ausgabe · Hilfe                                   │
├──────────────────────────────────────────────────────────────────────┤
│ Reiter: [Aufbau ●] [Strom ●] [Signal ●] [Ausgabe ●]   (Ampel je Reiter)│
├─────────────┬────────────────────────────────────────┬───────────────┤
│ Projekt-    │ Werkzeugleiste des aktiven Reiters      │ Eigenschaften │
│ baum:       │ (Duplizieren, Spiegeln, Pinsel …)       │ der Auswahl   │
│ · Screens   ├────────────────────────────────────────┤ (Screen,      │
│ · Geräte    │                                        │  Modul, Gerät,│
│ · Outputs   │          Zeichenfläche                 │  Kreis, Port, │
│ · Library   │   (Ansicht je nach Reiter)             │  Output)      │
│   (ziehen)  │                                        │               │
│             ├────────────────────────────────────────┤ Prüfungen /   │
│             │ Liste unten: Anschlüsse + Last (Strom) │ Warnungen     │
│             │ bzw. Ports + Auslastung (Signal)       │               │
└─────────────┴────────────────────────────────────────┴───────────────┘
```

### Hauptmenü (Inhalte; Form nach Rex-System)
- **Projekt**: Neu, Öffnen, Speichern, Speichern unter, Importieren, Exportieren,
  Drucken/PDF, Projekteinstellungen (Kunde, Veranstaltung, Ersteller, Datum,
  Revision – wie Schriftfeld im Signalfluss-Planer)
- **Bearbeiten**: Rückgängig/Wiederholen, Kopieren/Einfügen, Löschen, Auswahl
- **Ansicht**: Zoom, Einpassen, Raster, Vorder-/Rückansicht
- **Library**: öffnen, durchsuchen, eigene Einträge (bis DB-Anbindung)
- **Wand**: neuer Screen, Vorlagen, duplizieren, löschen
- **Ausgabe**: Pläne, Listen, Kundenansicht, Live-Ausgabe, an Rex übergeben
- **Hilfe**

### Werkzeugleiste über der Wand
Gemeinsam für alle Reiter:

| Werkzeug | Wirkung |
| --- | --- |
| Duplizieren | Screen oder Auswahl kopieren (mit/ohne Strom- und Signalzuordnung) |
| Spiegeln ↔ / ↕ | z.B. linke Seitenwand → rechte; Wege und Startpunkte werden mitgespiegelt |
| Erweitern / Kürzen | Reihe/Spalte des gewählten Modultyps an einer Seite anfügen oder entfernen |
| Module auswählen | Einzelne Module oder Bereich markieren → löschen (Lücke), Typ tauschen, verschieben |
| Ausrichten / Maße | Module und Screens ausrichten, Abstände und Maßketten ein-/ausblenden |

Zusätzlich je Reiter:
- *Aufbau*: Library-Modul in die Wand ziehen, geflogen/gestellt, Bumper/Stützen.
- *Strom*: **Pinsel** (Abgang wählen → über Module malen), Vorschlag erzeugen, Weg löschen.
- *Signal*: **Pinsel** (Port wählen → über Module malen), Vorschlag erzeugen, Backup ein/aus.
- *Ausgabe*: Ausschnitt ziehen, Output zuweisen, Testbild-Optionen, Live-Ausgabe.

## 4. Library

Eine Library mit Kategorien. Bis zur DB-Anbindung eingebaut (plus eigene
Einträge im Projekt), danach Material-Einträge des Rex-Systems mit dem
flexiblen JSON-Feld `attribute` – wie beim Signalfluss-Planer.

| Kategorie | Wichtige Eigenschaften |
| --- | --- |
| **LED-Modul** | Pixel B×H, Maße mm, Pitch, Gewicht, Leistung max./Ø, Einschaltstrom; **Receiving Card** (Typ/Familie); Anschlüsse Strom/Daten (ein/aus, Steckertyp); max. Module je Strombrücke und je Datenstrang; max. Anzahl geflogen untereinander / gestellt übereinander; Verbindungsart, mögliche Winkel; Grafik vorne/hinten |
| **Prozessor** | **unterstützte Receiving Cards**; Eingänge (Anschlussart, max. Auflösung, Bildraten); Ausgangs-Ports (Anzahl, Pixel je Port); Gesamtkapazität; Backup-Fähigkeit; Leistung, HE/Gewicht |
| **Stagebox** (aktiv) | Eingänge (z.B. Glasfaser), Ausgangs-Ports, Kapazität, **Leistung** (taucht im Strom auf) |
| **Multicore** (passiv) | Anzahl Adern/Ports, Steckertyp, Längen, Auflösung an der Wand |
| **Stromverteiler** | Einspeisung (CEE 16/32/63/125 A, Laka), Abgänge (Anzahl, Typ, Absicherung, Charakteristik B/C, Phase), FI |
| **Laka / Spinne** | Pole/Kreise je Laka, Längen, Spinne (Abgänge, Steckertyp) |
| **Bracket / Bumper / Stacking** | Typ, passende Module, Breite in Modulen, Eigengewicht, zulässige Last, Aufhängepunkte |
| **Kabel** | Art (Cat6/Ethercon, Glasfaser, PowerCON TRUE1, CEE, HDMI/DP/SDI), verfügbare Längen |

Fehlende Daten werden wie im Signalfluss-Planer abgefangen: Platzhalter mit
Warnung statt Abbruch.

## 5. Datenmodell (Skizze)

```
Projekt
 ├─ Einstellungen (Kunde, Veranstaltung, Ersteller, Revision, Datum …)
 ├─ Geräte[]          projektweit: Einspeisung, Stromverteiler (mit Ebene/Elternteil),
 │                    Prozessor (Standort), Stagebox, Zuspieler (einfach oder aus Signalfluss-Plan)
 ├─ Screens[]
 │   ├─ Beschreibung, Höhe (Unterkante), geflogen | gestellt
 │   ├─ Module[]      { Library-Typ, Position x/y in mm, Pixel-Lage im Screen }
 │   │                → frei platziert, gemischte Typen, Lücken einfach „kein Modul“
 │   ├─ Aufbau:       Bumper/Stützen[], Aufhängepunkte[] mit Last
 │   ├─ Strom:        Kreise[] { Abgang, Laka/Kabel, Module in gemalter Reihenfolge }
 │   └─ Signal:       Stränge[] { Port (Prozessor/Stagebox), Module in Reihenfolge, Backup-Port }
 ├─ Outputs[]         { Name, Auflösung, Bildrate, Anschluss, Zuspieler }
 ├─ Verbindungen[]    Einspeisung → Verteiler → Laka/Kabel → Screen
 │                    Prozessor → Stagebox/Multicore → Screen
 │                    Output → Prozessor-Eingang (mit Kabelart/-länge)
 ├─ Zuordnungen[]     { Output, Ausschnitt x/y/b/h → Screen, Fläche x/y } (1:1)
 └─ Verknüpfung       optional: Referenz auf Signalfluss-Plan (nur wenn freigeschaltet)
```

Wichtige Änderung gegenüber dem Prototyp: Ein Screen ist **kein Raster
Spalten × Zeilen** mehr, sondern eine Menge einzeln platzierter Module.
Erweitern/Kürzen und Vorschläge arbeiten trotzdem zeilen- bzw.
spaltenweise, indem sie Module nach ihrer Lage gruppieren.

Speicherformat als JSON wie die übrigen Module (`format`, `version`,
`gespeichert`, `projekt`) mit Versionsnummer und Migration.

## 6. Die vier Bereiche

### 6.1 Aufbau
- Neuer Screen: Name, Beschreibung, Höhe, **geflogen oder gestellt**.
- Module aus der Library **per Drag & Drop** setzen; Einrasten an Kanten und Ecken der Nachbarmodule; **verschiedene Typen** in einer Wand (z.B. 500×1000 und 500×500 gemischt).
- Werkzeuge: Erweitern/Kürzen, Spiegeln, Duplizieren, Auswahl → Lücke/Typ tauschen.
- Pixel-Lage jedes Moduls ergibt sich aus der Position (wichtig für Signal und Ausgabe); Warnung, wenn gemischte Typen unterschiedliche Pitches haben.
- Geflogen: Bumper/Flugrahmen, Aufhängepunkte, **Last je Punkt**, Prüfung max. Module untereinander.
- Gestellt: Stacking/Bodenstützen, **Bodenlast**, Prüfung max. Höhe.
- **Riggingplan** mit Punkten, Abständen, Lasten. Hinweis: *Ersetzt keine Statik.*
- Kurven/Winkel später als Abwicklung + Draufsicht.

### 6.2 Strom
- Oben sofort sichtbar: **Gesamtlast** (max./Ø) und Beschreibung/Höhe jedes Screens.
- Stromverteiler aus der Library wählen, **mehrere Ebenen** (Einspeisung → Haupt- → Unterverteiler).
- Zuleitungen: **Laka mit Spinne** (ein Kabel, mehrere Kreise) oder **CEE-Kabel**; Länge von Hand.
- Stromwege: **Vorschlag** (Schlangenlinie, Startecke, ausgewogen – aus dem Prototyp) oder **Pinsel**: Abgang wählen, mit gedrückter Maus über die Module fahren; die Reihenfolge des Malens ist die Reihenfolge der Brücken. Laufende Last-Anzeige, Warnung bei Überschreitung (Watt und max. Module je Brücke).
- **Liste unten**: jeder Anschluss mit Verteiler, Abgang, Phase, Laka/Spinne, Modulen, Last max./Ø, Auslastung.
- **Übersicht alle Stromverteiler**: Last je Phase (A und %), Last je Abgang, Max. und Durchschnitt, Schieflast-Warnung.
- Geräte (Prozessoren, **Stageboxen**) erscheinen als Verbraucher.
- **Einschaltstrom**: Warnung, wenn ein Automat zu klein ist → Hinweis auf C-Charakteristik oder Staffelung.

### 6.3 Signal
- Zuerst **Prozessoren** wählen: Die Auswahl zeigt **nur Prozessoren, deren Sendekarten zur Receiving Card der Module passen**. Bei gemischten Modultypen müssen alle Module des Screens passen.
- Je Prozessor ein **Standort** (Regie/FOH, Bühne, hinter der Wand …).
- Je Screen: **Stagebox** (aktiv, braucht Strom) oder **Multicore** (passiv, mit Auflösung) oder direkt.
- Datenwege: **Vorlage** des Programms oder **Pinsel** (Port wählen → Module malen), wie beim Strom.
- **Backup automatisch gespiegelt**: Zu jedem Strang ein Rückweg vom letzten Modul, auf eigenem Port.
- **Liste unten**: jeder Port (Haupt/Backup) mit Gerät, Strang, Modulen, Pixeln, **Portauslastung**.
- Kabelarten und Längen je Strecke, **Prozessor-Übersicht** zum Abtippen (Port → Startposition, Modulreihenfolge); Hersteller-Dateien später.

### 6.4 Ausgabe
- **Outputs anlegen**: Name, Auflösung, Bildrate, Anschluss, Zuspieler (z.B. „Medienserver 1 · Out 2 · 3840×2160 · 50p · HDMI 2.0“). Mit verknüpftem Signalfluss-Planer kommen die Zuspieler von dort.
- Outputs mit **Prozessor-Eingängen** verbinden.
- Am Prozessor festlegen, **welcher Ausschnitt eines Outputs auf welcher Fläche der Wand** erscheint: Rechteck im Output ziehen → auf den Screen legen, **1:1 ohne Skalierung**, Warnung bei Größenabweichung.
- **Testbild je Output** (aus dem Prototyp): zeigt genau, welcher Ausschnitt auf welchem Screen landet. PNG-Export und **Live-Ausgabe** je Output mit wandernden Cursorn.
- Prüfungen: **Eingangsauflösung**, **Gesamtkapazität** des Prozessors, **Anschlussart** (Konverter nötig?), **Bildrate**.

## 7. Prüfungen (Ampel je Reiter)

| Reiter | Beispiele |
| --- | --- |
| Aufbau | Last je Punkt überschritten · zu viele Module untereinander · Bracket passt nicht · unterschiedliche Pitches in einem Screen |
| Strom | Kreis überlastet · zu viele Module an einer Brücke · Schieflast · Einschaltstrom · Modul ohne Kreis · Verteiler-Ebene überlastet |
| Signal | Kein passender Prozessor · Port überlastet · Strang zu lang · Modul ohne Port · Backup fehlt · Kabel zu lang (z.B. Cat > 100 m) |
| Ausgabe | Output zu groß für den Eingang · Prozessor-Kapazität überschritten · Anschluss passt nicht · Bildraten unterschiedlich · Wandfläche ohne Bild · Ausschnitt ≠ Fläche |

## 8. Ausgaben

| Ausgabe | Inhalt | Für |
| --- | --- | --- |
| Aufbau-/Riggingplan (PDF) | Ansicht, Module, Punkte, Lasten, Maße | Rigger, Statiker, Techniker |
| Stromplan (PDF) | Verteiler-Ebenen, Laka/Spinnen, Kreise, Phasen | Elektrofachkraft, Techniker |
| Signalplan (PDF) | Prozessoren, Stageboxen/Multicores, Ports, Stränge, Backup | Techniker |
| Ausgabeplan (PDF/PNG) | Outputs, Eingänge, Ausschnitte → Flächen, Testbilder | Techniker, Medienserver |
| Listen | Material/Packliste, Kabelliste, Lastenliste, Phasenübersicht, Prozessor-Übersicht | Büro, Techniker |
| Kundenansicht | Ansicht, Maße, Auflösung, Fläche, Leistung – ohne Technikdetails | Angebot, Freigabe |
| Rückgabe ans Rex-System | Material als Auftragsposition/Reservierung | Disposition (Phase 3) |

Alle Pläne mit Schriftfeld (Projekt, Kunde, Ersteller, Revision, Datum) wie im
Signalfluss-Planer.

## 9. Verknüpfung mit dem Signalfluss-Planer & Freischaltung

- **Nur LED-Planer freigeschaltet**: voll nutzbar; Zuspieler werden im LED-Planer einfach angelegt.
- **Beide freigeschaltet**: „Mit Signalfluss-Plan verknüpfen“. Zuspieler/Outputs kommen aus dem Signalfluss-Plan, Prozessoren und Stageboxen erscheinen dort als Geräte (Abgleich siehe offene Fragen).
- Freischaltung aus der Rex-Benutzerverwaltung; bis dahin ein Schalter in den Einstellungen.

## 10. Was aus dem Prototyp übernommen wird

`ledraster.html` (v2): Testbild-Generator mit Live-Ausgabe (→ Ausgabe) ·
Schlangenlinien-Vorschlag mit ausgewogener Segmentierung (→ Vorschlag bei
Strom und Signal) · Physik (m², kg, W, A) · Rückgängig/Wiederholen · Bericht
als Druck/PDF · Projektformat mit Migration.
Neu zu konzipieren: Modul-Editor mit freier Platzierung und gemischten
Typen, Pinsel, mehrstufige Stromverteilung, Prozessor-Kompatibilität,
Output-Zuordnung, Rex-Oberfläche.

## 11. Fahrplan

Angepasst an den Ablauf: Die Ausgabe braucht Prozessoren (Signal). Darum
kommen Signal und Ausgabe zusammen in Phase 2. Das Testbild je Screen gibt
es aber schon in Phase 1.

| Phase | Inhalt | Ergebnis |
| --- | --- | --- |
| **0 · Klärung** | Rex-Bedienvorgaben einholen · Library-Format mit Datenbank-Agent abstimmen · echte Beispieldaten (Module mit Receiving Card, Prozessoren, Stagebox, Verteiler, Laka/Spinne, Brackets) · Ampel-Regeln und Grenzwerte · Skizzen der vier Reiter inkl. Pinsel und Listen | Freigegebenes Konzept, Datenformat, Skizzen |
| **1 · Aufbau-Editor + Strom** | Hauptmenü, Projekte · eingebaute Library · **Modul-Editor** (Drag & Drop, Einrasten, gemischte Typen, Lücken) · Werkzeugleiste · Screen-Daten (Höhe, Beschreibung, geflogen/gestellt) · **Strom komplett** (Verteiler-Ebenen, Laka/CEE, Vorschlag + Pinsel, Liste, Verteiler-Übersicht, Phasen, Einschaltstrom) · Testbild + Live je Screen · Stromplan-PDF, Materialliste, Kundenansicht | Nutzbar für Wand- und Stromplanung |
| **2 · Signal + Ausgabe + Rigging** | Prozessoren/Stageboxen/Multicores in der Library · **Signal** (Kompatibilität, Standorte, Vorschlag + Pinsel, Backup gespiegelt, Portliste, Prozessor-Übersicht) · **Ausgabe** (Outputs, Eingänge, Ausschnitt → Fläche, Testbild je Output, Prüfungen) · **Aufbau-Lasten und Riggingplan** · Signal-, Ausgabe- und Riggingplan-PDF | Vollständige Planung aller vier Bereiche |
| **3 · Rex-Anbindung** | Library aus dem Datenbank-Agent · Projekte in der Datenbank · Rückgabe Material ans Rex-System · Freischaltung über Benutzerverwaltung · Verknüpfung mit dem Signalfluss-Planer | Integriertes Rex-Modul |
| **4 · Erweiterungen** | Kurven/Winkel · Hersteller-Dateien (NovaLCT, Colorlight – mit Beispieldateien) · Skalierung in der Ausgabe · Medienserver-Exporte · 3D-Ansicht | Nach Bedarf |

## 12. Offene Fragen

1. **Rex-Oberfläche**: Gibt es einen Styleguide oder Screenshots (Menü, Dialoge, Farben)?
2. **Bestand**: Welche LED-Module (mit Receiving Card), Prozessoren, Stageboxen, Multicores, Verteiler, Lakas/Spinnen und Brackets habt ihr konkret?
3. **Werte**: Herstellerdatenblätter für Einschaltstrom, max. Module je Brücke/Strang, Lasten vorhanden?
4. **Strom**: Übliche Einspeisungen und Hausregeln (Reserve, max. Schieflast)?
5. **Aufbau**: Wer gibt Riggingpläne frei, welche Angaben braucht der Statiker/Rigger?
6. **Vor Ort**: Arbeitet der Techniker am Tablet (Touch, Pinsel mit Finger) und offline?
7. **Verknüpfung**: Wer ist führend, wenn Prozessor- oder Zuspielerdaten in beiden Modulen geändert werden?
8. **Mehrbenutzer**: Arbeiten mehrere Personen gleichzeitig am selben Projekt?
9. **Name** des Moduls (Arbeitstitel „LED-Planer“).
10. **Prototyp**: Bleibt `ledraster.html` als eigenständiges Testbild-Werkzeug für Kunden ohne LED-Planer, oder geht es ganz in der Ausgabe auf?
11. **Text Punkt 1**: „wenn die Wände. wichtig.“ – fehlt hier noch ein Gedanke?
12. **Gemischte Module**: Dürfen in einem Screen Module mit **unterschiedlichem Pitch** stecken (z.B. Bühne P2.6 und Seiten P3.9), oder nur gleicher Pitch in verschiedenen Größen?
