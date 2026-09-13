import webpush from "web-push";
import { createHash, timingSafeEqual } from "node:crypto";
import { preferences, nextSlot, chooseSession } from "./schedule.mjs";
import MicroBreaks from "../../../micro-core.js";

const json = (value, status = 200) => Response.json(value, { status });
export const hash = (value) => createHash("sha256").update(value).digest("hex");
const equal = (a, b) => timingSafeEqual(Buffer.from(hash(String(a))), Buffer.from(hash(String(b))));
const ready = (env) => Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT && env.ENROLLMENT_TOKEN?.length >= 32);

export function validateSubscription(value) {
  const url = new URL(value?.endpoint);
  const allowed = url.hostname === "fcm.googleapis.com" || url.hostname === "updates.push.services.mozilla.com" || url.hostname.endsWith(".push.services.mozilla.com") || url.hostname.endsWith(".push.apple.com");
  if (url.protocol !== "https:" || !allowed || url.port || url.username || url.password || url.hash || value.endpoint.length > 2048) throw new Error("Suscripcion no valida");
  for (const [key, length] of [["p256dh", 65], ["auth", 16]]) {
    if (!/^[\w-]+={0,2}$/.test(value.keys?.[key] || "") || Buffer.from(value.keys[key], "base64url").length !== length) throw new Error("Claves push no validas");
  }
  return { endpoint: value.endpoint, keys: { p256dh: value.keys.p256dh, auth: value.keys.auth } };
}

async function body(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Se requiere JSON");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Faltan datos");
  let size = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); throw new Error("Solicitud demasiado grande"); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    if (origin !== new URL(env.APP_URL).origin) return json({ error: "Origen no permitido" }, 403);
    const headers = { "Access-Control-Allow-Origin": origin, "Vary": "Origin", "Cache-Control": "no-store", "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Enrollment" };
    let response;
    try {
      const path = new URL(request.url).pathname;
      if (request.method === "OPTIONS") response = new Response(null, { status: 204 });
      else if (!ready(env)) response = json({ error: "Servicio pendiente de configurar" }, 503);
      else if (path === "/config" && request.method === "GET") response = json({ publicKey: env.VAPID_PUBLIC_KEY });
      else if (/^\/devices\/[a-f0-9]{64}(\/(test|balance))?$/.test(path)) {
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
        if (!/^[a-f0-9]{64}$/.test(token)) response = json({ error: "Dispositivo no autorizado" }, 401);
        else response = await env.DEVICES.get(env.DEVICES.idFromName(path.split("/")[2])).fetch(request);
      } else response = json({ error: "Ruta no encontrada" }, 404);
    } catch { response = json({ error: "No se pudo procesar la solicitud" }, 400); }
    return new Response(response.body, { status: response.status, headers: { ...Object.fromEntries(response.headers), ...headers } });
  },
};

export class PushDevice {
  constructor(ctx, env) { this.ctx = ctx; this.storage = ctx.storage; this.env = env; }

  // Serialize settings/deletion with alarm delivery, including outbound awaits.
  fetch(request) { return this.ctx.blockConcurrencyWhile(() => this.handle(request)); }
  alarm() { return this.ctx.blockConcurrencyWhile(() => this.deliverAlarm()); }

