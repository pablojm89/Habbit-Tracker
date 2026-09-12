// Timer calculations use elapsed time; rendering and interval frequency do not define time.
function denseTimerFrame(config, elapsedMs) {
  const roundSeconds = config.roundSeconds || 60;
  const rounds = Math.max(1, config.rounds || 1);
  const preparation = config.holdSeconds > 0 ? Number(config.preparationSeconds ?? 5) : 0;
  const activeMs = Math.max(0, elapsedMs - preparation * 1000);
  const elapsed = Math.min(rounds * roundSeconds, Math.floor(activeMs / 1000));
  const index = Math.min(rounds - 1, Math.floor(elapsed / roundSeconds));
  const intoRound = elapsed - index * roundSeconds;
  const complete = elapsed >= rounds * roundSeconds;
  const preparing = elapsedMs < preparation * 1000;
  return {
    elapsed, index, intoRound, complete, preparing,
    preparationRemaining: preparing ? Math.ceil(preparation - elapsedMs / 1000) : 0,
    remaining: rounds * roundSeconds - elapsed,
    phase: complete ? "complete" : preparing ? "prepare" : config.holdSeconds && intoRound < config.holdSeconds && !config.roundResults?.[index] ? "hold" : config.holdSeconds ? "rest" : "clock",
    phaseRemaining: config.holdSeconds && intoRound < config.holdSeconds && !config.roundResults?.[index] ? config.holdSeconds - intoRound : roundSeconds - intoRound,
  };
}

function denseTimerEvents(config, previousMs, currentMs) {
  const events = [];
  const prep = config.holdSeconds > 0 ? Number(config.preparationSeconds ?? 5) : 0;
  const round = config.roundSeconds || 60;
  const add = (seconds, kind) => { if (previousMs < seconds * 1000 && currentMs >= seconds * 1000) events.push({ at: seconds, kind }); };
  for (let i = 0; i < config.rounds; i += 1) {
    const start = prep + i * round;
    add(start, "start");
    for (let countdown = 3; countdown > 0; countdown -= 1) if (start - countdown >= 0) add(start - countdown, "countdown");
    if (config.holdSeconds > 0) add(start + config.holdSeconds, "hold-end");
  }
  add(prep + config.rounds * round, "complete");
  return events.sort((a, b) => a.at - b.at);
}

function denseTimerCollectRounds(config, elapsedMs) {
  if (!(config.holdSeconds > 0)) return false;
  const frame = denseTimerFrame(config, elapsedMs);
  if (frame.preparing) return false;
  let changed = false;
  for (let i = 0; i < config.rounds; i += 1) {
    if (!config.roundResults[i] && frame.elapsed >= i * (config.roundSeconds || 60) + config.holdSeconds) {
      config.roundResults[i] = { seconds: config.holdSeconds, kind: "target" };
      changed = true;
    }
  }
  return changed;
}

function quickTimerElapsedNow() {
  return quickTimerState.running
    ? quickTimerState.elapsedBeforeRunMs + Math.max(0, Date.now() - quickTimerState.startedAt)
    : quickTimerState.elapsedMs;
}

function saveQuickTimerDraft() {
  const q = quickTimerState;
  if (q.testing) return;
  try {
    localStorage.setItem("bittracker-quick-timer-v1", JSON.stringify({
      scheme: q.scheme, rounds: q.rounds, roundSeconds: q.roundSeconds, holdSeconds: q.holdSeconds,
      preparationSeconds: q.preparationSeconds, elapsedMs: q.elapsedMs, roundResults: q.roundResults,
      context: q.context, sessionId: q.sessionId, appliedEntryId: q.appliedEntryId,
    }));
    q.draftSaveFailed = false;
  } catch {
    q.draftSaveFailed = true;
  }
}

function restoreQuickTimerDraft() {
  if (quickTimerState.restored) return;
  quickTimerState.restored = true;
  try {
    const saved = JSON.parse(localStorage.getItem("bittracker-quick-timer-v1"));
    if (!saved || !saved.sessionId || !Number.isFinite(saved.elapsedMs)) return;
    const rounds = clamp(Math.round(Number(saved.rounds) || 5), 1, 120);
    Object.assign(quickTimerState, {
      scheme: bodyweightSchemes.includes(saved.scheme) ? saved.scheme : "5D", rounds,
      roundSeconds: clamp(Math.round(Number(saved.roundSeconds) || 60), 10, 900),
      holdSeconds: clamp(Math.round(Number(saved.holdSeconds) || 0), 0, 55),
      preparationSeconds: clamp(Math.round(Number(saved.preparationSeconds) || 0), 0, 10),
      elapsedMs: Math.max(0, saved.elapsedMs),
      roundResults: Array.from({ length: rounds }, (_, i) => {
        const result = saved.roundResults?.[i];
        return result && Number.isFinite(result.seconds) ? { seconds: clamp(result.seconds, 0, 60), kind: result.kind === "fall" ? "fall" : "target" } : null;
      }),
      context: saved.context?.exerciseId && findDenseExerciseById(saved.context.exerciseId) ? saved.context : null,
      sessionId: String(saved.sessionId), appliedEntryId: saved.appliedEntryId || "", running: false,
    });
    quickTimerState.remainingSeconds = denseTimerFrame(quickTimerState, quickTimerState.elapsedMs).remaining;
  } catch { /* An unreadable timer draft never blocks the training log. */ }
}

