// Deep audit: startup under every persisted screen (TDZ), click-crawl of all
// non-destructive actions per screen × density, key flows (plan → register →
// edit → delete), overflow/clipping detection, screenshots.
const fs = require("fs");
const { chromium } = require("playwright-core");
const { CHROME, BASE, SHOTS } = require("./env");
const FINDINGS = [];
const flag = (kind, detail) => { FINDINGS.push({ kind, ...detail }); console.log(`⚠ [${kind}]`, JSON.stringify(detail).slice(0, 260)); };
const DESTRUCTIVE = /delete|remove|reset|clear|wipe|import|export|sync|restore|backup|archive|cloud|download|upload|share|logout|purge/i;

async function newPage(browser, { preState = null } = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) && !r.request().url().includes("/sw.js") ? r.continue() : r.abort()));
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message.slice(0, 200)));
  await page.addInitScript((pre) => {
    localStorage.clear();
    localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false, endpointUrl: "", token: "" }));
    if (pre) localStorage.setItem(pre.key, JSON.stringify(pre.state));
    window.addEventListener("submit", (e) => { if (!e.defaultPrevented) e.preventDefault(); }, true);
  }, preState);
  await page.goto(`${BASE}/index.html?fresh=${Date.now()}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--disable-dev-shm-usage", "--no-sandbox"] });

  // ── A. seed a rich state once, capture it for startup variants ──────────
  const { page: seedPage } = await newPage(browser);
  const seeded = await seedPage.evaluate(() => {
    const d = (n) => dateKey(addDays(selectedDate, -n));
    const mk = (o) => computeDenseEntry({ bodyweight_kg: 80, effort: "N", created_at: `${o.date}T10:00:00Z`, ...o });
    state.denseTrainingEntries = [
      mk({ id: "a1", exercise_id: "chin_up", exercise_name: "Dominada supina", nature: "bodyweight", scheme: "5D", date: d(1), total_reps: 38, reps_per_min: 7.6, bodyweight_capacity: 12.7 }),
      mk({ id: "a2", exercise_id: "bench_press", exercise_name: "Press banca", nature: "weighted", scheme: "5D5", date: d(2), external_load_kg: 90, total_reps: 25 }),
      mk({ id: "a3", exercise_id: "back_squat", exercise_name: "Back Squat", nature: "weighted", scheme: "S5x5", date: d(3), external_load_kg: 100, sets: 5, rest_seconds: 180, reps_done: [5, 5, 5, 5, 5] }),
      mk({ id: "a4", exercise_id: "cuelgue_active", exercise_name: "Cuelgue activo", nature: "skill", scheme: "10D", date: d(4), total_hold_seconds: 120, hold_seconds_per_round: 12, isometric_capacity: 36 }),
      mk({ id: "a5", exercise_id: "pancake_hold", exercise_name: "Pancake hold", nature: "skill", scheme: "10D", date: d(5), total_hold_seconds: 200, hold_seconds_per_round: 20, isometric_capacity: 60, rom_cm: 18 }),
      mk({ id: "a6", exercise_id: "db_biceps_curl", exercise_name: "Curl de bíceps con mancuernas", nature: "weighted", scheme: "S3x12", date: d(6), weight_per_dumbbell_kg: 14, external_load_kg: 28, sets: 3, rest_seconds: 60 }),
      mk({ id: "a7", exercise_id: "pistol_squat", exercise_name: "Pistol squat", nature: "bodyweight", scheme: "10D", date: d(8), total_reps: 40, reps_per_min: 4, bodyweight_capacity: 12.1, effort: "H" }),
      mk({ id: "a8", exercise_id: "chin_up", exercise_name: "Dominada supina", nature: "weighted_calisthenics", scheme: "5D3", date: d(9), added_load_kg: 20, total_reps: 15, effort: "VH", session_fatigue: 7, expected_comparison: "harder" }),
      mk({ id: "a9", exercise_id: "chin_up", exercise_name: "Dominada supina", nature: "bodyweight", scheme: "5D", date: d(15), total_reps: 35, reps_per_min: 7, bodyweight_capacity: 11.7, effort: "fallo", failed: true, is_test: true }),
    ];
    state.bodyweightLogs = {};
    for (let i = 0; i < 21; i += 1) state.bodyweightLogs[d(20 - i)] = roundTo(80 + i * 0.02, 2);
    state.settings.bodyweightGoal = { mode: "gain" };
    state.settings.bodyweightPromptedOn = dateKey(new Date());
    rebuildDenseEstimates?.();
    rebuildTransferState();
    saveState();
    return { key: STORE_KEY, state: JSON.parse(localStorage.getItem(STORE_KEY)) };
  });
  await seedPage.close();

  // ── B. startup under every persisted screen (TDZ / first paint) ─────────
  for (const trainingMode of ["workout", "analytics", "dashboard"]) {
    for (const tab of ["progress", "volume", "strength", "recovery", "balance", "weight"]) {
      for (const density of ["normal", "compact"]) {
        if (trainingMode !== "analytics" && tab !== "progress") continue;
        const st = JSON.parse(JSON.stringify(seeded.state));
        st.settings.trainingMode = trainingMode;
        st.settings.trainingAnalyticsTab = tab;
        st.settings.uiDensity = density;
        const { page, errors } = await newPage(browser, { preState: { key: seeded.key, state: st } });
        const info = await page.evaluate(() => ({ bodyLen: document.body.innerText.length, hasWorkout: Boolean(document.querySelector("#mesocyclePanel")?.innerHTML.length), overflow: document.documentElement.scrollWidth > window.innerWidth + 1 }));
        if (errors.length) flag("startup-error", { trainingMode, tab, density, errors });
        if (info.overflow) flag("startup-overflow", { trainingMode, tab, density });
        if (info.bodyLen < 200) flag("startup-blank", { trainingMode, tab, density, bodyLen: info.bodyLen });
        await page.screenshot({ path: `${SHOTS}/audit-${trainingMode}-${tab}-${density}.png`, fullPage: true }).catch(() => {});
        await page.close();
      }
    }
  }
  console.log("startup variants done");

  // ── C. click-crawl every non-destructive action per screen ──────────────
  const { page, errors } = await newPage(browser, { preState: seeded });
  const crawl = await page.evaluate(async (DESTRUCTIVE_SRC) => {
    const DESTRUCTIVE = new RegExp(DESTRUCTIVE_SRC, "i");
    const out = { clicked: 0, skipped: [], errors: [], overflow: [], clipped: [] };
    const seen = new Set();
    const modes = ["workout", "analytics", "dashboard"];
    const tabs = ["progress", "volume", "strength", "recovery", "balance", "weight"];
    const windows = ["28", "70", "all"];
    const checkOverflow = (label) => {
      if (document.documentElement.scrollWidth > window.innerWidth + 1) out.overflow.push(label);
      // text clipping heuristic: single-line elements whose content is wider than box and no ellipsis
      document.querySelectorAll("strong, span, small, em, button, h2, h3").forEach((el) => {
        if (el.children.length || !el.textContent.trim()) return;
        const cs = getComputedStyle(el);
        if (cs.whiteSpace !== "nowrap" || cs.overflow !== "hidden" || cs.textOverflow === "ellipsis") return;
        if (Number(cs.opacity) === 0 || cs.maxWidth === "0px" || el.clientWidth === 0) return; // intentionally collapsed labels
        if (el.scrollWidth > el.clientWidth + 2) out.clipped.push(`${label}: <${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 40)}"`);
      });
    };
    for (const mode of modes) {
      state.settings.trainingMode = mode;
      for (const tab of mode === "analytics" ? tabs : ["progress"]) {
        state.settings.trainingAnalyticsTab = tab;
        for (const win of mode === "analytics" ? windows : ["70"]) {
          state.settings.trainingAnalyticsWindow = win;
          render();
          const label = `${mode}/${tab}/${win}`;
          checkOverflow(label);
          const buttons = [...document.querySelectorAll("[data-training-section]:not(.is-hidden) [data-action], #trainingModePanel [data-action], header [data-action]")];
          for (const btn of buttons) {
            const action = btn.dataset.action;
            const key = `${action}:${btn.dataset.exercise || ""}:${btn.dataset.tab || ""}:${btn.dataset.mode || ""}:${btn.dataset.window || ""}:${btn.dataset.shift || ""}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (DESTRUCTIVE.test(action)) { out.skipped.push(action); continue; }
            try {
              btn.click();
              await new Promise((r) => setTimeout(r, 30));
              if (nodes.modal.open) {
                const t = nodes.modalBody.innerText;
                if (/NaN|undefined|Infinity|\[object/.test(t)) out.errors.push(`${action}: modal leak`);
                closeModal();
              }
              out.clicked += 1;
            } catch (err) {
              out.errors.push(`${action}: ${String(err).slice(0, 100)}`);
            }
            // restore screen context after navigation-type clicks
            state.settings.trainingMode = mode;
            state.settings.trainingAnalyticsTab = tab;
            state.settings.trainingAnalyticsWindow = win;
            render();
          }
        }
      }
    }
    return out;
  }, DESTRUCTIVE.source);
  console.log(`click-crawl: clicked=${crawl.clicked} skipped=${[...new Set(crawl.skipped)].join(",")}`);
  crawl.errors.forEach((e) => flag("click-error", { e }));
  [...new Set(crawl.overflow)].forEach((l) => flag("overflow", { l }));
  [...new Set(crawl.clipped)].slice(0, 20).forEach((l) => flag("clipped", { l }));
  if (errors.length) { errors.forEach((e) => flag("pageerror", { e })); errors.length = 0; }

  // ── D. key flows: date nav, plan → register → edit → delete ─────────────
  const flows = await page.evaluate(async () => {
    const out = {};
    state.settings.trainingMode = "workout";
    render();
    const before = dateKey(selectedDate);
    document.querySelector("[data-action='shift-day'][data-shift='-7']")?.click();
    out.shiftBack = dateKey(selectedDate) !== before;
    document.querySelector("[data-action='go-today']")?.click();
    out.backToday = dateKey(selectedDate) === dateKey(new Date()) || dateKey(selectedDate) === before;
    // plan an exercise via picker
    document.querySelector("[data-action='open-workout-exercise-picker']")?.click();
    await new Promise((r) => setTimeout(r, 50));
    const addBtn = nodes.modalBody.querySelector("[data-action='add-planned-exercise'][data-exercise='leg_press']");
    out.pickerOpened = Boolean(addBtn);
    addBtn?.click();
    await new Promise((r) => setTimeout(r, 50));
    if (nodes.modal.open) closeModal();
    render();
    out.planned = Boolean(document.querySelector("#mesocyclePanel")?.innerText.includes("Prensa"));
    // register from planned card
    const regBtn = [...document.querySelectorAll("#mesocyclePanel [data-action]")].find((b) => b.dataset.exercise === "leg_press" && b.dataset.action === "open-dense-exercise-modal") || [...document.querySelectorAll("#mesocyclePanel [data-action]")].find((b) => b.dataset.exercise === "leg_press" && /modal|register/i.test(b.dataset.action));
    out.registerAction = regBtn?.dataset.action || null;
    regBtn?.click();
    await new Promise((r) => setTimeout(r, 50));
    const form = document.querySelector("#denseTrainingForm");
    out.formForLegPress = Boolean(form && form.querySelector("[name='exerciseId']")?.value === "leg_press");
    if (form) {
      form.querySelector("[name='externalLoadKg']").value = "120";
      form.requestSubmit();
      await new Promise((r) => setTimeout(r, 250));
      if (nodes.modal.open) closeModal();
    }
    const saved = state.denseTrainingEntries.find((e) => e.exercise_id === "leg_press");
    out.savedLegPress = saved ? { scheme: saved.scheme, total: saved.total_reps, e1rm: saved.e1rm_kg } : null;
    // edit it
    if (saved) {
      openDenseTrainingModal({ entryId: saved.id });
      const f2 = document.querySelector("#denseTrainingForm");
      f2.querySelector("[name='externalLoadKg']").value = "125";
      f2.requestSubmit();
      await new Promise((r) => setTimeout(r, 250));
      if (nodes.modal.open) closeModal();
      const edited = state.denseTrainingEntries.find((e) => e.id === saved.id);
      out.edited = edited?.external_load_kg === 125 && state.denseTrainingEntries.filter((e) => e.exercise_id === "leg_press").length === 1;
      // delete via UI action if present
      render();
      const del = [...document.querySelectorAll("[data-action]")].find((b) => /delete/i.test(b.dataset.action) && b.dataset.entry === saved.id);
      out.deleteAction = del?.dataset.action || null;
      const countBefore = getDenseEntries().length;
      del?.click();
      await new Promise((r) => setTimeout(r, 100));
      // confirm dialogs may be native confirm(); ensure state changed or a modal asks
      out.deleted = getDenseEntries().length < countBefore || nodes.modal.open;
      if (nodes.modal.open) closeModal();
    }
    out.leaks = /NaN|undefined|Infinity/.test(document.body.innerText);
    return out;
  });
  console.log("flows:", JSON.stringify(flows));
  ["shiftBack", "backToday", "pickerOpened", "planned", "formForLegPress", "edited"].forEach((k) => { if (!flows[k]) flag("flow", { step: k, value: flows[k] }); });
  if (!flows.savedLegPress) flag("flow", { step: "savedLegPress" });
  if (flows.leaks) flag("flow-leak", {});
  if (errors.length) errors.forEach((e) => flag("pageerror", { e }));

  fs.writeFileSync(__dirname + "/audit-findings.json", JSON.stringify(FINDINGS, null, 1));
  console.log(`\nAUDIT DONE. findings=${FINDINGS.length}`);
  await browser.close();
})().catch((e) => { console.error("AUDIT FAILED:", e); process.exit(1); });
