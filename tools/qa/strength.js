const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { CHROME, BASE, SHOTS } = require("./env");
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await page.route("**/*", (route) => route.request().url().startsWith(BASE) ? route.continue() : route.abort());
    await page.addInitScript(() => localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false })));
    await page.goto(`${BASE}/index.html?noprompt=1`);
    const result = await page.evaluate(() => {
      const exercise = denseExerciseById("db_hammer_curl");
      const seed = (scheme, effort = "N", done = [10, 10, 10]) => {
        state.denseTrainingEntries = [computeDenseEntry({ id: "qa-hammer", exercise_id: exercise.id, exercise_name: exercise.name, nature: "weighted", scheme, date: dateKey(addDays(selectedDate, -2)), created_at: "2026-09-01T12:00:00Z", sets: 3, reps_done: done, weight_per_dumbbell_kg: 12.5, external_load_kg: 25, rest_seconds: 60, bodyweight_kg: 80, effort })];
        state.denseDayPlans = {};
        state.denseEstimates = {};
        rebuildDenseEstimates();
        rebuildTransferState();
        openDenseTrainingModal({ exerciseId: exercise.id, planItem: { exercise_id: exercise.id, scheme } });
      };
      seed("S3x10");
      state.denseTrainingEntries.push(computeDenseEntry({ ...state.denseTrainingEntries[0], id: "qa-old-12", scheme: "S3x12", reps_done: [12, 12, 12], weight_per_dumbbell_kg: 8, external_load_kg: 16, created_at: "2026-08-01T12:00:00Z" }));
      if (denseProgressionSuggestion(exercise, "normal", "S3x12").weightPerDumbbellKg !== 12.5) throw new Error("Una marca antigua desplaza a la ultima completada");
      const rest = [];
      for (const seconds of [60, 90, 120, 60]) {
        const input = document.querySelector(`[name='restSeconds'][value='${seconds}']`);
        input.click();
        rest.push({ seconds, load: Number(document.querySelector("[name='weightPerDumbbellKg']").value), card: document.querySelector("[data-recommendation]").textContent });
      }
      const nextScheme = denseDefaultScheme(exercise);
      const cardLoad = densePlannedTargetValue(exercise, "S3x10");
      const next = denseProgressionSuggestion(exercise, "normal", nextScheme);
      closeModal();
      openDenseTrainingModal({ exerciseId: exercise.id });
      const automatic = { scheme: document.querySelector("[name='scheme']:checked").value, load: Number(document.querySelector("[name='weightPerDumbbellKg']").value) };
      document.querySelector("[name='weightPerDumbbellKg']").value = "14";
      document.querySelector("[name='restSeconds'][value='120']").click();
      const manualLoad = Number(document.querySelector("[name='weightPerDumbbellKg']").value);
      seed("S3x8-12", "N", [10, 10, 10]);
      const rangeTarget = denseProgressionSuggestion(exercise, "normal", "S3x8-12").repsPerSet;
      const placeholder = Number(document.querySelector("[name='repsDone1']").placeholder);
      document.querySelector("[name='repsDone1']").value = String(rangeTarget);
      updateDenseStrengthTotal(document.querySelector("#denseTrainingForm"));
      const total = Number(document.querySelector("[name='totalReps']").value);
      document.querySelector("[name='restSeconds'][value='120']").click();
      saveDenseTrainingForm(document.querySelector("#denseTrainingForm"));
      const saved = state.denseTrainingEntries.find((entry) => entry.id !== "qa-hammer");
      openDenseTrainingModal({ entryId: saved.id });
      const edited = { target: Number(document.querySelector("[name='strengthTargetReps']").value), rest: Number(document.querySelector("[name='restSeconds']:checked").value), total: Number(document.querySelector("[name='totalReps']").value) };
      seed("S3x8-12", "H", [10, 10, 10]);
      const hard = denseProgressionSuggestion(exercise, "normal", "S3x8-12");
      seed("S3x8-12", "N", [12, 12, 9]);
      const uneven = denseProgressionSuggestion(exercise, "normal", "S3x8-12");
      seed("S3x10", "N", [10, 10, 10]);
      for (const box of document.querySelectorAll("[name^='repsDone']")) box.value = "0";
      updateDenseStrengthTotal(document.querySelector("#denseTrainingForm"));
      saveDenseTrainingForm(document.querySelector("#denseTrainingForm"));
      const zero = state.denseTrainingEntries.find((entry) => entry.id !== "qa-hammer");
      const matrix = [];
      for (const id of ["db_hammer_curl", "barbell_curl", "leg_press", "chin_up"]) {
        const ex = { ...denseExerciseById(id), nature: id === "chin_up" ? "weighted_calisthenics" : "weighted" };
        for (const effort of ["N", "E", "VE", "H", "VH", "fallo"]) {
          const entry = { exercise_id: id, nature: ex.nature, scheme: "S3x10", reps_done: [10, 10, 10], total_reps: 30, rest_seconds: 60, effort, external_load_kg: 25, weight_per_dumbbell_kg: 12.5, added_load_kg: 12.5 };
          const next = denseStrengthNextBlock(ex, entry);
          matrix.push(["N", "E", "VE"].includes(effort) ? next?.scheme === "S3x12" && next.load === denseStrengthFieldLoad(ex, entry) : next === null);
        }
      }
      seed("S3x10");
      closeModal();
      openDenseTrainingModal({ exerciseId: exercise.id });
      return { rest, nextScheme, cardLoad, automatic, manualLoad, next: { reps: next.repsPerSet, load: next.weightPerDumbbellKg }, rangeTarget, placeholder, total, saved: { target: saved.target_reps_per_set, total: saved.total_reps, reps: saved.reps_done, rest: saved.rest_seconds }, edited, zero: { total: zero.total_reps, reps: zero.reps_done, failed: zero.failed }, matrix: matrix.every(Boolean), hard: { reps: hard.repsPerSet, load: hard.weightPerDumbbellKg }, uneven: { reps: uneven.repsPerSet, load: uneven.weightPerDumbbellKg } };
    });
    console.log(JSON.stringify(result, null, 2));
    const failures = [];
    const check = (value, label) => { if (!value) failures.push(label); };
    check(result.rest.every((r) => r.load === 12.5), "Cambiar solo descanso conserva 12,5 kg");
    check(result.rest.every((r) => r.card.includes(`descanso ${r.seconds === 60 ? "1:00" : r.seconds === 90 ? "1:30" : "2:00"}`)), "Tarjeta respeta el descanso elegido");
    check(result.nextScheme === "S3x12" && result.next.reps === 12 && result.next.load === 12.5, "3x10 completo progresa a 3x12 con la misma carga");
    check(result.automatic.scheme === "S3x12" && result.automatic.load === 12.5 && result.manualLoad === 14, "Reapertura coherente y descanso no sobrescribe carga manual");
    check(result.saved.target === 11 && result.saved.total === 33 && result.saved.reps.every((r) => r === 11) && result.edited.target === 11 && result.edited.rest === 120 && result.edited.total === 33, "Guardar y editar conserva objetivo, repeticiones y descanso");
    check(result.zero.total === 0 && result.zero.reps.every((r) => r === 0) && result.zero.failed, "Tres ceros no se guardan como tres series completadas");
    check(result.matrix, "Misma politica en mancuernas, barra, maquina y lastre");
    check(result.cardLoad === "12.5kg c/u", "Tarjeta y formulario usan kg por mancuerna, no el peso del par");
    check(result.placeholder === result.rangeTarget && result.total === result.rangeTarget * 3, "Propuesta, campos y total comparten el objetivo del rango");
    check(result.hard.reps <= 10, "No aumenta reps despues de esfuerzo duro");
    check(result.uneven.reps <= 10 && result.uneven.load === 12.5, "La media no oculta una serie incompleta");
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${SHOTS}/strength-390.png` });
    check(await page.evaluate(() => document.querySelector(".modal-body").scrollWidth <= document.querySelector(".modal-body").clientWidth), "Formulario movil sin desborde horizontal");
    await page.locator("label").filter({ has: page.locator("[name='scheme'][value='S3x8-12']") }).click();
    await page.locator("[name='strengthTargetReps']").scrollIntoViewIfNeeded();
    await page.locator("[name='strengthTargetReps']").fill("11");
    check(await page.locator("[name='totalReps']").inputValue() === "33", "Editar objetivo de rango actualiza total");
    await page.screenshot({ path: `${SHOTS}/strength-range-390.png` });
    assert.deepEqual(failures, []);
    console.log("STRENGTH: coherencia de descanso, progresion y registro OK");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
