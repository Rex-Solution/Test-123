/* Start: Library laden, letztes Projekt aus dem Autosave holen, Oberfläche verdrahten. */
function start() {
  libLaden();
  if (!autosaveLaden()) { P = neuesProjekt(); gespeicherterStand = null; }
  historieStart();
  ui.screen = P.screens[0]?.id || null;
  gerustEreignisse();
  for (const f of [aufbauEreignisse, typeof stromEreignisse === "function" && stromEreignisse,
    typeof signalEreignisse === "function" && signalEreignisse, typeof ausgabeEreignisse === "function" && ausgabeEreignisse,
    typeof kabelEreignisse === "function" && kabelEreignisse, typeof libraryEreignisse === "function" && libraryEreignisse,
    typeof einstellungenEreignisse === "function" && einstellungenEreignisse]) if (f) f();
  render();
}
start();
