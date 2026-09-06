const { chromium } = require("playwright-core");
const fs = require("fs");

const { CHROME, BASE } = require("./env");

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) && !r.request().url().includes("/sw.js") ? r.continue() : r.abort()));
  page.on("pageerror", (err) => console.log("PAGEERROR:", err.message));
  await page.goto(`${BASE}/index.html?fresh=${Date.now()}`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => {
    const r = runDenseSelfTests();
    return { passed: r.passed, total: r.total, failed: r.results.filter((x) => !x.ok) };
  });
  console.log(`SELFTESTS: ${out.passed}/${out.total} OK`);
  if (out.failed.length) console.log(JSON.stringify(out.failed, null, 1));
  await browser.close();
  process.exit(out.failed.length ? 1 : 0);
})().catch((e) => { console.error("SELFTEST RUN FAILED:", e); process.exit(1); });
