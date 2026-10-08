#!/usr/bin/env python3
"""Baut ledplaner.html (eine Datei, ohne Abhängigkeiten) aus den Teilen in src/.

Aufruf:  python3 ledplaner/build.py
Ergebnis: ../ledplaner.html (im Hauptordner des Repositorys)
"""
from pathlib import Path

HIER = Path(__file__).resolve().parent
SRC = HIER / "src"
ZIEL = HIER.parent / "ledplaner.html"

def main():
    html = (SRC / "geruest.html").read_text(encoding="utf-8")
    css = (SRC / "stil.css").read_text(encoding="utf-8")
    teile = sorted((SRC / "js").glob("*.js"))
    js = "\n".join(f"/* ===== {t.name} ===== */\n" + t.read_text(encoding="utf-8") for t in teile)
    if "/*CSS*/" not in html or "/*JS*/" not in html:
        raise SystemExit("geruest.html braucht die Platzhalter /*CSS*/ und /*JS*/")
    html = html.replace("/*CSS*/", css).replace("/*JS*/", '"use strict";\n' + js)
    ZIEL.write_text(html, encoding="utf-8")
    print(f"{ZIEL.name}: {len(html.splitlines())} Zeilen aus {len(teile)} JS-Teilen")

if __name__ == "__main__":
    main()
