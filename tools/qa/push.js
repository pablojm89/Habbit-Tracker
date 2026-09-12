const assert = require("node:assert/strict");
const { createECDH } = require("node:crypto");
const { chromium } = require("playwright-core");
const { CHROME, BASE, SHOTS } = require("./env");
const key = createECDH("prime256v1"); key.generateKeys();
const publicKey = key.getPublicKey().toString("base64url");
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    let configured = false, remote = null, lastPayload, sent = 0, offline = false;
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/push-config.json")) return route.fulfill({ json: { serviceUrl: configured ? "https://push.example.test" : "" } });
      if (url.origin === "https://push.example.test") {
        if (offline) return route.abort();
        const method = route.request().method();
        if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": new URL(BASE).origin, "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE", "Access-Control-Allow-Headers": "content-type,authorization,x-enrollment" } });
        const headers = { "Access-Control-Allow-Origin": new URL(BASE).origin };
        if (url.pathname === "/config") return route.fulfill({ headers, json: { publicKey } });
        if (method === "PUT") {
          lastPayload = route.request().postDataJSON();
          if (!remote && !route.request().headers()["x-enrollment"]) return route.fulfill({ status: 401, headers, json: { error: "Codigo de activacion no valido" } });
          remote = { active: true, preferences: lastPayload.preferences, nextAt: Date.now() + 3600000 };
          return route.fulfill({ headers, json: remote });
        }
        if (method === "DELETE") { remote = null; return route.fulfill({ headers, json: { active: false } }); }
        if (method === "POST") { sent += 1; return route.fulfill({ headers, json: { accepted: true } }); }
        return route.fulfill({ status: remote ? 200 : 404, headers, json: remote || { error: "No registrado" } });
      }
      return url.href.startsWith(BASE) || (process.env.QA_ICONS === "1" && url.href === "https://unpkg.com/lucide@1.23.0/dist/umd/lucide.min.js") ? route.continue() : route.abort();
    });
    await context.addInitScript(({ publicKey }) => {
      localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false }));
      window.mockPermissionRequests = 0;
      window.mockPermission = "default";
      window.mockUnsubscribed = false;
      const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/") + "="), (char) => char.charCodeAt(0));
      const subscription = { endpoint: "https://web.push.apple.com/test-qa", options: { applicationServerKey: bytes }, toJSON: () => ({ endpoint: "https://web.push.apple.com/test-qa", keys: { p256dh: publicKey, auth: "a".repeat(22) } }), unsubscribe: async () => { window.mockUnsubscribed = true; return true; } };
      Object.defineProperty(window, "Notification", { configurable: true, value: { get permission() { return window.mockPermission; }, requestPermission: async () => { window.mockPermissionRequests += 1; window.mockPermission = "granted"; return "granted"; } } });
      if (!("PushManager" in window)) window.PushManager = function () {};
      Object.defineProperty(navigator.serviceWorker, "getRegistration", { configurable: true, value: async () => ({ active: true, pushManager: { getSubscription: async () => window.mockUnsubscribed ? null : subscription, subscribe: async () => { window.mockUnsubscribed = false; return subscription; } } }) });
    }, { publicKey });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${BASE}/index.html?noprompt=1`);
    await page.locator('[data-action="open-micro-breaks"]').click();
    await page.getByText("Servicio push pendiente de configurar", { exact: true }).waitFor();
    check(await page.locator('#microPushForm [type="submit"]').isDisabled(), "Sin servidor no finge activar push");
    check(await page.evaluate(() => window.mockPermissionRequests) === 0, "Abrir ajustes no pide permisos");
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      check(await page.locator("#appModal .modal-body").evaluate((body) => body.scrollWidth <= body.clientWidth + 1), `Push sin desbordes a ${width}px`);
      await page.screenshot({ path: `${SHOTS}/push-${width}.png`, animations: "disabled" });
    }
    await page.locator('[data-micro-action="preview"]').click();
    await page.locator('[data-micro-action="start"]').waitFor();
    check(await page.locator('[data-micro-action="start"]').isVisible(), "Pausa inmediata disponible sin backend");
    check(await page.evaluate(() => state.denseTrainingEntries.length) === 0, "Abrir pausa no registra entrenamiento");
    await page.locator('[data-micro-action="start"]').click();
    check(await page.evaluate(() => quickTimerState.running && quickTimerState.rounds === 5 && quickTimerState.context === null), "Pausa con reloj de cinco minutos sin inventar marca");
    await page.locator('.modal-head [data-action="close-modal"]').click();
    check(await page.evaluate(() => !quickTimerState.running), "Cerrar pausa detiene el reloj");
    configured = true;
    await page.locator('[data-action="open-micro-breaks"]').click();
    await page.locator('[name="enrollment"]').waitFor();
    await page.locator('[name="enrollment"]').fill("c".repeat(64));
    await page.locator('#microPushForm [type="submit"]').click();
    await page.locator('[data-micro-action="test"]').waitFor();
    check(await page.evaluate(() => window.mockPermissionRequests) === 1, "Permiso solo al activar");
    check(lastPayload.preferences.times.join(",") === "11:00,17:00", "Solo los horarios seleccionados llegan al servicio");
    check(Object.keys(lastPayload).sort().join(",") === "preferences,subscription", "El historial no sale al emisor push");
    const snapshot = await page.evaluate(() => ({ state: JSON.parse(localStorage.getItem("habbit-tracker-v2")), device: JSON.parse(localStorage.getItem("bittracker-push-device-v1")) }));
    check(!JSON.stringify(snapshot.state).includes(snapshot.device.token), "Credencial separada del backup y Sheets");
    await page.locator('[data-micro-action="test"]').click();
    await page.waitForFunction(() => !microPush.busy);
    check(sent === 1, "Boton de prueba envia al emisor");
    await page.locator('[name="time"]').nth(0).fill("10:00");
    await page.locator('#microPushForm [type="submit"]').click();
    await page.waitForFunction(() => !microPush.busy);
    check(remote.preferences.times[0] === "10:00", "Editar actualiza horarios del dispositivo");
    offline = true;
    await page.locator('[data-micro-action="disable"]').click();
    await page.waitForFunction(() => !microPush.busy);
    check(await page.locator('[data-micro-action="disable"]').count() === 1 && remote.active, "Sin red no muestra una baja falsa");
    offline = false;
    await page.locator('[data-micro-action="disable"]').click();
    await page.waitForFunction(() => !microPush.busy);
    check(remote === null && await page.evaluate(() => window.mockUnsubscribed), "Desactivar elimina alarma remota y suscripcion del navegador");
    check(await page.evaluate(() => !localStorage.getItem("bittracker-push-device-v1")), "Baja elimina credencial local");
    await page.evaluate(() => { window.mockPermission = "denied"; renderMicroBreaks(); });
    check(await page.locator('#microPushForm [type="submit"]').isDisabled(), "Permiso denegado no activa");
    check(errors.length === 0, `Sin errores JS: ${errors.join(", ")}`);
    await page.goto(`${BASE}/index.html?noprompt=1&micro=anillas-remo`);
    await page.locator('[data-micro-action="start"]').waitFor();
    check(await page.locator('[data-micro-action="start"]').isVisible(), "Enlace del push abre la pausa correspondiente");
    check(await page.evaluate(() => state.denseTrainingEntries.length) === 0, "Enlace push no crea registros");
    console.log(`PUSH: ${checks} checks OK (proveedor y permisos simulados)`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
