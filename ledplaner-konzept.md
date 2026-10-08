# LED-Planer – Konzept & Fahrplan (Stand: Konzeptphase, 08.10.2026)

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
| Bedienung | **Freie Reiter** Aufbau · Strom · Signal · Ausgabe · **Kabel**, jeder mit **Ampel** (ok / Warnung / fehlt) |
| Nutzer | Planung im Büro, Techniker vor Ort, Kunde/Angebot |
| Wandbau | **Module einzeln per Drag & Drop** (wie NovaStar COEX), **verschiedene Modultypen in einer Wand** (verschiedene Größen und auch verschiedene Pixelpitches), Einrasten **an Nachbarmodulen** (+ feines mm-Raster) |
| Gemischte Module | Erlaubt im selben Screen. **Ein Datenport/-strang nur mit Modulen derselben Serie und derselben Receiving Card** (damit gleicher Pitch); verschiedene Größen dieser Serie (z.B. 1 × 0,5 m und 0,5 × 0,5 m) dürfen auf denselben Port |
| Position | Je Screen **Höhe und Beschreibung** (z.B. „Bühne Mitte, UK 2,50 m“); **Kabellängen von Hand** |
| Library LED-Modul | Grunddaten, Mechanik, Daten-/Strom-Grenzen, Grafik, **Receiving Card** |
| Aufbau | Material **+ Lasten + Riggingplan**; Bauformen gerade, unregelmäßig/Lücken, Kurven/Winkel; 3D später |
| Strom | **Mehrere Ebenen** (Einspeisung → Haupt-/Unterverteiler → Laka mit Spinne oder CEE-Kabel → Wand); Phasen L1/L2/L3; Reserve; **Einschaltstrom**-Prüfung |
| Stromwege | **Vorschlag** des Programms oder **Pinsel**: Reihenfolge wird gemalt |
| Verteiler-Übersicht | Last je Phase, Last je Abgang, **Max. und Durchschnitt**; kein automatischer Ausgleich |
| Signal | Prozessor → **Stagebox (aktiv)** oder **Multicore (passiv)** → Wand, beide als **eigene Geräte** aus der Library mit Port-Zuordnung (übrige Ports direkt per Cat); Prozessoren nur, wenn **Receiving Card** passt; Standort je Prozessor frei |
| Datenwege | Vorschlag oder Pinsel; **Backup** automatisch auf eigenem Port, **gleicher Weg** wie der Hauptweg, eingespeist am Strangende; in der Zeichnung nur Marke „B1“ am Endpunkt |
| Ausgabe | Zuspieler-Outputs mit **Format + Quelle**; Outputs ↔ Prozessor-Eingänge; **Ausschnitt → Fläche**, Standard 1:1, Skalierung möglich; **Layer gezählt** mit Grenze je Prozessor |
| Signal-Mapping | Pixelraum je Prozessor: **Vorschlag nach physischer Lage, frei verschiebbar**; mehrere Prozessoren je Screen möglich |
| Gemischter Pitch | **Immer 1:1**: eigener Ausschnitt je Pitch-Bereich, keine gemeinsame Skalierung (Entscheidung 10/2026) |
| Sonderfälle Ausgabe | Ein Output → mehrere Screens · mehrere Outputs → ein Screen · mehrere Prozessoren je Screen · gleiches Bild doppelt |
| Testbild | **Teil der Ausgabe**: Testbild je Output + Live-Ausgabe |
| Prüfungen Ausgabe | Eingangsauflösung, Gesamtkapazität, Anschlussart, Bildrate |
| Signalfluss-Planer | Beide Module **eigenständig nutzbar**; sind **beide freigeschaltet**, lassen sie sich **verknüpfen** (dann kommen Zuspieler aus dem Signalfluss-Plan) |
| Oberfläche | **Rex-Styleguide** (`rex-styleguide.md`): dunkel, Kopfleiste mit Hauptreitern **Planen · Library · Einstellungen**, Library als Manager-Ansicht |
| Ausgaben | Pläne (PDF), Listen, Kundenansicht, Rückgabe ans Rex-System |
| Druckformat | Standard **A4 hoch**; zusätzlich alle Pläne als **A4 quer oder A3 quer** |
| Farben Strom/Signal | **Interne freie Farben** für Kreise, Ports und Phasen erlaubt (Palette in Abschnitt 3) |
| Werkzeugleiste | Duplizieren/Spiegeln, Erweitern/Kürzen, Module auswählen, Ausrichten/Maße |
| Übersichten | Strom: Ansicht **„Alle Verteiler“** (Phasen, Kanäle je Ausgang, Einspeisung); Signal: Ansicht **„Alle Prozessoren“** (Ports, Eingänge, Pixel, Layer) |
| Kabel | Eigener Reiter **Kabel**: jede Verbindung mit **Kabeltyp, Länge, Anzahl, Von, Nach**; bearbeitbar in der Liste und beim angeklickten Kabel; Zusammenfassung nach Typ und Länge als Packliste |
| Freischaltung | Über die **Benutzerverwaltung des Rex-Systems**; bis zur DB-Anbindung ein einfacher Schalter |
| Name | **LED-Planer** |
| Geräte vor Ort | **Laptop** (Maus/Tastatur) und **Tablet** (Touch, seit 10/2026), muss **offline** funktionieren |
| Führung bei Verknüpfung | **Geteilt**: LED-Planer führend für Prozessoren, Stageboxen, Ports; Signalfluss-Planer führend für Zuspieler und Outputs; im jeweils anderen Modul nur lesbar bzw. als Vorschlag |
| Mehrbenutzer | **Nacheinander mit Sperre** („wird gerade von X bearbeitet“), andere lesen; ab DB-Anbindung |
| Prototyp | `ledraster.html` dient **nur als Referenz**; der LED-Planer wird neu geschrieben |
| Einspeisungen | CEE 16 A, 32 A, 63 A, 125 A, **Powerlock/Aggregat** |
| Hausregeln Strom | **Standardwerte je Projekt anpassbar** (Vorschlag: Reserve 20 %, max. Schieflast 20 %, Planung mit Max-Last); firmenweite Vorgaben ab DB-Anbindung |
| Rigging-Freigabe | **Je nach Projekt intern oder extern**: Plan enthält Punkte, Abstände, Last je Punkt, Gesamtlast, Material (Bumper, Ketten, Schäkel), Bezug zum Hallenraster, Freigabefeld (intern/extern, Name, Datum) |

