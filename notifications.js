const microPush = { serviceUrl: "", publicKey: "", device: null, remote: null, sessions: [], error: "", busy: false, loaded: false, previousId: "", balanceTimer: null, syncing: false, lastBalance: "", balanceSyncedAt: 0, balanceError: "" };

function microPreferences(value = state.settings.microBreaks || {}) {
  return {
    times: Array.isArray(value.times) && value.times.length ? value.times.slice(0, 4) : ["11:00", "17:00"],
    timeZone: value.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    equipment: Array.isArray(value.equipment) ? value.equipment : ["suelo", "anillas"],
    kinds: Array.isArray(value.kinds) ? value.kinds : ["movilidad", "activacion"],
    durations: Array.isArray(value.durations) ? [2, 5].filter((minutes) => value.durations.includes(minutes)) : [5],
  };
}

function microSupportIssue() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (ios && !navigator.standalone && !matchMedia("(display-mode: standalone)").matches) return "En iPhone, abre BitTracker desde la pantalla de inicio para activar los push.";
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "Este navegador no admite notificaciones push de la app.";
  if (Notification.permission === "denied") return "Notificaciones bloqueadas en los ajustes del dispositivo.";
  return "";
}

async function microRequest(path, { method = "GET", value, enrollment = "" } = {}) {
  const response = await fetch(`${microPush.serviceUrl}${path}`, {
    method, cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(15000),
    headers: { ...(value ? { "Content-Type": "application/json" } : {}), ...(microPush.device ? { Authorization: `Bearer ${microPush.device.token}` } : {}), ...(enrollment ? { "X-Enrollment": enrollment } : {}) },
    ...(value ? { body: JSON.stringify(value) } : {}),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error("El servicio push no responde con datos validos."); }
  if (!response.ok) {
    const error = new Error(result.error || "No se pudo contactar con el servicio push.");
    error.status = response.status;
    throw error;
  }
  return result;
}

async function loadMicroPush() {
  const config = await fetch("./push-config.json", { cache: "no-store" }).then((response) => response.json());
  microPush.serviceUrl = "";
  microPush.remote = null;
  microPush.publicKey = "";
  microPush.device = null;
  if (!config.serviceUrl) return;
  const url = new URL(config.serviceUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Direccion del servicio push no valida.");
  microPush.serviceUrl = url.origin;
  const saved = JSON.parse(localStorage.getItem("bittracker-push-device-v1") || "null");
  if (saved?.serviceUrl === microPush.serviceUrl && /^[a-f0-9]{64}$/.test(saved.id) && /^[a-f0-9]{64}$/.test(saved.token)) microPush.device = saved;
  const server = await microRequest("/config");
  if (typeof server.publicKey !== "string" || !/^[\w-]{87}$/.test(server.publicKey)) throw new Error("El servidor no tiene una clave push valida.");
  microPush.publicKey = server.publicKey;
  if (microPush.device) {
    try { microPush.remote = await microRequest(`/devices/${microPush.device.id}`); }
    catch (error) { if (![401, 404].includes(error.status)) throw error; }
  }
}

function queueMicroBalanceSync() {
  clearTimeout(microPush.balanceTimer);
  microPush.balanceTimer = setTimeout(syncMicroBalance, 750);
}

async function syncMicroBalance() {
  if (!microPush.device || !microPush.remote?.active || microPush.busy || microPush.syncing) return;
  const balance = denseMicroBalanceSnapshot(Date.now(), microPush.remote.preferences.timeZone);
  const fingerprint = JSON.stringify(balance.days);
  if (fingerprint === microPush.lastBalance && Date.now() - microPush.balanceSyncedAt < 6 * 3600000) return;
  const id = microPush.device.id;
  microPush.syncing = true;
  try {
    const result = await microRequest(`/devices/${id}/balance`, { method: "POST", value: { balance } });
    if (microPush.device?.id !== id) return;
    microPush.remote = result;
    microPush.lastBalance = fingerprint;
    microPush.balanceSyncedAt = balance.generatedAt;
    microPush.balanceError = "";
  } catch {
    microPush.balanceError = "Carga push pendiente de sincronizar";
  } finally {
    microPush.syncing = false;
    if (nodes.modalCard.dataset.modalKind === "micro-breaks") renderMicroBalance();
    if (microPush.device?.id === id && microPush.remote?.preferences && fingerprint !== JSON.stringify(denseMicroBalanceSnapshot(Date.now(), microPush.remote.preferences.timeZone).days)) queueMicroBalanceSync();
  }
}

function renderMicroBalance() {
  const target = document.querySelector("[data-micro-balance]");
  if (!target) return;
  const prefs = microPreferences();
  const work = MicroBreaks.workload(denseMicroBalanceSnapshot(Date.now(), prefs.timeZone), prefs.timeZone);
  target.innerHTML = `<strong>Ultimos 7 dias</strong><span class="muted">Series ponderadas por esfuerzo</span><dl class="micro-balance-grid">${["push", "pull", "legs", "core"].map((group) => `<div><dt>${MicroBreaks.labels[group]}</dt><dd>${roundTo(work.load[group], 1)}</dd><small>${work.blocked.has(group) ? "Trabajo duro reciente" : work.load[group] === 0 ? "Sin registro" : ""}</small></div>`).join("")}</dl>${microPush.remote?.active ? `<small class="muted">${escapeHtml(microPush.balanceError || (microPush.remote.balanceAt ? "Resumen de carga enviado al servicio push" : "Carga push pendiente de sincronizar"))}</small>` : ""}`;
}

async function openMicroBreaks() {
  pauseQuickTimer(false);
  nodes.modalEyebrow.textContent = "Durante el dia";
  nodes.modalTitle.textContent = "Pausas de 2 y 5 minutos";
  nodes.modalCard.dataset.modalKind = "micro-breaks";
  microPush.busy = true;
  microPush.error = "";
  renderMicroBreaks();
  openModal();
  try { await loadMicroPush(); microPush.loaded = true; }
  catch (error) { microPush.error = error.message; }
  finally { microPush.busy = false; if (nodes.modalCard.dataset.modalKind === "micro-breaks") renderMicroBreaks(); queueMicroBalanceSync(); }
}

function renderMicroBreaks() {
  const prefs = microPreferences(microPush.remote?.preferences || state.settings.microBreaks);
  const active = Boolean(microPush.remote?.active);
  const issue = microSupportIssue();
  const enabled = microPush.serviceUrl && microPush.publicKey && !issue && !microPush.busy;
  const next = active && microPush.remote.nextAt ? new Intl.DateTimeFormat("es", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: prefs.timeZone }).format(microPush.remote.nextAt) : "";
  const status = microPush.busy ? "Comprobando servicio..." : issue || microPush.error || (!microPush.serviceUrl ? "Servicio push pendiente de configurar" : active ? `Push activos en este dispositivo. Proximo: ${next}` : "Push desactivados en este dispositivo");
  const choice = (name, value, label, checked) => `<label class="micro-check"><input type="checkbox" name="${name}" value="${value}" ${checked ? "checked" : ""}><span>${label}</span></label>`;
  nodes.modalBody.innerHTML = `<form id="microPushForm" class="micro-form">
    <p class="micro-status" role="status">${escapeHtml(status)}</p>
    <section class="micro-balance" data-micro-balance></section>
    <fieldset ${microPush.busy ? "disabled" : ""}><legend>Duracion</legend><div class="micro-choices">${choice("durations", "2", "2 minutos", prefs.durations.includes(2))}${choice("durations", "5", "5 minutos", prefs.durations.includes(5))}</div></fieldset>
    <fieldset ${microPush.busy ? "disabled" : ""}><legend>Horas de aviso</legend>
      <div class="micro-times">${Array.from({ length: 4 }, (_, i) => `<label class="field"><span>Aviso ${i + 1}${i ? " (opcional)" : ""}</span><input type="time" name="time" min="08:00" max="21:59" value="${escapeAttr(prefs.times[i] || "")}" ${i === 0 ? "required" : ""}></label>`).join("")}</div>
      <label class="field"><span>Zona horaria</span><input name="timeZone" value="${escapeAttr(prefs.timeZone)}" required list="microTimeZones"><datalist id="microTimeZones"><option value="Europe/Madrid"><option value="Atlantic/Canary"><option value="${escapeAttr(Intl.DateTimeFormat().resolvedOptions().timeZone)}"></datalist></label>
    </fieldset>
    <fieldset ${microPush.busy ? "disabled" : ""}><legend>Material disponible</legend><div class="micro-choices">${choice("equipment", "suelo", "Suelo", prefs.equipment.includes("suelo"))}${choice("equipment", "anillas", "Anillas", prefs.equipment.includes("anillas"))}${choice("equipment", "barra", "Barra", prefs.equipment.includes("barra"))}</div></fieldset>
    <fieldset ${microPush.busy ? "disabled" : ""}><legend>Tipo de pausa</legend><div class="micro-choices">${choice("kinds", "movilidad", "Movilidad", prefs.kinds.includes("movilidad"))}${choice("kinds", "activacion", "Activacion suave", prefs.kinds.includes("activacion"))}</div></fieldset>
    ${!active && microPush.serviceUrl ? '<label class="field"><span>Codigo de activacion</span><input name="enrollment" type="password" autocomplete="off" minlength="32"></label>' : ""}
    ${!active ? '<button class="text-button timer-wide-button" type="button" data-micro-action="save-local"><i data-lucide="save"></i>Guardar preferencias</button>' : ""}
    <button class="text-button is-hot timer-wide-button" type="submit" ${enabled ? "" : "disabled"}><i data-lucide="${active ? "save" : "bell-ring"}"></i>${active ? "Guardar preferencias y horarios" : "Activar push"}</button>
    ${microPush.device ? `<div class="micro-actions">${active ? `<button class="text-button" type="button" data-micro-action="test" ${enabled ? "" : "disabled"}><i data-lucide="send"></i>Enviar prueba</button>` : ""}<button class="text-button" type="button" data-micro-action="disable" ${microPush.busy ? "disabled" : ""}><i data-lucide="bell-off"></i>Desactivar</button></div>` : ""}
    <button class="text-button timer-wide-button" type="button" data-micro-action="preview"><i data-lucide="shuffle"></i>Una pausa ahora</button>
  </form>`;
  renderMicroBalance();
  refreshIcons();
}

function readMicroPreferences(form) {
  const data = new FormData(form);
  const prefs = { times: [...new Set(data.getAll("time").filter(Boolean))].sort(), timeZone: String(data.get("timeZone")).trim(), equipment: data.getAll("equipment"), kinds: data.getAll("kinds"), durations: data.getAll("durations").map(Number) };
  if (!prefs.durations.length || prefs.durations.some((minutes) => ![2, 5].includes(minutes))) throw new Error("Elige pausas de 2 minutos, de 5 o ambas.");
  try { new Intl.DateTimeFormat("es", { timeZone: prefs.timeZone }).format(); } catch { throw new Error("Zona horaria no valida."); }
  const minutes = prefs.times.map((value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3)));
  if (!minutes.length || minutes.some((value, i) => value < 480 || value >= 1320 || i > 0 && value - minutes[i - 1] < 60)) throw new Error("Elige horarios entre las 08:00 y las 21:59, separados una hora.");
  if (!(prefs.equipment.includes("suelo") && prefs.kinds.includes("movilidad") || prefs.equipment.some((gear) => ["suelo", "anillas", "barra"].includes(gear)) && prefs.kinds.includes("activacion"))) throw new Error("Elige material y un tipo de pausa compatibles.");
  return prefs;
}

