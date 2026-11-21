import type { BoardElement, Point } from "@/lib/board/types";

let n = 0;
export function el(partial: Partial<BoardElement> & Pick<BoardElement, "type">): BoardElement {
  return { id: `e${++n}`, x: 0, y: 0, w: 100, h: 60, stroke: "#fff", strokeWidth: 2, z: n, ...partial };
}

/** Jittery hand-drawn polyline through the given corners (closed if first === last). */
export function rough(corners: Point[], steps = 12, jitter = 2, seed = 1): Point[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 2 * jitter;
  const out: Point[] = [];
  for (let i = 1; i < corners.length; i++) {
    const [ax, ay] = corners[i - 1];
    const [bx, by] = corners[i];
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      out.push([ax + (bx - ax) * t + rand(), ay + (by - ay) * t + rand()]);
    }
  }
  out.push(corners[corners.length - 1]);
  return out;
}

export function circle(cx: number, cy: number, rx: number, ry: number, steps = 48): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return [cx + Math.cos(a) * rx + Math.sin(i) * 1.5, cy + Math.sin(a) * ry] as Point;
  });
}

/** A pen element whose stroke follows absolute points. */
export function pen(points: Point[]): BoardElement {
  const minX = Math.min(...points.map((p) => p[0]));
  const minY = Math.min(...points.map((p) => p[1]));
  return el({ type: "pen", x: minX, y: minY, points: points.map(([x, y]) => [x - minX, y - minY]) });
}
