// Full-app QA crawl: search engine, every exercise × every modality form,
// every detail modal, quick timer, screens, feedback flow. Flags leaks,
// missing/extra fields, absurd targets and broken flows.
const fs = require("fs");
const { chromium } = require("playwright-core");
const { CHROME, BASE } = require("./env");
const FINDINGS = [];
const flag = (kind, detail) => { FINDINGS.push({ kind, ...detail }); console.log(`⚠ [${kind}]`, JSON.stringify(detail).slice(0, 240)); };

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) && !url.includes("/sw.js")) return route.continue();
    return route.abort();
  });
  page.on("pageerror", (err) => flag("pageerror", { message: err.message.slice(0, 200) }));
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false, endpointUrl: "", token: "" }));
    window.addEventListener("submit", (e) => { if (!e.defaultPrevented) e.preventDefault(); }, true);
  });
  await page.goto(`${BASE}/index.html?fresh=${Date.now()}`, { waitUntil: "load" });
  await page.waitForTimeout(400);

  await page.evaluate(() => {
    state.denseTrainingEntries = [
      computeDenseEntry({ id: "s1", exercise_id: "chin_up", exercise_name: "Dominada supina", nature: "bodyweight", scheme: "5D", date: "2026-07-10", created_at: "2026-07-10T10:00:00Z", total_reps: 38, reps_per_min: 7.6, bodyweight_capacity: 20, bodyweight_kg: 80, effort: "H" }),
      computeDenseEntry({ id: "s2", exercise_id: "bench_press", exercise_name: "Press banca", nature: "weighted", scheme: "5D5", date: "2026-07-11", created_at: "2026-07-11T10:00:00Z", external_load_kg: 90, total_reps: 25, bodyweight_kg: 80, effort: "N" }),
      computeDenseEntry({ id: "s3", exercise_id: "cuelgue_active", exercise_name: "Cuelgue activo", nature: "skill", scheme: "10D", date: "2026-07-12", created_at: "2026-07-12T10:00:00Z", total_hold_seconds: 120, hold_seconds_per_round: 12, isometric_capacity: 36, bodyweight_kg: 80, effort: "N" }),
      computeDenseEntry({ id: "s4", exercise_id: "back_squat", exercise_name: "Back Squat", nature: "weighted", scheme: "S5x5", date: "2026-09-01", created_at: "2026-09-01T10:00:00Z", external_load_kg: 100, sets: 5, rest_seconds: 180, bodyweight_kg: 80, effort: "N" }),
    ];
    rebuildDenseEstimates?.();
    rebuildTransferState();
    saveState?.();
  });

  // 1. search
  const searchCases = [["extension", "ring_triceps_extension_45"], ["curl biceps", "ring_biceps_curl_45"], ["l sit", "l_sit"], ["jalón ", "lat_pulldown"], ["dominada  supina", "chin_up"], ["remo barra", "barbell_row"], ["prensa", "leg_press"], ["triceps cuerda", "cable_triceps_pushdown_rope"], ["rumano", "romanian_deadlift"], ["laterales", "db_lateral_raise"]];
  const searchResults = await page.evaluate((cases) => cases.map(([query, wantId]) => ({ query, wantId, ok: denseExerciseLibrary({ category: "all", sort: "az", search: query }).some((e) => e.id === wantId) })), searchCases);
  searchResults.forEach((r) => { if (!r.ok) flag("search-miss", r); });
  console.log(`search: ${searchResults.filter((r) => r.ok).length}/${searchResults.length} OK`);

  // 2. every exercise × nature (× format for strength-capable)
  const formAudit = await page.evaluate(() => {
    const problems = [];
    denseExerciseCatalog.forEach((exercise) => {
      const natures = exercise.allowedNatures?.length ? exercise.allowedNatures : [exercise.nature];
      natures.forEach((nature) => {
        const formats = denseStrengthApplies({ ...exercise, nature }) ? ["dense", "strength"] : [null];
        formats.forEach((format) => {
          try {
            openDenseTrainingModal({ exerciseId: exercise.id });
            let rerender = false;
            if (nature !== exercise.nature) { denseFormNatureOverride = nature; rerender = true; }
            if (format) { denseFormFormatOverride = format; rerender = true; }
            if (rerender) nodes.modalBody.innerHTML = denseSetModalBodyHtml();
            const form = document.querySelector("#denseTrainingForm");
            if (!form) { problems.push({ id: exercise.id, nature, format, issue: "form-missing" }); return; }
            const active = { ...exercise, nature };
            const iso = denseIsIsometric(active);
            const load = denseIsLoadExercise(active);
            const has = (n) => Boolean(form.querySelector(`[name='${n}']`));
            const val = (n) => form.querySelector(`[name='${n}']`)?.value ?? null;
            const text = form.innerText;
            ["NaN", "undefined", "Infinity", "[object"].forEach((tok) => { if (text.includes(tok)) problems.push({ id: exercise.id, nature, format, issue: `leak:${tok}` }); });
            if (iso && has("totalReps")) problems.push({ id: exercise.id, nature, format, issue: "iso-shows-reps" });
            if (iso && !has("holdSecondsPerRound")) problems.push({ id: exercise.id, nature, format, issue: "iso-missing-hold" });
            if (!iso && !has("totalReps")) problems.push({ id: exercise.id, nature, format, issue: "missing-totalReps" });
            if (nature === "weighted" && !(has("externalLoadKg") || has("weightPerDumbbellKg"))) problems.push({ id: exercise.id, nature, format, issue: "weighted-missing-load" });
            if (nature === "weighted_calisthenics" && !has("addedLoadKg")) problems.push({ id: exercise.id, nature, format, issue: "wcal-missing-addedLoad" });
            if (nature === "assisted" && !has("assistLoadKg")) problems.push({ id: exercise.id, nature, format, issue: "assisted-missing-assist" });
            const checkedScheme = form.querySelector("input[name='scheme']:checked")?.value || "";
            const schemes = [...form.querySelectorAll("input[name='scheme']")].map((i) => i.value);
            if (!schemes.length) problems.push({ id: exercise.id, nature, format, issue: "no-schemes" });
            if (format === "strength") {
              if (!schemes.every((s) => denseIsStrengthScheme(s))) problems.push({ id: exercise.id, nature, format, issue: "dense-chip-in-strength" });
              if (!denseIsStrengthScheme(checkedScheme)) problems.push({ id: exercise.id, nature, format, issue: `strength-checked:${checkedScheme}` });
              if (!has("restSeconds")) problems.push({ id: exercise.id, nature, format, issue: "no-rest-chips" });
              if (has("repsPerSet")) problems.push({ id: exercise.id, nature, format, issue: "repsPerSet-in-strength" });
              const total = Number(val("totalReps")) || 0;
              if (!total) problems.push({ id: exercise.id, nature, format, issue: "strength-empty-total" });
            } else if (format === "dense") {
              if (schemes.some((s) => denseIsStrengthScheme(s))) problems.push({ id: exercise.id, nature, format, issue: "strength-chip-in-dense" });
              if (denseIsStrengthScheme(checkedScheme)) problems.push({ id: exercise.id, nature, format, issue: "dense-checked-S" });
            }
            const hold = Number(val("holdSecondsPerRound")) || 0;
            if (hold > 55) problems.push({ id: exercise.id, nature, format, issue: `hold>${hold}` });
            const rpm = Number(val("repsPerSet")) || 0;
            if (rpm > 30) problems.push({ id: exercise.id, nature, format, issue: `rpm>${rpm}` });
            closeModal();
          } catch (err) {
            problems.push({ id: exercise.id, nature, format, issue: `throw:${String(err).slice(0, 120)}` });
          }
        });
      });
    });
    return problems;
  });
  formAudit.forEach((p) => flag("form", p));
  console.log(`forms audited (problems: ${formAudit.length})`);

  // 3. detail modals
  const detailAudit = await page.evaluate(() => {
    const problems = [];
    denseExerciseCatalog.forEach((exercise) => {
      try {
        openDenseExerciseDetailModal(exercise.id);
        const text = nodes.modalBody.innerText;
        ["NaN", "undefined", "Infinity", "[object"].forEach((tok) => { if (text.includes(tok)) problems.push({ id: exercise.id, issue: `leak:${tok}` }); });
        closeModal();
      } catch (err) {
        problems.push({ id: exercise.id, issue: `throw:${String(err).slice(0, 120)}` });
      }
    });
    return problems;
  });
  detailAudit.forEach((p) => flag("detail", p));
  console.log(`details audited (problems: ${detailAudit.length})`);

  // 4. timer (EMOM + rest mode)
  const timerAudit = await page.evaluate(async () => {
    const problems = [];
    try {
      startExerciseTimer("cuelgue_active");
      if (!/ronda|round/i.test(nodes.modalBody.innerText)) problems.push({ issue: "timer-no-round-label" });
      nodes.modalBody.querySelector("[data-action='quick-timer-start']")?.click();
      await new Promise((r) => setTimeout(r, 1500));
      if (!quickTimerState.running) problems.push({ issue: "timer-did-not-start" });
      nodes.modalBody.querySelector("[data-action='quick-timer-pause']")?.click();
      if (quickTimerState.running) problems.push({ issue: "timer-did-not-pause" });
      closeModal();
      startExerciseTimer("back_squat");
      if (quickTimerState.roundSeconds !== 180 || quickTimerState.rounds !== 5) problems.push({ issue: `rest-mode-wrong:${quickTimerState.roundSeconds}/${quickTimerState.rounds}` });
      if (!/descanso/i.test(nodes.modalBody.innerText)) problems.push({ issue: "rest-label-missing" });
      nodes.modalBody.querySelector("[data-action='quick-timer-rest'][data-seconds='90']")?.click();
      if (quickTimerState.roundSeconds !== 90) problems.push({ issue: "rest-chip-broken" });
      closeModal();
    } catch (err) {
      problems.push({ issue: `timer-throw:${String(err).slice(0, 120)}` });
    }
    return problems;
  });
  timerAudit.forEach((p) => flag("timer", p));
  console.log(`timer audited (problems: ${timerAudit.length})`);

  // 5. screens
  for (const mode of ["workout", "analytics", "dashboard"]) {
    const leaks = await page.evaluate((mode) => {
      state.settings.trainingMode = mode;
      render();
      const text = document.body.innerText;
      return ["NaN", "undefined", "Infinity", "[object"].filter((tok) => text.includes(tok)).map((tok) => `${mode}:${tok}@${text.slice(Math.max(0, text.indexOf(tok) - 50), text.indexOf(tok) + 15).replace(/\n/g, " ")}`);
    }, mode);
    leaks.forEach((l) => flag("screen-leak", { l }));
  }
  const analyticsTabs = await page.evaluate(() => {
    const out = [];
    state.settings.trainingMode = "analytics";
    ["progress", "volume", "strength", "balance", "weight"].forEach((tab) => {
      state.settings.trainingAnalyticsTab = tab;
      try { render(); const t = document.body.innerText; if (["NaN", "undefined"].some((x) => t.includes(x))) out.push(`${tab}:leak`); } catch (err) { out.push(`${tab}:throw:${String(err).slice(0, 80)}`); }
    });
    return out;
  });
  analyticsTabs.forEach((l) => flag("analytics", { l }));

  fs.writeFileSync(__dirname + "/qa-findings.json", JSON.stringify(FINDINGS, null, 1));
  console.log(`\nQA DONE. findings=${FINDINGS.length}`);
  await browser.close();
  process.exit(FINDINGS.length ? 1 : 0);
})().catch((e) => { console.error("QA FAILED:", e); process.exit(1); });
