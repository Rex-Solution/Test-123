# Rex System – Style Guide

Eigenständige Vorgabe für das Aussehen und die Bedienung aller Rex-Oberflächen.
Gedacht zum Weitergeben an andere Systeme, Entwickler oder KI-Werkzeuge, die
**keinen** Zugriff auf das Rex-Gerüst haben. Alle Werte stehen hier vollständig.

Quelle der Wahrheit im Gerüst: `gemeinsam/basis.css`, `gemeinsam/farbsystem.js`,
`gemeinsam/logo/`, `PROJEKT-STANDARD.md` (Abschnitt 8). Weicht etwas ab, gilt das Gerüst.

---

## 1. Grundsätze

1. **Dunkel, ruhig, sachlich.** Dunkler Grund, helle Schrift, wenig Farbe.
2. **Farbe trägt Bedeutung** – Auswahl (Blau), OK (Grün), Warnung (Orange), Fehler (Rot),
   Stecker/Kabel (Farbsystem). Nie Farbe nur als Schmuck.
3. **Deutsch** in der ganzen Oberfläche, mit Umlauten und typografischen
   Anführungszeichen („…“). Zahlen deutsch: `1.234,5`.
4. **Werkzeug, keine Werbeseite.** Dichte Darstellung, keine großen Bilder, keine
   Animationen außer kurzen Einblendungen.
5. **Zeichnungen im Linienstil:** helle Linien auf dunklem Grund, maßstabsgetreu
   (SVG: 1 Einheit = 1 mm).

---

## 2. Farben

### 2.1 Bildschirm (dunkel)

Immer über diese Variablen, nie feste Farbwerte im Projekt.

| Variable | Wert | Verwendung |
|---|---|---|
| `--bg` | `#141414` | Seitenhintergrund |
| `--flaeche` | `#1c1c1c` | Eingabefelder, Knöpfe, Flächen |
| `--leiste` | `#1a1a1a` | Kopfleiste, Karten |
| `--linie` | `#333333` | Rahmen, Trennlinien |
| `--text` | `#e8e8e8` | Text |
| `--text-leise` | `#9a9a9a` | Nebentext, Tabellenköpfe, Beschriftungen |
| `--akzent` | `#4da3ff` | Auswahl, Fokus, Links, aktiver Reiter |
| `--akzent-flaeche` | `#16263a` | Hintergrund für aktiv/ausgewählt |
| `--ok` | `#3fb950` | in Ordnung, vollständig |
| `--warnung` | `#d29922` | Warnung (sperrt nichts) |
| `--fehler` | `#f85149` | Fehler (sperrt Speichern) |

Ergänzende feste Töne (nur für diese Zwecke):

| Wert | Zweck |
|---|---|
| `#1f4f80` / Rand `#2d6aa8` | Primärknopf |
| `#555555` | Knopfrand beim Überfahren |
| `#262626` | Zeilenlinie in Tabellen |
| `#2a1717` · `#2a2413` · `#15261a` | Hintergrund Fehler · Warnung · OK-Hinweis |
| `#3a1d1d` · `#1d2c3a` | Hintergrund Fehler- · Info-Meldung |
| `#193a24` · `#3a2f12` | Badge „vollständig“ · „teilweise“ |
| `#6b6b6b` | reserviert: „Signal nicht erkannt“ |

### 2.2 Druck und Berichte (hell)

Papier ist weiß. Text `#111`, Nebentext `#666`, Linien `#bbb`. Nur Zeichnungen
(z.B. Racks) dürfen ihren dunklen Grund behalten. Auf dem Bildschirm liegen die
A4-Blätter auf grauem Grund `#3a3a3a`.

### 2.3 Farbsystem Stecker und Kabel

**Stecker** – jedes Gewerk hat eine Farbfamilie; der erste Ton ist der Grundton.
Ein Steckertyp weicht höchstens mit einer Abstufung seiner Familie ab.

| Gewerk | Grundton | Abstufungen |
|---|---|---|
| Ton | `#56d364` Grün | `#8cc63f` `#1f9a5f` `#5f8f2a` `#2e7d32` `#a8f0c0` `#c8e67a` |
| Licht | `#e3c341` Gelb | `#c9a000` `#a8962a` `#f5e68a` |
| Strom | `#f0883e` Orange | `#cc5a14` `#ffb97a` |
| Video | `#d2a8ff` Flieder | `#a371f7` `#d06ad8` `#e8699f` `#7048d8` `#9a3fb0` `#f5a3e0` |
| Netzwerk & Daten | `#39c5cf` Türkis | `#1d8f9a` `#9ae8ee` |
| Glasfaser | `#58a6ff` Blau | `#2f6fd6` `#a8d0ff` |
| Sonstiges | `#c9d1d9` Hellgrau | `#8b949e` `#a8998a` |

**Kabel (Kabeltypen)** – jeder Kabeltyp hat eine klar eigene Farbe, jede nur einmal
(keine Familien, damit Kabel im Plan unterscheidbar sind):

