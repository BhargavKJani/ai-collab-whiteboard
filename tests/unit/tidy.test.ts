import { describe, expect, it } from "vitest";
import { snap, tidyElements } from "@/lib/board/tidy";
import { el, pen, rough } from "./helpers";

describe("tidyElements", () => {
  it("turns rough strokes into clean shapes snapped to the grid", () => {
    const stroke = pen(rough([[13, 17], [213, 17], [213, 137], [13, 137], [13, 17]]));
    const res = tidyElements([stroke]);
    const out = res.elements[0];
    expect(out.type).toBe("rect");
    expect(out.points).toBeUndefined();
    expect(out.x % 20).toBe(0);
    expect(out.y % 20).toBe(0);
    expect(res.stats.recognized).toBe(1);
    expect(res.summary).toMatch(/shapes/);
  });

  it("aligns shapes that sit roughly on the same row", () => {
    const a = el({ type: "rect", x: 0, y: 0, w: 120, h: 80 });
    const b = el({ type: "rect", x: 300, y: 14, w: 120, h: 70 });
    const res = tidyElements([a, b]);
    const [ra, rb] = res.elements;
    expect(ra.y + ra.h / 2).toBe(rb.y + rb.h / 2);
    expect(ra.h).toBe(rb.h);
  });

  it("attaches text inside a shape as its label", () => {
    const box = el({ type: "rect", x: 0, y: 0, w: 200, h: 100 });
    const label = el({ type: "text", x: 60, y: 40, w: 80, h: 24, text: "Database" });
    const res = tidyElements([box, label]);
    expect(res.removedIds).toEqual([label.id]);
    expect(res.elements.find((e) => e.id === box.id)?.text).toBe("Database");
    expect(res.stats.labeled).toBe(1);
  });

  it("snaps arrow endpoints to the nearest shape edges", () => {
    const a = el({ type: "rect", x: 0, y: 0, w: 100, h: 100 });
    const b = el({ type: "rect", x: 300, y: 0, w: 100, h: 100 });
    const arrow = el({ type: "arrow", x: 110, y: 45, w: 170, h: 10, points: [[0, 0], [170, 10]] });
    const res = tidyElements([a, b, arrow]);
    const out = res.elements.find((e) => e.id === arrow.id)!;
    const start = [out.x + out.points![0][0], out.y + out.points![0][1]];
    const end = [out.x + out.points![1][0], out.y + out.points![1][1]];
    expect(start).toEqual([100, 50]);
    expect(end).toEqual([300, 50]);
    expect(res.stats.connected).toBe(1);
  });

  it("does not mutate its input and reports when nothing changes", () => {
    const a = el({ type: "rect", x: 20, y: 20, w: 120, h: 80 });
    const copy = structuredClone(a);
    const res = tidyElements([a]);
    expect(a).toEqual(copy);
    expect(res.summary).toMatch(/Already tidy/);
  });

  it("snap rounds to grid", () => {
    expect(snap(29)).toBe(20);
    expect(snap(31)).toBe(40);
  });
});
