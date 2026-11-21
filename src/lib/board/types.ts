export type Tool =
  | "select"
  | "hand"
  | "pen"
  | "rect"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "sticky"
  | "text"
  | "eraser";

export type ElementType =
  | "pen"
  | "rect"
  | "ellipse"
  | "diamond"
  | "arrow"
  | "line"
  | "sticky"
  | "text";

export type Point = [number, number];

/**
 * A single whiteboard element. All positions are in world coordinates.
 * `points` (pen / arrow / line) are relative to (x, y).
 */
export interface BoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  stroke: string;
  fill?: string;
  strokeWidth: number;
  z: number;
  points?: Point[];
  text?: string;
  fontSize?: number;
  author?: string;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface UserInfo {
  name: string;
  color: string;
}

export interface BoardSnapshot {
  app: "ai-collab-whiteboard";
  version: 1;
  exportedAt: string;
  elements: BoardElement[];
}

export const PALETTE = [
  "#e2e8f0",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#facc15",
  "#4ade80",
  "#fb923c",
] as const;

export const STICKY_COLORS = [
  "#fde68a",
  "#a5f3fc",
  "#c4b5fd",
  "#fbcfe8",
  "#bbf7d0",
  "#fed7aa",
] as const;
