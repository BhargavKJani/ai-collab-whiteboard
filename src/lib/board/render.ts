import { getStroke } from "perfect-freehand";
import type { BoardElement, Point } from "./types";

/** Convert perfect-freehand outline points to an SVG path. */
export function outlineToPath(stroke: number[][]): string {
  if (!stroke.length) return "";
  const d = stroke.reduce(
    (acc: (string | number)[], [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(r(x0), r(y0), r((x0 + x1) / 2), r((y0 + y1) / 2));
      return acc;
    },
    ["M", ...stroke[0].map(r), "Q"],
  );
  d.push("Z");
  return d.join(" ");
}

const r = (n: number) => Math.round(n * 100) / 100;

/** Filled outline path for a freehand pen element (local coordinates). */
export function penPath(el: BoardElement): string {
  const pts = el.points ?? [];
  return outlineToPath(
    getStroke(pts, {
      size: el.strokeWidth * 2.2,
      thinning: 0.55,
      smoothing: 0.5,
      streamline: 0.45,
      simulatePressure: true,
    }),
  );
}

export function diamondPoints(el: BoardElement): string {
  const { w, h } = el;
  return `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;
}

/** Two short barbs for an arrow head at the end of the last segment. */
export function arrowHead(points: Point[], size = 14): [Point, Point, Point] | null {
  if (points.length < 2) return null;
  const [x1, y1] = points[points.length - 2];
  const [x2, y2] = points[points.length - 1];
  const a = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  return [
    [x2 - size * Math.cos(a - spread), y2 - size * Math.sin(a - spread)],
    [x2, y2],
    [x2 - size * Math.cos(a + spread), y2 - size * Math.sin(a + spread)],
  ];
}

/** Greedy word wrap using an average glyph-width estimate (no DOM needed). */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charW = fontSize * 0.56;
  const maxChars = Math.max(1, Math.floor(maxWidth / charW));
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
      while (line.length > maxChars) {
        lines.push(line.slice(0, maxChars));
        line = line.slice(maxChars);
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Estimated box for a free text element. */
export function measureText(text: string, fontSize: number) {
  const lines = (text || " ").split("\n");
  const longest = Math.max(...lines.map((l) => l.length), 1);
  return { w: Math.max(40, longest * fontSize * 0.58 + 8), h: lines.length * fontSize * 1.25 + 4 };
}
