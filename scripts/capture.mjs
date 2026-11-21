#!/usr/bin/env node
// Captures README screenshots + an animated demo GIF of the main flow with Playwright.
// Usage: start the app (`npm run build && AI_MODE=mock npm start`), then `npm run docs:capture`.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import gifenc from "gifenc";
const { GIFEncoder, applyPalette, quantize } = gifenc;
import { PNG } from "pngjs";

const BASE = process.env.BASE_URL || "http://localhost:3417";
const OUT = new URL("../docs/", import.meta.url).pathname;
const W = 1280;
const H = 800;
const GIF_W = 800;
const GIF_H = 500;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctxA = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const ctxB = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await ctxA.addInitScript(() => localStorage.setItem("wb-user", JSON.stringify({ name: "Neon Otter", color: "#22d3ee" })));
await ctxB.addInitScript(() => localStorage.setItem("wb-user", JSON.stringify({ name: "Swift Panda", color: "#f472b6" })));
const page = await ctxA.newPage();

/* ------------------------------- static shots ------------------------------ */
await page.goto(BASE);
await page.waitForTimeout(2600); // let hero animations settle
await page.screenshot({ path: `${OUT}landing.png` });
await page.locator("#ai").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}ai-features.png` });
await page.locator("#pricing").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}pricing.png` });

/* ---------------------------------- GIF ---------------------------------- */
const frames = [];
async function frame(delay = 120) {
  const buf = await page.screenshot();
  frames.push({ png: PNG.sync.read(buf), delay });
}
async function hold(ms) {
  await frame(ms);
}

const room = `demo-${Date.now().toString(36)}`;
await page.goto(`${BASE}/board/${room}`);
await page.getByTestId("canvas").waitFor();
await page.waitForTimeout(1200);
const guest = await ctxB.newPage();
await guest.goto(`${BASE}/board/${room}`);
await guest.getByTestId("canvas").waitFor();
await page.waitForTimeout(800);
await hold(1200);

const box = await page.getByTestId("canvas").boundingBox();
const at = (x, y) => [box.x + x, box.y + y];

/** Draw a path with the mouse, grabbing a GIF frame every `every` points. */
async function stroke(points, every = 6) {
  await page.mouse.move(...at(...points[0]));
  await page.mouse.down();
  for (let i = 1; i < points.length; i++) {
    await page.mouse.move(...at(...points[i]), { steps: 2 });
    if (i % every === 0) await frame(60);
  }
  await page.mouse.up();
  await frame(150);
}
function roughRect(x, y, w, h) {
  const c = [[x, y], [x + w + 4, y + 5], [x + w - 3, y + h], [x + 3, y + h - 4], [x - 2, y + 3]];
  const out = [];
  for (let i = 1; i < c.length; i++)
    for (let k = 0; k < 10; k++) {
      const t = k / 10;
      out.push([c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t + (k % 2 ? 2 : -2), c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t + (k % 3) - 1]);
    }
  out.push(c[c.length - 1]);
  return out;
}
function roughEllipse(cx, cy, rx, ry) {
  return Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2 - 0.3;
    return [cx + Math.cos(a) * (rx + (i % 4)), cy + Math.sin(a) * ry];
  });
}
function roughArrow(x1, y1, x2, y2) {
  const pts = [];
  for (let k = 0; k <= 16; k++) pts.push([x1 + ((x2 - x1) * k) / 16, y1 + ((y2 - y1) * k) / 16 + (k % 2 ? 2 : -1)]);
  pts.push([x2 - 18, y2 - 14], [x2 - 9, y2 - 7], [x2, y2], [x2 - 18, y2 + 14]);
  return pts;
}
async function typeLabel(x, y, text) {
  await page.getByTestId("tool-text").click();
  await page.mouse.click(...at(x, y));
  for (const ch of text) {
    await page.keyboard.type(ch);
    if (Math.random() < 0.35) await frame(50);
  }
  await page.keyboard.press("Escape");
  await frame(100);
}

// Guest moves their cursor around while we sketch.
const gbox = await guest.getByTestId("canvas").boundingBox();
let gi = 0;
const wiggle = async () => {
  gi++;
  await guest.mouse.move(gbox.x + 640 + Math.cos(gi / 3) * 120, gbox.y + 560 + Math.sin(gi / 3) * 60, { steps: 3 });
};

