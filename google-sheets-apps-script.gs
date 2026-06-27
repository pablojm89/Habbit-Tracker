const SHEETS = {
  snapshots: "RawState",
  habits: "HabitRecords",
  dayNotes: "DayNotes",
  training: "TrainingExercises",
  dense: "DenseTraining",
  estimates: "DenseEstimates",
  working: "WorkingPercentages",
  bw: "BodyweightMultipliers",
  guide: "FormulaGuide",
};

const WORKING_PERCENTAGES = [
  ["2D5", 0.733, 0.778, 0.822],
  ["2D10", 0.475, 0.535, 0.595],
  ["2D20", 0.371, 0.404, 0.436],
  ["5D1", 0.826, 0.893, 0.960],
  ["5D3", 0.723, 0.794, 0.864],
  ["5D5", 0.620, 0.688, 0.756],
  ["5D10", 0.362, 0.445, 0.529],
  ["5D20", 0.258, 0.314, 0.370],
  ["10D1", 0.8, 0.864, 0.927],
  ["10D3", 0.7, 0.767, 0.835],
  ["10D5", 0.6, 0.665, 0.73],
  ["10D10", 0.35, 0.431, 0.511],
  ["10D20", 0.25, 0.304, 0.358],
  ["10D1-2-3", 0.725, 0.803, 0.881],
  ["10D2-3-5", 0.613, 0.753, 0.793],
  ["20D1", 0.773, 0.834, 0.896],
  ["20D3", 0.676, 0.741, 0.806],
  ["20D5", 0.58, 0.643, 0.705],
  ["20D10", 0.338, 0.416, 0.494],
  ["20D20", 0.242, 0.294, 0.346],
];

const BODYWEIGHT_MULTIPLIERS = [
  ["2D", 0.9],
  ["5D", 0.6],
  ["10D", 0.33],
  ["20D", 0.27],
];

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || "{}");
    const expectedToken = PropertiesService.getScriptProperties().getProperty("BITTRACKER_SYNC_TOKEN");
    if (expectedToken && payload.token !== expectedToken) {
      return jsonOutput({ ok: false, error: "unauthorized" });
    }

    const state = payload.state || {};
    const syncedAt = payload.syncedAt || new Date().toISOString();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    setupStaticSheets(ss);
    appendSnapshot(ss, syncedAt, payload);
    rewriteHabitRecords(ss, syncedAt, state);
    rewriteDayNotes(ss, syncedAt, state);
    rewriteTrainingExercises(ss, syncedAt, state);
    rewriteDenseTraining(ss, syncedAt, state);
    rewriteDenseEstimates(ss, syncedAt, state);

    return jsonOutput({
      ok: true,
      syncedAt,
      sheets: Object.values(SHEETS),
    });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function setupStaticSheets(ss) {
  writeTable(ss, SHEETS.working, ["dense_scheme", "starting_pct", "working_pct", "max_pct"], WORKING_PERCENTAGES, false);
  writeTable(ss, SHEETS.bw, ["scheme_key", "multiplier"], BODYWEIGHT_MULTIPLIERS, false);
  writeTable(
    ss,
    SHEETS.guide,
    ["metric", "formula"],
    [
      ["weighted_e1rm", "e1RM = load_kg / working_pct"],
      ["weighted_calisthenics_total", "total_system_load = bodyweight_kg + added_load_kg"],
      ["weighted_calisthenics_relative", "relative_strength = total_system_load / bodyweight_kg"],
      ["bodyweight_capacity", "capacity = reps_per_min / multiplier(source_scheme_base)"],
      ["bodyweight_prediction", "target_reps_per_min = floor(capacity * multiplier(target_scheme_base))"],
      ["tonnage_estimate", "tonnage = effective_load * total_reps * tonnage_factor"],
      ["effective_load", "external_load + bodyweight_kg * bodyweight_contribution_pct / 100"],
      ["effort_learning", "new_estimate = old_estimate * 0.70 + observed * effort_factor * 0.30"],
      ["weighted_cross_scheme", "target_load_kg = e1RM * target_working_pct"],
      ["weighted_calisthenics_visible_load", "target_added_load_kg = target_total_system_load_kg - bodyweight_kg"],
    ],
    false,
  );
}

function appendSnapshot(ss, syncedAt, payload) {
  const sheet = ensureSheet(ss, SHEETS.snapshots);
  ensureHeader(sheet, ["synced_at", "source", "reason", "version", "selected_date", "payload_json"]);
  sheet.appendRow([
    syncedAt,
    payload.source || "",
    payload.reason || "",
    payload.state && payload.state.version ? payload.state.version : "",
    payload.state && payload.state.settings ? payload.state.settings.selectedDate || "" : "",
    JSON.stringify(payload.state || {}),
  ]);
}

