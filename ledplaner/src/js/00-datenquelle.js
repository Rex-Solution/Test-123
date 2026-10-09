/* Rex-Anbindung: einzige Stelle, die später auf den Datenbank-Agent umgestellt wird.
   Ohne API_BASIS_URL läuft der LED-Planer eigenständig: eingebaute Library + Browser-Speicher + Dateien.
   Das Rex-System kann beim Einbetten vor dem Laden `window.REX_KONFIG = { API_BASIS_URL, ... }` setzen.

   Erwartete Routen (TODO: Route/Antwortformat mit dem Datenbank-Agent abstimmen):
     GET  {API}/material                      → [Rex-Materialeintrag]   (nur Einträge mit attribute.led.typ werden genutzt)
     GET  {API}/freischaltung                 → { module: ["ledplaner", ...] }
     GET  {API}/projekte?modul=ledplaner      → [{ id, titel, geaendert }]
     GET  {API}/projekte/{id}                 → Projektdatei (format "rex-ledplaner")
     PUT  {API}/projekte/{id}                 → { id }   (ohne id: POST {API}/projekte)
     POST {API}/material-rueckgabe            → { ok }   (Materialliste, format "rex-materialliste") */

const KONFIG = {
  API_BASIS_URL: null,        // z.B. "http://rex-server/api" – null = eigenständig
  NAS_BASIS_URL: "",          // Präfix für relative Grafikpfade aus der Datenbank
  MODUL: "ledplaner",
  ...(typeof window !== "undefined" && window.REX_KONFIG && typeof window.REX_KONFIG === "object" ? window.REX_KONFIG : {}),
};

const Datenquelle = {
  verbunden() { return !!KONFIG.API_BASIS_URL; },
  async anfrage(pfad, opt = {}) {
    const antwort = await fetch(`${KONFIG.API_BASIS_URL}${pfad}`, {
      ...opt, headers: { "Content-Type": "application/json", ...(opt.headers || {}) },
    });
    if (!antwort.ok) throw new Error(`Datenbank-Agent: HTTP ${antwort.status}`);
    return antwort.status === 204 ? null : antwort.json();
  },
  /* null = keine Rex-Library (eigenständig) */
  async ladeLibrary() {
    if (!this.verbunden()) return null;
    const liste = await this.anfrage("/material");
    return (Array.isArray(liste) ? liste : []).filter(e => e && e.id && e.attribute?.led?.typ);
  },
  /* Eigenständig ist der LED-Planer freigeschaltet; die Verknüpfung mit dem Signalfluss-Planer folgt später */
  async ladeFreischaltung() {
    if (!this.verbunden()) return { ledplaner: true, signalplaner: false, quelle: "eigenständig" };
    const d = await this.anfrage("/freischaltung");
    const module = Array.isArray(d?.module) ? d.module : [];
    return { ledplaner: module.includes("ledplaner"), signalplaner: module.includes("signalplaner"), quelle: "Rex" };
  },
  async ladeProjektListe() { return this.anfrage(`/projekte?modul=${encodeURIComponent(KONFIG.MODUL)}`); },
  async ladeProjekt(id) { return this.anfrage(`/projekte/${encodeURIComponent(id)}`); },
  async speichereProjekt(text, id) {
    const erg = await this.anfrage(id ? `/projekte/${encodeURIComponent(id)}` : "/projekte", { method: id ? "PUT" : "POST", body: text });
    return erg?.id || id;
  },
  async materialZurueckgeben(liste) { return this.anfrage("/material-rueckgabe", { method: "POST", body: JSON.stringify(liste) }); },
};

/* Zustand der Anbindung (wird beim Start gefüllt) */
const REX = { freischaltung: { ledplaner: true, signalplaner: false, quelle: "eigenständig" }, fehler: null };
const nurLesen = () => !REX.freischaltung.ledplaner;
