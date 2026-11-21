import { expect, test } from "@playwright/test";
import { click, drag, openBoard, roughEllipse, roughRect, uniqueRoom } from "./helpers";

test("landing page → pricing → start a board", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("cleans up after you");
  await expect(page.getByTestId("plan-free")).toBeVisible();
  await expect(page.getByTestId("price-team")).toHaveText("$8");
  await page.getByTestId("billing-monthly").click();
  await expect(page.getByTestId("price-team")).toHaveText("$10");
  await page.getByTestId("start-board").first().click();
  await expect(page).toHaveURL(/\/board\/[a-z0-9]{10}$/);
  await expect(page.getByTestId("empty-hint")).toBeVisible();
});

test("drawing tools, select/move, undo and redo", async ({ page }) => {
  await openBoard(page, uniqueRoom());
  const rects = page.getByTestId("el-rect");

  await page.keyboard.press("r");
  await drag(page, [[200, 200], [380, 320]]);
  await expect(rects).toHaveCount(1);

  await page.getByTestId("tool-ellipse").click();
  await drag(page, [[450, 200], [600, 300]]);
  await expect(page.getByTestId("el-ellipse")).toHaveCount(1);

  await page.getByTestId("tool-arrow").click();
  await drag(page, [[380, 260], [450, 250]]);
  await expect(page.getByTestId("el-arrow")).toHaveCount(1);

  await page.getByTestId("tool-pen").click();
  await drag(page, [[200, 450], [260, 420], [320, 470], [380, 430]]);
  await expect(page.getByTestId("el-pen")).toHaveCount(1);

  // sticky note with text
  await page.getByTestId("tool-sticky").click();
  await click(page, [700, 450]);
  await page.getByTestId("text-editor").fill("Ship it Friday");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("el-sticky")).toContainText("Ship it Friday");

  // text
  await page.getByTestId("tool-text").click();
  await click(page, [200, 600]);
  await page.getByTestId("text-editor").fill("Architecture");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("el-text")).toContainText("Architecture");

  // select + move the rectangle
  await page.getByTestId("tool-select").click();
  const before = await rects.first().getAttribute("transform");
  await drag(page, [[290, 205], [340, 255]]);
  await expect(rects.first()).not.toHaveAttribute("transform", before!);

  // undo the move, then undo the text, then redo
  await page.keyboard.press("ControlOrMeta+z");
  await expect(rects.first()).toHaveAttribute("transform", before!);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByTestId("el-text")).toHaveCount(0);
  await page.getByTestId("redo").click();
  await expect(page.getByTestId("el-text")).toHaveCount(1);

  // delete selection
  await click(page, [290, 205]);
  await page.keyboard.press("Delete");
  await expect(rects).toHaveCount(0);
});

test("AI Tidy turns rough pen sketches into clean shapes", async ({ page }) => {
  await openBoard(page, uniqueRoom());
  await page.keyboard.press("p");
  await drag(page, roughRect(150, 180, 220, 130), 2);
  await drag(page, roughEllipse(620, 260, 110, 70), 2);
  await expect(page.getByTestId("el-pen")).toHaveCount(2);

  await page.getByTestId("ai-tidy").click();
  await expect(page.getByTestId("toast").first()).toContainText("shapes");
  await expect(page.getByTestId("el-pen")).toHaveCount(0);
  await expect(page.getByTestId("el-rect")).toHaveCount(1);
  await expect(page.getByTestId("el-ellipse")).toHaveCount(1);

  // AI changes are a single undo step
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByTestId("el-pen")).toHaveCount(2);
});

test("Brainstorm adds grouped sticky notes", async ({ page }) => {
  await openBoard(page, uniqueRoom());
  await page.getByTestId("brainstorm-input").fill("onboarding for new developers");
  await page.getByTestId("brainstorm-go").click();
  await expect(page.getByTestId("el-sticky")).toHaveCount(8);
  await expect(page.getByTestId("el-text")).toHaveCount(4);
  await expect(page.getByTestId("toast").first()).toContainText("Added 8 ideas");
});

test("Sketch → UI renders a Tailwind preview", async ({ page }) => {
  await openBoard(page, uniqueRoom());
  await page.keyboard.press("r");
  await drag(page, [[200, 200], [560, 250]]);
  await page.keyboard.press("Enter");
  await page.getByTestId("text-editor").fill("Email address");
  await page.keyboard.press("Escape");
  await page.keyboard.press("r");
  await drag(page, [[200, 290], [340, 340]]);
  await page.keyboard.press("Enter");
  await page.getByTestId("text-editor").fill("Sign up");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape"); // clear selection → convert the whole board

  await page.getByTestId("ai-sketch").click();
  await expect(page.getByTestId("code-modal")).toBeVisible();
  const frame = page.frameLocator('[data-testid="code-preview"]');
  await expect(frame.locator("button")).toHaveText("Sign up");
  await expect(frame.locator("input")).toHaveAttribute("placeholder", "Email address");
  await page.getByTestId("code-tab-code").click();
  await expect(page.getByTestId("code-source")).toContainText("<button");
});

test("exports JSON + PNG and re-imports JSON", async ({ page }) => {
  await openBoard(page, uniqueRoom());
  await page.keyboard.press("r");
  await drag(page, [[200, 200], [380, 320]]);
  await page.keyboard.press("o");
  await drag(page, [[450, 200], [600, 300]]);

  const [json] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
  const path = await json.path();
  const data = JSON.parse(await (await import("node:fs/promises")).readFile(path!, "utf8"));
  expect(data.app).toBe("ai-collab-whiteboard");
  expect(data.elements).toHaveLength(2);

  const [png] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-png").click()]);
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  const buf = await (await import("node:fs/promises")).readFile((await png.path())!);
  expect(buf.subarray(1, 4).toString()).toBe("PNG");

  await page.getByTestId("clear-board").click();
  await expect(page.getByTestId("el-rect")).toHaveCount(0);
  await page.getByTestId("import-file").setInputFiles(path!);
  await expect(page.getByTestId("el-rect")).toHaveCount(1);
  await expect(page.getByTestId("el-ellipse")).toHaveCount(1);
});
