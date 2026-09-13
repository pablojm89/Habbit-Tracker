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
    let configured = false, remote = null, lastPayload, sent = 0, offline = false, balances = 0, lastBalance;
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
          remote = { active: true, preferences: lastPayload.preferences, nextAt: Date.now() + 3600000, balanceAt: lastPayload.balance?.generatedAt };
          return route.fulfill({ headers, json: remote });
        }
        if (method === "DELETE") { remote = null; return route.fulfill({ headers, json: { active: false } }); }
        if (method === "POST" && url.pathname.endsWith("/balance")) {
          balances += 1;
          lastBalance = route.request().postDataJSON().balance;
          remote.balanceAt = lastBalance.generatedAt;
          return route.fulfill({ headers, json: remote });
        }
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
    await page.clock.install();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(`${BASE}/index.html?noprompt=1`);
    await page.locator('[data-action="open-micro-breaks"]').click();
    await page.getByText("Servicio push pendiente de configurar", { exact: true }).waitFor();
    check(await page.locator('#microPushForm [type="submit"]').isDisabled(), "Sin servidor no finge activar push");
    check(await page.evaluate(() => window.mockPermissionRequests) === 0, "Abrir ajustes no pide permisos");
    check(await page.locator('[name="durations"]:checked').count() === 2, "Instalacion nueva ofrece ambas duraciones");
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      check(await page.locator("#appModal .modal-body").evaluate((body) => body.scrollWidth <= body.clientWidth + 1), `Push sin desbordes a ${width}px`);
      await page.screenshot({ path: `${SHOTS}/push-${width}.png`, animations: "disabled" });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const minutes of [2, 5]) {
      await page.locator(`[name="durations"][value="${minutes}"]`).check();
      await page.locator(`[name="durations"][value="${minutes === 2 ? 5 : 2}"]`).uncheck();
      await page.locator('[data-micro-action="preview"]').click();
      await page.locator('[data-micro-action="start"]').waitFor();
      check(await page.locator('[data-micro-action="start"]').innerText() === `Iniciar ${minutes} minutos`, `Boton y pausa de ${minutes} minutos coinciden`);
      check((await page.locator('.micro-session').innerText()).includes(`${minutes} rondas`), `Instrucciones de ${minutes} rondas`);
      check(await page.evaluate(() => state.denseTrainingEntries.length) === 0, "Abrir pausa no registra entrenamiento");
      await page.screenshot({ path: `${SHOTS}/pause-${minutes}min-390.png`, animations: "disabled" });
      const isHold = await page.locator('[data-micro-hold]').count() > 0;
      await page.locator('[data-micro-action="start"]').click();
      check(await page.evaluate(({ minutes, isHold }) => quickTimerState.running && quickTimerState.rounds === minutes && quickTimerState.scheme === `${minutes}D` && Boolean(quickTimerState.context) === isHold, { minutes, isHold }), `Reloj de ${minutes} minutos sin inventar marca`);
      if (isHold) await page.clock.fastForward(5000);
      await page.clock.fastForward(120000);
      check(await page.evaluate((minutes) => quickTimerState.running === (minutes === 5), minutes), `A los 120 segundos ${minutes === 2 ? "termina" : "sigue"} el bloque de ${minutes} minutos`);
      if (minutes === 5) await page.clock.fastForward(180000);
      check(await page.evaluate(() => !quickTimerState.running && quickTimerState.remainingSeconds === 0), `Final correcto de ${minutes} minutos`);
      await page.locator('.modal-head [data-action="close-modal"]').click();
      await page.locator('[data-action="open-micro-breaks"]').click();
      await page.getByText("Servicio push pendiente de configurar", { exact: true }).waitFor();
    }
    await page.locator('[name="durations"][value="2"]').uncheck();
    await page.locator('[name="durations"][value="5"]').uncheck();
    await page.locator('[data-micro-action="preview"]').click();
    check(await page.locator('#microPushForm').isVisible(), "No inicia pausas sin duracion elegida");
    await page.locator('.modal-head [data-action="close-modal"]').click();
    configured = true;
    await page.locator('[data-action="open-micro-breaks"]').click();
    await page.locator('[name="enrollment"]').waitFor();
    await page.locator('[name="enrollment"]').fill("c".repeat(64));
    await page.locator('[name="durations"][value="2"]').check();
    await page.locator('[name="durations"][value="5"]').uncheck();
    await page.locator('#microPushForm [type="submit"]').click();
    await page.locator('[data-micro-action="test"]').waitFor();
    check(await page.evaluate(() => window.mockPermissionRequests) === 1, "Permiso solo al activar");
    check(lastPayload.preferences.times.join(",") === "11:00,17:00", "Solo los horarios seleccionados llegan al servicio");
    check(lastPayload.preferences.durations.join(",") === "2", "Alta envia solo la duracion seleccionada");
    check(Object.keys(lastPayload).sort().join(",") === "balance,preferences,subscription" && Object.keys(lastPayload.balance).sort().join(",") === "days,generatedAt", "Solo resumen agregado, no historial completo, llega al emisor push");
    const snapshot = await page.evaluate(() => ({ state: JSON.parse(localStorage.getItem("habbit-tracker-v2")), device: JSON.parse(localStorage.getItem("bittracker-push-device-v1")) }));
    check(!JSON.stringify(snapshot.state).includes(snapshot.device.token), "Credencial separada del backup y Sheets");
    check(snapshot.state.settings.microBreaks.durations.join(",") === "2", "Preferencia de dos minutos persiste en el backup");
    await page.locator('[data-micro-action="test"]').click();
    await page.waitForFunction(() => !microPush.busy);
    check(sent === 1, "Boton de prueba envia al emisor");
    await page.locator('[name="time"]').nth(0).fill("10:00");
    await page.locator('[name="durations"][value="5"]').check();
    await page.locator('#microPushForm [type="submit"]').click();
    await page.waitForFunction(() => !microPush.busy);
    check(remote.preferences.times[0] === "10:00", "Editar actualiza horarios del dispositivo");
    check(remote.preferences.durations.join(",") === "2,5", "Editar permite recibir ambas duraciones");
    await page.locator('[name="equipment"][value="barra"]').check();
    await page.locator('#microPushForm [type="submit"]').click();
    await page.waitForFunction(() => !microPush.busy);
    check(remote.preferences.equipment.includes("barra"), "Barra persiste y llega al servidor");
    await page.evaluate(() => {
      const date = MicroBreaks.dayKey(Date.now(), "Europe/Madrid");
      state.denseTrainingEntries = ["pull_up", "floor_push_up", "toes_to_bar_strict"].map((exercise_id, i) => computeDenseEntry({ id: `seed-${i}`, date, exercise_id, nature: "bodyweight", scheme: "10D", total_reps: 50, target_total_reps: 50, effort: "N", notes: "nota-privada", bodyweight_kg: 80 }));
      saveState();
    });
    await page.clock.fastForward(1000);
    await page.waitForFunction(() => !microPush.syncing);
    check(balances > 0 && lastBalance.days[0].load.pull === 10 && !JSON.stringify(lastBalance).includes("nota-privada"), "Guardar entrenamiento sincroniza solo carga agregada");
    await page.locator('[name="kinds"][value="movilidad"]').uncheck();
    await page.locator('[data-micro-action="preview"]').click();
    check(await page.locator('#appModal h2').innerText() === "Sentadillas sin peso", "Entrenar empuje/tiron/core prioriza piernas en la app");
    await page.evaluate(() => openMicroSession("sentadillas-2min"));
    await page.locator('[data-micro-action="start"]').click();
    check(await page.locator('[data-micro-action="review"]').isDisabled(), "No registra una pausa aun no terminada");
    await page.clock.fastForward(120000);
    check(await page.evaluate(() => state.denseTrainingEntries.length) === 3, "Terminar el reloj no inventa reps ni marcas");
    await page.reload();
    await page.locator('[data-action="open-quick-timer"]').click();
    check(await page.evaluate(() => quickTimerState.microSession?.id === "sentadillas-2min" && !quickTimerState.running), "Recargar conserva protocolo, fecha y reloj pausado");
    await page.locator('[data-micro-action="review"]').click();
    check(await page.locator('[name="totalReps"]').inputValue() === "", "Registro pide reps reales en blanco");
    await page.locator('#denseTrainingForm [type="submit"]').click();
    check(await page.locator('#denseTrainingForm').count() === 1 && await page.evaluate(() => state.denseTrainingEntries.length) === 3, "No guarda reps sin introducirlas");
    await page.locator('[name="totalReps"]').fill("12");
    await page.locator('#denseTrainingForm [type="submit"]').click();
    await page.waitForFunction(() => state.denseTrainingEntries.length === 4);
    const recorded = await page.evaluate(() => state.denseTrainingEntries.find((entry) => entry.source === "micro_break"));
    check(recorded.total_reps === 12 && recorded.scheme === "2D" && recorded.effort === "E" && !recorded.failed && recorded.timer_session_id, "Pausa comparte historial, esfuerzo real y menos reps no es fallo automatico");
    check(await page.evaluate(() => normalizeState(JSON.parse(localStorage.getItem("habbit-tracker-v2"))).denseTrainingEntries.some((entry) => entry.source === "micro_break" && entry.total_reps === 12)), "Backup conserva la pausa como marca Dense compartida");
    check(await page.evaluate(() => denseMicroBalanceSnapshot().days[0].load.legs) === .9, "La pausa registrada cuenta en la siguiente prioridad");
    await page.evaluate(() => reviewMicroSession());
    await page.locator('[name="totalReps"]').fill("14");
    await page.locator('#denseTrainingForm [type="submit"]').click();
    check(await page.evaluate(() => state.denseTrainingEntries.length) === 4, "Reabrir pausa edita sin duplicar");
    await page.evaluate(async () => {
      state.denseTrainingEntries = [{ exercise_id: "pull_up", date: MicroBreaks.dayKey(Date.now(), "Europe/Madrid"), scheme: "5D", total_reps: 10, effort: "H" }];
      await openMicroSession("toes-to-bar-2min");
    });
    check(await page.locator('[data-micro-action="start"]').isDisabled(), "Un enlace push anterior no salta el bloqueo por tiron duro reciente");
    await page.evaluate(async () => { state.denseTrainingEntries = []; saveState(); await openMicroBreaks(); });
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
    check(await page.locator('[data-micro-action="start"]').innerText() === "Iniciar 5 minutos", "Enlace antiguo conserva cinco minutos");
    check(await page.evaluate(() => state.denseTrainingEntries.length) === 0, "Enlace push no crea registros");
    await page.goto(`${BASE}/index.html?noprompt=1&micro=anillas-remo-2min`);
    await page.locator('[data-micro-action="start"]').waitFor();
    check(await page.locator('[data-micro-action="start"]').innerText() === "Iniciar 2 minutos", "Enlace push corto conserva dos minutos");
    await page.evaluate(async () => { state.settings.microBreaks.equipment = ["suelo"]; await openMicroSession("toes-to-bar"); });
    check(await page.locator('[data-micro-action="start"]').isDisabled(), "No inicia TTB sin barra seleccionada");
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    for (const [id, exercise, seconds, minutes] of [["front-lever-2min", "front_lever_full", 7, 2], ["handstand", "straddle_handstand", 22, 5]]) {
      await page.evaluate(async (id) => {
        state.denseTrainingEntries = [];
        state.settings.microBreaks.equipment = ["suelo", "barra", "anillas"];
        selectedDate = parseDate("2026-01-01");
        saveState();
        await openMicroSession(id);
      }, id);
      await page.locator('[data-micro-exercise]').selectOption(exercise);
      await page.locator('[data-micro-hold]').fill("0");
      await page.locator('[data-micro-action="start"]').click();
      check(await page.locator('[data-micro-hold]').count() === 1, `${id}: no arranca con segundos invalidos`);
      await page.locator('[data-micro-hold]').fill(String(seconds));
      check((await page.locator('[data-micro-instruction]').innerText()).includes(`${seconds} s`), `${id}: instrucciones coherentes con el objetivo`);
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        check(await page.locator('#appModal .modal-body').evaluate((body) => body.scrollWidth <= body.clientWidth + 1), `${id}: sin desborde a ${width}px`);
        await page.screenshot({ path: `${SHOTS}/${id}-${width}.png`, animations: "disabled" });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => { window.holdPauseCues = []; playQuickTimerCue = (kind) => window.holdPauseCues.push(kind); });
      await page.locator('[data-micro-action="start"]').click();
      check(await page.evaluate(({ exercise, seconds }) => quickTimerState.holdSeconds === seconds && quickTimerState.context.exerciseId === exercise && denseTimerFrame(quickTimerState, quickTimerElapsedNow()).preparing, { exercise, seconds }), `${id}: variante, segundos y preparacion de 5 s`);
      await page.clock.fastForward(5000);
      await page.clock.fastForward((seconds - 2) * 1000);
      await page.locator('[data-action="quick-timer-fall"]').click();
      check(await page.evaluate((seconds) => quickTimerState.roundResults[0].seconds === seconds - 2, seconds), `${id}: caida registra segundos reales`);
      check(await page.locator('[data-action="apply-timer-hold"]').isDisabled(), `${id}: no guarda una pausa sin terminar`);
      await page.clock.fastForward((60 - seconds + 2) * 1000);
      await page.clock.fastForward(seconds * 1000);
      check(await page.evaluate((seconds) => quickTimerState.roundResults[1].seconds === seconds && window.holdPauseCues.includes("hold-end"), seconds), `${id}: aviso al objetivo y segunda ronda automatica`);
      await page.clock.fastForward((minutes * 60 - 60 - seconds) * 1000);
      check(await page.evaluate(() => state.denseTrainingEntries.length === 0 && !quickTimerState.running), `${id}: terminar no crea historial`);
      await page.reload();
      await page.locator('[data-action="open-quick-timer"]').click();
      check(await page.evaluate((exercise) => quickTimerState.microSession.exerciseId === exercise && quickTimerState.context.exerciseId === exercise, exercise), `${id}: recarga conserva la variante elegida`);
      await page.locator('[data-action="apply-timer-hold"]').click();
      check(await page.locator('[data-hold-round="0"]').inputValue() === String(seconds - 2), `${id}: segundos reales llegan al formulario`);
      check(await page.locator('[name="effort"][value="E"]').isChecked() && await page.locator('[name="isTest"]').count() === 0, `${id}: esfuerzo editable, no marca test`);
      await page.locator('#denseTrainingForm [type="submit"]').click();
      const entry = await page.evaluate(() => state.denseTrainingEntries[0]);
      check(entry.exercise_id === exercise && entry.total_hold_seconds === minutes * seconds - 2 && entry.source === "micro_break" && entry.date !== "2026-01-01", `${id}: marca compartida con fecha actual, variante y TUT real`);
      await page.evaluate(() => { openQuickTimerModal(); applyTimerHoldToDenseForm(); });
      await page.locator('#denseTrainingForm [type="submit"]').click();
      check(await page.evaluate(() => state.denseTrainingEntries.length === 1), `${id}: editar no duplica`);
    }
    check(errors.length === 0, `Sin errores nuevos JS: ${errors.join(", ")}`);
    console.log(`PUSH: ${checks} checks OK (proveedor y permisos simulados)`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