## 3. Aufbau der Oberfläche (nach Rex-Styleguide)

Verbindlich ist der **Rex-Styleguide** (`rex-styleguide.md`): dunkles Design über
Farb-Variablen, Segoe UI 14 px, deutsche Texte und Zahlen, Prüfhinweise mit
farbigem Rand, Toasts statt `alert()`, Zeichnungen im Linienstil (SVG, 1 Einheit
= 1 mm). Die bisherigen Prototypen (`ledraster.html`, `signalplaner.html`) sind
noch hell und erfüllen ihn nicht – der LED-Planer wird von Anfang an danach gebaut.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Rex] LED-Planer   [Planen] [Library] [Einstellungen]   Projekt · ungespeichert │  ← Kopfleiste
├──────────────────────────────────────────────────────────────────────┤
│ [Aufbau ●][Strom ●][Signal ●][Ausgabe ●][Kabel ●]  (Ampel je Reiter)   │
├─────────────┬────────────────────────────────────────┬───────────────┤
│ Projekt-    │ Werkzeugleiste des aktiven Reiters      │ Eigenschaften │
│ baum:       │ (Duplizieren, Spiegeln, Pinsel …)       │ (Karte mit    │
│ · Screens   ├────────────────────────────────────────┤  Abschnitten) │
│ · Geräte    │                                        │               │
│ · Outputs   │   Zeichenfläche: dunkler Grund,         │ Prüfhinweise  │
│ · Library   │   helle Linien, maßstäblich (mm)        │ (Fehler/Warn./│
│   (ziehen)  ├────────────────────────────────────────┤  OK, klickbar)│
│             │ Tabelle unten: Anschlüsse + Last       │               │
│             │ bzw. Ports + Auslastung                │               │
└─────────────┴────────────────────────────────────────┴───────────────┘
```

### Kopfleiste und Hauptreiter (statt klassischer Menüleiste)
Der Styleguide sieht keine Menüleiste vor, sondern eine **Kopfleiste**: links
Rex-Zeichen (30 px) + „LED-Planer“, daneben die **Hauptreiter**, rechts der
**Status** (Projektname, „ungespeichert“). Die Inhalte des geplanten Hauptmenüs
verteilen sich so:

| Hauptreiter | Inhalt |
| --- | --- |
| **Planen** | Arbeitsbereich mit den Unterreitern Aufbau · Strom · Signal · Ausgabe (Umschalter, aktiver Reiter Akzentfarbe mit schwarzer Schrift); Knopfreihe mit Rückgängig/Wiederholen, Zoom, Pläne/Listen drucken, Live-Ausgabe |
| **Library** | **Manager-Ansicht**: links Liste (+ Neu, Suche, Filter „nur unvollständige“, Gruppen = Kategorien, Badge je Eintrag), rechts Formular als Karte; Pflichtfelder `*`; **Speichern · Verwerfen · Löschen**. Das Badge „4/7“ zeigt fehlende Datenblattwerte (z.B. Einschaltstrom ❓) |
| **Einstellungen** | Untermenü links: **Speichern/Laden** (Neu, Öffnen, Speichern, Importieren, Exportieren), **Projektdaten** (Kunde, Veranstaltung, Ersteller, Revision, Datum), **Hausregeln** (Reserve, Schieflast …), **Verknüpfte Programme** (Signalfluss-Planer) |

Bedienung laut Styleguide: `Strg+S` speichern, `Entf` Auswahl entfernen, `Esc`
abbrechen, Ziehen & Ablegen mit Maus **und Touch**, Warnung beim Schließen mit
ungespeicherten Änderungen, Rückfrage nur vor Löschen/Datenverlust.

### Farben im LED-Planer
- **Prüfhinweise/Ampel**: OK `--ok`, Warnung `--warnung`, Fehler `--fehler`.
  Planungsprobleme (Kreis überlastet, Port voll …) sind **Warnungen** und sperren
  das Speichern nicht; **Fehler** nur für ungültige Daten (z.B. Modul ohne Maße).
- **Kabel** nach Kabel-Farbsystem: Strom `#a3a3a3`, LAN `#22d3ee`, Fiber `#f97316`,
  Multicore/Laka (Harting) `#808000`, Socapex `#0f766e`, HDMI/SDI/DP wie festgelegt.
