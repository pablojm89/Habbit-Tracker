const microPush = { serviceUrl: "", publicKey: "", device: null, remote: null, sessions: [], error: "", busy: false, loaded: false };

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
  finally { microPush.busy = false; if (nodes.modalCard.dataset.modalKind === "micro-breaks") renderMicroBreaks(); }
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
    <fieldset ${microPush.busy ? "disabled" : ""}><legend>Duracion</legend><div class="micro-choices">${choice("durations", "2", "2 minutos", prefs.durations.includes(2))}${choice("durations", "5", "5 minutos", prefs.durations.includes(5))}</div></fieldset>
    <fieldset ${microPush.busy ? "disabled" : ""}><legend>Horas de aviso</legend>
      <div class="micro-times">${Array.from({ length: 4 }, (_, i) => `<label class="field"><span>Aviso ${i + 1}${i ? " (opcional)" : ""}</span><input type="time" name="time" min="08:00" max="21:59" value="${escapeAttr(prefs.times[i] || "")}" ${i === 0 ? "required" : ""}></label>`).join("")}</div>
      <label class="field"><span>Zona horaria</span><input name="timeZone" value="${escapeAttr(prefs.timeZone)}" required list="microTimeZones"><datalist id="microTimeZones"><option value="Europe/Madrid"><option value="Atlantic/Canary"><option value="${escapeAttr(Intl.DateTimeFormat().resolvedOptions().timeZone)}"></datalist></label>
    </fieldset>
    <fieldset ${microPush.busy ? "disabled" : ""}><legend>Material disponible</legend><div class="micro-choices">${choice("equipment", "suelo", "Suelo", prefs.equipment.includes("suelo"))}${choice("equipment", "anillas", "Anillas", prefs.equipment.includes("anillas"))}</div></fieldset>
    <fieldset ${microPush.busy ? "disabled" : ""}><legend>Tipo de pausa</legend><div class="micro-choices">${choice("kinds", "movilidad", "Movilidad", prefs.kinds.includes("movilidad"))}${choice("kinds", "activacion", "Activacion suave", prefs.kinds.includes("activacion"))}</div></fieldset>
    ${!active && microPush.serviceUrl ? '<label class="field"><span>Codigo de activacion</span><input name="enrollment" type="password" autocomplete="off" minlength="32"></label>' : ""}
    <button class="text-button is-hot timer-wide-button" type="submit" ${enabled ? "" : "disabled"}><i data-lucide="${active ? "save" : "bell-ring"}"></i>${active ? "Guardar horarios" : "Activar push"}</button>
    ${microPush.device ? `<div class="micro-actions">${active ? `<button class="text-button" type="button" data-micro-action="test" ${enabled ? "" : "disabled"}><i data-lucide="send"></i>Enviar prueba</button>` : ""}<button class="text-button" type="button" data-micro-action="disable" ${microPush.busy ? "disabled" : ""}><i data-lucide="bell-off"></i>Desactivar</button></div>` : ""}
    <button class="text-button timer-wide-button" type="button" data-micro-action="preview"><i data-lucide="shuffle"></i>Una pausa ahora</button>
  </form>`;
  refreshIcons();
}

function readMicroPreferences(form) {
  const data = new FormData(form);
  const prefs = { times: [...new Set(data.getAll("time").filter(Boolean))].sort(), timeZone: String(data.get("timeZone")).trim(), equipment: data.getAll("equipment"), kinds: data.getAll("kinds"), durations: data.getAll("durations").map(Number) };
  if (!prefs.durations.length || prefs.durations.some((minutes) => ![2, 5].includes(minutes))) throw new Error("Elige pausas de 2 minutos, de 5 o ambas.");
  try { new Intl.DateTimeFormat("es", { timeZone: prefs.timeZone }).format(); } catch { throw new Error("Zona horaria no valida."); }
  const minutes = prefs.times.map((value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3)));
  if (!minutes.length || minutes.some((value, i) => value < 480 || value >= 1320 || i > 0 && value - minutes[i - 1] < 60)) throw new Error("Elige horarios entre las 08:00 y las 21:59, separados una hora.");
  if (!(prefs.equipment.includes("suelo") && prefs.kinds.includes("movilidad") || prefs.equipment.includes("anillas") && prefs.kinds.includes("activacion"))) throw new Error("Elige suelo y movilidad, o anillas y activacion.");
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
    microPush.remote = await microRequest(`/devices/${id}`, { method: "PUT", enrollment, value: { subscription: subscription.toJSON(), preferences: prefs } });
    state.settings.microBreaks = prefs;
    saveState();
    microPush.error = "";
    toast("Horarios push guardados");
  } catch (error) { microPush.error = error.message; }
  finally { microPush.busy = false; if (nodes.modalCard.dataset.modalKind === "micro-breaks") renderMicroBreaks(); }
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
    const eligible = microPush.sessions.filter((item) => prefs.durations.includes(item.durationMinutes) && prefs.kinds.includes(item.kind) && item.equipment.every((gear) => prefs.equipment.includes(gear)));
    const session = id ? microPush.sessions.find((item) => item.id === id) : eligible[Math.floor(Math.random() * eligible.length)];
    if (!session || ![2, 5].includes(session.durationMinutes)) throw new Error("No hay una pausa compatible con esas preferencias.");
    pauseQuickTimer(false);
    nodes.modalEyebrow.textContent = `${session.durationMinutes} minutos`;
    nodes.modalTitle.textContent = session.title;
    nodes.modalCard.dataset.modalKind = "micro-session";
    nodes.modalBody.innerHTML = `<section class="micro-session"><p>${escapeHtml(session.instruction)}</p><p class="muted">Sin dolor ni esfuerzo maximo. Si molesta, para.</p><button class="text-button is-hot timer-wide-button" data-micro-action="start" data-session="${escapeAttr(session.id)}"><i data-lucide="timer"></i>Iniciar ${session.durationMinutes} minutos</button></section>`;
    refreshIcons();
    openModal();
  } catch (error) { toast(error.message); }
}

function startMicroSession(id) {
  const session = microPush.sessions.find((item) => item.id === id);
  if (!session || ![2, 5].includes(session.durationMinutes)) return;
  restoreQuickTimerDraft();
  if (quickTimerState.roundResults.some(Boolean) && !quickTimerState.appliedEntryId && !confirm("Hay rondas sin guardar. ¿Descartarlas para empezar esta pausa?")) return;
  resetQuickTimer(false);
  Object.assign(quickTimerState, { scheme: `${session.durationMinutes}D`, rounds: session.durationMinutes, roundSeconds: 60, holdSeconds: 0, context: null, microSession: session });
  nodes.modalTitle.textContent = `Cronómetro · ${session.title}`;
  nodes.modalCard.dataset.modalKind = "quick-timer";
  startQuickTimer();
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
  else microDeviceAction(action);
});
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
