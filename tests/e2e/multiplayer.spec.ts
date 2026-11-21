import { expect, test } from "@playwright/test";
import { drag, openBoard, uniqueRoom } from "./helpers";

test("two browsers share a room: shapes, live cursors and presence sync via the WebSocket server", async ({ browser }) => {
  const room = uniqueRoom("mp");
  const a = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const b = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await openBoard(a, room);
  await openBoard(b, room);
  await expect(a.getByTestId("sync-status")).toHaveAttribute("data-status", "server");

  await expect(a.getByTestId("peer-avatar")).toHaveCount(1);
  await expect(b.getByTestId("peer-avatar")).toHaveCount(1);

  await a.keyboard.press("r");
  await drag(a, [[200, 200], [380, 320]]);
  await expect(a.getByTestId("el-rect")).toHaveCount(1);
  await expect(b.getByTestId("el-rect")).toHaveCount(1);

  await b.getByTestId("brainstorm-input").fill("retro");
  await b.getByTestId("brainstorm-go").click();
  await expect(a.getByTestId("el-sticky")).toHaveCount(8);

  const box = (await a.getByTestId("canvas").boundingBox())!;
  await a.mouse.move(box.x + 500, box.y + 400);
  await a.mouse.move(box.x + 520, box.y + 420);
  await expect(b.getByTestId("remote-cursor")).toBeVisible();

  // undo is per-user: B's undo must not remove A's rectangle
  await b.keyboard.press("ControlOrMeta+z");
  await expect(a.getByTestId("el-sticky")).toHaveCount(0);
  await expect(a.getByTestId("el-rect")).toHaveCount(1);
});

test("falls back to BroadcastChannel sync between tabs when the server is unreachable", async ({ context }) => {
  const room = uniqueRoom("bc");
  const offline = "?ws=ws://localhost:9";
  const a = await context.newPage();
  const b = await context.newPage();
  await openBoard(a, room, offline);
  await openBoard(b, room, offline);
  await expect(a.getByTestId("sync-status")).toHaveAttribute("data-status", "local");

  await a.keyboard.press("o");
  await drag(a, [[300, 300], [450, 400]]);
  await expect(b.getByTestId("el-ellipse")).toHaveCount(1);
  await expect(b.getByTestId("peer-avatar")).toHaveCount(1);
});
