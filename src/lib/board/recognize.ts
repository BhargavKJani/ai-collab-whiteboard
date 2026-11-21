import { boundsOfPoints } from "./geometry";
import type { Point } from "./types";

export type RecognizedShape = "rect" | "ellipse" | "diamond" | "line" | "arrow" | "unknown";

export interface Recognition {
  shape: RecognizedShape;
  confidence: number;
  /** Start/end for line/arrow, in the same coordinate space as the input. */
  start?: Point;
  end?: Point;
}

function pathLength(pts: Point[]) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

function polygonArea(pts: Point[]) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Ramer–Douglas–Peucker polyline simplification. */
export function simplify(pts: Point[], epsilon: number): Point[] {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpendicular(pts[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = simplify(pts.slice(0, idx + 1), epsilon);
    const right = simplify(pts.slice(idx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [a, b];
}

function perpendicular(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

/**
 * Classify a single freehand stroke. Pure + deterministic so it can run both
 * in the browser (instant preview) and on the server (mock AI mode).
 */
export function recognizeStroke(points: Point[]): Recognition {
  if (points.length < 3) return { shape: "unknown", confidence: 0 };
  const b = boundsOfPoints(points);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const diag = Math.hypot(w, h);
  if (diag < 12) return { shape: "unknown", confidence: 0 };

  const len = pathLength(points);
  const start = points[0];
  const end = points[points.length - 1];
  const gap = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const closed = gap < diag * 0.28;

  if (!closed) {
    // Straightness of the whole stroke.
    const straight = gap / len;
    if (straight > 0.9) return { shape: "line", confidence: straight, start, end };
    // Arrow: a mostly-straight shaft followed by a small head that doubles back.
    // The point furthest from the start is the arrow tip.
    let tipIdx = 0;
    let best = 0;
    points.forEach((p, i) => {
      const d = Math.hypot(p[0] - start[0], p[1] - start[1]);
      if (d > best) {
        best = d;
        tipIdx = i;
      }
    });
    // Use the first time the stroke reaches (almost) that distance, so a head
    // drawn back over the tip doesn't count as part of the shaft.
    tipIdx = points.findIndex((p) => Math.hypot(p[0] - start[0], p[1] - start[1]) >= best * 0.97);
    const tip = points[tipIdx];
    const shaftLen = pathLength(points.slice(0, tipIdx + 1));
    const shaftStraight = best / Math.max(1, shaftLen);
    const headLen = len - shaftLen;
    const headStaysNearTip = points
      .slice(tipIdx)
      .every((p) => Math.hypot(p[0] - tip[0], p[1] - tip[1]) < best * 0.35);
    if (shaftStraight > 0.85 && headLen > shaftLen * 0.05 && headLen < shaftLen * 0.8 && headStaysNearTip) {
      return { shape: "arrow", confidence: shaftStraight, start, end: tip };
    }
    return { shape: "unknown", confidence: 0.2 };
  }

  const bboxArea = Math.max(1, w * h);
  const ratio = polygonArea(points) / bboxArea;
  const corners = simplify([...points, points[0]], diag * 0.07).length - 1;

  if (ratio < 0.62 && corners <= 6) return { shape: "diamond", confidence: 1 - ratio };
  if (ratio >= 0.86) return { shape: "rect", confidence: ratio };
  if (corners <= 5 && ratio > 0.74) return { shape: "rect", confidence: ratio };
  if (ratio >= 0.62) return { shape: "ellipse", confidence: 1 - Math.abs(ratio - Math.PI / 4) };
  return { shape: "unknown", confidence: 0.2 };
}
