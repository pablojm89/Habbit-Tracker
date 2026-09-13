import { DateTime } from "luxon";
import sessions from "../../../micro-sessions.json" with { type: "json" };

export function preferences(value) {
  if (!value || !DateTime.now().setZone(value.timeZone).isValid) throw new Error("Zona horaria no valida");
  const times = [...new Set(value.times || [])].sort();
  if (!times.length || times.length > 4 || times.some((time) => typeof time !== "string" || !/^(0[8-9]|1[0-9]|2[01]):[0-5][0-9]$/.test(time))) throw new Error("Elige de 1 a 4 horas entre las 08:00 y las 21:59");
  const minutes = times.map((time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3)));
  if (minutes.some((time, i) => i > 0 && time - minutes[i - 1] < 60)) throw new Error("Separa los avisos al menos una hora");
  const equipment = ["suelo", "anillas"].filter((item) => value.equipment?.includes(item));
  const kinds = ["movilidad", "activacion"].filter((item) => value.kinds?.includes(item));
  const durations = value.durations === undefined ? [5] : value.durations;
  if (!Array.isArray(durations) || !durations.length || durations.some((minutes) => ![2, 5].includes(minutes))) throw new Error("Elige pausas de 2 minutos, de 5 o ambas");
  const prefs = { times, timeZone: value.timeZone, equipment, kinds, durations: [2, 5].filter((minutes) => durations.includes(minutes)) };
  if (!eligibleSessions(prefs).length) throw new Error("Elige material y un tipo de pausa compatibles");
  return prefs;
}

export function eligibleSessions(prefs) {
  return sessions.filter((session) => (prefs.durations || [5]).includes(session.durationMinutes) && prefs.kinds.includes(session.kind) && session.equipment.every((item) => prefs.equipment.includes(item)));
}

export function nextSlot(prefs, now = Date.now()) {
  const today = DateTime.fromMillis(now, { zone: prefs.timeZone }).startOf("day");
  for (let day = 0; day < 3; day += 1) {
    for (const time of prefs.times) {
      const [hour, minute] = time.split(":").map(Number);
      const at = today.plus({ days: day }).set({ hour, minute }).toMillis();
      if (at > now) return at;
    }
  }
  throw new Error("No hay un horario valido");
}

export function chooseSession(prefs, previousId = "", random = Math.random) {
  const all = eligibleSessions(prefs);
  const previousExercise = sessions.find((session) => session.id === previousId)?.exerciseId;
  const fresh = all.filter((session) => session.exerciseId !== previousExercise);
  const options = fresh.length ? fresh : all;
  return options[Math.floor(random() * options.length)];
}
