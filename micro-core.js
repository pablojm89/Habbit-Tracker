// Shared by the offline app and the push worker. Scores are a scheduling heuristic,
// not a measure of energy, muscle stimulus or a prescribed training target.
const MicroBreaks = (() => {
  const labels = { push: "Empuje", pull: "Tiron", legs: "Piernas", core: "Core", mobility: "Movilidad" };
  const keys = [...Object.keys(labels), "horizontal_pull", "vertical_pull"];
  const dayKey = (now, timeZone) => {
    const parts = new Intl.DateTimeFormat("en", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const value = (key) => parts.find((part) => part.type === key).value;
    return `${value("year")}-${value("month")}-${value("day")}`;
  };
  const daysBetween = (from, to) => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;

  function validateBalance(value, now = Date.now()) {
    if (value == null) return null;
    if (!Number.isFinite(value.generatedAt) || value.generatedAt < 0 || value.generatedAt > now + 300000 || !Array.isArray(value.days) || value.days.length > 7) throw new Error("Resumen de carga no valido");
    const seen = new Set();
    const days = value.days.map((day) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(Date.parse(`${day.date}T00:00:00Z`)) || new Date(`${day.date}T00:00:00Z`).toISOString().slice(0, 10) !== day.date || seen.has(day.date)) throw new Error("Fecha de carga no valida");
      seen.add(day.date);
      if (!day.load || typeof day.load !== "object" || Array.isArray(day.load) || Object.keys(day.load).some((key) => !keys.includes(key)) || !Array.isArray(day.hard) || day.hard.some((key) => !keys.includes(key))) throw new Error("Patron de carga no valido");
      const load = Object.fromEntries(Object.entries(day.load).map(([key, amount]) => {
        if (!Number.isFinite(amount) || amount < 0 || amount > 10000) throw new Error("Carga no valida");
        return [key, amount];
      }));
      return { date: day.date, load, hard: [...new Set(day.hard)] };
    });
    return { generatedAt: value.generatedAt, days };
  }

  function workload(balance, timeZone, now = Date.now()) {
    const load = Object.fromEntries(keys.map((key) => [key, 0]));
    const blocked = new Set(), recovering = new Set();
    const fresh = Boolean(balance && now - balance.generatedAt <= 48 * 3600000 && now >= balance.generatedAt - 300000);
    const current = dayKey(now, timeZone);
    let recorded = false;
    if (fresh) for (const day of balance.days) {
      const age = daysBetween(day.date, current);
      if (age < 0 || age > 6) continue;
      for (const key of keys) {
        load[key] += day.load[key] || 0;
        if (day.load[key] > 0) recorded = true;
      }
      if (age <= 1) day.hard.forEach((key) => blocked.add(key));
      if (age === 2) day.hard.forEach((key) => recovering.add(key));
    }
    return { load, blocked, recovering, fresh, recorded };
  }

  function eligible(sessions, prefs) {
    return sessions.filter((session) => (prefs.durations || [5]).includes(session.durationMinutes) && prefs.kinds.includes(session.kind) && session.equipment.every((item) => prefs.equipment.includes(item)) && (!session.equipmentAny || session.equipmentAny.some((item) => prefs.equipment.includes(item))));
  }

  function choose(sessions, prefs, balance = null, previousId = "", random = Math.random, now = Date.now()) {
    const work = workload(balance, prefs.timeZone, now);
    const safe = eligible(sessions, prefs).filter((session) => session.kind === "movilidad" || !session.stressGroups.some((group) => work.blocked.has(group)));
    const pick = (items) => items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];
    const active = safe.filter((session) => session.kind === "activacion");
    const mobility = safe.filter((session) => session.kind === "movilidad");
    // Mobility has its own quota; unlogged stretching must not displace every
    // strength pause. Group first, exercise second, duration last avoids bias.
    const pool = active.length && (!mobility.length || random() < .75) ? active : mobility;
    if (!pool.length) return null;
    const groups = [...new Set(pool.map((session) => session.group))];
    const score = (group) => work.load[group] + (work.recovering.has(group) ? 2 : 0);
    const min = Math.min(...groups.map(score));
    const priority = pool.filter((session) => score(session.group) <= min + 1).filter((session) => {
      const patternMin = Math.min(...pool.filter((item) => item.group === session.group).map((item) => work.load[item.pattern] || 0));
      return (work.load[session.pattern] || 0) <= patternMin + .5;
    });
    const priorExercise = sessions.find((session) => session.id === previousId)?.exerciseId;
    const different = priority.filter((session) => session.exerciseId !== priorExercise);
    const options = different.length ? different : priority;
    const group = pick([...new Set(options.map((session) => session.group))]);
    const inGroup = options.filter((session) => session.group === group);
    const exercise = pick([...new Set(inGroup.map((session) => session.exerciseId))]);
    return pick(inGroup.filter((session) => session.exerciseId === exercise));
  }

  return { labels, keys, dayKey, daysBetween, validateBalance, workload, eligible, choose };
})();

if (typeof module !== "undefined" && module.exports) module.exports = MicroBreaks;