- **Stecker** nach Gewerk: Strom Orange-Familie, Netzwerk & Daten Türkis, Glasfaser Blau, Video Flieder.
- **Interne Farben für Strom und Signal** (Ausnahme vom Styleguide, freigegeben
  am 08.10.2026): Stromkreise und Datenports bekommen eigene Farben, damit Wege in
  der Zeichnung unterscheidbar sind. Vorschlag (10 Töne, auf dunklem Grund gut
  lesbar, ohne Rot – Rot bleibt Fehlern vorbehalten):

  | Nr. | Farbe | Nr. | Farbe |
  | --- | --- | --- | --- |
  | 1 | `#4dabf7` Blau | 6 | `#66d9e8` Cyan |
  | 2 | `#f783ac` Rosa | 7 | `#c0eb75` Limette |
  | 3 | `#63e6be` Mint | 8 | `#e599f7` Orchidee |
  | 4 | `#ffd43b` Gelb | 9 | `#ffc078` Apricot |
  | 5 | `#b197fc` Lila | 10 | `#91a7ff` Indigo |

  Ab Kreis/Port 11 wiederholen sich die Farben, ebenfalls **durchgezogen**
  (Unterscheidung über die Nummer). **Backup** läuft immer denselben Weg wie der
  Hauptweg – keine eigene Linie, nur eine **Endpunkt-Marke** am letzten Modul
  des Hauptwegs (z.B. „B1“ in der Farbe des Strangs). Überlastete Wege:
  zusätzlich orange Umrandung (`--warnung`) und Prüfhinweis. Im Druck werden
  dieselben Töne dunkler abgestuft, damit sie auf Weiß lesbar bleiben.
