import { expect, type Page } from "@playwright/test";

export type Pt = [number, number];

/** Canvas-relative mouse drag through a list of points. */
export async function drag(page: Page, points: Pt[], steps = 4) {
  const box = (await page.getByTestId("canvas").boundingBox())!;
  const [x0, y0] = points[0];
  await page.mouse.move(box.x + x0, box.y + y0);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) await page.mouse.move(box.x + x, box.y + y, { steps });
  await page.mouse.up();
}

export async function click(page: Page, [x, y]: Pt) {
  const box = (await page.getByTestId("canvas").boundingBox())!;
  await page.mouse.click(box.x + x, box.y + y);
}

/** Wobbly hand-drawn closed rectangle. */
export function roughRect(x: number, y: number, w: number, h: number): Pt[] {
  const c: Pt[] = [[x, y], [x + w, y + 3], [x + w - 2, y + h], [x + 2, y + h - 3], [x, y + 2]];
  const out: Pt[] = [];
  for (let i = 1; i < c.length; i++) {
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      out.push([c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t + (k % 2 ? 1.5 : -1.5), c[i - 1][1] + (c[i][1] - c[i - 1][1]) * t]);
    }
  }
  out.push(c[c.length - 1]);
  return out;
}

export function roughEllipse(cx: number, cy: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    return [cx + Math.cos(a) * rx + (i % 3) - 1, cy + Math.sin(a) * ry] as Pt;
  });
}

export async function openBoard(page: Page, room: string, query = "") {
  await page.goto(`/board/${room}${query}`);
  await expect(page.getByTestId("canvas")).toBeVisible();
  await expect(page.getByTestId("ai-mode")).toHaveText(/demo/i);
}

export const uniqueRoom = (p = "e2e") => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
