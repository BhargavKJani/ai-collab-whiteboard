import { describe, expect, it } from "vitest";
import { elementsToSvg, parseSnapshot, sanitizeElement, toSnapshot } from "@/lib/board/export";
import { wrapText } from "@/lib/board/render";
import { el } from "./helpers";

describe("export", () => {
  const els = [
    el({ type: "rect", x: 0, y: 0, w: 100, h: 50, text: "A <b>" }),
    el({ type: "arrow", x: 120, y: 20, w: 80, h: 1, points: [[0, 0], [80, 0]] }),
    el({ type: "sticky", x: 0, y: 100, w: 200, h: 130, text: "Hello world", fill: "#fde68a" }),
    el({ type: "pen", x: 0, y: 0, w: 10, h: 10, points: [[0, 0], [5, 5], [10, 10]] }),
    el({ type: "ellipse", x: 10, y: 10, w: 20, h: 20 }),
    el({ type: "diamond", x: 10, y: 10, w: 20, h: 20 }),
    el({ type: "text", x: 10, y: 10, w: 20, h: 20, text: "hi" }),
  ];

  it("renders a standalone, escaped SVG sized to the content", () => {
    const { svg, width, height } = elementsToSvg(els, { padding: 10, background: "#000" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(width).toBe(220);
    expect(height).toBe(250);
    expect(svg).toContain("A &lt;b&gt;");
    expect(svg).not.toContain("<b>");
    for (const tag of ["<rect", "<ellipse", "<polygon", "<polyline", "<path"]) expect(svg).toContain(tag);
  });

  it("round-trips JSON snapshots", () => {
    const snap = toSnapshot(els);
    const back = parseSnapshot(JSON.stringify(snap));
    expect(back).toHaveLength(els.length);
    expect(back[0].type).toBe("rect");
  });

  it("rejects foreign JSON and drops invalid elements", () => {
    expect(() => parseSnapshot("{}")).toThrow(/Not an AI Collab/);
    expect(() => parseSnapshot("not json")).toThrow();
    const res = parseSnapshot(
      JSON.stringify({ app: "ai-collab-whiteboard", version: 1, elements: [{ id: "x", type: "virus", x: 0, y: 0, w: 1, h: 1 }, els[0]] }),
    );
    expect(res).toHaveLength(1);
  });

  it("clamps and cleans element fields", () => {
    const e = sanitizeElement({ id: "a", type: "pen", x: 1, y: 2, w: -5, h: 3, strokeWidth: 999, points: [[1, 2], ["x", 3], [4, 5]] });
    expect(e?.w).toBe(1);
    expect(e?.strokeWidth).toBe(40);
    expect(e?.points).toEqual([[1, 2], [4, 5]]);
    expect(sanitizeElement({ id: "a", type: "rect", x: NaN, y: 0, w: 1, h: 1 })).toBeNull();
  });

  it("wraps text to the available width", () => {
    const lines = wrapText("the quick brown fox jumps over the lazy dog", 100, 16);
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
    expect(wrapText("a\nb", 100, 16)).toEqual(["a", "b"]);
  });
});