- **Phasen** (intern): L1 `#c08050` Braun · L2 `#e8e8e8` (steht für Schwarz; auf
  dunklem Grund hell, im Druck `#111`) · L3 `#8b949e` Grau – angelehnt an die
  Aderfarben, immer zusätzlich mit Beschriftung „L1/L2/L3“.

### Druck
Weißes Papier, Kopfzeile mit Logo und Titel, Deckblatt, Überschriften in
Großbuchstaben. Zeichnungen dürfen ihren dunklen Grund behalten.

Zwei Druckvarianten werden angeboten:
1. **Standard: A4 hoch** nach Styleguide – vollständiger Bericht (Deckblatt,
   alle Pläne und Listen).
2. **Zusatz: Großformat** – dieselben Pläne (Aufbau/Rigging, Strom, Signal,
   Ausgabe) noch einmal wahlweise auf **A4 quer** oder **A3 quer**, für große
   Wände und zum Aushängen vor Ort. Listen bleiben im A4-hoch-Bericht.

### Verknüpfung
Braucht der LED-Planer Daten des Signalfluss-Planers, wird dessen Oberfläche
**eingebettet** („In neuem Fenster öffnen ↗“), nicht nachgebaut.

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
| **LED-Modul** | **Serie**, Pixel B×H, Maße mm, Pitch, Gewicht, Leistung max./Ø, Einschaltstrom; **Receiving Card** (Typ/Familie); Anschlüsse Strom/Daten (ein/aus, Steckertyp); max. Module je Strombrücke und je Datenstrang; max. Anzahl geflogen untereinander / gestellt übereinander; Verbindungsart, mögliche Winkel; Grafik vorne/hinten |
| **Prozessor** | **unterstützte Receiving Cards**; Eingänge (Anschlussart, max. Auflösung, Bildraten); Ausgangs-Ports (Anzahl, Pixel je Port); Gesamtkapazität; Backup-Fähigkeit; Leistung, HE/Gewicht |
| **Stagebox** (aktiv) | Eingänge (z.B. Glasfaser), Ausgangs-Ports, Kapazität, **Leistung** (taucht im Strom auf) |
| **Multicore** (passiv) | Anzahl Adern/Ports, Steckertyp, Längen, Auflösung an der Wand |
| **Stromverteiler** | Einspeisung (CEE 16/32/63/125 A, Laka), Abgänge (Anzahl, Typ, Absicherung, Charakteristik B/C, Phase), FI |
| **Laka / Spinne** | Pole/Kreise je Laka, Längen, Spinne (Abgänge, Steckertyp) |
| **Bracket / Bumper / Stacking** | Typ, passende Module, Breite in Modulen, Eigengewicht, zulässige Last, Aufhängepunkte |
| **Kabel** | Kabeltyp (Cat6/etherCON, Glasfaser, PowerCON TRUE1, CEE, Laka, HDMI/DP/SDI), Stecker beidseitig, Farbe aus dem Kabel-Farbsystem, verfügbare Längen, Standardlänge für Brücken |

Fehlende Daten werden wie im Signalfluss-Planer abgefangen: Platzhalter mit
Warnung statt Abbruch.