  async handle(request) {
    const device = await this.storage.get("device");
    const token = request.headers.get("authorization")?.slice(7) || "";
    const authorized = device && equal(hash(token), device.tokenHash);
    const enroll = request.headers.get("x-enrollment");
    const action = new URL(request.url).pathname.split("/")[3] || "";
    if (action && request.method !== "POST") return json({ error: "Metodo no permitido" }, 405);
    if (request.method === "PUT") {
      if (!authorized && !(enroll && equal(enroll, this.env.ENROLLMENT_TOKEN))) return json({ error: "Codigo de activacion no valido" }, 401);
      let subscription, prefs, balance;
      try {
        const value = await body(request);
        subscription = validateSubscription(value.subscription);
        prefs = preferences(value.preferences);
        balance = value.balance === undefined ? device?.balance || null : MicroBreaks.validateBalance(value.balance);
        if (hash(subscription.endpoint) !== new URL(request.url).pathname.split("/")[2]) throw new Error("Dispositivo incorrecto");
      } catch (error) { return json({ error: error.message }, 400); }
      const next = { subscription, preferences: prefs, balance, tokenHash: hash(token), nextAt: nextSlot(prefs), previousId: device?.previousId || "", lastTest: device?.lastTest || 0 };
      await this.storage.put("device", next);
      await this.storage.setAlarm(next.nextAt);
      return json(this.publicState(next));
    }
    if (!device) return json({ error: "Dispositivo no registrado" }, 404);
    if (!authorized) return json({ error: "Dispositivo no autorizado" }, 401);
    if (request.method === "POST" && action === "balance") {
      try { device.balance = MicroBreaks.validateBalance((await body(request)).balance); }
      catch (error) { return json({ error: error.message }, 400); }
      await this.storage.put("device", device);
      return json(this.publicState(device));
    }
    if (request.method === "GET") return json(this.publicState(device));
    if (request.method === "DELETE") {
      await this.storage.deleteAlarm();
      await this.storage.deleteAll();
      return json({ active: false });
    }
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/test")) {
      if (Date.now() - device.lastTest < 60000) return json({ error: "Espera un minuto antes de otra prueba" }, 429);
      device.lastTest = Date.now();
      await this.storage.put("device", device);
      const session = chooseSession(device.preferences, device.previousId, Math.random, device.balance);
      if (!session) return json({ error: "No hay una pausa compatible con la carga reciente. Elige movilidad o descansa." }, 409);
      const status = await this.send(device, session, `test-${device.lastTest}`).catch(() => 503);
      if ([404, 410].includes(status)) {
        await this.storage.deleteAlarm();
        await this.storage.deleteAll();
      }
      return status >= 200 && status < 300 ? json({ accepted: true }) : json({ error: "El proveedor no ha aceptado la prueba. Revisa o reactiva la suscripcion." }, 502);
    }
    return json({ error: "Metodo no permitido" }, 405);
  }

  publicState(device) { return { active: true, preferences: device.preferences, nextAt: device.nextAt, balanceAt: device.balance?.generatedAt || null }; }

  async send(device, session, deliveryId) {
    const url = new URL(this.env.APP_URL);
    url.searchParams.set("micro", session.id);
    const payload = JSON.stringify({ title: `${session.durationMinutes} min: ${session.title}`, body: session.instruction, url: url.href, tag: `micro-${deliveryId}` });
    const details = webpush.generateRequestDetails(device.subscription, payload, {
      TTL: 300, urgency: "normal", topic: hash(deliveryId).slice(0, 32),
      vapidDetails: { subject: this.env.VAPID_SUBJECT, publicKey: this.env.VAPID_PUBLIC_KEY, privateKey: this.env.VAPID_PRIVATE_KEY },
    });
    const response = await fetch(details.endpoint, { method: details.method, headers: details.headers, body: details.body, redirect: "manual", signal: AbortSignal.timeout(10000) });
    await response.body?.cancel();
    return response.status;
  }

  async deliverAlarm() {
    const device = await this.storage.get("device");
    if (!device) return;
    const now = Date.now();
    if (device.nextAt > now) { await this.storage.setAlarm(device.nextAt); return; }
    const slot = device.nextAt;
    const session = chooseSession(device.preferences, device.previousId, Math.random, device.balance, now);
    // Reserve the next alarm first: a crash or a stale retry cannot duplicate this slot.
    // A delivery interrupted after reservation is skipped, never sent hours late.
    device.nextAt = nextSlot(device.preferences, now);
    const fresh = now - slot < 5 * 60000;
    if (fresh && session) device.previousId = session.id;
    await this.storage.put("device", device);
    await this.storage.setAlarm(device.nextAt);
    if (!fresh || !session) return;
    const status = await this.send(device, session, String(slot)).catch(() => 503);
    if ([404, 410].includes(status)) {
      await this.storage.deleteAlarm();
      await this.storage.deleteAll();
    }
  }
}
