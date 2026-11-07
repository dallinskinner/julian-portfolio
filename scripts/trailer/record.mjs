// Records the website trailer. Usage (dev server running on :5199):
//   cd scripts/trailer && npm i && node record.mjs
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const SITE = process.env.SITE ?? "http://localhost:5199/";
const URL_TEXT = "julianskinner.vercel.app";
const outDir = join(root, "trailer");
const rawDir = join(outDir, "raw");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

rmSync(rawDir, { recursive: true, force: true });
mkdirSync(rawDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: rawDir, size: { width: 1280, height: 720 } } });
const guestCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const host = await hostCtx.newPage();
const created = Date.now();

async function card(page, text, { sub = "", hold = 1500, solid = false } = {}) {
  await page.evaluate(({ text, sub, solid }) => {
    document.getElementById("tcard")?.remove();
    const d = document.createElement("div");
    d.id = "tcard";
    d.style.cssText = `position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:${solid ? "#000" : "rgba(0,0,0,.72)"};color:#fff;text-align:center;opacity:0;transition:opacity .35s;font-family:Impact,'Arial Narrow Bold','Helvetica Neue',sans-serif;text-transform:uppercase;letter-spacing:.14em;pointer-events:none`;
    d.innerHTML = `<div style="font-size:64px;line-height:1.1;padding:0 60px">${text}</div>${sub ? `<div style="font-size:22px;letter-spacing:.3em;color:#9aa;font-family:'Courier New',monospace">${sub}</div>` : ""}<div style="position:absolute;top:0;left:0;right:0;height:60px;background:#000"></div><div style="position:absolute;bottom:0;left:0;right:0;height:60px;background:#000"></div>`;
    document.body.appendChild(d);
    requestAnimationFrame(() => (d.style.opacity = "1"));
  }, { text, sub, solid });
  await sleep(hold);
  await page.evaluate(() => {
    const d = document.getElementById("tcard");
    if (d) {
      d.style.opacity = "0";
      setTimeout(() => d.remove(), 400);
    }
  });
  await sleep(380);
}

async function idle(page, timeout = 20000) {
  await page.waitForFunction(() => !document.querySelector("#cmd-input")?.disabled, null, { timeout });
}
async function run(page, cmd, wait = 700) {
  await page.click("#cmd-input");
  await page.keyboard.type(cmd, { delay: 38 });
  await page.keyboard.press("Enter");
  await sleep(wait);
}

// ---------- scene 1: cold open on black ----------
await host.setContent('<body style="margin:0;background:#000"></body>');
const t0 = Date.now(); // timeline start
await card(host, "In a world&hellip;", { hold: 1200, solid: true });
await card(host, "&hellip;where every portfolio<br>is a boring page", { hold: 1500, solid: true });

// ---------- scene 2: boot ----------
await host.goto(SITE);
await host.waitForSelector("#cmd-input:not([hidden])");
await sleep(900);
await card(host, "One developer.", { hold: 900 });

// ---------- scene 3: commands ----------
await run(host, "help", 600);
await run(host, "about", 600);
await run(host, "matrix", 1100);
await card(host, "One terminal.", { hold: 900 });
await run(host, "matrix", 300);
await run(host, "clear", 200);

// ---------- scene 4: multiplayer canvas ----------
await run(host, "create demo", 1200);
await host.evaluate(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => (window.__link = t) }, configurable: true });
});
await host.waitForFunction(() => /hosting/.test(document.querySelector(".cv-status")?.textContent ?? ""), null, { timeout: 20000 });
await host.click('[data-act="invite"]');
const link = await host.evaluate(() => window.__link);
const guest = await guestCtx.newPage();
const guestJoin = (async () => {
  await guest.goto(link);
  await guest.waitForSelector(".cv-modal input");
  await guest.fill(".cv-modal input", "Kubai");
  await guest.keyboard.press("Enter");
  await guest.waitForFunction(() => document.querySelector(".cv-status")?.textContent === "connected", null, { timeout: 20000 });
})();

