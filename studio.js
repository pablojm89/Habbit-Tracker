(() => {
  const root = document.getElementById("studioRoot");
  const ui = { page: "session", slot: "A", search: "", library: "exercises", selected: new Set(), undo: null, drag: "" };
  const h = escapeHtml;
  const attr = escapeAttr;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const action = (name, label, symbol, extra = "", className = "") => `<button type="button" class="studio-button ${className}" data-studio-action="${name}" ${extra}>${symbol ? icon(symbol) : ""}${label}</button>`;
  const tool = (name, label, symbol, extra = "") => action(name, "", symbol, `title="${attr(label)}" aria-label="${attr(label)}" ${extra}`, "studio-icon");
  const day = () => dateKey(selectedDate);
  const data = () => state.denseStudio;
  const pairs = () => data().drafts[day()] || { A: densePlanItemsForDate(selectedDate).map((item, index) => ({ ...clone(item), id: item.id || `plan_${day()}_${index}` })), B: [] };
  const items = () => pairs()[ui.slot] || [];
  const itemById = (id) => items().find((item) => item.id === id);
  const rowName = (item) => denseStudioVariant(item)?.name || findDenseExerciseById(item.exercise_id)?.name || "Ejercicio retirado";
  const normalizeItem = (item) => {
    const clean = denseStudioNormalizeItem(item);
    const exercise = denseStudioItemExercise(clean);
    if (!exercise) return clean;
    return { ...clean, id: clean.id || denseStudioId(), nature: exercise.nature, scheme: denseStudioItemScheme(clean) };
  };
  const copyItems = (list) => list.map((item) => normalizeItem({ ...clone(item), id: denseStudioId() }));

  function save(message) { saveAndRender(message); }
  function setItems(next, message = "") {
    const key = day(), previous = clone(pairs());
    ui.undo = () => { data().drafts[key] = previous; };
    data().drafts[key] = { ...clone(pairs()), [ui.slot]: next.map(normalizeItem) };
    save(message);
  }
  function mutateItem(id, fn) {
    setItems(items().map((item) => item.id === id ? fn(clone(item)) : item));
  }
  function switchExperience(mode, updateUrl = true) {
    const studio = mode === "studio";
    if (nodes.modal.open) closeModal();
    document.documentElement.dataset.experience = studio ? "studio" : "classic";
    root.hidden = !studio;
    document.querySelector(".app-shell").hidden = studio;
    document.querySelectorAll("button[data-experience]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.experience === (studio ? "studio" : "classic"))));
    if (updateUrl) {
      const url = new URL(location.href);
      if (studio) url.searchParams.set("experience", "studio");
      else url.searchParams.delete("experience");
      history.replaceState(null, "", url);
    }
    renderStudio(); refreshIcons();
  }

  function renderStudio() {
    if (root.hidden) return;
    root.innerHTML = `<div class="studio-heading"><div><p class="studio-eyebrow">Tu entrenamiento, a tu manera</p><h2>Estudio</h2></div><span class="studio-shared">${icon("database")}Historial compartido</span></div>
      <nav class="studio-tabs" aria-label="Vistas de Estudio">${[["session", "Sesión", "list-plus"], ["compare", "Comparar", "columns-2"], ["library", "Biblioteca", "library"], ["experiments", "Experimentos", "flask-conical"]].map(([key, label, symbol]) => action("page", label, symbol, `data-page="${key}" aria-pressed="${ui.page === key}"`)).join("")}</nav>
      <div class="studio-date">${tool("day", "Día anterior", "chevron-left", 'data-shift="-1"')}<label>Fecha<input type="date" data-studio-field="date" value="${day()}" aria-label="Fecha de entrenamiento"></label>${tool("day", "Día siguiente", "chevron-right", 'data-shift="1"')}${action("today", "Hoy", "calendar-clock")}</div>
      ${ui.page === "session" ? sessionMarkup() : ui.page === "compare" ? compareMarkup() : ui.page === "library" ? libraryMarkup() : experimentsMarkup()}`;
    refreshIcons();
  }

  function sessionMarkup() {
    const list = items();
    const selected = list.filter((item) => ui.selected.has(item.id));
    const commonSchemes = selected.length ? denseAllowedSchemes(denseStudioItemExercise(selected[0])).filter((scheme) => selected.every((item) => denseAllowedSchemes(denseStudioItemExercise(item)).includes(scheme))) : [];
    const duration = denseStudioDuration(list);
    const entries = denseEntriesForDate(day());
    return `<div class="studio-toolbar"><div class="studio-segment" aria-label="Borrador">${["A", "B"].map((slot) => action("slot", `Borrador ${slot}`, "", `data-slot="${slot}" aria-pressed="${ui.slot === slot}"`)).join("")}</div>
      <div class="studio-tools">${tool("load-day", "Copiar plan del día al borrador", "calendar-days", densePlanItemsForDate(selectedDate).length ? "" : "disabled")}${tool("copy-other", `Copiar ${ui.slot} al otro borrador`, "copy-plus")}${tool("undo", "Deshacer último cambio", "undo-2", ui.undo ? "" : "disabled")}${action("routine-save", "Guardar bloque", "bookmark-plus", list.length ? "" : "disabled")}</div></div>
      <div class="studio-workspace"><section class="studio-editor" aria-label="Editor de sesión">
      <div class="studio-section-heading"><h3>${list.length} bloques</h3><span>${duration.minutes} min de trabajo${duration.unknown ? " + bloques sin duración" : ""}</span></div>
      ${selected.length ? `<div class="studio-bulk"><span>${selected.length} seleccionados</span>${action("group", "Agrupar", "group")}${selected.some((item) => item.group) ? tool("ungroup", "Quitar grupo", "ungroup") : ""}<label>Esquema<select data-studio-field="bulk-scheme"><option value="">Mantener</option>${commonSchemes.map((scheme) => `<option>${h(scheme)}</option>`).join("")}</select></label></div>` : ""}
      <div class="studio-rows">${list.length ? list.map((item, index) => rowMarkup(item, index, entries)).join("") : `<div class="studio-empty">${icon("list-plus")}<h3>Tu sesión empieza aquí</h3><p>No hay ejercicios en el borrador ${ui.slot}.</p>${action("picker", "Añadir ejercicios", "plus", "", "is-primary")}</div>`}</div>
      ${list.length ? `<div class="studio-editor-footer">${action("picker", "Añadir ejercicio", "plus")}${action("publish", "Aplicar al día", "calendar-check", "", "is-primary")}</div><p class="studio-note">Borrador guardado · Plan del día: ${densePlanItemsForDate(selectedDate).length} bloques. La duración excluye calentamiento y transiciones; en fuerza usa 3 s por repetición.</p>` : ""}
      ${entries.length ? `<section class="studio-logged"><div class="studio-section-heading"><h3>Registrado hoy</h3><span>${entries.length} marcas</span></div>${entries.map((entry) => `<div class="studio-log-row"><div><strong>${h(entry.studio_variant_name || entry.exercise_name)}</strong><small>${h(entry.scheme)} · ${h(denseEntryValue(entry))}${entry.technique_quality ? ` · ${h(techniqueLabel(entry.technique_quality))}` : ""}</small></div>${tool("edit-entry", "Editar marca", "pencil", `data-entry="${attr(entry.id)}"`)}</div>`).join("")}</section>` : ""}
      </section><aside class="studio-catalog" aria-label="Biblioteca rápida">${catalogMarkup(true)}</aside></div>`;
  }

  function rowMarkup(raw, index, entries) {
    const item = normalizeItem(raw), exercise = denseStudioItemExercise(item);
    if (!exercise) return "";
    const target = denseStudioTarget(item), ref = referenceFor(item);
    const entry = entries.find((e) => e.plan_ref === item.id);
    const variants = data().variants.filter((v) => v.exercise_id === exercise.id && (!v.archived || v.id === item.studio_variant_id));
    const reference = ref ? `${formatShortDate(parseDate(ref.date))} · ${denseEntryValue(ref)} · ${denseEffortTagLabel(ref.effort)}` : "Sin historial comparable";
    return `<article class="studio-row" data-row="${attr(item.id)}">
      <div class="studio-row-title"><label class="studio-check ${ui.selected.has(item.id) ? "is-selected" : ""}"><input type="checkbox" data-studio-select="${attr(item.id)}" aria-label="Seleccionar ${attr(rowName(item))}" ${ui.selected.has(item.id) ? "checked" : ""}><span aria-hidden="true">${icon("check")}</span></label>
      <button class="studio-drag" type="button" draggable="true" data-drag="${attr(item.id)}" aria-label="Arrastrar ${attr(rowName(item))}" title="Arrastrar">${icon("grip-vertical")}</button><div><small>${item.group ? `${h(item.group)} · ` : ""}${String(index + 1).padStart(2, "0")} · ${h(denseCategoryLabel(exercise.category))}</small><h3>${h(rowName(item))}</h3></div><div class="studio-row-tools">${tool("move", "Subir bloque", "arrow-up", `data-id="${attr(item.id)}" data-shift="-1" ${index === 0 ? "disabled" : ""}`)}${tool("move", "Bajar bloque", "arrow-down", `data-id="${attr(item.id)}" data-shift="1" ${index === items().length - 1 ? "disabled" : ""}`)}${tool("duplicate", "Duplicar bloque", "copy", `data-id="${attr(item.id)}"`)}${tool("remove", "Quitar del borrador", "x", `data-id="${attr(item.id)}"`)}</div></div>
      <div class="studio-row-fields"><label>Modalidad<select data-studio-field="nature" data-id="${attr(item.id)}">${(exercise.allowedNatures || [exercise.nature]).map((nature) => `<option value="${attr(nature)}" ${nature === item.nature ? "selected" : ""}>${h(denseNatureShort(nature))}</option>`).join("")}</select></label>
      <label>Esquema<select data-studio-field="scheme" data-id="${attr(item.id)}">${denseAllowedSchemes(exercise).map((scheme) => `<option ${item.scheme === scheme ? "selected" : ""}>${h(scheme)}</option>`).join("")}</select></label>
      <label>${h(target.label)} · ${h(target.unit)}<input type="number" min="${["repsPerSet", "holdSecondsPerRound"].includes(target.field) ? 1 : 0}" max="${target.field === "holdSecondsPerRound" ? 55 : 1000}" step="${target.field.includes("Load") || target.field === "weightPerDumbbellKg" ? .5 : 1}" inputmode="decimal" data-studio-field="target" data-id="${attr(item.id)}" value="${attr(target.value)}" placeholder="Sin dato" ${target.fixed ? "disabled" : ""}></label>
      ${denseIsStrengthScheme(item.scheme) ? `<label>Descanso · s<input type="number" min="15" max="600" step="15" data-studio-field="rest" data-id="${attr(item.id)}" value="${item.prescription?.restSeconds ?? DENSE_STRENGTH_DEFAULT_REST}"></label>` : ""}
      ${variants.length ? `<label class="studio-variant-field">Variante<select data-studio-field="variant" data-id="${attr(item.id)}"><option value="">Ejercicio base</option>${variants.map((v) => `<option value="${attr(v.id)}" ${v.id === item.studio_variant_id ? "selected" : ""}>${h(v.name)}</option>`).join("")}</select></label>` : ""}</div>
      <div class="studio-reference"><span>${icon("history")}${h(reference)}</span>${action("history", "Comparar", "", `data-id="${attr(item.id)}"`)}</div>
      <div class="studio-row-bottom"><small>${target.manual ? "Objetivo elegido por ti" : item.studio_variant_id ? "Referencia estimada del ejercicio base" : h(denseTargetSource(exercise, item.scheme).label || "Referencia del motor")}</small><div>${tool("timer", "Cronómetro de este bloque", "timer", `data-id="${attr(item.id)}"`)}${action("register", entry ? "Editar marca" : "Registrar", entry ? "pencil" : "check", `data-id="${attr(item.id)}"`, "is-primary")}</div></div>
    </article>`;
  }

  function referenceFor(item) {
    const history = denseStudioComparableEntries(item).filter((entry) => entry.plan_ref !== item.id && entry.date <= day());
    if (item.reference_id) return history.find((entry) => entry.id === item.reference_id) || history[0];
    if (item.reference_mode === "best") return history.reduce((best, entry) => !best || denseEntryScore(entry) > denseEntryScore(best) ? entry : best, null);
    return history[0];
  }

  function catalogMarkup(compact = false) {
    const exercises = denseExerciseLibrary({ category: "all", sort: "recent", search: ui.search });
    const variants = data().variants.filter((v) => !v.archived && denseSearchMatches(`${v.name} ${v.conditions || ""}`, ui.search));
    const routines = denseRoutines().filter((routine) => denseSearchMatches(routine.name, ui.search));
    return `<div class="studio-section-heading"><h3>Biblioteca</h3><span>${denseExerciseCatalog.length} ejercicios</span></div><label class="studio-search">${icon("search")}<input type="search" data-studio-search value="${attr(ui.search)}" placeholder="Buscar ejercicio, variante o rutina" aria-label="Buscar en biblioteca"></label>
      <div class="studio-catalog-list">${variants.map((variant) => `<div class="studio-pick"><div><strong>${h(variant.name)}</strong><small>Variante personal · ${h(findDenseExerciseById(variant.exercise_id)?.name)}</small></div>${tool("add", "Añadir variante", "plus", `data-exercise="${attr(variant.exercise_id)}" data-variant="${attr(variant.id)}"`)}</div>`).join("")}
      ${routines.map((routine) => `<div class="studio-pick"><div><strong>${h(routine.name)}</strong><small>Rutina · ${routine.items.length} bloques</small></div>${tool("add-routine", "Añadir rutina", "plus", `data-routine="${attr(routine.id)}"`)}</div>`).join("")}
      ${exercises.slice(0, compact ? 10 : 180).map((exercise) => `<div class="studio-pick"><span class="studio-category" style="color:${denseCategoryColor(exercise.category)}">${denseExerciseIconMarkup(exercise)}</span><div><strong>${h(exercise.name)}</strong><small>${h(denseCategoryLabel(exercise.category))}</small></div>${tool("add", "Añadir " + exercise.name, "plus", `data-exercise="${attr(exercise.id)}"`)}</div>`).join("")}
      ${!exercises.length && !variants.length && !routines.length ? '<p class="studio-note">Sin resultados.</p>' : ""}</div>
      ${compact ? action("page", "Biblioteca completa", "arrow-right", 'data-page="library"') : ""}`;
  }

  function compareMarkup() {
    const pair = pairs(), a = pair.A || [], b = pair.B || [];
    const durationA = denseStudioDuration(a), durationB = denseStudioDuration(b);
    return `<div class="studio-toolbar"><h3>Dos formas de montar tu sesión</h3>${action("copy-a-b", "Copiar A en B", "copy-plus", a.length ? "" : "disabled")}</div>
      <div class="studio-compare-table"><table><caption>Borradores del ${h(formatShortDate(selectedDate))}</caption><thead><tr><th>Detalle</th><th>Borrador A</th><th>Borrador B</th></tr></thead><tbody>
      <tr><th>Bloques</th><td>${a.length}</td><td>${b.length}</td></tr><tr><th>Trabajo</th><td>${durationA.minutes} min${durationA.unknown ? " + sin duración" : ""}</td><td>${durationB.minutes} min${durationB.unknown ? " + sin duración" : ""}</td></tr>
      ${Array.from({ length: Math.max(a.length, b.length) }, (_, index) => `<tr><th>Bloque ${index + 1}</th>${[a[index], b[index]].map((item) => `<td>${item ? `<strong>${h(rowName(item))}</strong><span>${h(denseStudioItemScheme(item))}</span><span>${h(denseStudioTargetLabel(item))}</span>${item.group ? `<small>${h(item.group)}</small>` : ""}` : "—"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="studio-note">Sin calentamiento ni transiciones. En fuerza: 3 s por repetición y descanso entre series. Agrupar no descuenta descansos automáticamente. Las estimaciones del motor no son marcas realizadas.</p>
      <div class="studio-toolbar">${action("edit-a", "Editar A", "pencil")}${action("edit-b", "Editar B", "pencil")}${action("adopt-b", "Usar B como A", "arrow-left-right", b.length ? "" : "disabled")}</div>`;
  }

  function libraryMarkup() {
    return `<div class="studio-toolbar"><h3>Ejercicios, variantes y bloques</h3>${action("variant-edit", "Nueva variante", "plus")}</div>
      ${data().variants.length ? `<section class="studio-variants"><h3>Tus variantes</h3>${data().variants.map((v) => `<div class="studio-log-row"><div><strong>${h(v.name)}${v.archived ? " · archivada" : ""}</strong><small>${h(v.conditions || findDenseExerciseById(v.exercise_id)?.name)}</small></div><div class="studio-tools">${tool("variant-edit", "Editar variante", "pencil", `data-variant="${attr(v.id)}"`)}${tool("variant-archive", v.archived ? "Recuperar variante" : "Archivar variante", v.archived ? "archive-restore" : "archive", `data-variant="${attr(v.id)}"`)}</div></div>`).join("")}</section>` : ""}
      ${catalogMarkup()}`;
  }

  function experimentsMarkup() {
    return `<div class="studio-toolbar"><h3>Tus preguntas, tus pruebas</h3>${action("experiment-edit", "Nuevo experimento", "plus")}</div>
      ${data().experiments.length ? data().experiments.map((experiment) => `<article class="studio-experiment"><div><small>${experiment.closed ? "Cerrado" : "En seguimiento"} · ${h(experiment.start)}</small><h3>${h(experiment.name)}</h3><p>${h(experiment.hypothesis)}</p><span>${h(rowName(experiment))} · ${h(experiment.scheme)}</span></div><div class="studio-tools">${action("experiment-review", "Ver registros", "chart-no-axes-combined", `data-id="${attr(experiment.id)}"`)}${tool("experiment-edit", "Editar experimento", "pencil", `data-id="${attr(experiment.id)}"`)}</div></article>`).join("") : `<div class="studio-empty">${icon("flask-conical")}<h3>Ningún experimento todavía</h3><p>Sin hipótesis en seguimiento.</p></div>`}`;
  }

  function modal(title, content, kind = "studio") {
    nodes.modalCard.dataset.modalKind = kind;
    nodes.modalEyebrow.textContent = "Estudio";
    nodes.modalTitle.textContent = title;
    nodes.modalBody.innerHTML = `<div class="studio-modal-content">${content}</div>`;
    openModal(); refreshIcons();
  }
  function exerciseOptions(selected = "") {
    return denseExerciseCatalog.map((exercise) => `<option value="${attr(exercise.id)}" ${selected === exercise.id ? "selected" : ""}>${h(exercise.name)}</option>`).join("");
  }
  function editVariant(id) {
    const variant = data().variants.find((v) => v.id === id);
    modal(variant ? "Editar variante" : "Nueva variante personal", `<form data-studio-form="variant"><input type="hidden" name="id" value="${attr(variant?.id || "")}"><label>Nombre<input name="name" required maxlength="100" value="${attr(variant?.name || "")}" placeholder="Dominada con pausa de 2 s"></label><label>Ejercicio base<select name="exercise_id" ${variant ? "disabled" : ""}>${exerciseOptions(variant?.exercise_id)}</select></label><label>Condiciones<textarea name="conditions" maxlength="1000" placeholder="Agarre, recorrido, tempo y material">${h(variant?.conditions || "")}</textarea></label><p class="studio-note">El historial comparable distingue esta variante. Las estimaciones generales siguen usando el ejercicio base.</p>${action("submit", "Guardar variante", "check", "", "is-primary").replace('type="button"', 'type="submit"')}</form>`);
  }
  function editExperiment(id) {
    const experiment = data().experiments.find((e) => e.id === id);
    const candidates = items().filter((item) => denseStudioItemExercise(item));
    const base = experiment || candidates[0] || normalizeItem({ exercise_id: "pull_up" });
    const exercise = denseStudioItemExercise(base);
    modal(experiment ? "Editar experimento" : "Nuevo experimento", `<form data-studio-form="experiment"><input type="hidden" name="id" value="${attr(experiment?.id || "")}"><label>Nombre<input name="name" required maxlength="100" value="${attr(experiment?.name || "")}" placeholder="Dominadas con pausa"></label>
      <label>Pregunta<textarea name="hypothesis" required maxlength="1000" placeholder="Qué quieres observar al cambiar tu entrenamiento">${h(experiment?.hypothesis || "")}</textarea></label>
      <label>Ejercicio<select name="exercise_id" data-studio-experiment-exercise>${exerciseOptions(base.exercise_id)}</select></label>
      <label>Modalidad<select name="nature" data-studio-experiment-nature>${(exercise.allowedNatures || [exercise.nature]).map((nature) => `<option value="${nature}" ${nature === exercise.nature ? "selected" : ""}>${h(denseNatureShort(nature))}</option>`).join("")}</select></label>
      <label>Esquema<select name="scheme">${denseAllowedSchemes(exercise).map((scheme) => `<option ${scheme === base.scheme ? "selected" : ""}>${h(scheme)}</option>`).join("")}</select></label>
      <label>Variante<select name="studio_variant_id"><option value="">Ejercicio base</option>${data().variants.filter((v) => v.exercise_id === exercise.id).map((v) => `<option value="${attr(v.id)}" ${v.id === base.studio_variant_id ? "selected" : ""}>${h(v.name)}</option>`).join("")}</select></label>
      <div class="studio-form-grid"><label>Inicio<input name="start" type="date" value="${attr(experiment?.start || day())}" required></label><label>Fin<input name="end" type="date" value="${attr(experiment?.end || "")}"></label></div>
      <label>Estado<select name="closed"><option value="false">En seguimiento</option><option value="true" ${experiment?.closed ? "selected" : ""}>Cerrado</option></select></label><label>Observaciones<textarea name="notes" maxlength="2000">${h(experiment?.notes || "")}</textarea></label>${action("submit", "Guardar experimento", "check", "", "is-primary").replace('type="button"', 'type="submit"')}</form>`);
  }
  function techniqueLabel(value) { return { clean: "Técnica limpia", adjusted: "Con ajustes", partial: "Recorrido parcial" }[value] || "Sin valorar"; }
  function historyTable(entries) {
    return entries.length ? `<table class="studio-history-table"><thead><tr><th>Fecha</th><th>Resultado</th><th>Esfuerzo y técnica</th></tr></thead><tbody>${entries.map((entry) => `<tr><td>${h(entry.date)}</td><td>${h(denseEntryValue(entry))}</td><td>${h(denseEffortTagLabel(entry.effort))}<small>${h(techniqueLabel(entry.technique_quality))}</small></td></tr>`).join("")}</tbody></table>` : '<p class="studio-note">Sin registros comparables en este periodo.</p>';
  }
  function reviewExperiment(id) {
    const experiment = data().experiments.find((e) => e.id === id);
    if (!experiment) return;
    const end = experiment.end || day();
    const span = Math.max(1, daysBetween(parseDate(experiment.start), parseDate(end)) + 1);
    const beforeStart = dateKey(addDays(parseDate(experiment.start), -span));
    const entries = denseStudioComparableEntries(experiment);
    const before = entries.filter((e) => e.date >= beforeStart && e.date < experiment.start);
    const after = entries.filter((e) => e.date >= experiment.start && e.date <= end);
    modal(experiment.name, `<p>${h(experiment.hypothesis)}</p><p class="studio-note">${h(rowName(experiment))} · ${h(experiment.scheme)} · ${h(denseNatureShort(experiment.nature))}. Coinciden ejercicio, modalidad, esquema y variante. Las diferencias observadas no prueban causalidad.</p><h3>Antes · ${before.length} registros</h3>${historyTable(before)}<h3>Durante · ${after.length} registros</h3>${historyTable(after)}${experiment.notes ? `<h3>Tus observaciones</h3><p>${h(experiment.notes)}</p>` : ""}`);
  }

  function openHistory(id) {
    const item = itemById(id);
    if (!item) return;
    const entries = denseStudioComparableEntries(item);
    modal(`Referencia · ${rowName(item)}`, `<div class="studio-toolbar">${action("reference", "Última", "history", `data-id="${attr(id)}" data-mode="latest"`)}${action("reference", "Mejor marca", "trophy", `data-id="${attr(id)}" data-mode="best"`)}</div>${entries.length ? `<label>Una sesión concreta<select data-studio-field="reference" data-id="${attr(id)}"><option value="">Seleccionar</option>${entries.map((entry) => `<option value="${attr(entry.id)}" ${item.reference_id === entry.id ? "selected" : ""}>${h(entry.date)} · ${h(denseEntryValue(entry))}</option>`).join("")}</select></label>` : ""}${historyTable(entries.slice(0, 30))}`);
  }

  function publish() {
    if (!items().length) return;
    const key = day(), previous = clone(state.denseDayPlans[key] || []);
    ui.undo = () => { state.denseDayPlans[key] = previous; };
    state.denseDayPlans[key] = items().map((item) => ({ ...normalizeItem(clone(item)), source: "studio" }));
    save("Plan del día actualizado en ambas vistas");
  }
  function copySlot(from, to) {
    const previous = clone(pairs()), key = day();
    ui.undo = () => { data().drafts[key] = previous; };
    data().drafts[key] = { ...clone(pairs()), [to]: copyItems(pairs()[from] || []) };
    save(`Borrador ${from} copiado a ${to}`);
  }
  function addExercise(id, variantId = "") {
    const exercise = findDenseExerciseById(id);
    if (!exercise) return;
    setItems([...items(), normalizeItem({ id: denseStudioId(), exercise_id: id, studio_variant_id: variantId })], `${exercise.name} añadido al borrador ${ui.slot}`);
  }

  function handleAction(button) {
    const { studioAction: name, id } = button.dataset;
    if (name === "page") { ui.page = button.dataset.page; renderStudio(); }
    if (name === "slot") { ui.slot = button.dataset.slot; ui.selected.clear(); renderStudio(); }
    if (name === "day") { selectedDate = addDays(selectedDate, Number(button.dataset.shift)); ui.selected.clear(); persistUiOnly(); }
    if (name === "today") { selectedDate = startOfDay(new Date()); persistUiOnly(); }
    if (name === "undo" && ui.undo) { const undo = ui.undo; ui.undo = null; undo(); save("Cambio deshecho"); }
    if (name === "add") addExercise(button.dataset.exercise, button.dataset.variant || "");
    if (name === "add-routine") { const routine = denseRoutineById(button.dataset.routine); if (routine) setItems([...items(), ...copyItems(denseRoutinePlanItems(routine))], "Rutina añadida al borrador"); }
    if (name === "picker") modal("Añadir al borrador " + ui.slot, catalogMarkup(), "studio-picker");
    if (name === "remove") { ui.selected.delete(id); setItems(items().filter((item) => item.id !== id)); }
    if (name === "duplicate") { const list = clone(items()), index = list.findIndex((item) => item.id === id); if (index >= 0) { list.splice(index + 1, 0, ...copyItems([list[index]])); setItems(list); } }
    if (name === "move") { const list = clone(items()), index = list.findIndex((item) => item.id === id), next = index + Number(button.dataset.shift); if (index >= 0 && next >= 0 && next < list.length) { [list[index], list[next]] = [list[next], list[index]]; setItems(list); } }
    if (name === "publish") publish();
    if (name === "load-day") { ui.selected.clear(); setItems(densePlanItemsForDate(selectedDate).map((item) => normalizeItem(clone(item))), "Plan copiado al borrador"); }
    if (name === "ungroup") setItems(items().map((item) => ui.selected.has(item.id) ? { ...item, group: "" } : item));
    if (name === "copy-other") copySlot(ui.slot, ui.slot === "A" ? "B" : "A");
    if (name === "copy-a-b") copySlot("A", "B");
    if (name === "adopt-b") { copySlot("B", "A"); ui.slot = "A"; ui.page = "session"; renderStudio(); }
    if (name === "edit-a" || name === "edit-b") { ui.slot = name === "edit-a" ? "A" : "B"; ui.page = "session"; renderStudio(); }
    if (name === "register") {
      const item = itemById(id); if (!item) return;
      const existing = denseEntriesForDate(day()).find((entry) => entry.plan_ref === id);
      openDenseTrainingModal(existing ? { entryId: existing.id } : { exerciseId: item.exercise_id, planItem: normalizeItem(item) });
    }
    if (name === "edit-entry") openDenseTrainingModal({ entryId: button.dataset.entry });
    if (name === "timer") { const item = itemById(id); if (item) startExerciseTimer(item.exercise_id, normalizeItem(item)); }
    if (name === "history") openHistory(id);
    if (name === "reference") { mutateItem(id, (item) => ({ ...item, reference_mode: button.dataset.mode, reference_id: "" })); closeModal(); }
    if (name === "variant-edit") editVariant(button.dataset.variant);
    if (name === "variant-archive") { const variant = data().variants.find((v) => v.id === button.dataset.variant); if (variant) { variant.archived = !variant.archived; save(); } }
    if (name === "experiment-edit") editExperiment(id);
    if (name === "experiment-review") reviewExperiment(id);
    if (name === "group") modal("Agrupar bloques", `<form data-studio-form="group"><label>Nombre del grupo<input name="name" required maxlength="60" placeholder="Superserie A"></label>${action("submit", "Agrupar selección", "group", "", "is-primary").replace('type="button"', 'type="submit"')}</form>`);
    if (name === "routine-save") {
      if (!items().length) return;
      modal("Guardar bloque reutilizable", `<form data-studio-form="routine"><label>Nombre<input name="name" required maxlength="100" placeholder="Mi bloque de tirón"></label><label>Contenido<select name="scope"><option value="all">Borrador ${ui.slot} completo</option>${ui.selected.size ? '<option value="selected">Bloques seleccionados</option>' : ""}</select></label>${action("submit", "Guardar en rutinas", "bookmark-plus", "", "is-primary").replace('type="button"', 'type="submit"')}</form>`);
    }
  }

  document.addEventListener("click", (event) => {
    const experience = event.target.closest("button[data-experience]");
    if (experience) switchExperience(experience.dataset.experience);
    const button = event.target.closest("[data-studio-action]");
    if (button && !button.disabled) handleAction(button);
  });
  document.addEventListener("change", (event) => {
    const input = event.target;
    if (input.matches('#denseTrainingForm [name="studioVariant"], #denseTrainingForm [name="studioTechnique"]')) {
      denseSetModalContext.studioFields ||= {};
      denseSetModalContext.studioFields[input.name] = input.value;
    }
    if (input.matches("[data-studio-select]")) { input.checked ? ui.selected.add(input.dataset.studioSelect) : ui.selected.delete(input.dataset.studioSelect); renderStudio(); }
    const field = input.dataset.studioField, id = input.dataset.id;
    if (field === "date" && input.value) { selectedDate = parseDate(input.value); ui.selected.clear(); persistUiOnly(); }
    if (field === "bulk-scheme" && input.value) setItems(items().map((item) => ui.selected.has(item.id) ? { ...item, scheme: input.value, prescription: {} } : item));
    if (field === "nature") mutateItem(id, (item) => normalizeItem({ ...item, nature: input.value, scheme: "", prescription: {} }));
    if (field === "scheme") mutateItem(id, (item) => ({ ...item, scheme: input.value, prescription: {} }));
    if (field === "variant") mutateItem(id, (item) => ({ ...item, studio_variant_id: input.value, reference_id: "" }));
    if (field === "target" || field === "rest") {
      if (!input.checkValidity()) { input.reportValidity(); return; }
      mutateItem(id, (item) => {
        const key = field === "rest" ? "restSeconds" : denseStudioTarget(item).field;
        item.prescription ||= {};
        if (input.value === "") delete item.prescription[key]; else item.prescription[key] = Number(input.value);
        return item;
      });
    }
    if (field === "reference" && input.value) { mutateItem(id, (item) => ({ ...item, reference_id: input.value })); closeModal(); }
    if (input.matches("[data-studio-experiment-exercise], [data-studio-experiment-nature]")) {
      const form = input.form, base = findDenseExerciseById(form.elements.exercise_id.value);
      if (input.matches("[data-studio-experiment-exercise]")) {
        form.elements.nature.innerHTML = (base.allowedNatures || [base.nature]).map((nature) => `<option value="${nature}">${h(denseNatureShort(nature))}</option>`).join("");
        form.elements.studio_variant_id.innerHTML = '<option value="">Ejercicio base</option>' + data().variants.filter((v) => v.exercise_id === base.id).map((v) => `<option value="${attr(v.id)}">${h(v.name)}</option>`).join("");
      }
      form.elements.scheme.innerHTML = denseAllowedSchemes({ ...base, nature: form.elements.nature.value }).map((scheme) => `<option>${h(scheme)}</option>`).join("");
    }
  });
  document.addEventListener("input", (event) => {
    if (!event.target.matches("[data-studio-search]")) return;
    const input = event.target, position = input.selectionStart, inModal = nodes.modalBody.contains(input);
    ui.search = input.value;
    if (inModal) nodes.modalBody.querySelector(".studio-modal-content").innerHTML = catalogMarkup();
    else renderStudio();
    const next = (inModal ? nodes.modalBody : root).querySelector("[data-studio-search]");
    next?.focus(); next?.setSelectionRange(position, position); refreshIcons();
  });
  document.addEventListener("submit", (event) => {
    const form = event.target, type = form.dataset.studioForm;
    if (!type) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    if (type === "variant") {
      const existing = data().variants.find((v) => v.id === values.id);
      const variant = { ...existing, id: existing?.id || denseStudioId(), exercise_id: existing?.exercise_id || values.exercise_id, name: values.name.trim(), conditions: values.conditions.trim() };
      if (!variant.name) return;
      if (existing) Object.assign(existing, variant); else data().variants.push(variant);
    }
    if (type === "experiment") {
      if (values.closed === "true" && !values.end) values.end = day();
      if (values.end && values.end < values.start) { form.elements.end.setCustomValidity("El fin debe ser posterior al inicio"); form.elements.end.reportValidity(); form.elements.end.addEventListener("input", () => form.elements.end.setCustomValidity(""), { once: true }); return; }
      const experiment = { ...values, id: values.id || denseStudioId(), closed: values.closed === "true", name: values.name.trim() };
      const index = data().experiments.findIndex((e) => e.id === values.id);
      if (index >= 0) data().experiments[index] = experiment; else data().experiments.push(experiment);
    }
    if (type === "routine") {
      const selectedItems = values.scope === "selected" ? items().filter((item) => ui.selected.has(item.id)) : items();
      if (!selectedItems.length) { toast("Selecciona al menos un bloque"); return; }
      state.denseRoutines.push(denseNormalizeRoutine({ id: denseRoutineId(), name: values.name.trim(), items: copyItems(selectedItems) }));
    }
    if (type === "group") setItems(items().map((item) => ui.selected.has(item.id) ? { ...item, group: values.name.trim() } : item));
    closeModal(); save("Guardado");
  });
  root.addEventListener("dragstart", (event) => {
    const handle = event.target.closest("[data-drag]");
    if (!handle) return;
    ui.drag = handle.dataset.drag; event.dataTransfer.setData("text/plain", ui.drag); event.dataTransfer.effectAllowed = "move";
  });
  root.addEventListener("dragover", (event) => { if (ui.drag && event.target.closest("[data-row]")) event.preventDefault(); });
  root.addEventListener("drop", (event) => {
    const target = event.target.closest("[data-row]");
    if (!target || !ui.drag) return;
    event.preventDefault();
    const list = clone(items()), from = list.findIndex((item) => item.id === ui.drag), to = list.findIndex((item) => item.id === target.dataset.row);
    if (from >= 0 && to >= 0 && from !== to) { list.splice(to, 0, list.splice(from, 1)[0]); setItems(list); }
    ui.drag = "";
  });
  root.addEventListener("dragend", () => { ui.drag = ""; });
  window.addEventListener("storage", (event) => {
    if (event.key !== STORE_KEY || !event.newValue) return;
    try {
      state = normalizeState(JSON.parse(event.newValue));
      state.settings.selectedDate = day();
      denseCalibrationCache = null; denseLevelExpCache = null;
      ui.undo = null; render();
    } catch { toast("No se pudo leer el cambio de otra pestaña"); }
  });
  window.bitTrackerStudio = { render: renderStudio, switchExperience };
  switchExperience(new URL(location.href).searchParams.get("experience") === "studio" ? "studio" : "classic", false);
})();
