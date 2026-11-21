import { unionBounds } from "./geometry";
import { arrowHead, diamondPoints, penPath, wrapText } from "./render";
import type { BoardElement, BoardSnapshot, ElementType, Point } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const n = (v: number) => Math.round(v * 100) / 100;

function textBlock(el: BoardElement, color: string, centered: boolean, pad = 10) {
  if (!el.text) return "";
  const fs = el.fontSize ?? 16;
  const lines = wrapText(el.text, Math.max(10, el.w - pad * 2), fs);
  const lh = fs * 1.25;
  const total = lines.length * lh;
  const startY = centered ? el.h / 2 - total / 2 + fs * 0.9 : pad + fs * 0.9;
  const x = centered ? el.w / 2 : pad;
  const anchor = centered ? "middle" : "start";
  const tspans = lines
    .map((l, i) => `<tspan x="${n(x)}" y="${n(startY + i * lh)}">${esc(l)}</tspan>`)
    .join("");
  return `<text font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="${fs}" fill="${color}" text-anchor="${anchor}">${tspans}</text>`;
}

/** Render one element as an SVG fragment in world coordinates. */
export function elementToSvg(el: BoardElement): string {
  const t = `transform="translate(${n(el.x)} ${n(el.y)})"`;
  const stroke = esc(el.stroke);
  const fill = el.fill ? esc(el.fill) : "none";
  const sw = el.strokeWidth;
  switch (el.type) {
    case "pen":
      return `<g ${t}><path d="${penPath(el)}" fill="${stroke}"/></g>`;
    case "rect":
      return `<g ${t}><rect width="${n(el.w)}" height="${n(el.h)}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${textBlock(el, stroke, true)}</g>`;
    case "ellipse":
      return `<g ${t}><ellipse cx="${n(el.w / 2)}" cy="${n(el.h / 2)}" rx="${n(el.w / 2)}" ry="${n(el.h / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>${textBlock(el, stroke, true)}</g>`;
    case "diamond":
      return `<g ${t}><polygon points="${diamondPoints(el)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>${textBlock(el, stroke, true)}</g>`;
    case "line":
    case "arrow": {
      const pts = el.points ?? [];
      const d = pts.map((p) => `${n(p[0])},${n(p[1])}`).join(" ");
      const head = el.type === "arrow" ? arrowHead(pts) : null;
      const headSvg = head
        ? `<polyline points="${head.map((p) => `${n(p[0])},${n(p[1])}`).join(" ")}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
        : "";
      return `<g ${t}><polyline points="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>${headSvg}</g>`;
    }
    case "sticky":
      return `<g ${t}><rect width="${n(el.w)}" height="${n(el.h)}" rx="6" fill="${fill === "none" ? "#fde68a" : fill}"/>${textBlock(el, "#0f172a", false, 14)}</g>`;
    case "text":
      return `<g ${t}>${textBlock({ ...el, w: Math.max(el.w, 2000) }, stroke, false, 2)}</g>`;
  }
}

/** Standalone SVG document for a set of elements (used for PNG export + Sketch → UI). */
export function elementsToSvg(
  elements: BoardElement[],
  opts: { padding?: number; background?: string } = {},
): { svg: string; width: number; height: number } {
  const padding = opts.padding ?? 32;
  const b = unionBounds(elements) ?? { minX: 0, minY: 0, maxX: 400, maxY: 300 };
  const width = Math.ceil(b.maxX - b.minX + padding * 2);
  const height = Math.ceil(b.maxY - b.minY + padding * 2);
  const body = [...elements]
    .sort((a, c) => a.z - c.z)
    .map(elementToSvg)
    .join("");
  const bg = opts.background ? `<rect width="100%" height="100%" fill="${esc(opts.background)}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bg}<g transform="translate(${n(padding - b.minX)} ${n(padding - b.minY)})">${body}</g></svg>`;
  return { svg, width, height };
}

export function toSnapshot(elements: BoardElement[]): BoardSnapshot {
  return {
    app: "ai-collab-whiteboard",
    version: 1,
    exportedAt: new Date().toISOString(),
    elements: [...elements].sort((a, b) => a.z - b.z),
  };
}

const TYPES: ElementType[] = ["pen", "rect", "ellipse", "diamond", "arrow", "line", "sticky", "text"];
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Validate a single untrusted element. Returns null when invalid. */
export function sanitizeElement(raw: unknown): BoardElement | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.id !== "string" || !TYPES.includes(e.type as ElementType)) return null;
  if (![e.x, e.y, e.w, e.h].every(isNum)) return null;
  const el: BoardElement = {
    id: e.id.slice(0, 64),
    type: e.type as ElementType,
    x: e.x as number,
    y: e.y as number,
    w: Math.max(1, e.w as number),
    h: Math.max(1, e.h as number),
    stroke: typeof e.stroke === "string" ? e.stroke.slice(0, 32) : "#e2e8f0",
    strokeWidth: isNum(e.strokeWidth) ? Math.min(40, Math.max(1, e.strokeWidth)) : 2,
    z: isNum(e.z) ? e.z : 0,
  };
  if (typeof e.fill === "string") el.fill = e.fill.slice(0, 32);
  if (typeof e.text === "string") el.text = e.text.slice(0, 2000);
  if (isNum(e.fontSize)) el.fontSize = Math.min(200, Math.max(8, e.fontSize));
  if (typeof e.author === "string") el.author = e.author.slice(0, 64);
  if (Array.isArray(e.points)) {
    el.points = e.points
      .filter((p): p is number[] => Array.isArray(p) && isNum(p[0]) && isNum(p[1]))
      .slice(0, 5000)
      .map((p) => [p[0], p[1]] as Point);
  }
  return el;
}

/** Parse an exported board JSON file. Throws on malformed input. */
export function parseSnapshot(json: string): BoardElement[] {
  const data = JSON.parse(json) as Partial<BoardSnapshot>;
  if (!data || data.app !== "ai-collab-whiteboard" || !Array.isArray(data.elements)) {
    throw new Error("Not an AI Collab Whiteboard export");
  }
  return data.elements.map(sanitizeElement).filter((e): e is BoardElement => !!e);
}
