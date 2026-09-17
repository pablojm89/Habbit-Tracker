const assert = require("node:assert/strict");
const { createECDH } = require("node:crypto");
const { chromium, webkit } = require("playwright-core");
const { CHROME, BASE, SHOTS } = require("./env");
const useWebKit = process.env.QA_ENGINE === "webkit";

(async () => {
  const browser = await (useWebKit ? webkit.launch() : chromium.launch({ executablePath: CHROME }));
  const failures = [];
  let checks = 0;
  const key = createECDH("prime256v1");
  key.generateKeys();
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 800 }]) {
      const context = await browser.newContext({ viewport, hasTouch: true, serviceWorkers: "block" });
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/push-config.json")) return route.fulfill({ json: { serviceUrl: "https://push.example.test" } });
        if (url.origin === "https://push.example.test") return route.fulfill({ headers: { "Access-Control-Allow-Origin": new URL(BASE).origin }, json: { publicKey: key.getPublicKey().toString("base64url") } });
        return url.href.startsWith(BASE) || (process.env.QA_ICONS === "1" && url.href === "https://unpkg.com/lucide@1.23.0/dist/umd/lucide.min.js") ? route.continue() : route.abort();
      });
      await context.addInitScript(() => localStorage.setItem("bittracker-cloud-sync-config-v1", JSON.stringify({ enabled: false })));
      const page = await context.newPage();
      const cdp = useWebKit ? null : await context.newCDPSession(page);
      await page.goto(`${BASE}/index.html?noprompt=1`);
      for (const kind of ["micro-breaks", "quick-timer", "micro-session"]) {
        const label = `${kind} ${viewport.width}x${viewport.height}`;
        try {
          await page.evaluate(async (kind) => {
            closeModal();
            if (kind === "micro-breaks") await openMicroBreaks();
            else if (kind === "quick-timer") openQuickTimerModal();
            else {
              microPush.sessions = await fetch("./micro-sessions.json").then((r) => r.json());
              await openMicroSession(microPush.sessions.find((s) => s.variantFamily === "front_lever").id);
            }
          }, kind);
          await page.waitForTimeout(350);
          const body = page.locator("#appModal .modal-body");
          await body.evaluate((el) => { el.scrollTop = 0; });
          const geometry = await body.evaluate((el) => {
            const box = el.getBoundingClientRect(), card = el.parentElement.getBoundingClientRect();
            return { top: box.top, bottom: box.bottom, cardBottom: card.bottom, x: box.x + box.width / 2, height: box.height, max: el.scrollHeight - el.clientHeight, wide: el.scrollWidth > el.clientWidth + 1 };
          });
          assert.ok(geometry.bottom <= geometry.cardBottom + 1 && geometry.bottom <= viewport.height, `Cuerpo recortado: ${JSON.stringify(geometry)}`);
          assert.ok(!geometry.wide, "Desborde horizontal");
          if (kind !== "micro-session") assert.ok(geometry.max > 0, "El contenido largo necesita un scroller real");
          if (geometry.max > 0) {
            const y = geometry.top + geometry.height * .8;
            if (cdp) {
              await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: geometry.x, y }] });
              for (let step = 1; step <= 8; step++) {
                await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: geometry.x, y: y - geometry.height * .5 * step / 8 }] });
                await page.waitForTimeout(25);
              }
              await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
            } else {
              await page.mouse.move(geometry.x, y);
              await page.mouse.wheel(0, 240);
            }
            await page.waitForFunction(() => document.querySelector("#appModal .modal-body").scrollTop > 10, null, { timeout: 1500 });
            await page.waitForTimeout(250);
            await body.evaluate((el) => { el.scrollTop = el.scrollHeight; });
          }
          const end = await body.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            const buttons = el.querySelectorAll("button");
            const last = buttons[buttons.length - 1].getBoundingClientRect();
            return { reachable: last.bottom <= rect.bottom + 1 && last.top >= rect.top, outerScroll: el.parentElement.scrollTop, dialogScroll: el.closest("dialog").scrollTop, headTop: el.parentElement.querySelector(".modal-head").getBoundingClientRect().top };
          });
          assert.ok(end.reachable, `Ultimo control inaccesible: ${JSON.stringify(end)}`);
          assert.equal(end.outerScroll, 0);
          assert.equal(end.dialogScroll, 0);
          assert.ok(end.headTop >= 0, "Cabecera fuera de pantalla");
          await page.screenshot({ path: `${SHOTS}/scroll-${useWebKit ? "webkit-" : ""}${kind}-${viewport.width}.png`, animations: "disabled" });
          checks++;
          console.log(`OK ${label}`);
        } catch (error) { failures.push(`${label}: ${error.message}`); }
      }
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(`MODAL SCROLL: ${checks}/12 OK; ${useWebKit ? "WebKit con rueda" : "Chromium con gestos"}, no dispositivo iOS real`);
  assert.equal(failures.length, 0, failures.join("\n"));
})().catch((error) => { console.error(error); process.exitCode = 1; });