function recordQuickTimerFall() {
  if (!quickTimerState.running || !quickTimerState.holdSeconds) return;
  tickQuickTimer();
  const frame = denseTimerFrame(quickTimerState, quickTimerState.elapsedMs);
  if (frame.preparing || frame.complete || quickTimerState.roundResults[frame.index]) return;
  quickTimerState.roundResults[frame.index] = { seconds: Math.min(quickTimerState.holdSeconds, frame.intoRound), kind: "fall" };
  playQuickTimerCue("fall");
  saveQuickTimerDraft();
  patchQuickTimerReadout();
}

function quickTimerAudioContext() {
  try {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* Optional audio routing. */ }
    if (!quickTimerState.audioContext || quickTimerState.audioContext.state === "closed") {
      quickTimerState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = quickTimerState.audioContext;
    if (ctx.state === "suspended" || ctx.state === "interrupted") ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

function playQuickTimerCue(kind) {
  const patterns = {
    start: [[820, 0, .24], [1040, .32, .24]],
    "hold-end": [[1320, 0, .2], [1320, .3, .2], [1580, .6, .28]],
    complete: [[1040, 0, .25], [1320, .35, .25], [1580, .7, .45]],
    countdown: [[680, 0, .12]],
    fall: [[520, 0, .2], [440, .26, .2]],
  };
  for (const [frequency, offset, duration] of patterns[kind] || patterns.start) playTimerBeep(frequency, offset, duration);
}

function playTimerBeep(frequency = 660, offset = 0, duration = .2) {
  const ctx = quickTimerAudioContext();
  if (!ctx) return;
  const volume = clamp(Number(state.settings.timerVolume ?? .85), 0, 1);
  if (volume === 0) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + offset;
  oscillator.frequency.value = frequency;
  oscillator.type = "triangle";
  gain.gain.setValueAtTime(.001, start);
  gain.gain.linearRampToValueAtTime(.55 * volume, start + .015);
  gain.gain.setValueAtTime(.55 * volume, start + Math.max(.02, duration - .025));
  gain.gain.linearRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(start);
  oscillator.stop(start + duration + .01);
}

function requestQuickTimerWakeLock() {
  if (!quickTimerState.running || document.visibilityState !== "visible" || !navigator.wakeLock?.request) return;
  navigator.wakeLock.request("screen").then((lock) => {
    if (!quickTimerState.running) { lock.release().catch(() => {}); return; }
    quickTimerState.wakeLock = lock;
  }).catch(() => {});
}

function releaseQuickTimerWakeLock() {
  quickTimerState.wakeLock?.release().catch(() => {});
  quickTimerState.wakeLock = null;
}

function denseHoldRoundFields(rounds, values = [], sessionId = "") {
  const count = clamp(Math.round(Number(rounds) || 1), 1, 120);
  return `<details class="hold-round-details" ${values.length ? "open" : ""}><summary>Segundos reales por ronda</summary><div class="hold-round-grid">${Array.from({ length: count }, (_, i) => `<label class="field"><span>Ronda ${i + 1}</span><input type="number" min="0" max="60" step="1" inputmode="numeric" data-hold-round="${i}" value="${escapeAttr(values[i] ?? "")}" placeholder="Objetivo"></label>`).join("")}</div></details>${sessionId ? `<input type="hidden" name="timerSessionId" value="${escapeAttr(sessionId)}">` : ""}`;
}

function denseReadHoldRounds(form, rounds, target) {
  const inputs = [...form.querySelectorAll("[data-hold-round]")];
  if (!inputs.some((input) => input.value !== "")) return null;
  return Array.from({ length: clamp(Math.round(rounds || 1), 1, 120) }, (_, i) => !inputs[i] ? 0 : inputs[i].value !== "" ? clamp(Number(inputs[i].value) || 0, 0, 60) : target || 0);
}

function resizeDenseHoldRounds(form) {
  const details = form.querySelector(".hold-round-details");
  if (!details) return;
  const values = [...details.querySelectorAll("[data-hold-round]")].map((input) => input.value);
  const rounds = clamp(Math.round(Number(form.elements.rounds.value) || 1), 1, 120);
  if (values.slice(rounds).some((value) => value !== "") && !window.confirm("¿Quitar los segundos de las rondas que sobran?")) {
    form.elements.rounds.value = values.length;
  } else {
    const open = details.open;
    const actual = values.some((value) => value !== "");
    details.outerHTML = denseHoldRoundFields(rounds, Array.from({ length: rounds }, (_, i) => values[i] ?? (actual ? 0 : "")));
    form.querySelector(".hold-round-details").open = open;
  }
  updateDenseHoldEstimate(form);
}

function denseRecordedHoldPace(entry) {
  if (!Array.isArray(entry.hold_rounds) || !entry.hold_rounds.length) return Number(entry.hold_seconds_per_round) || 0;
  const total = entry.hold_rounds.reduce((sum, value) => sum + (Number(value) || 0), 0);
  return total / Math.max(1, Number(entry.duration_minutes) || Number(entry.rounds) || entry.hold_rounds.length);
}

function denseTimerFormDefaults(defaults) {
  const result = denseSetModalContext.timerResult;
  if (!result || defaults.exerciseId !== result.exerciseId || defaults.scheme !== result.scheme) return defaults;
  return { ...defaults, holdSecondsPerRound: result.target, rounds: result.rounds.length, holdRounds: result.rounds, timerSessionId: result.sessionId };
}