| Kabel | Farbe | Kabel | Farbe |
|---|---|---|---|
| SDI | `#3b82f6` Blau | DMX | `#facc15` Gelb |
| HDMI | `#d946ef` Magenta | Socapex | `#0f766e` Petrol |
| DisplayPort | `#7c3aed` Violett | LAN | `#22d3ee` Cyan |
| DVI | `#f9a8d4` Rosa | Fiber | `#f97316` Orange |
| USB | `#93c5fd` Hellblau | SFP-Einschub | `#d6b98c` Sand |
| XLR (Audio) | `#22c55e` Grün | Strom | `#a3a3a3` Hellgrau |
| Klinke | `#bef264` Limette | Speakon | `#a16207` Braun |
| Chinch | `#15803d` Dunkelgrün | Multicore (Harting) | `#808000` Oliv |

Noch frei: `#be185d` Weinrot. **Rot** ist Fehlern vorbehalten, **Dunkelgrau**
`#6b6b6b` heißt „nicht erkannt“. Alle Farben müssen auf dunklem Grund (Kontrast ≥ 3)
und im weißen Druck erkennbar sein. Keine freien Farbwähler – nur Farbfelder aus diesen Listen.

---

## 3. Schrift

| Element | Wert |
|---|---|
| Schriftart | `"Segoe UI", system-ui, sans-serif` |
| Grundtext | 14 px, Zeilenhöhe 1.4 |
| Überschrift Kopfleiste (`h1`) | 18 px |
| Abschnittsüberschrift (`h2`) | 16 px |
| Tabellen, Hinweise, Nebentext | 13 px |
| Beschriftungen (Labels) | 12 px, GROSSBUCHSTABEN, Sperrung `.05em`, `--text-leise` |
| Badges, Tastenkürzel | 11 px |
| Druck | 10 pt Grundtext, 9 pt Tabellen, Überschriften in Großbuchstaben |

Keine Webfonts nachladen.

---

## 4. Formen und Abstände

- **Abstandsraster:** 4 · 6 · 8 · 12 · 16 · 24 px.
- **Eckenradius:** Eingaben/Knöpfe/Hinweise 6 px, Karten 10 px, Toast 8 px,
  Badges 10 px (Pille), Tasten 3 px.
- **Rahmen:** 1 px `--linie`. Fokus: Rahmen `--akzent`, kein Leuchtrand.
- **Schatten** nur für schwebende Elemente (Toast: `0 6px 20px rgba(0,0,0,.4)`).
- Innenabstand Eingaben/Knöpfe `6px 8px`, Karten `16px`, Tabellenzellen `6px 8px`.

---

## 5. Bausteine

### Knöpfe
- Standard: Grund `--flaeche`, Rahmen `--linie`; beim Überfahren Rahmen `#555`.
- **Primär** (eine Hauptaktion je Bereich, z.B. „Speichern“): Grund `#1f4f80`, Rahmen `#2d6aa8`.
- Deaktiviert: 45 % Deckkraft, kein Zeiger.
- **Knopfreihe:** waagerecht, 8 px Abstand; ein Füller schiebt Knöpfe nach rechts.
- **Umschalter** (z.B. Vorne | Hinten | Seite): Knöpfe aneinander, nur äußere Ecken
  rund, aktiver Knopf Grund `--akzent` mit schwarzer Schrift.

### Kopfleiste
Oben über die volle Breite, Grund `--leiste`, untere Linie `--linie`, Innenabstand `8px 16px`.
Von links: **Rex-Zeichen (30 × 30 px) + Programmname** · **Hauptreiter**
(z.B. „Planen“ / „Einstellungen“) · rechts der **Status** (Planname, „ungespeichert“).
Aktiver Reiter: Grund `--akzent-flaeche`, Rahmen `--akzent`; inaktive ohne Rahmen.

### Karte
Grund `--leiste`, Rahmen `--linie`, Radius 10 px, Innenabstand 16 px.

### Tabelle
Volle Breite, 13 px. Köpfe linksbündig, normal (nicht fett), `--text-leise`.
Zeilenlinien `#262626`. Ausgewählte Zeile: Grund `--akzent-flaeche`.

### Badge (Vollständigkeit)
„vollständig“ grün auf `#193a24`, „4/7“ orange auf `#3a2f12`, Tooltip nennt, was fehlt.

### Prüfhinweise
Kasten mit 3 px farbigem Rand links: Fehler (rot, sperrt Speichern), Warnung (orange,
sperrt nicht), OK (grün), Info (blau). Klickbare Hinweise springen zum Feld.

### Meldungen
- **Meldungszeile** (bleibt stehen): Fehler rot umrandet auf `#3a1d1d`, Info blau auf `#1d2c3a`.
- **Einblendung/Toast** unten rechts, max. 420 px breit, verschwindet selbst
  (Info nach ~3 s, Fehler nach 6 s).
- Nie `alert()` für normale Hinweise; Rückfrage (`confirm`) nur vor Löschen oder Datenverlust.

### Farbwahl
Farbfelder 24 × 24 px, Radius 5 px; aktives Feld mit hellem Rahmen; schon vergebene
Farbe mit kleinem Punkt; Farbe außerhalb des Systems rot gestrichelt umrandet.

---

