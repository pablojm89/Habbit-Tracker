import test from "node:test";
import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import webpush from "web-push";
import worker, { PushDevice, hash, validateSubscription } from "../src/worker.mjs";
import { preferences, nextSlot, chooseSession, eligibleSessions } from "../src/schedule.mjs";

const prefs = { times: ["11:00", "17:00"], timeZone: "Europe/Madrid", equipment: ["suelo", "anillas"], kinds: ["movilidad", "activacion"], durations: [5] };
const client = createECDH("prime256v1");
client.generateKeys();
const subscription = { endpoint: "https://web.push.apple.com/QAtest", keys: { p256dh: client.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
const vapid = webpush.generateVAPIDKeys();
const env = { APP_URL: "https://app.example.test/", VAPID_SUBJECT: "https://app.example.test/", VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, ENROLLMENT_TOKEN: "c".repeat(64) };
const token = "a".repeat(64);

function fixture() {
  const map = new Map();
  const storage = { alarm: null, get: async (key) => structuredClone(map.get(key)), put: async (key, value) => map.set(key, structuredClone(value)), deleteAll: async () => map.clear(), setAlarm: async (at) => { storage.alarm = at; }, deleteAlarm: async () => { storage.alarm = null; } };
  let queue = Promise.resolve();
  const ctx = { storage, blockConcurrencyWhile(fn) { const task = queue.then(fn); queue = task.catch(() => {}); return task; } };
  const object = new PushDevice(ctx, env);
  const request = (method, { invite = false, auth = token, value = { subscription, preferences: prefs }, test = false, balance = false } = {}) => new Request(`https://push.example.test/devices/${hash(subscription.endpoint)}${test ? "/test" : balance ? "/balance" : ""}`, {
    method, headers: { Origin: "https://app.example.test", Authorization: `Bearer ${auth}`, "Content-Type": "application/json", ...(invite ? { "X-Enrollment": env.ENROLLMENT_TOKEN } : {}) }, ...(method === "PUT" || balance && method === "POST" ? { body: JSON.stringify(value) } : {}),
  });
  return { storage, object, request, contextEnv: { ...env, DEVICES: { idFromName: (id) => id, get: () => object } } };
}

test("horarios: validacion, separacion, material y zona", () => {
  assert.deepEqual(preferences(prefs), prefs);
  for (const change of [{ times: [] }, { times: ["02:00"] }, { times: ["11:00", "11:30"] }, { timeZone: "Unknown/Zone" }, { equipment: [] }, { equipment: ["anillas"], kinds: ["movilidad"] }]) assert.throws(() => preferences({ ...prefs, ...change }));
  assert.equal(eligibleSessions({ ...prefs, equipment: ["suelo"] }).length, 4);
  const first = chooseSession(prefs, "", () => 0);
  assert.notEqual(chooseSession(prefs, first.id, () => 0).id, first.id);
});

test("horarios: Madrid mantiene la hora local en ambos cambios de hora", () => {
  const once = { ...prefs, times: ["11:00"] };
  assert.equal(new Date(nextSlot(once, Date.parse("2026-10-24T12:00:00Z"))).toISOString(), "2026-10-25T10:00:00.000Z");
  assert.equal(new Date(nextSlot(once, Date.parse("2026-03-28T12:00:00Z"))).toISOString(), "2026-03-29T09:00:00.000Z");
  assert.equal(nextSlot(prefs, Date.parse("2026-09-12T09:00:00Z")), Date.parse("2026-09-12T15:00:00Z"));
});

test("duraciones: 2, 5 o ambas; conserva las suscripciones antiguas", () => {
  assert.deepEqual(preferences({ ...prefs, durations: undefined }).durations, [5]);
  for (const durations of [[], [3], ["2"], null, 2]) assert.throws(() => preferences({ ...prefs, durations }));
  for (const durations of [[2], [5], [2, 5]]) {
    const normalized = preferences({ ...prefs, durations });
    const pool = eligibleSessions(normalized);
    assert.equal(pool.length, durations.length * 7);
    assert.ok(pool.every((session) => durations.includes(session.durationMinutes) && session.instruction.includes(`${session.durationMinutes} rondas`)));
    assert.equal(new Set(pool.map((session) => session.id)).size, pool.length);
  }
  assert.ok(eligibleSessions(prefs).every((session) => !session.id.endsWith("-2min")));
});

test("azar: cambiar de duracion no repite el mismo ejercicio consecutivamente", () => {
  const both = { ...prefs, durations: [2, 5] };
  for (const previous of eligibleSessions(both)) {
    for (const random of [() => 0, () => .99]) assert.notEqual(chooseSession(both, previous.id, random).exerciseId, previous.exerciseId);
  }
});

test("envio: titulo y enlace coinciden con la duracion de la pausa", async (t) => {
  const original = webpush.generateRequestDetails;
  const originalFetch = globalThis.fetch;
  t.after(() => { webpush.generateRequestDetails = original; globalThis.fetch = originalFetch; });
  let payload;
  webpush.generateRequestDetails = (sub, value, options) => { payload = JSON.parse(value); return original(sub, value, options); };
  globalThis.fetch = async () => new Response(null, { status: 201 });
  for (const minutes of [2, 5]) {
    const f = fixture();
    const choice = { ...prefs, durations: [minutes] };
    const session = chooseSession(choice, "", () => 0);
    assert.equal(await f.object.send({ subscription }, session, `qa-${minutes}`), 201);
    assert.equal(payload.title, `${minutes} min: ${session.title}`);
    assert.equal(new URL(payload.url).searchParams.get("micro"), session.id);
    assert.ok(payload.body.includes(`${minutes} rondas`));
  }
});

test("suscripciones: solo proveedores HTTPS, sin SSRF ni claves invalidas", () => {
  assert.equal(validateSubscription(subscription).endpoint, subscription.endpoint);
  for (const endpoint of ["http://web.push.apple.com/a", "https://web.push.apple.com.evil.test/a", "https://127.0.0.1/a", "https://web.push.apple.com:8443/a", "https://user@web.push.apple.com/a"]) assert.throws(() => validateSubscription({ ...subscription, endpoint }));
  assert.throws(() => validateSubscription({ ...subscription, keys: { ...subscription.keys, auth: "bad" } }));
});

test("alta idempotente, autorizacion, origen y baja persistente", async () => {
  const f = fixture();
  assert.equal((await worker.fetch(new Request("https://push.example.test/config", { headers: { Origin: "https://evil.test" } }), f.contextEnv)).status, 403);
  assert.equal((await worker.fetch(new Request("https://push.example.test/config", { headers: { Origin: "https://app.example.test" } }), { ...f.contextEnv, VAPID_PRIVATE_KEY: "" })).status, 503);
  assert.equal((await worker.fetch(f.request("PUT"), f.contextEnv)).status, 401);
  assert.equal((await worker.fetch(f.request("PUT", { invite: true }), f.contextEnv)).status, 200);
  assert.equal((await worker.fetch(f.request("PUT"), f.contextEnv)).status, 200);
  assert.equal((await worker.fetch(f.request("GET", { auth: "b".repeat(64) }), f.contextEnv)).status, 401);
  const publicState = await (await worker.fetch(f.request("GET"), f.contextEnv)).json();
  assert.equal(publicState.active, true);
  assert.ok(!JSON.stringify(publicState).includes(subscription.endpoint));
  assert.ok(!JSON.stringify(await f.storage.get("device")).includes(`"${token}"`));
  assert.equal((await worker.fetch(f.request("DELETE"), f.contextEnv)).status, 200);
  assert.equal(f.storage.alarm, null);
  assert.equal(await f.storage.get("device"), undefined);
});

test("rechaza horarios, identidad y cuerpos no validos sin reemplazar el dispositivo", async () => {
  const f = fixture();
  await f.object.fetch(f.request("PUT", { invite: true }));
  const before = await f.storage.get("device");
  assert.equal((await f.object.fetch(f.request("PUT", { value: { subscription, preferences: { ...prefs, times: ["23:00"] } } }))).status, 400);
  assert.equal((await f.object.fetch(f.request("PUT", { value: { subscription: { ...subscription, endpoint: "https://fcm.googleapis.com/different" }, preferences: prefs } }))).status, 400);
  assert.equal((await f.object.fetch(f.request("PUT", { value: { subscription, preferences: prefs, excess: "x".repeat(9000) } }))).status, 400);
  assert.deepEqual(await f.storage.get("device"), before);
});

test("cifrado Web Push real, TTL corto y prueba limitada por dispositivo", async (t) => {
  const f = fixture();
  await f.object.fetch(f.request("PUT", { invite: true }));
  let sent = 0;
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, options) => {
    sent += 1;
    assert.equal(url, subscription.endpoint);
    assert.equal(options.headers["Content-Encoding"], "aes128gcm");
    assert.equal(Number(options.headers.TTL), 300);
    assert.ok(options.headers.Authorization.startsWith("vapid "));
    assert.ok(!Buffer.from(options.body).toString().includes("instruction"));
    assert.equal(options.redirect, "manual");
    return new Response(null, { status: 201 });
  };
  assert.equal((await f.object.fetch(f.request("POST", { test: true }))).status, 200);
  assert.equal((await f.object.fetch(f.request("POST", { test: true }))).status, 429);
  assert.equal(sent, 1);
});

test("alarma: reserva, no duplicados, omite retrasos y reprograma sin app abierta", async () => {
  const f = fixture();
  await f.object.fetch(f.request("PUT", { invite: true }));
  const device = await f.storage.get("device");
  device.nextAt = Date.now() - 100;
  await f.storage.put("device", device);
  let sent = 0;
  f.object.send = async () => { sent += 1; return 201; };
  await f.object.alarm();
  await f.object.alarm();
  assert.equal(sent, 1);
  assert.ok(f.storage.alarm > Date.now());
  const stale = await f.storage.get("device");
  stale.nextAt = Date.now() - 3600000;
  await f.storage.put("device", stale);
  await f.object.alarm();
  assert.equal(sent, 1);
});

test("alarma: baja de proveedor caducado y continuidad tras fallo de red", async () => {
  for (const status of [410, 404, 503]) {
    const f = fixture();
    await f.object.fetch(f.request("PUT", { invite: true }));
    const device = await f.storage.get("device");
    device.nextAt = Date.now() - 100;
    await f.storage.put("device", device);
    f.object.send = async () => { if (status === 503) throw new Error("Offline"); return status; };
    await f.object.alarm();
    assert.equal(Boolean(await f.storage.get("device")), status === 503);
    assert.equal(Boolean(f.storage.alarm), status === 503);
  }
});

test("baja durante un envio no resucita una alarma", async () => {
  const f = fixture();
  await f.object.fetch(f.request("PUT", { invite: true }));
  const device = await f.storage.get("device");
  device.nextAt = Date.now() - 100;
  await f.storage.put("device", device);
  f.object.send = () => new Promise((resolve) => setTimeout(() => resolve(201), 10));
  const sending = f.object.alarm();
  const deleting = f.object.fetch(f.request("DELETE"));
  await sending;
  await deleting;
  assert.equal(await f.storage.get("device"), undefined);
  assert.equal(f.storage.alarm, null);
});

test("balance autenticado: no cambia horarios, invalido no reemplaza y alarma usa carga", async () => {
  const f = fixture();
  await f.object.fetch(f.request("PUT", { invite: true }));
  const balance = { generatedAt: Date.now(), days: [{ date: new Date().toISOString().slice(0, 10), load: { push: 20, pull: 20, core: 20 }, hard: [] }] };
  const nextAt = f.storage.alarm;
  const req = { balance: true, value: { balance } };
  assert.equal((await worker.fetch(f.request("POST", { ...req, auth: "b".repeat(64) }), f.contextEnv)).status, 401);
  assert.equal((await worker.fetch(f.request("POST", req), f.contextEnv)).status, 200);
  assert.equal(f.storage.alarm, nextAt);
  assert.deepEqual((await f.storage.get("device")).balance, balance);
  assert.equal((await f.object.fetch(f.request("PUT", { balance: true, invite: true }))).status, 405);
  assert.equal((await f.object.fetch(f.request("POST", { balance: true, value: { balance: { ...balance, days: [{}] } } }))).status, 400);
  assert.deepEqual((await f.storage.get("device")).balance, balance);
  const device = await f.storage.get("device");
  device.preferences.kinds = ["activacion"];
  device.nextAt = Date.now() - 10;
  await f.storage.put("device", device);
  f.object.send = async (_, session) => { assert.equal(session.exerciseId, "air_squat"); return 201; };
  await f.object.alarm();
  assert.ok(f.storage.alarm > Date.now());
});
