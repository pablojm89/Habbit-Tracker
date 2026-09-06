// Entorno común de los scripts de QA. Sobrescribible por variables de entorno:
//   QA_BASE   URL del servidor estático (por defecto http://localhost:4173)
//   QA_CHROME ruta al binario de Chromium (por defecto el de Playwright en /opt/pw-browsers)
const fs = require("fs");
const path = require("path");

function findChrome() {
  if (process.env.QA_CHROME) return process.env.QA_CHROME;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers", path.join(process.env.HOME || "", ".cache/ms-playwright")].filter(Boolean);
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter((d) => d.startsWith("chromium")).sort().reverse();
    for (const dir of dirs) {
      for (const bin of ["chrome-linux/chrome", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-win/chrome.exe"]) {
        const full = path.join(root, dir, bin);
        if (fs.existsSync(full)) return full;
      }
    }
  }
  throw new Error("No encuentro Chromium: define QA_CHROME o instala playwright chromium");
}

const SHOTS = path.join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

module.exports = { CHROME: findChrome(), BASE: process.env.QA_BASE || "http://localhost:4173", SHOTS };
