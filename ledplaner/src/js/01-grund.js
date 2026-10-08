/* Grundfunktionen: DOM, Formatierung, Meldungen, Dialoge, Dateien. */

const $ = (sel, wurzel = document) => wurzel.querySelector(sel);
const $$ = (sel, wurzel = document) => [...wurzel.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* Deutsche Zahlen: 1.234,5 – leere Werte bleiben leer bzw. „—“ */
function fmt(v, nk = 0) {
  if (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk });
}
function fmtFlex(v, maxNk = 2) {
  if (v === null || v === undefined || v === "" || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("de-DE", { maximumFractionDigits: maxNk });
}
/* Eingabe deutsch oder englisch lesen: „1.234,5“, „1234.5“, „4,81“ */
function leseZahl(text) {
  if (text === null || text === undefined) return null;
  let s = String(text).trim();
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

let uidZaehler = 0;
function neueId(praefix = "x") { return praefix + Date.now().toString(36) + (uidZaehler++).toString(36); }

function klon(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

function spaltenBuchstabe(i) {
  let s = ""; i += 1;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

/* Interne Farben für Kreise/Ports (ab Nr. 11 wiederholt, durchgezogen) */
const WEGFARBEN = ["#4dabf7", "#f783ac", "#63e6be", "#ffd43b", "#b197fc", "#66d9e8", "#c0eb75", "#e599f7", "#ffc078", "#91a7ff"];
const wegFarbe = i => WEGFARBEN[((i % WEGFARBEN.length) + WEGFARBEN.length) % WEGFARBEN.length];
const PHASENFARBE = { L1: "#c08050", L2: "#e8e8e8", L3: "#8b949e" };

/* Kabel-Farbsystem aus dem Rex-Styleguide */
const KABELFARBEN = {
  "SDI": "#3b82f6", "HDMI": "#d946ef", "DisplayPort": "#7c3aed", "DVI": "#f9a8d4", "USB": "#93c5fd",
  "XLR (Audio)": "#22c55e", "Klinke": "#bef264", "Chinch": "#15803d", "DMX": "#facc15", "Socapex": "#0f766e",
  "LAN": "#22d3ee", "Fiber": "#f97316", "SFP-Einschub": "#d6b98c", "Strom": "#a3a3a3", "Speakon": "#a16207",
  "Multicore (Harting)": "#808000",
};
const kabelFarbe = name => KABELFARBEN[name] || "#6b6b6b";

/* ---------- Meldungen (Toast) ---------- */
function toast(text, art = "info") {
  const el = document.createElement("div");
  el.className = "toast " + (art === "fehler" ? "fehler" : art === "ok" ? "ok" : "");
  el.textContent = text;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), art === "fehler" ? 6000 : 3000);
}

/* ---------- Dialoge ---------- */
/* felder: [{ name, label, art: "text"|"zahl"|"auswahl"|"check", wert, optionen:[[wert,text]], hilfe }] */
function formularDialog(titel, felder, okText = "Übernehmen") {
  return new Promise(res => {
    const d = $("#dialog");
    d.innerHTML = `<form method="dialog"><h2>${esc(titel)}</h2>
      ${felder.map(f => {
        if (f.art === "check") return `<label class="feld check"><input type="checkbox" name="${f.name}" ${f.wert ? "checked" : ""}><span>${esc(f.label)}</span></label>`;
        if (f.art === "auswahl") return `<label class="feld"><span>${esc(f.label)}</span><select name="${f.name}">${f.optionen.map(([w, t]) =>
          `<option value="${esc(w)}"${String(w) === String(f.wert) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
        if (f.art === "hinweis") return `<p class="klein leise">${esc(f.label)}</p>`;
        return `<label class="feld"><span>${esc(f.label)}</span><input name="${f.name}" value="${esc(f.wert ?? "")}" ${f.art === "zahl" ? 'inputmode="decimal"' : ""}></label>`;
      }).join("")}
      <div class="knopfreihe" style="justify-content:flex-end;margin-top:12px">
        <button value="abbruch" type="submit">Abbrechen</button><button value="ok" type="submit" class="primaer">${esc(okText)}</button>
      </div></form>`;
    d.onclose = () => {
      if (d.returnValue !== "ok") return res(null);
      const f = d.querySelector("form");
      const erg = {};
      for (const feld of felder) {
        if (feld.art === "hinweis") continue;
        const el = f.elements[feld.name];
        if (feld.art === "check") erg[feld.name] = el.checked;
        else if (feld.art === "zahl") erg[feld.name] = leseZahl(el.value);
        else erg[feld.name] = el.value;
      }
      res(erg);
    };
    d.returnValue = "";
    d.showModal();
    d.querySelector("input, select")?.focus();
  });
}

/* ---------- Dateien ---------- */
function dateiname(basis, endung) {
  const ascii = String(basis || "").trim()
    .replace(/[äÄöÖüÜß]/g, c => ({ ä: "ae", Ä: "Ae", ö: "oe", Ö: "Oe", ü: "ue", Ü: "Ue", ß: "ss" }[c]))
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  return (ascii || "ledplaner") + endung;
}
function herunterladen(inhalt, name, typ = "application/json") {
  const blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: typ });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function csvText(kopf, zeilen) {
  const feld = v => { const s = typeof v === "number" ? String(v).replace(".", ",") : String(v ?? ""); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return "﻿" + [kopf, ...zeilen].map(z => z.map(feld).join(";")).join("\r\n") + "\r\n";
}
function waehleDatei(input) {
  return new Promise(res => {
    input.value = "";
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return res(null);
      try { res({ name: f.name, text: await f.text() }); } catch (e) { res(null); }
    };
    input.click();
  });
}

/* Speicher im Browser (Autosave, Library) – darf fehlschlagen */
const speicher = {
  lesen(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  schreiben(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
