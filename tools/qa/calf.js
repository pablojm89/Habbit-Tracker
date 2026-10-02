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
    const result = await page.evaluate(() => {
      const exercise = denseExerciseById("single_leg_calf_raise_full_rom");
      const searchable = ["gemelo", "unilateral", "full rom"].every((q) => denseSearchMatches(denseSearchHaystack(exercise), q));
      state.denseTrainingEntries = [computeDenseEntry({ id: "bilateral", exercise_id: "calf_raise", nature: "weighted", scheme: "S3x12", total_reps: 36, date: dateKey(selectedDate), created_at: new Date().toISOString(), external_load_kg: 20 })];
      openDenseTrainingModal({ exerciseId: exercise.id });
      const initial = denseFormDefaults();
      saveDenseTrainingForm(document.querySelector("#denseTrainingForm"));
      const entry = state.denseTrainingEntries.find((item) => item.exercise_id === exercise.id);
      const bodyweight = entry.nature === "bodyweight" && entry.reps_per_side && entry.total_reps === 36;
      openDenseTrainingModal({ exerciseId: exercise.id });
      document.querySelector('[name="natureChoice"][value="weighted_calisthenics"]').click();
      document.querySelector('[name="addedLoadKg"]').value = "10";
      document.querySelector('[name="bodyweightKg"]').value = "80";
      saveDenseTrainingForm(document.querySelector("#denseTrainingForm"));
      const updated = state.denseTrainingEntries.find((item) => item.exercise_id === exercise.id && item.nature === "weighted_calisthenics");
      openDenseTrainingModal({ entryId: updated.id });
      saveDenseTrainingForm(document.querySelector("#denseTrainingForm"));
      openDenseTrainingModal({ entryId: updated.id });
      return { searchable, scheme: initial.scheme, bodyweight, load: updated.total_system_load_kg, perSide: updated.reps_per_side, count: state.denseTrainingEntries.length, bilateral: state.denseTrainingEntries.find((item) => item.id === "bilateral").total_reps };
    });
    assert.deepEqual(result, { searchable: true, scheme: "S3x12", bodyweight: true, load: 90, perSide: true, count: 3, bilateral: 36 });
    await page.waitForTimeout(350);
    await page.evaluate(() => openDenseTrainingModal({ entryId: state.denseTrainingEntries.find((entry) => entry.exercise_id === "single_leg_calf_raise_full_rom" && entry.nature === "weighted_calisthenics").id }));
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${SHOTS}/calf-390.png` });
    assert.ok(await page.evaluate(() => nodes.modalBody.scrollWidth <= nodes.modalBody.clientWidth));
    console.log("CALF: busqueda, registro por lado, edicion con lastre e historial separado OK");
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
