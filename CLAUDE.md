# Hinweise für Claude

Repository mit Modulen des Rex-Systems (eigenständige HTML-Dateien, Deutsch, ohne Abhängigkeiten).

- **LED-Planer**: Quellcode in `ledplaner/src/`, Build `python3 ledplaner/build.py` → `ledplaner.html`.
  Nie `ledplaner.html` direkt bearbeiten. Tests: `node ledplaner/test/e2e.mjs`. Details: `ledplaner/README.md`.
- Übergabe/Einbindung ins Rex-System: `ledplaner-uebergabe.md` (Schnittstelle, Dateien, Checkliste).
- Konzept und Entscheidungen: `ledplaner-konzept.md` (Abschnitt „Getroffene Entscheidungen“ ist verbindlich),
  Library-Datenformat: `ledplaner-library-format.md`, Oberfläche: `rex-styleguide.md`.
- Ältere Prototypen: `ledraster.html` (nur Referenz), `signalplaner.html` (Signalfluss-Planer, eigenes Modul).
- Texte in der Oberfläche kurz, aktiv, deutsch; Zahlen deutsch; fehlende Werte nie raten.
