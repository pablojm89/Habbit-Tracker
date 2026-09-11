// Shared data contracts; loaded before app.js, called after its catalog exists.
function denseStudioId() {
  return `st_${globalThis.crypto?.randomUUID ? crypto.randomUUID() : denseRoutineId()}`;
}

function denseStudioNormalizeItem(raw) {
  const source = densePlanItem(raw);
  if (!source) return null;
  const item = { ...source, exercise_id: denseExerciseAliases[source.exercise_id] || source.exercise_id };
  if (denseExerciseAliases[source.exercise_id] && !item.nature) item.nature = "weighted_calisthenics";
  if (item.prescription && typeof item.prescription === "object") {
    item.prescription = Object.fromEntries(Object.entries(item.prescription)
      .filter(([key, value]) => ["repsPerSet", "holdSecondsPerRound", "externalLoadKg", "addedLoadKg", "weightPerDumbbellKg", "assistLoadKg", "restSeconds"].includes(key) && value !== "" && Number.isFinite(Number(value)) && Number(value) >= (key === "restSeconds" ? 15 : ["repsPerSet", "holdSecondsPerRound"].includes(key) ? 1 : 0))
      .map(([key, value]) => [key, Math.min(Number(value), key === "holdSecondsPerRound" ? 55 : key === "restSeconds" ? 600 : 1000)]));
  } else delete item.prescription;
  return item;
}

function denseNormalizeStudio(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const drafts = {};
  Object.entries(source.drafts || {}).forEach(([day, pair]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !pair || typeof pair !== "object") return;
    drafts[day] = {};
    ["A", "B"].forEach((key) => {
      if (Array.isArray(pair[key])) drafts[day][key] = pair[key].map(denseStudioNormalizeItem).filter(Boolean);
    });
  });
  return {
    version: 1,
    drafts,
    variants: (Array.isArray(source.variants) ? source.variants : []).filter((v) => v?.id && v.exercise_id && v.name)
      .map((v) => ({ ...v, exercise_id: denseExerciseAliases[v.exercise_id] || v.exercise_id })),
    experiments: (Array.isArray(source.experiments) ? source.experiments : []).filter((e) => e?.id && e.exercise_id && e.name)
      .map((e) => ({ ...e, exercise_id: denseExerciseAliases[e.exercise_id] || e.exercise_id })),
  };
}

function denseStudioItemExercise(item) {
  const base = findDenseExerciseById(item?.exercise_id);
  if (!base) return null;
  const nature = (base.allowedNatures || [base.nature]).includes(item.nature) ? item.nature : densePlanNatureForScheme(base, item.scheme) || base.nature;
  return { ...base, nature };
}

function denseStudioItemScheme(item) {
  const exercise = denseStudioItemExercise(item);
  if (!exercise) return "";
  const allowed = denseAllowedSchemes(exercise);
  return allowed.includes(item.scheme) ? item.scheme : denseDefaultScheme(exercise);
}

function denseStudioTarget(item) {
  const exercise = denseStudioItemExercise(item);
  if (!exercise) return { field: "", value: "", unit: "", label: "Objetivo", fixed: true };
  const scheme = denseStudioItemScheme(item);
  const strength = denseStrengthParts(scheme);
  const suggestion = denseProgressionSuggestion(exercise, "normal", scheme);
  if (denseIsMaxScheme(scheme)) return { field: "", value: denseIsIsometric(exercise) ? suggestion?.totalHoldSeconds ?? "" : suggestion?.totalReps ?? "", unit: denseIsIsometric(exercise) ? "s" : "reps", manual: false, fixed: true, label: "Máximo estimado" };
  let field, value, unit;
  if (denseIsIsometric(exercise)) {
    field = "holdSecondsPerRound"; unit = "s/ronda";
    value = denseResolvedHoldTarget(exercise, scheme, suggestion);
  } else if (denseIsLoadExercise(exercise)) {
    field = exercise.nature === "assisted" ? "assistLoadKg" : exercise.nature === "weighted_calisthenics" ? "addedLoadKg" : exercise.loadPattern === "dumbbell_pair" ? "weightPerDumbbellKg" : "externalLoadKg";
    unit = field === "weightPerDumbbellKg" ? "kg/mancuerna" : field === "assistLoadKg" ? "kg asistencia" : "kg";
    value = suggestion?.[field] ?? "";
  } else {
    field = "repsPerSet"; unit = strength ? "reps/serie" : "rep/min";
    value = strength?.reps || denseResolvedRepsTarget(exercise, scheme, suggestion);
  }
  const manual = !strength || field !== "repsPerSet" ? item.prescription?.[field] : undefined;
  return { field, value: manual ?? value ?? "", unit, manual: manual !== undefined, fixed: Boolean(strength && field === "repsPerSet") || denseIsMaxScheme(scheme), label: field === "addedLoadKg" ? "Lastre" : field === "assistLoadKg" ? "Asistencia" : "Objetivo" };
}

function denseStudioTargetLabel(item) {
  const target = denseStudioTarget(item);
  if (target.value === "" || target.value === null) return "Sin referencia";
  return `${target.field === "addedLoadKg" ? "+" : ""}${target.value} ${target.unit}`;
}

