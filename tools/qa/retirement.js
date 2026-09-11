const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { CHROME, BASE, SHOTS } = require("./env");
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await context.route("**/*", (route) => {
      const url = route.request().url();
      return url.startsWith(BASE) || (process.env.QA_ICONS === "1" && url === "https://unpkg.com/lucide@1.23.0/dist/umd/lucide.min.js") ? route.continue() : route.abort();
    });
    await context.addInitScript(() => localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false })));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const url = `${BASE}/index.html?experience=studio&noprompt=1`;
    const snapshot = () => page.evaluate(() => JSON.parse(localStorage.getItem("habbit-tracker-v2")));
    await page.goto(url);
    check(await page.locator(".app-shell").isVisible(), "El enlace antiguo abre la interfaz habitual");
    check(await page.locator("#studioRoot, .experience-switch, [data-studio-action]").count() === 0, "Estudio y su selector estan retirados");
    check(await page.evaluate(() => !window.bitTrackerStudio), "No se carga el editor retirado");
    const day = await page.evaluate(() => {
      const day = dateKey(selectedDate);
      const a = { id: "qa-a", exercise_id: "pull_up", nature: "bodyweight", scheme: "5D", group: "Grupo QA", studio_variant_id: "qa-pause", prescription: { repsPerSet: 8 } };
      const b = { ...a, id: "qa-b", prescription: { repsPerSet: 4 } };
      state.denseStudio = {
        version: 1,
        drafts: { [day]: { A: [a, b], B: [{ ...a, id: "qa-c", prescription: { repsPerSet: 6 } }] } },
        variants: [{ id: "qa-pause", exercise_id: "pull_up", name: "Pausa QA", conditions: "Pausa de 2 s" }],
        experiments: [{ id: "qa-experiment", exercise_id: "pull_up", nature: "bodyweight", scheme: "5D", name: "Prueba QA", start: day }],
      };
      state.denseDayPlans[day] = [a, b];
      state.denseRoutines = [denseNormalizeRoutine({ id: "qa-routine", name: "Rutina conservada QA", items: [a, b] })];
      saveAndRender();
      return day;
    });
    const planned = page.locator(".day-slide:not(.is-prev):not(.is-next) .is-planned");
    check(await planned.count() === 2, "Plan previo conservado");
    await planned.nth(1).locator('[data-action="open-dense-exercise-modal"]').click();
    check(await page.locator('[name="repsPerSet"]').inputValue() === "4", "El objetivo guardado sigue llegando al formulario");
    check(await page.locator('[name="studioVariant"], [name="studioTechnique"]').count() === 0, "Formulario habitual sin controles de Estudio");
    await page.locator('#denseTrainingForm [type="submit"]').click();
    await page.waitForFunction(() => Boolean(document.querySelector("#denseFeedbackForm")));
    await page.locator('.modal-head [data-action="close-modal"]').click();
    let saved = await snapshot();
    const entryId = saved.denseTrainingEntries[0].id;
    check(saved.denseTrainingEntries[0].plan_ref === "qa-b" && saved.denseTrainingEntries[0].total_reps === 20, "Registro vinculado al bloque correcto");
    check(saved.denseTrainingEntries[0].studio_variant_id === "qa-pause", "Variante del plan conservada sin interfaz nueva");
    check(await planned.count() === 1, "El otro bloque sigue pendiente");
    await page.evaluate(() => {
      state.denseTrainingEntries[0].technique_quality = "clean";
      state.denseStudio.variants[0].conditions = "Condiciones futuras";
      saveState();
    });
    const before = await snapshot();
    await page.reload();
    await page.evaluate((id) => openDenseTrainingModal({ entryId: id }), entryId);
    await page.locator('#denseTrainingForm [name="notes"]').fill("Editado en la interfaz habitual");
    const fits = await page.locator("#appModal .modal-body").evaluate((body) => body.scrollWidth <= body.clientWidth + 1);
    check(fits, "Formulario movil sin desborde");
    await page.locator('#denseTrainingForm [type="submit"]').click();
    saved = await snapshot();
    check(saved.denseTrainingEntries.length === 1 && saved.denseTrainingEntries[0].id === entryId, "Editar no duplica ni borra marcas");
    check(saved.denseTrainingEntries[0].notes === "Editado en la interfaz habitual", "La edicion sigue funcionando");
    for (const field of ["plan_ref", "studio_variant_id", "studio_variant_name", "studio_conditions", "technique_quality", "prescription_snapshot"]) {
      check(JSON.stringify(saved.denseTrainingEntries[0][field]) === JSON.stringify(before.denseTrainingEntries[0][field]), `Metadato historico conservado: ${field}`);
    }
    check(JSON.stringify(saved.denseStudio) === JSON.stringify(before.denseStudio), "Borradores, variantes y experimentos conservados en el backup");
    check(saved.denseRoutines[0].items[1].prescription.repsPerSet === 4, "Rutina conserva sus objetivos");
    check(saved.denseDayPlans[day][0].group === "Grupo QA", "Plan conserva sus datos adicionales");
    check(await page.evaluate(() => {
      const restored = normalizeState(JSON.parse(JSON.stringify(state)));
      return stateHasTrainingData(restored) && restored.denseTrainingEntries.length === 1 && restored.denseStudio.experiments.length === 1;
    }), "Normalizacion de backup conserva los datos");
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Pantalla sin desborde a ${width}px`);
      await page.screenshot({ path: `${SHOTS}/retirement-${width}.png`, fullPage: true });
    }
    check(errors.length === 0, `Sin errores JS: ${errors.join(", ")}`);
    await context.close();

    const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await offline.route("**/*", (route) => route.request().url().startsWith(BASE) ? route.continue() : route.abort());
    await offline.addInitScript(() => localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false })));
    const offlinePage = await offline.newPage();
    await offlinePage.goto(`${BASE}/icon.svg`);
    await offlinePage.evaluate(async () => {
      const cache = await caches.open("bittracker-mobile-20260911-estudio-46");
      await cache.put("./index.html", new Response('<main id="studioRoot">Version retirada</main>', { headers: { "Content-Type": "text/html" } }));
    });
    await offlinePage.goto(url);
    await offlinePage.waitForFunction(() => navigator.serviceWorker.controller && !window.__bitTrackerReloading && typeof render === "function");
    const cache = await offlinePage.evaluate(async () => ({
      keys: await caches.keys(),
      core: Boolean(await caches.match(new URL("./studio-core.js?v=20260911-clasica-47", location.href).href)),
    }));
    check(!cache.keys.includes("bittracker-mobile-20260911-estudio-46"), "La cache anterior se retira al activar la nueva version");
    check(cache.keys.includes("bittracker-mobile-20260911-clasica-47") && cache.core, "Compatibilidad precacheada para uso sin conexion");
    await offline.setOffline(true);
    await offlinePage.goto(`${url}&offline=1`);
    check(await offlinePage.locator(".app-shell").isVisible(), "El enlace antiguo tambien abre la app habitual sin conexion");
    check(await offlinePage.locator("#studioRoot, .experience-switch").count() === 0, "Estudio no reaparece desde la cache");
    await offline.close();
    console.log(`RETIREMENT: ${checks} checks OK`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