## 6. Seitenaufbau

- **Kopfleiste** oben, darunter der Arbeitsbereich.
- **Einstellungen** mit Untermenü links (Speichern/Laden, Stammdaten, verknüpfte Programme).
- **Manager-Ansicht** (Stammdaten bearbeiten):
  - **Links Liste:** Überschrift, „+ Neu“, Suche, Filter „nur unvollständige“, Gruppen,
    je Eintrag ein Badge.
  - **Rechts Formular** als Karte mit Abschnitten; Pflichtfelder mit `*`;
    Prüfung schon beim Tippen; geänderte Felder markiert.
  - Knöpfe **Speichern · Verwerfen · Löschen**.
- Braucht ein Programm Daten eines anderen, wird dessen Oberfläche **eingebettet**
  (mit „In neuem Fenster öffnen ↗“), nicht nachgebaut.

---

## 7. Bedienung

| Aktion | Verhalten |
|---|---|
| `Strg+S` | Speichern |
| `Entf` | Auswahl entfernen |
| `Esc` | Abbrechen / Dialog schließen |
| Ziehen & Ablegen | mit Maus und Touch |
| Tab schließen mit ungespeicherten Änderungen | Warnung |
| KI-Vorschläge | füllen nur das Formular, gespeichert wird immer von Hand |

Tastenkürzel in der Oberfläche als `<kbd>` anzeigen (kleiner Rahmen, 11 px).

---

## 8. Logo

Rex Solution: Dino-Zeichen im Rahmen, optional mit Schriftzug „REX SOLUTION“.

| Datei | Verwendung |
|---|---|
| `rex-symbol.png` | Tab-/App-Symbol |
| `rex-zeichen-weiss.png` | Zeichen für dunklen Grund (Kopfleiste, 30 px hoch) |
| `rex-zeichen-schwarz.png` | Zeichen für hellen Grund (Druck) |
| `rex-logo-weiss.png` / `rex-logo-schwarz.png` | Zeichen + Schriftzug (Berichte, Deckblätter) |
| `rex.ico` | Windows-Symbol |

Regeln: nicht nachzeichnen, nicht umfärben, nicht verzerren. Weiß auf dunkel,
schwarz auf hell. Neue Varianten nur aus den Originalen ableiten.

---

## 9. Berichte und Druck

- A4 hoch, Ränder 12 mm, ein Abschnitt je Seite.
- **Kopfzeile** jedes Blatts: links Logo (6 mm hoch) + Titel, rechts Seiteninfo, 8 pt grau,
  darunter dünne Linie.
- **Deckblatt:** Logo (ca. 62 mm breit), kleine gesperrte Großschrift „REX SOLUTION“,
  Titel 30 pt, Unterzeile 12 pt, Eckdaten als zweispaltige Liste (Bezeichnung grau, Wert fett).
- Überschriften in Großbuchstaben (h2 15 pt, h3 11 pt).

---

## 10. Texte

- Kurz, aktiv, deutsch: „Gerät speichern“, nicht „Speichern Sie das Gerät“.
- Fehlermeldungen sagen, **was** fehlt und **wo**: „HE: muss größer als 0 sein“.
- Leere Werte bleiben leer (nicht „0“), fehlende Angaben heißen „—“ oder werden genannt.
- Fachbegriffe der Veranstaltungstechnik bleiben im Original (SDI, Speakon, Rack Tray).

---

## 11. Startvorlage (ohne Rex-Gerüst)

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Programmname – Rex</title>
  <link rel="icon" href="rex-symbol.png">
  <style>
    :root {
      --bg:#141414; --flaeche:#1c1c1c; --leiste:#1a1a1a; --linie:#333; --text:#e8e8e8;
      --text-leise:#9a9a9a; --akzent:#4da3ff; --akzent-flaeche:#16263a;
      --ok:#3fb950; --warnung:#d29922; --fehler:#f85149;
    }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:14px/1.4 "Segoe UI",system-ui,sans-serif; }
    input,select,textarea,button { font:inherit; color:var(--text); background:var(--flaeche);
      border:1px solid var(--linie); border-radius:6px; padding:6px 8px; }
    input:focus,select:focus,textarea:focus { outline:none; border-color:var(--akzent); }
    button { cursor:pointer; } button:hover { border-color:#555; }
    button:disabled { opacity:.45; cursor:default; }
    button.primaer { background:#1f4f80; border-color:#2d6aa8; }
    .kopfleiste { display:flex; align-items:center; gap:24px; padding:8px 16px;
      background:var(--leiste); border-bottom:1px solid var(--linie); }
    .marke { display:flex; align-items:center; gap:10px; font-size:18px; margin:0; }
    .marke img { width:30px; height:30px; }
    .karte { background:var(--leiste); border:1px solid var(--linie); border-radius:10px; padding:16px; }
  </style>
</head>
<body>
  <header class="kopfleiste">
    <h1 class="marke"><img src="rex-zeichen-weiss.png" alt="Rex Solution">Programmname</h1>
  </header>
  <main style="padding:16px">
    <div class="karte">Inhalt</div>
  </main>
</body>
</html>
```