const box = async (page) => (await page.locator(".cv-board canvas").boundingBox());
const at = (b, fx, fy) => [b.x + b.width * fx, b.y + b.height * fy];
async function drag(page, b, a, c, steps = 14) {
  const [x1, y1] = at(b, ...a), [x2, y2] = at(b, ...c);
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps });
  await page.mouse.up();
}
const hb = await box(host);
const tool = (page, name) => page.locator(".cv-tools button", { hasText: new RegExp(`^${name}$`) }).click();

// host draws while the guest is still joining
await tool(host, "rect");
await host.locator(".cv-sw").nth(4).click();
await drag(host, hb, [0.1, 0.18], [0.34, 0.5]);
await tool(host, "ellipse");
await host.locator(".cv-sw").nth(1).click();
await drag(host, hb, [0.4, 0.2], [0.55, 0.5]);
await guestJoin;
const gb = await box(guest);

const hostWork = (async () => {
  await tool(host, "sticky");
  await host.mouse.click(...at(hb, 0.12, 0.62));
  await host.fill(".cv-modal input", "SHIP IT");
  await host.keyboard.press("Enter");
  await host.mouse.move(...at(hb, 0.3, 0.8), { steps: 20 });
})();
const guestWork = (async () => {
  await tool(guest, "pen");
  await guest.locator(".cv-sw").nth(3).click();
  const [sx, sy] = at(gb, 0.62, 0.3);
  await guest.mouse.move(sx, sy, { steps: 18 });
  await guest.mouse.down();
  for (let i = 0; i <= 40; i++) await guest.mouse.move(sx + i * 9, sy + Math.sin(i / 3) * 40 + i * 2, { steps: 2 });
  await guest.mouse.up();
  await tool(guest, "rect");
  await drag(guest, gb, [0.64, 0.58], [0.88, 0.82]);
  await guest.mouse.move(...at(gb, 0.5, 0.7), { steps: 25 });
})();
await Promise.all([hostWork, guestWork]);
await sleep(600);
await card(host, "Multiplayer.", { hold: 900 });

// ---------- scene 5: the OS ----------
await host.keyboard.press("Escape");
await idle(host);
await run(host, "os", 900);
await host.locator(".os-icon", { hasText: "Radio" }).dblclick();
await sleep(500);
await host.locator(".radio-station").nth(2).click();
await sleep(1500);
await card(host, "A whole OS.", { hold: 900 });
await host.keyboard.press("Escape");
await idle(host);

// ---------- scene 6: secrets ----------
await run(host, "clear", 200);
await run(host, "party", 700);
await sleep(1500);
await card(host, "100+ commands.", { sub: "some of them secret", hold: 1200 });

// ---------- finale ----------
await card(host, "Julian Skinner", { sub: URL_TEXT, hold: 3000, solid: true });
await host.evaluate(() => (document.body.style.background = "#000"));

const durationMs = Date.now() - t0;
const offsetMs = t0 - created;
await hostCtx.close();
await guestCtx.close();
await browser.close();

const webm = join(rawDir, readdirSync(rawDir).find((f) => f.endsWith(".webm")));
const dur = (durationMs / 1000).toFixed(2);
const fadeAt = (durationMs / 1000 - 3).toFixed(2);
const out = join(outDir, "website-trailer.mp4");
execFileSync("ffmpeg", [
  "-y", "-ss", (offsetMs / 1000).toFixed(2), "-i", webm,
  "-ss", "8", "-i", join(root, "public/music/distant-dreams.m4a"),
  "-t", dur, "-map", "0:v", "-map", "1:a",
  "-vf", "fps=30,format=yuv420p", "-af", `afade=t=in:d=1,afade=t=out:st=${fadeAt}:d=3`,
  "-c:v", "libx264", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out,
], { stdio: "inherit" });
console.log("wrote", out, dur + "s");