function rewriteHabitRecords(ss, syncedAt, state) {
  const habits = {};
  (state.habits || []).forEach((habit) => {
    habits[habit.id] = habit;
  });

  const rows = [];
  Object.entries(state.records || {}).forEach(([date, record]) => {
    Object.entries(record || {}).forEach(([habitId, entry]) => {
      const habit = habits[habitId] || {};
      const normalized = typeof entry === "object" ? entry : { done: Boolean(entry), quality: "base" };
      const mult = normalized.quality === "heroic" ? 1.25 : normalized.quality === "min" ? 0.75 : 1;
      rows.push([
        syncedAt,
        date,
        habitId,
        habit.name || "",
        Boolean(normalized.done),
        normalized.quality || "",
        normalized.completedAt || "",
        Number(habit.xp || 0),
        habit.stat || "",
        Boolean(habit.core),
        Boolean(normalized.done) ? Math.round(Number(habit.xp || 0) * mult) : 0,
      ]);
    });
  });

  writeTable(ss, SHEETS.habits, ["synced_at", "date", "habit_id", "habit_name", "done", "quality", "completed_at", "xp", "stat", "core", "calculated_xp"], rows, true);
}

function rewriteDayNotes(ss, syncedAt, state) {
  const rows = Object.entries(state.dayNotes || {}).map(([date, note]) => [
    syncedAt,
    date,
    note.energy || "",
    note.sleep || "",
    note.frogTask || "",
    note.familyNote || "",
    note.note || "",
  ]);
  writeTable(ss, SHEETS.dayNotes, ["synced_at", "date", "energy", "sleep", "frog_task", "family_note", "note"], rows, true);
}

function rewriteTrainingExercises(ss, syncedAt, state) {
  const rows = [];
  const logs = state.trainingLogs || {};
  ((state.mesocycle && state.mesocycle.weeks) || []).forEach((week) => {
    (week.sessions || []).forEach((session) => {
      const log = logs[session.id] || {};
      (session.exercises || []).forEach((exercise) => {
        rows.push([
          syncedAt,
          week.id,
          week.label || "",
          session.id,
          session.title || "",
          session.type || "",
          session.slot || "",
          exercise.id,
          exercise.name || "",
          exercise.sets || "",
          exercise.reps || "",
          exercise.load || "",
          exercise.rir || "",
          exercise.progression || "",
          Boolean(log.exercises && log.exercises[exercise.id]),
          log.updatedAt || "",
          log.note || "",
        ]);
      });
    });
  });
  writeTable(
    ss,
    SHEETS.training,
    ["synced_at", "week_id", "week_label", "session_id", "session_title", "session_type", "slot", "exercise_id", "exercise_name", "prescribed_sets", "prescribed_reps", "prescribed_load", "prescribed_effort", "progression", "done", "log_updated_at", "note"],
    rows,
    true,
  );
}

function rewriteDenseTraining(ss, syncedAt, state) {
  const entries = state.trainingEntries || state.denseTrainingEntries || [];
  const pct = Object.fromEntries(WORKING_PERCENTAGES.map((row) => [row[0], { starting: row[1], working: row[2], max: row[3] }]));
  const bwMultipliers = Object.fromEntries(BODYWEIGHT_MULTIPLIERS);
  const rows = entries.map((entry) => {
    const scheme = entry.scheme || entry.dense_scheme || "";
    const duration = Number(entry.duration_minutes || parseDenseDuration(scheme) || 0);
    const totalReps = Number(entry.total_reps || 0);
    const repsPerMin = Number(entry.reps_per_min || (duration && totalReps ? totalReps / duration : 0));
    const load = Number(entry.load_kg || entry.external_load_kg || 0);
    const added = Number(entry.added_load_kg || 0);
    const bw = Number(entry.bodyweight_kg || 0);
    const nature = entry.exercise_nature || entry.nature || "";
    const schemeBase = parseDenseBase(scheme);
    const totalSystemLoad = Number(entry.total_system_load_kg || (nature === "weighted_calisthenics" ? bw + added : load));
    const visibleAddedLoad = Number(entry.visible_added_load_kg || (nature === "weighted_calisthenics" ? totalSystemLoad - bw : 0));
    const relativeStrength = Number(entry.relative_strength || (bw && totalSystemLoad ? totalSystemLoad / bw : 0));
    const workingPct = pct[scheme] ? pct[scheme].working : "";
    const e1rm = Number(entry.e1rm_kg || (workingPct && totalSystemLoad ? totalSystemLoad / workingPct : 0));
    const multiplier = bwMultipliers[schemeBase] || "";
    const capacity = Number(entry.bodyweight_capacity || (multiplier && repsPerMin ? repsPerMin / multiplier : 0));
    const bwContribution = Number(entry.bodyweight_contribution_pct || 0);
    const tonnageFactor = Number(entry.tonnage_factor == null ? 1 : entry.tonnage_factor);
    const effectiveLoad = nature === "weighted_calisthenics" ? totalSystemLoad : load + (bw * bwContribution) / 100;
    const tonnage = Number(entry.tonnage_kg || (totalReps && effectiveLoad ? effectiveLoad * totalReps * tonnageFactor : 0));

    return [
      syncedAt,
      entry.id || Utilities.getUuid(),
      entry.version || "",
      entry.date || entry.workout_date || "",
      entry.exercise_id || "",
      entry.exercise_name || entry.name || "",
      entry.exercise_family_id || entry.family || "",
      entry.variant_id || "",
      nature,
      scheme,
      schemeBase,
      entry.scheme_target || "",
      entry.scheme_type || "",
      duration || "",
      entry.target_reps_per_min || "",
      entry.target_total_reps || "",
      totalReps || "",
      repsPerMin || "",
      load || "",
      entry.weight_per_dumbbell_kg || "",
      entry.dumbbell_count || "",
      added || "",
      bw || "",
      entry.bodyweight_source || "",
      totalSystemLoad || "",
      visibleAddedLoad || "",
      relativeStrength || "",
      entry.effort || "",
      entry.effort_value || "",
      Boolean(entry.failed),
      entry.missed_reps || "",
      workingPct || "",
      e1rm || "",
      capacity || "",
      effectiveLoad || "",
      tonnage || "",
      bwContribution || "",
      tonnageFactor || "",
      entry.notes || "",
      entry.created_at || "",
      entry.updated_at || "",
      entry.deleted_at || "",
    ];
  });

  writeTable(
    ss,
    SHEETS.dense,
    ["synced_at", "entry_id", "version", "date", "exercise_id", "exercise_name", "exercise_family_id", "variant_id", "nature", "scheme", "scheme_base", "scheme_target", "scheme_type", "duration_min", "target_reps_per_min", "target_total_reps", "total_reps", "reps_per_min", "external_load_kg", "weight_per_dumbbell_kg", "dumbbell_count", "added_load_kg", "bodyweight_kg", "bodyweight_source", "total_system_load_kg", "visible_added_load_kg", "relative_strength", "effort", "effort_value", "failed", "missed_reps", "working_pct", "e1rm_kg", "bodyweight_capacity", "effective_load_kg", "tonnage_kg", "bodyweight_contribution_pct", "tonnage_factor", "notes", "created_at", "updated_at", "deleted_at"],
    rows,
    true,
  );
}

