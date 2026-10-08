/* Start: Library laden, letztes Projekt aus dem Autosave holen, Oberfläche verdrahten.
   Mit Rex-Anbindung danach Library und Freischaltung aus dem Datenbank-Agent nachladen. */
function start() {
  libLaden();
  if (!autosaveLaden()) { P = neuesProjekt(); gespeicherterStand = null; }
  historieStart();
  ui.screen = P.screens[0]?.id || null;
  gerustEreignisse();
  touchEreignisse();
  baumEreignisse();
  for (const f of [aufbauEreignisse, riggingEreignisse, typeof stromEreignisse === "function" && stromEreignisse,
    typeof signalEreignisse === "function" && signalEreignisse, typeof ausgabeEreignisse === "function" && ausgabeEreignisse, mappingEreignisse,
    typeof kabelEreignisse === "function" && kabelEreignisse, typeof libraryEreignisse === "function" && libraryEreignisse,
    typeof einstellungenEreignisse === "function" && einstellungenEreignisse]) if (f) f();
  render();
  if (Datenquelle.verbunden()) rexVerbinden();
}

async function rexVerbinden() {
  try {
    const [liste, frei] = await Promise.all([Datenquelle.ladeLibrary(), Datenquelle.ladeFreischaltung()]);
    libLaden(liste); REX.freischaltung = frei; REX.fehler = null;
    if (!frei.ledplaner) toast("Nur ansehen – der LED-Planer ist für diesen Benutzer nicht freigeschaltet.", "fehler");
  } catch (e) {
    REX.fehler = e.message;
    toast("Rex-System nicht erreichbar – eingebaute Library wird genutzt. (" + e.message + ")", "fehler");
  }
  render();
}
start();