function denseStudioApplyPrescription(defaults, item) {
  if (!item || item.exercise_id !== defaults.exerciseId || item.scheme !== defaults.scheme || (item.nature && item.nature !== defaults.nature)) return defaults;
  const exercise = denseStudioItemExercise(item);
  if (!exercise) return defaults;
  const target = denseStudioTarget(item);
  const out = { ...defaults };
  if (target.manual && !target.fixed) {
    out[target.field] = target.value;
    if (target.field === "repsPerSet") out.totalReps = denseTotalFromRepsPerSet(target.value, defaults.scheme);
    if (target.field === "holdSecondsPerRound") out.rounds = denseSchemeMinutes(defaults.scheme) || 1;
  }
  if (denseIsStrengthScheme(defaults.scheme) && item.prescription?.restSeconds !== undefined) out.restSeconds = item.prescription.restSeconds;
  return out;
}

function denseStudioComparableEntries(item) {
  const exercise = denseStudioItemExercise(item);
  if (!exercise) return [];
  const variant = item.studio_variant_id || "";
  return getDenseEntries().filter((entry) => entry.exercise_id === exercise.id && entry.nature === exercise.nature && entry.scheme === denseStudioItemScheme(item) && (entry.studio_variant_id || "") === variant)
    .sort((a, b) => String(b.created_at || b.date).localeCompare(String(a.created_at || a.date)));
}

function denseStudioVariant(item) {
  return state.denseStudio?.variants?.find((variant) => variant.id === item?.studio_variant_id && variant.exercise_id === item.exercise_id) || null;
}

function denseStudioDuration(items) {
  let minutes = 0, unknown = 0;
  items.forEach((item) => {
    const scheme = denseStudioItemScheme(item);
    const strength = denseStrengthParts(scheme);
    if (strength) {
      const rest = item.prescription?.restSeconds ?? DENSE_STRENGTH_DEFAULT_REST;
      minutes += (strength.sets * strength.reps * 3 + Math.max(0, strength.sets - 1) * rest) / 60;
    } else if (denseSchemeMinutes(scheme)) minutes += denseSchemeMinutes(scheme);
    else unknown += 1;
  });
  return { minutes: Math.round(minutes), unknown };
}

function denseStudioVisiblePlans(entries, planned) {
  const linked = new Set(entries.map((entry) => entry.plan_ref).filter(Boolean));
  const legacy = entries.filter((entry) => !entry.plan_ref);
  const used = new Set();
  return planned.filter((exercise) => {
    if (exercise.plannedItem?.id && linked.has(exercise.plannedItem.id)) return false;
    const match = legacy.findIndex((entry, index) => !used.has(index) && entry.exercise_id === exercise.id);
    if (match >= 0) { used.add(match); return false; }
    return true;
  });
}

function denseStudioFormFields(defaults) {
  const entry = state.settings.denseDraftEntryId ? getDenseEntries().find((item) => item.id === state.settings.denseDraftEntryId) : null;
  const plan = denseSetModalContext.planItem;
  if (document.documentElement.dataset.experience !== "studio" && !entry?.studio_variant_id && !entry?.technique_quality && !plan?.studio_variant_id) return "";
  const variants = (state.denseStudio?.variants || []).filter((v) => v.exercise_id === defaults.exerciseId);
  const variantId = denseSetModalContext.studioFields?.studioVariant ?? entry?.studio_variant_id ?? plan?.studio_variant_id ?? "";
  const technique = denseSetModalContext.studioFields?.studioTechnique ?? entry?.technique_quality ?? "";
  return `<fieldset class="studio-form-details"><legend>Condiciones del registro</legend>
    <label class="field"><span>Variante personal</span><select name="studioVariant"><option value="">Ejercicio base</option>${variants.map((v) => `<option value="${escapeAttr(v.id)}" ${variantId === v.id ? "selected" : ""}>${escapeHtml(v.name)}</option>`).join("")}</select></label>
    <label class="field"><span>Técnica declarada</span><select name="studioTechnique">${[["", "Sin valorar"], ["clean", "Limpia"], ["adjusted", "Con ajustes"], ["partial", "Recorrido parcial"]].map(([value, label]) => `<option value="${value}" ${technique === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
  </fieldset>`;
}

function denseStudioEntryMetadata(data, existing) {
  const plan = denseSetModalContext.planItem?.exercise_id === data.exerciseId ? denseSetModalContext.planItem : null;
  const variantId = data.studioVariant ?? existing?.studio_variant_id ?? plan?.studio_variant_id ?? "";
  const variant = (state.denseStudio?.variants || []).find((v) => v.id === variantId && v.exercise_id === data.exerciseId);
  const sameVariant = Boolean(existing?.studio_variant_id && existing.exercise_id === data.exerciseId && existing.studio_variant_id === variantId);
  return {
    plan_ref: existing?.plan_ref || plan?.id || "",
    studio_variant_id: sameVariant ? existing.studio_variant_id : variant?.id || "",
    studio_variant_name: sameVariant ? existing.studio_variant_name ?? variant?.name ?? "" : variant?.name || "",
    studio_conditions: sameVariant ? existing.studio_conditions ?? variant?.conditions ?? "" : variant?.conditions || "",
    technique_quality: data.studioTechnique ?? existing?.technique_quality ?? "",
    prescription_snapshot: existing?.prescription_snapshot || (plan ? JSON.parse(JSON.stringify(plan)) : null),
  };
}
