import type { BoardElement, Bounds, Camera, Point } from "./types";

export function boundsOfPoints(points: Point[]): Bounds {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

/**
 * Normalise a pointed element so that its points start at (0,0)-relative
 * bounds and x/y/w/h describe the bounding box.
 */
export function normalizePointed(el: BoardElement): BoardElement {
  if (!el.points?.length) return el;
  const b = boundsOfPoints(el.points);
  return {
    ...el,
    x: el.x + b.minX,
    y: el.y + b.minY,
    w: Math.max(1, b.maxX - b.minX),
    h: Math.max(1, b.maxY - b.minY),
    points: el.points.map(([px, py]) => [px - b.minX, py - b.minY] as Point),
  };
}

export function elementBounds(el: BoardElement): Bounds {
  return { minX: el.x, minY: el.y, maxX: el.x + el.w, maxY: el.y + el.h };
}

export function unionBounds(els: BoardElement[]): Bounds | null {
  if (!els.length) return null;
  const b = els.map(elementBounds);
  return {
    minX: Math.min(...b.map((v) => v.minX)),
    minY: Math.min(...b.map((v) => v.minY)),
    maxX: Math.max(...b.map((v) => v.maxX)),
    maxY: Math.max(...b.map((v) => v.maxY)),
  };
}

export function rectFromPoints(a: Point, b: Point) {
  return {
    x: Math.min(a[0], b[0]),
    y: Math.min(a[1], b[1]),
    w: Math.abs(a[0] - b[0]),
    h: Math.abs(a[1] - b[1]),
  };
}

export function boundsIntersect(a: Bounds, b: Bounds) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}

/** Hit test a world point against an element (with tolerance in world units). */
export function hitTest(el: BoardElement, p: Point, tol = 6): boolean {
  const b = elementBounds(el);
  if (p[0] < b.minX - tol || p[0] > b.maxX + tol || p[1] < b.minY - tol || p[1] > b.maxY + tol) {
    return false;
  }
  if ((el.type === "pen" || el.type === "arrow" || el.type === "line") && el.points?.length) {
    const local: Point = [p[0] - el.x, p[1] - el.y];
    const t = tol + el.strokeWidth;
    if (el.points.length === 1) return Math.hypot(local[0] - el.points[0][0], local[1] - el.points[0][1]) <= t;
    for (let i = 1; i < el.points.length; i++) {
      if (distToSegment(local, el.points[i - 1], el.points[i]) <= t) return true;
    }
    return false;
  }
  return true;
}

/** Topmost element under a point. */
export function elementAt(els: BoardElement[], p: Point, tol = 6): BoardElement | null {
  const sorted = [...els].sort((a, b) => b.z - a.z);
  return sorted.find((el) => hitTest(el, p, tol)) ?? null;
}

export function screenToWorld(cam: Camera, sx: number, sy: number): Point {
  return [sx / cam.zoom + cam.x, sy / cam.zoom + cam.y];
}

export function worldToScreen(cam: Camera, wx: number, wy: number): Point {
  return [(wx - cam.x) * cam.zoom, (wy - cam.y) * cam.zoom];
}

/** Zoom around a screen-space anchor, clamped to sane levels. */
export function zoomAt(cam: Camera, sx: number, sy: number, factor: number): Camera {
  const zoom = Math.min(4, Math.max(0.2, cam.zoom * factor));
  const [wx, wy] = screenToWorld(cam, sx, sy);
  return { zoom, x: wx - sx / zoom, y: wy - sy / zoom };
}

/** Scale an element to a new bounding box (used by the resize handle). */
export function resizeElement(el: BoardElement, w: number, h: number): BoardElement {
  const nw = Math.max(8, w);
  const nh = Math.max(8, h);
  if (el.points?.length) {
    const sx = el.w ? nw / el.w : 1;
    const sy = el.h ? nh / el.h : 1;
    return { ...el, w: nw, h: nh, points: el.points.map(([x, y]) => [x * sx, y * sy] as Point) };
  }
  if (el.type === "text") {
    const scale = nh / Math.max(1, el.h);
    return { ...el, w: nw, h: nh, fontSize: Math.round((el.fontSize ?? 24) * scale) };
  }
  return { ...el, w: nw, h: nh };
}

export function nextZ(els: BoardElement[]) {
  return els.reduce((m, e) => Math.max(m, e.z), 0) + 1;
}