function microKeyBytes(key) {
  const binary = atob(key.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - key.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function saveMicroSubscription(form) {
  if (microPush.busy || !microPush.publicKey || microSupportIssue()) return;
  let prefs;
  try { prefs = readMicroPreferences(form); } catch (error) { toast(error.message); return; }
  const enrollment = form.elements.enrollment?.value.trim() || "";
  // Permission must be requested directly from this user gesture, before network awaits.
  const permission = Notification.permission === "granted" ? Promise.resolve("granted") : Notification.requestPermission();
  microPush.busy = true;
  form.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  try {
    if (await permission !== "granted") throw new Error("No has autorizado las notificaciones.");
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active) throw new Error("La app se esta instalando. Vuelve a abrirla y prueba otra vez.");
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription && microPush.remote?.active) throw new Error("La suscripcion del movil ha caducado. Desactiva los push y vuelve a activarlos.");
    if (subscription?.options.applicationServerKey && [...new Uint8Array(subscription.options.applicationServerKey)].join() !== [...microKeyBytes(microPush.publicKey)].join()) throw new Error("La clave del servidor ha cambiado. Desactiva la suscripcion anterior antes de reactivarla.");
    subscription ||= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: microKeyBytes(microPush.publicKey) });
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(subscription.endpoint));
    const hex = (bytes) => [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
    const id = hex(new Uint8Array(digest));
    if (!microPush.device || microPush.device.id !== id) microPush.device = { id, token: hex(crypto.getRandomValues(new Uint8Array(32))), serviceUrl: microPush.serviceUrl };
    // Store before enrollment so retrying an uncertain response uses the same identity.
    localStorage.setItem("bittracker-push-device-v1", JSON.stringify(microPush.device));
    const balance = denseMicroBalanceSnapshot(Date.now(), prefs.timeZone);
    microPush.remote = await microRequest(`/devices/${id}`, { method: "PUT", enrollment, value: { subscription: subscription.toJSON(), preferences: prefs, balance } });
    microPush.lastBalance = JSON.stringify(balance.days);
    microPush.balanceSyncedAt = balance.generatedAt;
    microPush.balanceError = "";
    state.settings.microBreaks = prefs;
    saveState();
    microPush.error = "";
    toast("Horarios push guardados");
  } catch (error) { microPush.error = error.message; }
  finally { microPush.busy = false; if (nodes.modalCard.dataset.modalKind === "micro-breaks") renderMicroBreaks(); queueMicroBalanceSync(); }
}