function rewriteDenseEstimates(ss, syncedAt, state) {
  const entries = state.trainingEntries || state.denseTrainingEntries || [];
  const latestByExercise = {};
  entries.forEach((entry) => {
    const key = entry.exercise_id || "";
    if (!key) return;
    if (!latestByExercise[key] || String(entry.created_at || entry.date || "") > String(latestByExercise[key].created_at || latestByExercise[key].date || "")) {
      latestByExercise[key] = entry;
    }
  });

  const estimates = state.denseEstimates || {};
  const rows = [];
  Object.entries(estimates).forEach(([exerciseId, estimate]) => {
    const latest = latestByExercise[exerciseId] || {};
    if (estimate.bodyweight_capacity) {
      BODYWEIGHT_MULTIPLIERS.forEach(([scheme, multiplier]) => {
        const minutes = parseDenseDuration(scheme);
        const rpm = Math.floor(Number(estimate.bodyweight_capacity) * multiplier);
        rows.push([
          syncedAt,
          exerciseId,
          estimate.exercise_name || latest.exercise_name || "",
          "bodyweight_capacity",
          estimate.bodyweight_capacity,
          scheme,
          minutes,
          rpm,
          rpm * minutes,
          "",
          "",
          estimate.updated_at || "",
        ]);
      });
    }

    if (estimate.e1rm_kg) {
      WORKING_PERCENTAGES.forEach(([scheme, _start, working]) => {
        const targetLoad = Number(estimate.e1rm_kg) * working;
        const bw = Number(latest.bodyweight_kg || 0);
        rows.push([
          syncedAt,
          exerciseId,
          estimate.exercise_name || latest.exercise_name || "",
          "e1rm_cross_scheme",
          estimate.e1rm_kg,
          scheme,
          parseDenseDuration(scheme),
          "",
          "",
          targetLoad,
          latest.nature === "weighted_calisthenics" && bw ? targetLoad - bw : "",
          estimate.updated_at || "",
        ]);
      });
    }
  });

  writeTable(
    ss,
    SHEETS.estimates,
    ["synced_at", "exercise_id", "exercise_name", "estimate_type", "estimate_value", "target_scheme", "target_duration_min", "target_reps_per_min", "target_total_reps", "target_load_kg", "target_added_load_kg", "updated_at"],
    rows,
    true,
  );
}

function parseDenseDuration(scheme) {
  const match = String(scheme || "").match(/^(\d+)D/);
  return match ? Number(match[1]) : "";
}

function parseDenseBase(scheme) {
  const match = String(scheme || "").match(/^(\d+D)/);
  return match ? match[1] : "";
}

function writeTable(ss, sheetName, header, rows, clearData) {
  const sheet = ensureSheet(ss, sheetName);
  ensureHeader(sheet, header);
  if (clearData && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getMaxColumns()).clearContent();
  }
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  sheet.autoResizeColumns(1, Math.min(header.length, 12));
}

function ensureSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeader(sheet, header) {
  if (sheet.getMaxColumns() < header.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), header.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.setFrozenRows(1);
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