**Das Datenformat ist festgelegt in `ledplaner-library-format.md`** (Version 1):
Rex-Material-Eintrag mit gemeinsamen Feldern (`hersteller`, `gewicht`,
`stromverbrauch`, `grafik`, `anschluesse` – wie Signalfluss-Planer) und
LED-Planer-Feldern unter `attribute.led` je Typ (`modul`, `prozessor`,
`stagebox`, `multicore`, `verteiler`, `laka`, `spinne`, `rigging`, `kabel`);
Pflicht- und Prüffelder, Badge-Regel, Projekt speichert Kopie der verwendeten Einträge.

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
 │   ├─ Signal:       Stränge[] { Port (Prozessor/Stagebox), Module in Reihenfolge, Backup-Port }
 │   └─ Ausgabe:      gemischter Pitch immer 1:1 (eigene Ausschnitte je Bereich)
 ├─ Outputs[]         { Name, Auflösung, Bildrate, Anschluss, Zuspieler }
 ├─ Kabel[]          { Nr, Gewerk, Kabeltyp (Library), Länge, Anzahl, Von {Gerät, Anschluss},
 │                      Nach {Gerät, Anschluss}, Herkunft (automatisch | von Hand), Bemerkung }
 ├─ Verbindungen[]    Einspeisung → Verteiler → Laka/Kabel → Screen
 │                    Prozessor → Stagebox/Multicore → Screen
 │                    Output → Prozessor-Eingang (mit Kabelart/-länge)
 ├─ Pixelräume[]      je Prozessor: { Screen bzw. Pitch-Bereich → Position x/y }
 ├─ Zuordnungen[]     { Prozessor, Layer, Output/Eingang, Ausschnitt x/y/b/h →
 │                      Fläche im Pixelraum x/y/b/h, 1:1 | skaliert }
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
- Pixel-Lage jedes Moduls ergibt sich aus der Position (wichtig für Signal und Ausgabe). Bei **unterschiedlichem Pitch** im selben Screen hat jeder Pitch-Bereich seine eigene Pixeldichte: Der Screen zeigt die Bereiche je Pitch farbig an, die Pixel-Lage wird je Bereich bzw. je Port gerechnet. Verschiedene Größen mit gleichem Pitch bilden einen gemeinsamen Bereich.
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
- **Regel: ein Port = eine Serie mit derselben Receiving Card.** Verschiedene Größen derselben Serie dürfen auf denselben Port (z.B. 1 × 0,5 m und 0,5 × 0,5 m). Der Vorschlag bildet Stränge nur innerhalb einer Serie; der Pinsel überspringt Module einer anderen Serie bzw. Receiving Card (Hinweis). Screens mit mehreren Serien brauchen mindestens einen Port je Serie.
- Die Library braucht dafür beim LED-Modul das Feld **Serie** (z.B. Herstellerserie), zusätzlich zu Receiving Card und Pitch.
- **Backup automatisch**: Zu jedem Strang ein Backup-Port, der am **letzten Modul** einspeist und denselben Weg rückwärts nutzt. Keine eigene Linie in der Zeichnung – nur die Marke „B1“ am Endpunkt des Hauptwegs; das Backup-Kabel steht im Kabel-Reiter.
- **Liste unten**: jeder Port (Haupt/Backup) mit Gerät, Strang, Modulen, Pixeln, **Portauslastung**.
- Kabelarten und Längen je Strecke, **Prozessor-Übersicht** zum Abtippen (Port → Startposition, Modulreihenfolge); Hersteller-Dateien später.

**Signal-Mapping (Pixelraum des Prozessors)** – entspricht der Screen-Konfiguration in der Prozessor-Software:
- Jeder Prozessor hat einen **Pixelraum**, in dem seine Screens bzw. Pitch-Bereiche liegen.
- **Vorschlag**: Das Programm ordnet die Screens so an, wie sie physisch nebeneinanderstehen (sonst lückenlos von links nach rechts). Danach **frei verschiebbar** (Ziehen, Einrasten, Pfeiltasten – wie im Prototyp).
- Bereiche mit unterschiedlichem Pitch in einem Screen sind im Pixelraum **eigene Blöcke** (je nach Ausgabe-Einstellung des Screens, siehe 6.4).
- **Mehrere Prozessoren je Screen**: Ein großer Screen kann auf mehrere Prozessoren aufgeteilt werden (je Prozessor eine Gruppe von Strängen); jeder Prozessor zeigt nur seinen Teil im Pixelraum.
- Aus Pixelraum + Strängen entsteht die **Prozessor-Übersicht**: je Port Startposition x/y im Pixelraum und Modulreihenfolge.