await page.keyboard.press("p");
await stroke(roughRect(120, 220, 230, 120));
await wiggle();
await stroke(roughArrow(370, 285, 520, 280));
await wiggle();
await stroke(roughEllipse(640, 280, 110, 62));
await wiggle();
await typeLabel(170, 278, "Web app");
await typeLabel(585, 278, "Auth API");
await page.keyboard.press("Escape"); // clear selection → tidy the whole board
await hold(900);
await page.screenshot({ path: `${OUT}rough-sketch.png` });

// AI Tidy
await page.getByTestId("ai-tidy").hover();
await frame(400);
await page.getByTestId("ai-tidy").click();
await page.getByTestId("toast").first().waitFor();
await page.waitForTimeout(250);
await page.keyboard.press("Escape");
await hold(1800);
await page.screenshot({ path: `${OUT}ai-tidy.png` });

// Brainstorm
const input = page.getByTestId("brainstorm-input");
await input.click();
for (const ch of "auth service rollout") {
  await page.keyboard.type(ch);
  if (Math.random() < 0.4) await frame(50);
}
await frame(300);
await page.getByTestId("brainstorm-go").click();
await page.getByTestId("el-sticky").first().waitFor();
await page.waitForTimeout(400);
await page.keyboard.press("Escape");
for (let i = 0; i < 6; i++) {
  await wiggle();
  await page.waitForTimeout(60);
  await frame(160);
}
await hold(1400);
await page.screenshot({ path: `${OUT}brainstorm.png` });

// Sketch → UI on a small wireframe
await page.getByTestId("clear-board").click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Zoom to fit" }).click();
await frame(400);
const wf = async (x1, y1, x2, y2, label) => {
  await page.keyboard.press("r");
  await page.mouse.move(...at(x1, y1));
  await page.mouse.down();
  await page.mouse.move(...at(x2, y2), { steps: 6 });
  await page.mouse.up();
  await frame(100);
  await page.keyboard.press("Enter");
  await page.keyboard.type(label);
  await page.keyboard.press("Escape");
  await frame(150);
};
await typeLabel(260, 170, "Create your account");
await wf(260, 230, 700, 280, "Email address");
await wf(260, 300, 700, 350, "Password");
await wf(260, 380, 420, 430, "Sign up");
await page.keyboard.press("Escape");
await hold(800);
await page.screenshot({ path: `${OUT}wireframe.png` });
await page.getByTestId("ai-sketch").click();
await page.getByTestId("code-modal").waitFor();
await page.frameLocator('[data-testid="code-preview"]').locator("button").waitFor();
await page.waitForTimeout(1500); // tailwind browser build
await hold(2200);
await page.screenshot({ path: `${OUT}sketch-to-ui.png` });
await page.getByTestId("code-tab-code").click();
await hold(1400);
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "Close" }).click();

// Multiplayer shot: guest view with host cursor
await page.mouse.move(...at(520, 470), { steps: 4 });
await guest.mouse.move(gbox.x + 820, gbox.y + 300, { steps: 4 });
await guest.waitForTimeout(500);
await guest.screenshot({ path: `${OUT}multiplayer.png` });

await browser.close();

/* ------------------------------ encode GIF ------------------------------ */
function downscale(png) {
  const out = new Uint8Array(GIF_W * GIF_H * 4);
  const sx = png.width / GIF_W;
  const sy = png.height / GIF_H;
  for (let y = 0; y < GIF_H; y++) {
    for (let x = 0; x < GIF_W; x++) {
      // 2x2 box filter around the source position
      let r = 0, g = 0, b = 0;
      for (const [ox, oy] of [[0, 0], [0.5, 0], [0, 0.5], [0.5, 0.5]]) {
        const ix = Math.min(png.width - 1, Math.floor((x + ox) * sx));
        const iy = Math.min(png.height - 1, Math.floor((y + oy) * sy));
        const i = (iy * png.width + ix) * 4;
        r += png.data[i];
        g += png.data[i + 1];
        b += png.data[i + 2];
      }
      const o = (y * GIF_W + x) * 4;
      out[o] = r / 4;
      out[o + 1] = g / 4;
      out[o + 2] = b / 4;
      out[o + 3] = 255;
    }
  }
  return out;
}

const gif = GIFEncoder();
for (const f of frames) {
  const rgba = downscale(f.png);
  const palette = quantize(rgba, 256);
  gif.writeFrame(applyPalette(rgba, palette), GIF_W, GIF_H, { palette, delay: f.delay });
}
gif.finish();
await writeFile(`${OUT}demo.gif`, gif.bytes());
console.log(`wrote ${frames.length} frames → docs/demo.gif and screenshots in docs/`);
