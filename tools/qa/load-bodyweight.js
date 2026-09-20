const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { CHROME, BASE, SHOTS } = require("./env");

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await page.route("**/*", (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await page.addInitScript(() => localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false })));
    await page.goto(`${BASE}/index.html?noprompt=1`);
    const cases = await page.evaluate(() => {
      const ex = denseExerciseById("chin_up");
      const results = [];
      for (const withOldBody of [false, true]) for (const effort of ["N", "H", "VH"]) {
        const entry = computeDenseEntry({ id: "loaded", exercise_id: ex.id, nature: "weighted_calisthenics", scheme: "10D5", date: dateKey(selectedDate), created_at: new Date().toISOString(), bodyweight_kg: 80, added_load_kg: 10, total_reps: 50, target_total_reps: 50, effort });
        state.denseTrainingEntries = [computeDenseEntry({ ...entry, id: "old-body", nature: "bodyweight", scheme: "10D", added_load_kg: 0, total_reps: 30, target_total_reps: 30, target_reps_per_min: 3, created_at: "2026-01-01T12:00:00Z" }), entry];
        if (!withOldBody) state.denseTrainingEntries.shift();
        state.denseEstimates = {};
        rebuildDenseEstimates();
        rebuildTransferState();
        const suggestion = denseProgressionSuggestion(ex, "normal", "10D");
        const markup = document.createElement("div");
        markup.innerHTML = renderDenseEstimateCards({ ...entry, nature: "bodyweight" });
        const card = [...markup.querySelectorAll("article")].find((el) => el.querySelector("span").textContent === "10D");
        openDenseTrainingModal({ exerciseId: ex.id, planItem: { exercise_id: ex.id, nature: "bodyweight", scheme: "10D" } });
        results.push({ withOldBody, effort, capacity: entry.bodyweight_capacity, target: denseFormTargetRepsPerSet(ex, "10D", null), suggestion: suggestion && { scheme: suggestion.scheme, reps: suggestion.repsPerSet }, form: Number(document.querySelector("[name='repsPerSet']").value), table: parseInt(card.querySelector("strong").textContent, 10) });
      }
      return results;
    });
    console.log(JSON.stringify(cases, null, 2));
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${SHOTS}/load-bodyweight-390.png` });
    assert.ok(await page.evaluate(() => document.querySelector(".modal-body").scrollWidth <= document.querySelector(".modal-body").clientWidth));
    for (const row of cases) {
      assert.ok(row.target >= 5, `Capacidad sin lastre ${row.effort}: ${row.target}`);
      assert.ok(row.form >= 5, `Formulario sin lastre ${row.effort}: ${row.form}`);
      assert.ok(row.table >= 5, `Tabla sin lastre ${row.effort}: ${row.table}`);
      assert.equal(row.suggestion.scheme, "10D");
      assert.ok(row.suggestion.reps >= 5);
    }
    console.log("LOAD-BODYWEIGHT: mismo bloque sin lastre no infravalora el completado con lastre");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
