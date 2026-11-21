import { normalizePointed } from "./geometry";
import { recognizeStroke } from "./recognize";
import type { BoardElement, Point } from "./types";

export const GRID = 20;

export interface TidyResult {
  /** Elements to upsert (new or changed). */
  elements: BoardElement[];
  /** Element ids to delete (e.g. strokes replaced by clean shapes, merged labels). */
  removedIds: string[];
  stats: { recognized: number; aligned: number; connected: number; labeled: number };
  summary: string;
}

const BOXY = new Set(["rect", "ellipse", "diamond", "sticky"]);

export const snap = (v: number, g = GRID) => Math.round(v / g) * g;

function center(el: BoardElement): Point {
  return [el.x + el.w / 2, el.y + el.h / 2];
}

function inside(p: Point, el: BoardElement) {
  return p[0] >= el.x && p[0] <= el.x + el.w && p[1] >= el.y && p[1] <= el.y + el.h;
}

/** Closest edge-midpoint anchor of a box to a point. */
function anchorFor(el: BoardElement, p: Point): Point {
  const anchors: Point[] = [
    [el.x + el.w / 2, el.y],
    [el.x + el.w, el.y + el.h / 2],
    [el.x + el.w / 2, el.y + el.h],
    [el.x, el.y + el.h / 2],
  ];
  return anchors.reduce((best, a) =>
    Math.hypot(a[0] - p[0], a[1] - p[1]) < Math.hypot(best[0] - p[0], best[1] - p[1]) ? a : best,
  );
}

function distToBox(el: BoardElement, p: Point) {
  const dx = Math.max(el.x - p[0], 0, p[0] - (el.x + el.w));
  const dy = Math.max(el.y - p[1], 0, p[1] - (el.y + el.h));
  return Math.hypot(dx, dy);
}

/** Cluster numbers that are within `tol` of each other; returns groups of indexes. */
function cluster(values: number[], tol: number): number[][] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const groups: number[][] = [];
  let current: number[] = [];
  let last = -Infinity;
  for (const [v, i] of order) {
    if (v - last > tol && current.length) {
      groups.push(current);
      current = [];
    }
    current.push(i);
    last = v;
  }
  if (current.length) groups.push(current);
  return groups;
}

/**
 * AI Tidy (deterministic core): turns rough sketches into a clean diagram.
 * 1. recognise freehand strokes as rect / ellipse / diamond / line / arrow
 * 2. snap boxes to the grid and align rows + columns
 * 3. attach loose text inside a shape as that shape's label
 * 4. connect line / arrow endpoints to the nearest shape edge
 */
export function tidyElements(input: BoardElement[]): TidyResult {
  const removed = new Set<string>();
  const stats = { recognized: 0, aligned: 0, connected: 0, labeled: 0 };
  let els: BoardElement[] = input.map((e) => ({ ...e, points: e.points?.map((p) => [...p] as Point) }));

  // 1. recognise strokes
  els = els.map((el) => {
    if (el.type !== "pen" || !el.points?.length) return el;
    const abs = el.points.map(([x, y]) => [x + el.x, y + el.y] as Point);
    const r = recognizeStroke(abs);
    if (r.shape === "unknown") return el;
    stats.recognized++;
    if (r.shape === "line" || r.shape === "arrow") {
      const s = r.start!;
      const e = r.end!;
      return normalizePointed({
        ...el,
        type: r.shape,
        x: 0,
        y: 0,
        strokeWidth: 2,
        points: [s, e],
      });
    }
    return { ...el, type: r.shape, points: undefined, strokeWidth: 2 };
  });

  // 2. snap + align boxes
  const boxes = els.filter((e) => BOXY.has(e.type));
  for (const b of boxes) {
    const nx = snap(b.x);
    const ny = snap(b.y);
    const nw = Math.max(GRID * 2, snap(b.w));
    const nh = Math.max(GRID * 2, snap(b.h));
    if (nx !== b.x || ny !== b.y || nw !== b.w || nh !== b.h) stats.aligned++;
    Object.assign(b, { x: nx, y: ny, w: nw, h: nh });
  }
  // rows: same centre-y → share centre-y and height
  for (const group of cluster(boxes.map((b) => center(b)[1]), GRID * 2)) {
    if (group.length < 2) continue;
    const cy = snap(group.reduce((s, i) => s + center(boxes[i])[1], 0) / group.length, GRID / 2);
    const h = snap(Math.max(...group.map((i) => boxes[i].h)));
    for (const i of group) Object.assign(boxes[i], { h, y: cy - h / 2 });
  }
  // columns: same centre-x → share centre-x
  for (const group of cluster(boxes.map((b) => center(b)[0]), GRID * 2)) {
    if (group.length < 2) continue;
    const cx = snap(group.reduce((s, i) => s + center(boxes[i])[0], 0) / group.length, GRID / 2);
    const w = snap(Math.max(...group.map((i) => boxes[i].w)));
    for (const i of group) Object.assign(boxes[i], { w, x: cx - w / 2 });
  }

  // 3. loose text inside a shape → shape label
  const shapes = boxes.filter((b) => b.type !== "sticky");
  for (const t of els.filter((e) => e.type === "text")) {
    const host = shapes
      .filter((s) => inside(center(t), s))
      .sort((a, b) => a.w * a.h - b.w * b.h)[0];
    if (host && t.text?.trim()) {
      host.text = host.text ? `${host.text}\n${t.text}` : t.text;
      removed.add(t.id);
      stats.labeled++;
    }
  }

  // 4. connect lines/arrows to shapes
  const reach = GRID * 3;
  els = els.map((el) => {
    if ((el.type !== "line" && el.type !== "arrow") || !el.points || el.points.length < 2) return el;
    const abs = el.points.map(([x, y]) => [x + el.x, y + el.y] as Point);
    const ends: Point[] = [abs[0], abs[abs.length - 1]];
    let changed = false;
    const fixed = ends.map((p, idx) => {
      const other = ends[1 - idx];
      const candidates = shapes
        .filter((s) => distToBox(s, p) < reach && !inside(other, s))
        .sort((a, b) => distToBox(a, p) - distToBox(b, p));
      if (!candidates.length) return p;
      changed = true;
      return anchorFor(candidates[0], other);
    });
    if (!changed) return el;
    stats.connected++;
    return normalizePointed({ ...el, x: 0, y: 0, points: [fixed[0], fixed[1]] });
  });

  const changed = els.filter((e) => !removed.has(e.id));
  const parts = [
    stats.recognized && `${stats.recognized} sketch${stats.recognized > 1 ? "es" : ""} → shapes`,
    stats.aligned && `${stats.aligned} aligned to grid`,
    stats.labeled && `${stats.labeled} label${stats.labeled > 1 ? "s" : ""} attached`,
    stats.connected && `${stats.connected} connector${stats.connected > 1 ? "s" : ""} snapped`,
  ].filter(Boolean);
  return {
    elements: changed,
    removedIds: [...removed],
    stats,
    summary: parts.length ? parts.join(" · ") : "Already tidy — nothing to change",
  };
}
