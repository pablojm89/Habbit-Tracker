// Audit: everything that proposes a test/plan (dashboard suggestions, calibration kits,
// generic exercise × scheme) must land on the card and the form with the same scheme,
// a compatible modality, and matching target vs prefill.
const { chromium } = require("playwright-core");
const { CHROME, BASE } = require("./env");
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) && !r.request().url().includes("/sw.js") ? r.continue() : r.abort()));
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
  await page.goto(`${BASE}/index.html?noprompt=1&fresh=${Date.now()}`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const out = await page.evaluate((withHistory) => {
    // Uso: node plan.js [empty] — segunda pasada sin historial.
    const d = (n) => dateKey(addDays(selectedDate, -n));
    const mk = (over) => computeDenseEntry({ id: `h${Math.random()}`, nature: "bodyweight", bodyweight_kg: 80, effort: "N", created_at: new Date().toISOString(), ...over });
    const history = [
      mk({ exercise_id: "pull_up", date: d(6), scheme: "10D", total_reps: 70, reps_per_set: 7, duration_minutes: 10 }),
      mk({ exercise_id: "chin_up", nature: "weighted_calisthenics", date: d(4), scheme: "5D3", total_reps: 15, added_load_kg: 25, duration_minutes: 5 }),
      mk({ exercise_id: "ring_dip", date: d(5), scheme: "5D", total_reps: 40, reps_per_set: 8, duration_minutes: 5 }),
      mk({ exercise_id: "bench_press", nature: "weighted", date: d(7), scheme: "5D5", total_reps: 25, external_load_kg: 85, duration_minutes: 5 }),
      mk({ exercise_id: "back_squat", nature: "weighted", date: d(8), scheme: "5D5", total_reps: 25, external_load_kg: 110, duration_minutes: 5 }),
      mk({ exercise_id: "deadlift", nature: "weighted", date: d(9), scheme: "5D3", total_reps: 15, external_load_kg: 150, duration_minutes: 5 }),
      mk({ exercise_id: "tiptoe_squat", date: d(3), scheme: "10D", total_reps: 130, reps_per_set: 13, duration_minutes: 10 }),
      mk({ exercise_id: "pistol_squat", date: d(10), scheme: "5D", total_reps: 30, reps_per_set: 6, duration_minutes: 5 }),
      mk({ exercise_id: "floor_push_up", date: d(2), scheme: "10D", total_reps: 150, reps_per_set: 15, duration_minutes: 10 }),
    ];
    const isoIds = denseExerciseCatalog.filter((e) => denseIsIsometric(e)).slice(0, 2).map((e) => e.id);
    isoIds.forEach((id, i) => history.push(mk({ exercise_id: id, nature: denseExerciseById(id).nature, date: d(11 + i), scheme: "10D", hold_seconds_per_round: 15, total_hold_seconds: 150, rounds: 10, duration_minutes: 10 })));
    state.denseTrainingEntries = withHistory ? history : [];
    rebuildDenseEstimates?.(); rebuildTransferState();
    const issues = [];
    let checks = 0;
    const num = (t) => { const m = String(t || "").replace(",", ".").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
    const check = (label, id, scheme) => {
      const exercise = findDenseExerciseById(id);
      if (!exercise) { issues.push(`${label}: id desconocido ${id}`); return; }
      checks += 1;
      state.denseDayPlans = {};
      addPlannedExerciseToSelectedDate(id, { isTest: true, scheme });
      const plan = state.denseDayPlans[dateKey(selectedDate)]?.[0];
      const card = document.querySelector(".day-slide:not(.is-prev):not(.is-next) .workout-set-card.is-planned");
      if (!card) { issues.push(`${label} ${id} ${scheme}: sin tarjeta`); return; }
      const cardScheme = card.querySelector(".workout-set-main > strong small")?.textContent.trim();
      const targetText = card.querySelector(".workout-set-volume strong")?.textContent.trim();
      const hasTest = Boolean(card.querySelector(".mini-tag.is-amber"));
      openDenseTrainingModal({ exerciseId: id });
      const form = document.querySelector("#denseTrainingForm");
      const checked = (n) => form.querySelector(`[name='${n}']:checked`)?.value ?? null;
      const val = (n) => { const v = form.querySelector(`[name='${n}']`)?.value; return v === undefined ? null : v; };
      const formScheme = checked("scheme");
      const formNature = checked("natureChoice") || exercise.nature;
      const rpm = num(val("repsPerSet")), hold = num(val("holdSecondsPerRound")), ext = num(val("externalLoadKg")), added = num(val("addedLoadKg")), db = num(val("weightPerDumbbellKg")), assist = num(val("assistLoadKg"));
      const isTest = form.querySelector("[name='isTest']")?.checked;
      closeModal();
      const tag = `${label} ${id} ${scheme}`;
      if (cardScheme !== scheme) issues.push(`${tag}: tarjeta muestra ${cardScheme}`);
      if (formScheme !== scheme) issues.push(`${tag}: formulario abre ${formScheme} (${formNature})`);
      if (plan?.nature && formNature !== plan.nature) issues.push(`${tag}: plan nature ${plan.nature} pero form ${formNature}`);
      if (isTest === false) issues.push(`${tag}: plan is_test pero toggle test apagado`);
      // target vs prefill
      const t = targetText || "";
      const strength = /^S/.test(scheme);
      if (t === "-" || t === "") {
        // Load modality: the headline is the load; the fixed reps of "2D5" are a prescription, not a target.
        const loadNature = ["weighted", "weighted_calisthenics", "assisted"].includes(formNature);
        const filled = (loadNature ? [ext, added, db, assist] : [rpm, hold, ext, added, db]).filter((v) => v !== null && v > 0);
        if (filled.length && !strength && scheme !== "MAX") issues.push(`${tag}: tarjeta "-" pero formulario trae ${JSON.stringify({ rpm, hold, ext, added, db })}`);
      } else if (/rpm/.test(t)) {
        if (rpm !== num(t)) issues.push(`${tag}: tarjeta ${t} vs form rpm ${rpm}`);
      } else if (/s\/ronda/.test(t)) {
        if (hold !== num(t)) issues.push(`${tag}: tarjeta ${t} vs form hold ${hold}`);
      } else if (/^\+/.test(t)) {
        if (added !== num(t)) issues.push(`${tag}: tarjeta ${t} vs form lastre ${added}`);
      } else if (/^−/.test(t)) {
        if (assist !== Math.abs(num(t))) issues.push(`${tag}: tarjeta ${t} vs form asist ${assist}`);
      } else if (/kg/.test(t)) {
        const formLoad = ext ?? db;
        if (formLoad !== num(t)) issues.push(`${tag}: tarjeta ${t} vs form carga ${JSON.stringify({ ext, db })}`);
      } else if (/cm/.test(t) || t === "OAC") {
        // ROM / OAC: informational
      } else if (t !== scheme) {
        issues.push(`${tag}: target no reconocido "${t}"`);
      }
    };
    // 1) Dashboard test suggestions
    denseTestSuggestions().forEach((s) => check("sugerencia", s.exercise.id, s.scheme));
    // 2) Calibration kits
    [...denseCalibrationKit, ...denseCalibrationKitBarbell].forEach((t) => check("kit", t.id, t.scheme));
    // 3) Generic: every exercise × representative schemes across natures
    denseExerciseCatalog.forEach((exercise) => {
      const schemes = new Set();
      (exercise.allowedNatures || [exercise.nature]).forEach((nature) => {
        const list = denseAllowedSchemes({ ...exercise, nature });
        ["2D", "5D", "10D", "20D"].forEach((b) => { const first = list.find((sc) => sc.startsWith(b)); if (first) schemes.add(first); const last = [...list].reverse().find((sc) => sc.startsWith(b) && sc !== first); if (last) schemes.add(last); });
        const s = list.find((sc) => sc.startsWith("S")); if (s) schemes.add(s);
        if (list.includes("MAX")) schemes.add("MAX");
      });
      schemes.forEach((scheme) => check("plan", exercise.id, scheme));
    });
    state.denseDayPlans = {};
    return { checks, issues };
  }, process.argv[2] !== "empty");
  console.log(`checks=${out.checks} issues=${out.issues.length}`);
  out.issues.forEach((i) => console.log(" -", i));
  await browser.close();
})().catch((e) => { console.error("AUDIT FAILED:", e); process.exit(1); });