### 6.4 Ausgabe
- **Outputs anlegen**: Name, Auflösung, Bildrate, Anschluss, Zuspieler (z.B. „Medienserver 1 · Out 2 · 3840×2160 · 50p · HDMI 2.0“). Mit verknüpftem Signalfluss-Planer kommen die Zuspieler von dort.
- Outputs mit **Prozessor-Eingängen** verbinden.
- Am Prozessor festlegen, **welcher Ausschnitt eines Outputs auf welcher Fläche des Pixelraums** erscheint: Rechteck im Output ziehen → auf den Pixelraum legen. Jede solche Zuordnung belegt einen **Layer** des Prozessors.
- **Standard 1:1** ohne Skalierung, Warnung bei Größenabweichung. Layer dürfen skalieren (Ausschnitt ≠ Fläche), der Planer warnt dann.
- **Layer mit Grenze**: Das Programm zählt die Layer je Prozessor und warnt bei Überschreitung (NovaStar MX30: 3 Layer). Tipp im Programm: Screens im Pixelraum so anordnen wie im Output, dann reicht **ein Layer für mehrere Screens**.
- **Gemischter Pitch in einem Screen – immer 1:1**: jeder Pitch-Bereich wird mit seinen echten Pixeln abgebildet, eigener Ausschnitt je Bereich (Content muss dafür vorbereitet sein). Eine gemeinsame Skalierung über den ganzen Screen gibt es nicht.
- **Sonderfälle**, die abgedeckt werden:
  - *Ein Output → mehrere Screens* (z.B. Mitte + zwei Seiten aus einem 4K-Signal).
  - *Mehrere Outputs → ein Screen* (z.B. 2 × 4K nebeneinander auf einem breiten Screen).
  - *Mehrere Prozessoren je Screen* (siehe Signal-Mapping; je Prozessor eigener Eingang und Ausschnitt).
  - *Gleiches Bild doppelt* (derselbe Ausschnitt auf zwei Screens, z.B. beide Seitenwände).
- **Testbild je Output** (aus dem Prototyp): zeigt genau, welcher Ausschnitt auf welchem Screen landet – mit Screen-Name, Pitch-Bereich, Modulnummern und Markierung doppelt genutzter Ausschnitte. PNG-Export und **Live-Ausgabe** je Output mit wandernden Cursorn.
- Prüfungen: **Eingangsauflösung**, **Gesamtkapazität** des Prozessors, **Anschlussart** (Konverter nötig?), **Bildrate**, **Anzahl Layer**, Flächen ohne Bild, Ausschnitt ≠ Fläche bei 1:1.

### 6.5 Übersichten Verteiler und Prozessoren
- **Strom → „Alle Verteiler“**: je Verteiler eine Karte mit Standort, Einspeisung (mit Kabel), Last je Phase, Schieflast, Max./Ø und den Kanälen je Ausgang (belegt mit Kreisfarbe, Phase und Strom; frei gestrichelt). Darunter die Liste aller Abgänge aller Verteiler. Einspeisungen als eigene Karte.
- **Signal → „Alle Prozessoren“**: je Prozessor eine Karte mit Standort, Receiving Card, den Ausgangs-Ports (Haupt/Backup, Screen, Auslastung), Eingängen (welcher Output) und Auslastung (Pixel, Ports, Layer, Glasfaser). Darunter die Liste aller Ports aller Prozessoren.
- Unbenutzte Geräte werden als Hinweis gemeldet („Prozessor 2 ohne Ports – wird er gebraucht?“).

