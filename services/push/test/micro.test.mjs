import test from "node:test";
import assert from "node:assert/strict";
import MicroBreaks from "../../../micro-core.js";
import sessions from "../../../micro-sessions.json" with { type: "json" };
import { chooseSession } from "../src/schedule.mjs";

const now = Date.parse("2026-09-13T12:00:00Z");
const prefs = { durations: [2, 5], equipment: ["suelo", "anillas", "barra"], kinds: ["activacion"], timeZone: "Europe/Madrid" };
const summary = (load, hard = [], date = "2026-09-13") => ({ generatedAt: now, days: [{ date, load, hard }] });
const choose = (balance, random = () => 0, extra = {}) => chooseSession({ ...prefs, ...extra }, "", random, balance, now);

test("catalogo: ocho ejercicios, dos dosis cada uno y equipo real", () => {
  assert.equal(sessions.length, 16);
  assert.equal(new Set(sessions.map((s) => s.exerciseId)).size, 8);
  assert.ok(sessions.every((s) => MicroBreaks.keys.includes(s.group) && MicroBreaks.keys.includes(s.pattern) && s.instruction.includes(`${s.durationMinutes} rondas`)));
  const floor = MicroBreaks.eligible(sessions, { ...prefs, equipment: ["suelo"] });
  assert.deepEqual([...new Set(floor.map((s) => s.exerciseId))].sort(), ["air_squat", "floor_push_up"]);
  const rings = MicroBreaks.eligible(sessions, { ...prefs, equipment: ["anillas"] });
  assert.ok(rings.some((s) => s.exerciseId === "pull_up"));
  assert.ok(!rings.some((s) => s.exerciseId === "toes_to_bar_strict"));
});

test("balance: prioriza el patron menos trabajado entre los disponibles", () => {
  for (const [group, exercise] of [["legs", "air_squat"], ["push", "floor_push_up"], ["core", "toes_to_bar_strict"], ["pull", "ring_row"]]) {
    const load = { push: 15, pull: 15, legs: 15, core: 15, [group]: 0 };
    for (const r of [0, .3, .99]) assert.equal(choose(summary(load), () => r).group, group);
    assert.equal(choose(summary(load)).exerciseId, exercise);
  }
  assert.equal(choose(summary({ push: 10, legs: 10, core: 10, pull: 5, vertical_pull: 5 })).exerciseId, "ring_row");
  assert.notEqual(choose(summary({ push: 10, legs: 10, core: 10, pull: 5, horizontal_pull: 5 })).exerciseId, "ring_row");
  assert.equal(chooseSession(prefs, "anillas-remo", () => 0, summary({ push: 20, legs: 20, core: 20, pull: 10, vertical_pull: 10 }), now).exerciseId, "ring_row");
});

test("fatiga: bloquea hoy y ayer, comparte tiron con TTB, omite si no hay alternativa", () => {
  for (const date of ["2026-09-13", "2026-09-12"]) {
    const balance = summary({ pull: 3, push: 20, legs: 20 }, ["pull"], date);
    for (const r of [0, .5, .99]) assert.ok(!["pull", "core"].includes(choose(balance, () => r).group));
    assert.equal(choose(balance, () => 0, { equipment: ["barra"] }), null);
  }
  assert.equal(choose(summary({ pull: 2 }, ["pull"]), () => 0, { equipment: ["suelo", "anillas"], kinds: ["movilidad"] }).kind, "movilidad");
  const blockedAll = summary({}, ["push", "pull", "legs", "core"]);
  assert.equal(choose(blockedAll), null);
  assert.equal(choose(blockedAll, () => 0, { kinds: ["activacion", "movilidad"] }).kind, "movilidad");
  assert.equal(MicroBreaks.workload(summary({}, ["pull"], "2026-09-11"), prefs.timeZone, now).blocked.size, 0);
});

test("fechas: caduca a 48 h, ventana movil, futuro y cambio de dia en zona local", () => {
  const balance = summary({ pull: 10 }, ["pull"]);
  assert.equal(MicroBreaks.workload({ ...balance, generatedAt: now - 49 * 3600000 }, prefs.timeZone, now).fresh, false);
  for (const date of ["2026-09-06", "2026-09-14"]) assert.equal(MicroBreaks.workload(summary({ pull: 10 }, ["pull"], date), prefs.timeZone, now).load.pull, 0);
  assert.equal(MicroBreaks.dayKey(Date.parse("2026-09-13T22:30:00Z"), prefs.timeZone), "2026-09-14");
  assert.equal(MicroBreaks.daysBetween("2026-03-28", "2026-03-30"), 2);
  assert.equal(MicroBreaks.workload(summary({ pull: 10 }, [], "2026-09-07"), prefs.timeZone, now).load.pull, 10);
});

test("resumen: contrato acotado, rechaza fechas/cargas invalidas y no almacena notas", () => {
  const valid = summary({ pull: 5 });
  assert.deepEqual(MicroBreaks.validateBalance({ ...valid, notes: "privado" }, now), valid);
  for (const value of [{ ...valid, generatedAt: now + 3600000 }, { ...valid, days: Array(8).fill(valid.days[0]) }, summary({ pull: -1 }), summary({ pull: Infinity }), summary({ pull: "7" }), summary({ unknown: 1 }), summary({}, [], "2026-02-31"), summary({}, ["unknown"])]) assert.throws(() => MicroBreaks.validateBalance(value, now));
});

test("azar equilibrado: ni multiplicar duraciones ni variantes favorece un patron", () => {
  let seed = 42;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const counts = { pull: 0, push: 0, legs: 0, core: 0 };
  for (let i = 0; i < 4000; i += 1) counts[choose(null, random).group] += 1;
  assert.ok(Object.values(counts).every((n) => n > 850 && n < 1150), JSON.stringify(counts));
});
