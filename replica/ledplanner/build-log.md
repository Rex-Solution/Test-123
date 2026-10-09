# Build-Log: LED-Planer-Erweiterung (Replica von LED Planner, ledplanner.pro)

Basis: `ledraster.html` (pixl-Grid-Nachbau), erweitert auf Version 2.

| ID | Datum | Status | fehlt | schwieriger als gedacht |
| --- | --- | --- | --- | --- |
| S08 Karte Inhalt/Ausgang | 2026-10-07 | done | Drehung | eine Zeichenlogik für zwei Karten (Kontext `rk` statt doppeltem Code); Live muss immer Ausgang zeigen |
| S09 Datenwege | 2026-10-07 | done | – | ausgewogene, zusammenhängende Segmente unter Kapazität |
| S10 Stromkreise | 2026-10-07 | done | – | halbe Kabinette anteilig rechnen |
| S11 Kabinett/Physik | 2026-10-07 | done | DB-Anbindung | – |
| S12 Bericht | 2026-10-07 | done | Logo | PDF ohne Bibliothek → Druckansicht |
| Editor | 2026-10-07 | partial | Ausrichten mehrerer Wände | Undo: ganzes Ziehen = ein Schritt (verzögertes Merken) |

Tests: 36 Prüfungen v2 + Regression v1 (26, davon 1 bewusst geändert: Slice-CSV
hat jetzt zwei Kopfzeilen für Inhalt und Ausgang). Keine Konsolenfehler.
Parity: 92,6 / 100, Must-haves 12 von 12. Rebrand-Sweep: sauber.

Bewusste Abweichung: Kapazität in Pixel je Port und Watt je Kreis statt m².
Quelle der Recon: nur die öffentliche README des gleichnamigen
GitHub-Projekts – ledplanner.pro selbst war aus der Umgebung gesperrt.
