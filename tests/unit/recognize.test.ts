import { describe, expect, it } from "vitest";
import { recognizeStroke, simplify } from "@/lib/board/recognize";
import { circle, rough } from "./helpers";

describe("recognizeStroke", () => {
  it("recognises a rough rectangle", () => {
    const pts = rough([[0, 0], [200, 0], [200, 120], [0, 120], [0, 0]]);
    expect(recognizeStroke(pts).shape).toBe("rect");
  });

  it("recognises a rough ellipse", () => {
    expect(recognizeStroke(circle(100, 100, 90, 60)).shape).toBe("ellipse");
  });

  it("recognises a diamond", () => {
    const pts = rough([[100, 0], [200, 80], [100, 160], [0, 80], [100, 0]]);
    expect(recognizeStroke(pts).shape).toBe("diamond");
  });

  it("recognises a straight line with endpoints", () => {
    const r = recognizeStroke(rough([[0, 0], [300, 20]], 30, 1.5));
    expect(r.shape).toBe("line");
    expect(r.start).toBeDefined();
    expect(r.end![0]).toBeGreaterThan(290);
  });

  it("recognises an arrow drawn as shaft + head", () => {
    const pts = rough([[0, 0], [300, 0], [275, -20], [300, 0], [275, 20]], 10, 1);
    const r = recognizeStroke(pts);
    expect(r.shape).toBe("arrow");
    expect(r.end![0]).toBeGreaterThan(290);
  });

  it("leaves scribbles and tiny dots alone", () => {
    expect(recognizeStroke([[0, 0], [1, 1], [2, 0]]).shape).toBe("unknown");
    const zigzag = Array.from({ length: 40 }, (_, i) => [i * 10, i % 2 ? 80 : 0] as [number, number]);
    expect(recognizeStroke(zigzag).shape).toBe("unknown");
  });
});

describe("simplify", () => {
  it("reduces a straight noisy line to its endpoints", () => {
    const pts = rough([[0, 0], [100, 0]], 20, 0.5);
    expect(simplify(pts, 3)).toHaveLength(2);
  });
});