async function microDeviceAction(action) {
  if (microPush.busy || !microPush.device) return;
  microPush.busy = true;
  try {
    if (action === "disable") {
      try { await microRequest(`/devices/${microPush.device.id}`, { method: "DELETE" }); }
      catch (error) { if (error.status !== 404) throw error; }
      microPush.remote = null;
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
      localStorage.removeItem("bittracker-push-device-v1");
      microPush.device = null;
      toast("Push desactivados");
    } else {
      await microRequest(`/devices/${microPush.device.id}/test`, { method: "POST" });
      toast("Prueba aceptada por el servicio push");
    }
    microPush.error = "";
  } catch (error) { microPush.error = error.message; }
  finally { microPush.busy = false; if (nodes.modalCard.dataset.modalKind === "micro-breaks") renderMicroBreaks(); }
}

async function openMicroSession(id = "") {
  try {
    if (!microPush.sessions.length) microPush.sessions = await fetch("./micro-sessions.json").then((response) => response.json());
    const form = document.querySelector("#microPushForm");
    const prefs = form ? readMicroPreferences(form) : microPreferences();
    const balance = denseMicroBalanceSnapshot(Date.now(), prefs.timeZone);
    const work = MicroBreaks.workload(balance, prefs.timeZone);
    const session = id ? microPush.sessions.find((item) => item.id === id) : MicroBreaks.choose(microPush.sessions, prefs, balance, microPush.previousId);
    if (!session || ![2, 5].includes(session.durationMinutes)) throw new Error("No hay una pausa disponible con esa carga y material. Puedes elegir movilidad o descansar.");
    if (form) { state.settings.microBreaks = prefs; saveState(); }
    microPush.previousId = session.id;
    const tired = session.kind === "activacion" && session.stressGroups.some((group) => work.blocked.has(group));
    const compatible = MicroBreaks.eligible([session], { ...prefs, durations: [session.durationMinutes], kinds: [session.kind] }).length > 0;
    const reason = tired ? "Trabajo duro registrado hoy o ayer en una zona implicada." : !compatible ? "Este ejercicio necesita material que no tienes seleccionado." : session.kind === "movilidad" ? "Pausa de movilidad suave" : !work.recorded ? "Sin entrenamiento registrado en los ultimos 7 dias" : `${MicroBreaks.labels[session.group]}: ${roundTo(work.load[session.group], 1)} series ponderadas en 7 dias`;
    pauseQuickTimer(false);
    nodes.modalEyebrow.textContent = `${session.durationMinutes} minutos`;
    nodes.modalTitle.textContent = session.title;
    nodes.modalCard.dataset.modalKind = "micro-session";
    nodes.modalBody.innerHTML = `<section class="micro-session"><p class="micro-reason">${escapeHtml(reason)}</p><p>${escapeHtml(session.instruction)}</p><p class="muted">Sin dolor ni esfuerzo maximo. Si molesta, para.</p><button class="text-button is-hot timer-wide-button" data-micro-action="start" data-session="${escapeAttr(session.id)}" ${tired || !compatible ? "disabled" : ""}><i data-lucide="timer"></i>Iniciar ${session.durationMinutes} minutos</button><button class="text-button timer-wide-button" data-micro-action="preview"><i data-lucide="shuffle"></i>Otra pausa</button></section>`;
    refreshIcons();
    openModal();
  } catch (error) { toast(error.message); }
}

