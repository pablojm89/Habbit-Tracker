import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import assert from "node:assert/strict";
import { createECDH, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import webpush from "web-push";
import { hash } from "../src/worker.mjs";

const vapid = webpush.generateVAPIDKeys();
let deliveries = 0;
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, scriptPath: fileURLToPath(new URL("../dist/worker.js", import.meta.url)),
  cf: false,
  outboundService: async (request) => {
    assert.equal(new URL(request.url).hostname, "web.push.apple.com");
    assert.equal(request.headers.get("content-encoding"), "aes128gcm");
    assert.ok((await request.arrayBuffer()).byteLength > 100);
    deliveries += 1;
    return new Response(null, { status: 201 });
  },
  compatibilityDate: "2026-09-12", compatibilityFlags: ["nodejs_compat"],
  durableObjects: { DEVICES: { className: "PushDevice", useSQLite: true } },
  bindings: { APP_URL: "https://app.test/", VAPID_SUBJECT: "https://app.test/", VAPID_PUBLIC_KEY: vapid.publicKey, VAPID_PRIVATE_KEY: vapid.privateKey, ENROLLMENT_TOKEN: "c".repeat(64) },
}));
try {
  const headers = { Origin: "https://app.test", Authorization: `Bearer ${"a".repeat(64)}`, "X-Enrollment": "c".repeat(64), "Content-Type": "application/json" };
  const config = await mf.dispatchFetch("https://push.test/config", { headers });
  assert.equal(config.status, 200);
  assert.equal((await config.json()).publicKey, vapid.publicKey);
  const key = createECDH("prime256v1"); key.generateKeys();
  const subscription = { endpoint: "https://web.push.apple.com/local-runtime-test", keys: { p256dh: key.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
  const url = `https://push.test/devices/${hash(subscription.endpoint)}`;
  const body = { subscription, preferences: { times: ["11:00", "17:00"], timeZone: "Europe/Madrid", equipment: ["suelo"], kinds: ["movilidad"], durations: [2] } };
  const enroll = await mf.dispatchFetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
  assert.equal(enroll.status, 200, await enroll.clone().text());
  assert.ok((await enroll.json()).nextAt > Date.now());
  const saved = await mf.dispatchFetch(url, { headers });
  assert.equal(saved.status, 200);
  assert.deepEqual((await saved.json()).preferences.durations, [2]);
  const sending = await mf.dispatchFetch(`${url}/test`, { method: "POST", headers });
  assert.equal(sending.status, 200, await sending.clone().text());
  assert.equal(deliveries, 1);
  assert.equal((await mf.dispatchFetch(url, { method: "DELETE", headers })).status, 200);
  assert.equal((await mf.dispatchFetch(url, { headers })).status, 404);
  console.log("RUNTIME: Worker + SQLite Durable Object, alta/lectura/baja OK; sin proveedor externo");
} finally { await mf.dispose(); }
