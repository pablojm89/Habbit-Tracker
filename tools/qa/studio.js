const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { CHROME, BASE, SHOTS } = require("./env");
const KEY = "habbit-tracker-v2";
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks += 1; };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "es-ES", serviceWorkers: "block" });
    await context.route("**/*", (route) => {
      const url = route.request().url();
      return url.startsWith(BASE) || (process.env.QA_ICONS === "1" && url === "https://unpkg.com/lucide@1.23.0/dist/umd/lucide.min.js") ? route.continue() : route.abort();
    });
    await context.addInitScript(() => localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false })));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const goto = () => page.goto(`${BASE}/index.html?experience=studio&noprompt=1`);
    const close = async () => { if (await page.locator("#appModal").evaluate((modal) => modal.open)) await page.locator('.modal-head [data-action="close-modal"]').click(); };
    const act = (name) => page.locator(`[data-studio-action="${name}"]`);
    const mode = (name) => page.locator(`button[data-experience="${name}"]`);
    const rows = () => page.locator(".studio-row");
    const field = (name, index = 0) => rows().nth(index).locator(`[data-studio-field="${name}"]`);
    const setNumber = async (name, value, index = 0) => { const input = field(name, index); await input.fill(String(value)); await input.press("Tab"); };
    const snapshot = () => page.evaluate(() => JSON.parse(localStorage.getItem("habbit-tracker-v2")));
    await goto();
    check(await mode("studio").getAttribute("aria-pressed") === "true", "Entrada directa a Estudio");
    await page.locator('.studio-tabs [data-page="library"]').click();
    await act("variant-edit").click();
    await page.locator('[data-studio-form="variant"] [name="name"]').fill("Dominada pausada QA");
    await page.locator('[data-studio-form="variant"] [name="exercise_id"]').selectOption("pull_up");
    await page.locator('[data-studio-form="variant"] [name="conditions"]').fill("Pausa 2 s, recorrido completo");
    await page.locator('[data-studio-form="variant"] [type="submit"]').click();
    let state = await snapshot();
    const variant = state.denseStudio.variants[0];
    check(variant.name === "Dominada pausada QA", "Variante persistida");
    await page.locator('.studio-tabs [data-page="session"]').click();
    await act("picker").click();
    await page.locator('#appModal [data-studio-search]').fill("pausada");
    await page.locator(`#appModal [data-studio-action="add"][data-variant="${variant.id}"]`).click();
    check(await page.locator("#appModal").evaluate((modal) => modal.open), "Añadir al borrador no cierra el selector");
    await close();
    await field("scheme").selectOption("5D");
    await setNumber("target", 8);
    await act("duplicate").click();
    await setNumber("target", 4, 1);
    for (let index = 0; index < 2; index += 1) await rows().nth(index).locator("[data-studio-select]").check();
    await act("group").click();
    await page.locator('[data-studio-form="group"] [name="name"]').fill("Superserie QA");
    await page.locator('[data-studio-form="group"] [type="submit"]').click();
    await act("routine-save").click();
    await page.locator('[data-studio-form="routine"] [name="name"]').fill("Bloque compartido QA");
    await page.locator('[data-studio-form="routine"] [type="submit"]').click();
    state = await snapshot();
    check(state.denseRoutines[0].items[1].prescription.repsPerSet === 4, "Rutina conserva objetivo");
    check(state.denseRoutines[0].items[0].studio_variant_id === variant.id, "Rutina conserva variante");
    check(state.denseTrainingEntries.length === 0, "Diseñar y guardar una rutina no registra entrenamiento");
    const day = state.settings.selectedDate;
    await act("copy-other").click();
    await page.locator('[data-studio-action="slot"][data-slot="B"]').click();
    await setNumber("target", 6);
    state = await snapshot();
    check(state.denseStudio.drafts[day].A[0].prescription.repsPerSet === 8, "A no cambia al editar B");
    check(state.denseStudio.drafts[day].B[0].prescription.repsPerSet === 6, "B conserva su objetivo");
    check(state.denseStudio.drafts[day].A[0].id !== state.denseStudio.drafts[day].B[0].id, "Las copias tienen identidad propia");
    await page.locator('.studio-tabs [data-page="compare"]').click();
    check((await page.locator(".studio-compare-table").innerText()).includes("8 rep/min"), "Comparación muestra A");
    check((await page.locator(".studio-compare-table").innerText()).includes("6 rep/min"), "Comparación muestra B");
    await act("edit-a").click();
    await act("publish").click();
    state = await snapshot();
    const plan = state.denseDayPlans[day];
    check(plan.length === 2 && plan[0].group === "Superserie QA", "Plan compartido conserva grupo y bloques");
    await mode("classic").click();
    const planned = page.locator(".day-slide:not(.is-prev):not(.is-next) .is-planned");
    check(await planned.count() === 2, "Los dos bloques aparecen en Actual");
    check((await planned.nth(0).innerText()).includes("8 rep/min"), "Objetivo manual visible en Actual");
    await planned.nth(1).locator('[data-action="open-dense-exercise-modal"]').click();
    check(await page.locator('[name="repsPerSet"]').inputValue() === "4", "Registrar segundo bloque usa su propio objetivo");
    check(await page.locator('[name="studioVariant"]').inputValue() === variant.id, "Variante disponible en formulario de Actual");
    await page.locator('[name="studioTechnique"]').selectOption("clean");
    await page.locator('#denseTrainingForm [type="submit"]').click();
    await page.waitForFunction(() => Boolean(document.querySelector("#denseFeedbackForm")));
    await close();
    state = await snapshot();
    check(state.denseTrainingEntries.length === 1, "Una única marca real");
    const entry = state.denseTrainingEntries[0];
    check(entry.plan_ref === plan[1].id && entry.total_reps === 20, "Registro vinculado al segundo bloque");
    check(entry.studio_variant_id === variant.id && entry.technique_quality === "clean", "Condiciones persistidas");
    check(await planned.count() === 1 && (await planned.innerText()).includes("8 rep/min"), "Queda pendiente el primer bloque repetido");
    await mode("studio").click();
    check(await page.locator(".studio-logged .studio-log-row").count() === 1, "Marca de Actual visible en Estudio");
    await rows().nth(1).locator('[data-studio-action="register"]').click();
    await page.locator('#denseTrainingForm [name="notes"]').fill("Editada desde Estudio");
    await page.locator('#denseTrainingForm [type="submit"]').click();
    state = await snapshot();
    check(state.denseTrainingEntries.length === 1 && state.denseTrainingEntries[0].notes === "Editada desde Estudio", "Editar no duplica marcas");
    await goto();
    state = await snapshot();
    check(state.denseStudio.drafts[day].B[0].prescription.repsPerSet === 6, "B sobrevive a recarga");
    const compatible = await page.evaluate(() => {
      const pair = state.denseStudio.drafts[state.settings.selectedDate];
      const withVariant = denseStudioComparableEntries(pair.A[1]);
      const withoutVariant = denseStudioComparableEntries({ ...pair.A[1], studio_variant_id: "" });
      const restored = normalizeState(JSON.parse(JSON.stringify(state)));
      return { personal: withVariant.length, base: withoutVariant.length, target: restored.denseRoutines[0].items[1].prescription.repsPerSet, id: restored.denseTrainingEntries[0].id };
    });
    check(compatible.personal === 1 && compatible.base === 0, "Historial separa condiciones comparables");
    check(compatible.target === 4 && compatible.id === entry.id, "Ida y vuelta por backup conserva extensión y marca");
    await page.locator('.studio-tabs [data-page="experiments"]').click();
    await act("experiment-edit").click();
    await page.locator('[data-studio-form="experiment"] [name="name"]').fill("Pausa QA");
    await page.locator('[data-studio-form="experiment"] [name="hypothesis"]').fill("Observar las repeticiones con pausa");
    await page.locator('[data-studio-form="experiment"] [type="submit"]').click();
    await act("experiment-review").click();
    check((await page.locator(".studio-modal-content").innerText()).includes("Durante · 1 registros"), "Experimento lee marcas compartidas y comparables");
    await close();
    const second = await context.newPage();
    await second.goto(`${BASE}/index.html?noprompt=1`);
    await second.evaluate(() => { state.denseTrainingEntries[0].notes = "Cambio desde otra pestaña"; saveAndRender(); });
    await page.waitForFunction(() => state.denseTrainingEntries[0]?.notes === "Cambio desde otra pestaña");
    check(true, "Otra pestaña actualiza el estado compartido");
    await second.close();
    await page.locator('.studio-tabs [data-page="session"]').click();
    await rows().nth(0).locator('[data-studio-action="remove"]').click();
    check(await rows().count() === 1, "Quitar bloque solo modifica el borrador");
    await act("undo").click();
    check(await rows().count() === 2, "Deshacer restaura el borrador");
    const latest = await snapshot();
    check(latest.denseTrainingEntries[0].notes === "Cambio desde otra pestaña", "Editar borradores no pierde cambios compartidos");
    const metadata = await page.evaluate(() => {
      const entry = state.denseTrainingEntries[0];
      const variant = state.denseStudio.variants[0];
      const conditions = variant.conditions;
      try {
        variant.conditions = "Condiciones actualizadas para sesiones futuras";
        const preserved = denseStudioEntryMetadata({ exerciseId: entry.exercise_id, studioVariant: variant.id }, entry);
        denseSetModalContext.planItem = { id: "unrelated", exercise_id: "bench_press", studio_variant_id: variant.id };
        const unrelated = denseStudioEntryMetadata({ exerciseId: "pull_up" });
        return { keptConditions: preserved.studio_conditions === entry.studio_conditions, unlinked: !unrelated.plan_ref && !unrelated.prescription_snapshot && !unrelated.studio_variant_id };
      } finally {
        variant.conditions = conditions;
        denseSetModalContext.planItem = null;
      }
    });
    check(metadata.keptConditions, "Editar una marca mantiene sus condiciones históricas");
    check(metadata.unlinked, "Cambiar ejercicio no hereda la referencia de otro bloque");
    const prescriptions = await page.evaluate(() => {
      const cases = [
        { exercise_id: "pull_up", nature: "bodyweight", scheme: "5D", prescription: { repsPerSet: 9 } },
        { exercise_id: "pull_up", nature: "weighted_calisthenics", scheme: "5D3", prescription: { addedLoadKg: 22.5 } },
        { exercise_id: "pull_up", nature: "assisted", scheme: "5D3", prescription: { assistLoadKg: 12 } },
        { exercise_id: "bench_press", nature: "weighted", scheme: "S5x5", prescription: { externalLoadKg: 62.5, restSeconds: 105 } },
        { exercise_id: "front_lever_adv_tuck", nature: "skill", scheme: "5D", prescription: { holdSecondsPerRound: 7 } },
      ];
      const results = cases.map((item) => {
        openDenseTrainingModal({ exerciseId: item.exercise_id, planItem: item });
        const form = document.querySelector("#denseTrainingForm");
        const before = Object.entries(item.prescription).every(([key, value]) => Number(form.querySelector(`[name='${key}']${key === "restSeconds" ? ":checked" : ""}`)?.value) === value);
        const readiness = form.querySelector("[name='readiness'][value='low']") || form.querySelector("[name='readiness']");
        readiness.checked = true;
        updateDenseReadinessSelection(readiness);
        const after = Object.entries(item.prescription).every(([key, value]) => Number(form.querySelector(`[name='${key}']${key === "restSeconds" ? ":checked" : ""}`)?.value) === value);
        const body = document.querySelector("#appModal .modal-body");
        const fits = body.scrollWidth <= body.clientWidth + 1;
        closeModal();
        return { item, before, after, fits };
      });
      return results;
    });
    prescriptions.forEach((result) => {
      check(result.before, `Objetivo manual en ${result.item.exercise_id} / ${result.item.nature}`);
      check(result.after, `Readiness respeta objetivo manual en ${result.item.exercise_id} / ${result.item.nature}`);
      check(result.fits, `Formulario sin desborde en ${result.item.exercise_id} / ${result.item.nature}`);
    });
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const view of ["session", "compare", "library", "experiments"]) {
        await page.locator(`.studio-tabs [data-page="${view}"]`).click();
        await page.evaluate(() => window.scrollTo(0, 0));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
        check(!overflow, `Sin desborde ${width}px / ${view}`);
        await page.screenshot({ path: `${SHOTS}/studio-${view}-${width}.png`, fullPage: view !== "library" });
      }
    }
    check(errors.length === 0, `Sin errores JS: ${errors.join(", ")}`);
    await context.close();

    const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await offlineContext.route("**/*", (route) => route.request().url().startsWith(BASE) ? route.continue() : route.abort());
    await offlineContext.addInitScript(() => localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false })));
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto(`${BASE}/index.html?experience=studio&noprompt=1`);
    await offlinePage.waitForFunction(() => navigator.serviceWorker.controller && window.bitTrackerStudio && !window.__bitTrackerReloading);
    const cached = await offlinePage.evaluate(async () => {
      const assets = [...document.querySelectorAll('script[src], link[rel="stylesheet"]')]
        .map((node) => node.src || node.href)
        .filter((url) => /\/studio(?:-core)?\.(js|css)$/.test(new URL(url).pathname));
      return Promise.all(assets.map(async (url) => Boolean(await caches.match(url))));
    });
    check(cached.length === 3 && cached.every(Boolean), "Estudio precacheado para modo avión");
    await offlineContext.setOffline(true);
    await offlinePage.goto(`${BASE}/index.html?experience=studio&noprompt=1&offline=1`);
    check(await offlinePage.locator("#studioRoot").isVisible(), "Estudio abre sin conexión");
    await offlinePage.locator('button[data-experience="classic"]').click();
    check(await offlinePage.locator(".app-shell").isVisible(), "Actual disponible sin conexión");
    await offlineContext.close();
    console.log(`STUDIO: ${checks} checks OK`);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