function startMicroSession(id) {
  const session = microPush.sessions.find((item) => item.id === id);
  if (!session || ![2, 5].includes(session.durationMinutes)) return;
  const prefs = microPreferences();
  const work = MicroBreaks.workload(denseMicroBalanceSnapshot(Date.now(), prefs.timeZone), prefs.timeZone);
  if (!MicroBreaks.eligible([session], { ...prefs, durations: [session.durationMinutes], kinds: [session.kind] }).length || session.kind === "activacion" && session.stressGroups.some((group) => work.blocked.has(group))) { openMicroSession(id); return; }
  restoreQuickTimerDraft();
  if (quickTimerState.roundResults.some(Boolean) && !quickTimerState.appliedEntryId && !confirm("Hay rondas sin guardar. ¿Descartarlas para empezar esta pausa?")) return;
  resetQuickTimer(false);
  Object.assign(quickTimerState, { scheme: `${session.durationMinutes}D`, rounds: session.durationMinutes, roundSeconds: 60, holdSeconds: 0, context: null, microSession: session, microDate: MicroBreaks.dayKey(Date.now(), prefs.timeZone) });
  nodes.modalTitle.textContent = `Cronómetro · ${session.title}`;
  nodes.modalCard.dataset.modalKind = "quick-timer";
  startQuickTimer();
}

