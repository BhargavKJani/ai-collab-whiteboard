import { describe, expect, it } from "vitest";
import {
  elementAt,
  hitTest,
  normalizePointed,
  rectFromPoints,
  resizeElement,
  screenToWorld,
  unionBounds,
  worldToScreen,
  zoomAt,
} from "@/lib/board/geometry";
import { el } from "./helpers";

describe("geometry", () => {
  it("round-trips screen ↔ world coordinates", () => {
    const cam = { x: 100, y: -50, zoom: 2 };
    const [wx, wy] = screenToWorld(cam, 300, 200);
    expect(worldToScreen(cam, wx, wy)).toEqual([300, 200]);
  });

  it("zooms around the anchor point and clamps", () => {
    const cam = { x: 0, y: 0, zoom: 1 };
    const next = zoomAt(cam, 400, 300, 2);
    expect(next.zoom).toBe(2);
    expect(screenToWorld(next, 400, 300)).toEqual(screenToWorld(cam, 400, 300));
    expect(zoomAt(cam, 0, 0, 100).zoom).toBe(4);
    expect(zoomAt(cam, 0, 0, 0.001).zoom).toBe(0.2);
  });

  it("normalises pointed elements to their bounding box", () => {
    const n = normalizePointed(el({ type: "pen", x: 10, y: 10, points: [[-5, 4], [20, 30]] }));
    expect([n.x, n.y, n.w, n.h]).toEqual([5, 14, 25, 26]);
    expect(n.points![0]).toEqual([0, 0]);
  });

  it("hit-tests lines by distance, boxes by bounds, and picks the topmost", () => {
    const line = el({ type: "line", x: 0, y: 0, w: 100, h: 100, points: [[0, 0], [100, 100]], z: 1 });
    expect(hitTest(line, [50, 50])).toBe(true);
    expect(hitTest(line, [90, 10])).toBe(false);
    const low = el({ type: "rect", x: 0, y: 0, w: 100, h: 100, z: 1 });
    const high = el({ type: "sticky", x: 50, y: 50, w: 100, h: 100, z: 9 });
    expect(elementAt([low, high], [60, 60])?.id).toBe(high.id);
    expect(elementAt([low, high], [500, 500])).toBeNull();
  });

  it("computes rects and union bounds", () => {
    expect(rectFromPoints([10, 50], [0, 0])).toEqual({ x: 0, y: 0, w: 10, h: 50 });
    expect(unionBounds([])).toBeNull();
    expect(unionBounds([el({ type: "rect", x: 0, y: 0, w: 10, h: 10 }), el({ type: "rect", x: 20, y: -5, w: 5, h: 5 })])).toEqual({
      minX: 0,
      minY: -5,
      maxX: 25,
      maxY: 10,
    });
  });

  it("scales points and font size when resizing", () => {
    const p = resizeElement(el({ type: "pen", w: 10, h: 10, points: [[0, 0], [10, 10]] }), 20, 40);
    expect(p.points![1]).toEqual([20, 40]);
    const t = resizeElement(el({ type: "text", w: 100, h: 30, fontSize: 24 }), 200, 60);
    expect(t.fontSize).toBe(48);
  });
});