### 6.6 Kabel
- Eigener Reiter **Kabel** (mit Ampel). Kabel entstehen **automatisch** aus Strom, Signal und Ausgabe: Zuleitungen, Lakas, Spinnen-Abgänge, Port-Kabel, Backup-Kabel, Video-Kabel und **Brücken** zwischen Modulen (Länge aus der Library als Standard).
- Zusätzlich **Kabel von Hand** (z.B. Strom für den Prozessor, Reserve).
- Je Kabel: Nr., Gewerk, **Kabeltyp** (Library, Farbe nach Kabel-Farbsystem), **Länge**, Anzahl, **Von** (Gerät · Anschluss), **Nach** (Gerät · Anschluss), Herkunft (automatisch/von Hand), Bemerkung.
- **Bearbeiten an zwei Stellen**: in der Kabelliste oder beim angeklickten Kabel in der Zeichnung von Strom/Signal (Karte „Ausgewählte Verbindung“). „In Zeichnung zeigen“ springt zurück.
- Filter nach Gewerk, Screen und „nur ohne Länge“.
- Unten die **Zusammenfassung nach Typ und Länge** = Packliste; Export als Liste (Druck) und CSV.
- Prüfungen: Länge fehlt, Cat-Strecke > max. Cat-Länge (Hausregel 100 m), Kabeltyp passt nicht zum Anschluss.

## 7. Prüfungen (Ampel je Reiter)

| Reiter | Beispiele |
| --- | --- |
| Aufbau | Last je Punkt überschritten · zu viele Module untereinander · Bracket passt nicht · Lücke/Versatz zwischen Modulen |
| Strom | Kreis überlastet · zu viele Module an einer Brücke · Schieflast · Einschaltstrom · Modul ohne Kreis · Verteiler-Ebene überlastet |
| Signal | Kein passender Prozessor · **verschiedene Serien/Receiving Cards an einem Port** · Port überlastet · Strang zu lang · Modul ohne Port · Backup fehlt · Kabel zu lang (z.B. Cat > 100 m) |
| Kabel | Länge fehlt · Cat-Strecke zu lang · Kabeltyp passt nicht zum Anschluss · Kabel ohne Von/Nach |
| Ausgabe | Output zu groß für den Eingang · Prozessor-Kapazität überschritten · **zu viele Layer** · Anschluss passt nicht · Bildraten unterschiedlich · Wandfläche ohne Bild · Ausschnitt ≠ Fläche (bei 1:1) · Screens eines Prozessors überlappen im Pixelraum |

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
| **1 · Aufbau-Editor + Strom** | Hauptmenü, Projekte · eingebaute Library · **Modul-Editor** (Drag & Drop, Einrasten, gemischte Typen, Lücken) · Werkzeugleiste · Screen-Daten (Höhe, Beschreibung, geflogen/gestellt) · **Strom komplett** (Verteiler-Ebenen, Laka/CEE, Vorschlag + Pinsel, Liste, Verteiler-Übersicht, Phasen, Einschaltstrom) · Testbild + Live je Screen · **Verteiler-Übersicht** · **Kabel-Reiter** (Strom-Kabel) · Stromplan-PDF, Materialliste, Kabelliste, Kundenansicht | Nutzbar für Wand- und Stromplanung |
| **2 · Signal + Ausgabe + Rigging** | Prozessoren/Stageboxen/Multicores in der Library · **Signal** (Kompatibilität, Standorte, Vorschlag + Pinsel, Backup gespiegelt, Portliste, Prozessor-Übersicht, **Alle Prozessoren**, Signal- und Video-Kabel im Kabel-Reiter) · **Ausgabe** (Outputs, Eingänge, Ausschnitt → Fläche, Testbild je Output, Prüfungen) · **Aufbau-Lasten und Riggingplan** · Signal-, Ausgabe- und Riggingplan-PDF | Vollständige Planung aller vier Bereiche |
| **3 · Rex-Anbindung** | Library aus dem Datenbank-Agent · Projekte in der Datenbank · Rückgabe Material ans Rex-System · Freischaltung über Benutzerverwaltung · Verknüpfung mit dem Signalfluss-Planer | Integriertes Rex-Modul |
| **4 · Erweiterungen** | Kurven/Winkel · Hersteller-Dateien (NovaLCT, Colorlight – mit Beispieldateien) · Skalierung in der Ausgabe · Medienserver-Exporte · 3D-Ansicht | Nach Bedarf |