function reviewMicroSession() {
  const session = quickTimerState.microSession;
  if (!session?.repsPerRound || !denseTimerFrame(quickTimerState, quickTimerElapsedNow()).complete) return;
  pauseQuickTimer(false);
  const entry = getDenseEntries().find((item) => item.timer_session_id === quickTimerState.sessionId);
  selectedDate = parseDate(quickTimerState.microDate);
  openDenseTrainingModal({ exerciseId: session.exerciseId, entryId: entry?.id || "", planItem: { exercise_id: session.exerciseId, nature: "bodyweight", scheme: `${session.durationMinutes}D`, prescription: { repsPerSet: session.repsPerRound } }, timerResult: { kind: "reps", exerciseId: session.exerciseId, scheme: `${session.durationMinutes}D`, sessionId: quickTimerState.sessionId } });
}

document.addEventListener("submit", (event) => {
  if (event.target.id !== "microPushForm") return;
  event.preventDefault();
  saveMicroSubscription(event.target);
});
document.addEventListener("click", (event) => {
  if (event.target.closest('[data-action="open-micro-breaks"]')) openMicroBreaks();
  const target = event.target.closest("[data-micro-action]");
  if (!target) return;
  const action = target.dataset.microAction;
  if (action === "preview") openMicroSession();
  else if (action === "start") startMicroSession(target.dataset.session);
  else if (action === "review") reviewMicroSession();
  else if (action === "save-local") {
    try { state.settings.microBreaks = readMicroPreferences(target.form); saveState(); toast("Preferencias guardadas"); }
    catch (error) { toast(error.message); }
  }
  else microDeviceAction(action);
});
document.addEventListener("bittracker-state-saved", queueMicroBalanceSync);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") queueMicroBalanceSync(); });
window.addEventListener("online", queueMicroBalanceSync);
try {
  if (localStorage.getItem("bittracker-push-device-v1")) loadMicroPush().then(queueMicroBalanceSync).catch(() => { microPush.balanceError = "Carga push pendiente de sincronizar"; });
} catch { /* Unavailable local storage must not block manual pauses. */ }
navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.type !== "open-micro-session") return;
  if (quickTimerState.running || nodes.modal.open) { toast("Hay una pausa disponible en la campana."); return; }
  openMicroSession(event.data.id);
});
const initialMicroId = new URL(location.href).searchParams.get("micro");
if (initialMicroId) {
  const clean = new URL(location.href);
  clean.searchParams.delete("micro");
  history.replaceState(null, "", clean);
  openMicroSession(initialMicroId);
}