## 12. Offene Fragen

1. **Bestand**: Stageboxen, Multicores, Flugrahmen. Beispieldaten für LED-Module, Prozessor und Stromverteiler in `ledplaner-beispieldaten.md` (LEDTEK P4+WH/P4+sWH PRO V3, NovaStar MX30, StageSmarts C24).
2. **Datenblätter**: LEDTEK V3 (Einschaltstrom, max. Module je Brücke/Strang, Rigging-Grenzen), StageSmarts C24 (Phasenzuordnung der Kanäle).

## 13. Stand und nächste Schritte

**Stand 08.10.2026** – Konzeptphase (Phase 0) abgeschlossen, **Umsetzung begonnen**:
`ledplaner.html` (Quellcode `ledplaner/src/`, Tests `ledplaner/test/e2e.mjs`, Übergabe `ledplaner/README.md`).

Umgesetzt: Phase 1 vollständig (Projekte, Library-Manager, Modul-Editor, Strom mit Verteilern/Phasen/Laka/Pinsel,
Verteiler-Übersicht, Kabel-Reiter, Testbild + Live je Screen, Bericht/Großformat/Kundenansicht, Hausregeln) und
Phase 2: Signal (Prozessoren, Port-Regel, Vorschlag + Pinsel, Backup am Strangende, Prozessor-Übersicht, Signalkabel),
Rigging (Flugrahmen/Stacking, Last je Punkt, Riggingplan, Freigabefeld) und Ausgabe-Mapping (Outputs → Eingänge,
Pixelraum je Prozessor mit frei verschiebbaren Screens, Layer-Vorschlag mit Grenze je Prozessor, Testbild/Live je
Output, Videokabel, Ausgabe-Blatt im Bericht) sowie Stagebox und Multicore als eigene Geräte (je Prozessor, Ports frei
zuordenbar, Rest direkt per Cat; Stagebox mit Zuleitung und Strom). Gemischte Pitches bleiben 1:1 je Modultyp.
Phase 3 vorbereitet, soweit ohne Signalfluss-Planer möglich: eine Datenquelle für den Datenbank-Agent (Library,
Freischaltung mit „nur ansehen“, Projekte, Material-Rückgabe), Materialliste (Einstellungen, Bericht, CSV, Datei).
Der Signalfluss-Planer wird neu gebaut; der LED-Planer ist ohne ihn voll nutzbar.
Aus Phase 4: Kurven/Winkel – Knick an senkrechten Fugen (je Fuge, für alle/ausgewählte Fugen oder als Radius),
+ konkav / − konvex, Vorderansicht als Abwicklung, Draufsicht mit Sehne, Stich und Radius (Aufbau, Bericht, Großformat),
Prüfung gegen die möglichen Winkel der Library und auf Flugrahmen über einem Knick.
Tablet-Bedienung: Zwei-Finger-Zoom/-Verschieben, Zoom-Knöpfe, Module mit dem Finger ziehen, Mehrfachauswahl und
Einrasten als Schalter (statt Shift/Alt), Pinsel mit dem Finger, größere Bedienelemente, Seitenspalten hochkant ausklappbar.
3D-Ansicht im Aufbau (Umschalter „3D“): Module mit Kurve und Unterkante, Flugrahmen, Boden-Raster, Person als Maßstab,
drehen und zoomen mit Maus oder Fingern; 3D-Bild auch in der Kundenansicht.

**Nächste Schritte:**
1. Im echten Einsatz ausprobieren (Beispielprojekt unter Einstellungen → Speichern/Laden) und Rückmeldung sammeln.
2. Echte Multicore-Einträge aus dem Bestand anlegen; Leistung der NovaStar CVT10 mit dem Datenblatt bestätigen.
3. Bestandsliste und Datenblätter nachreichen (Lakas, Stageboxen, Multicores, Flugrahmen; LEDTEK-Grenzwerte, C24-Phasen).
