"use client";

import { nanoid } from "nanoid";
import { Minus, Plus, Redo2, Undo2, Maximize } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useYBoard } from "@/hooks/useYBoard";
import { layoutIdeas, type Idea } from "@/lib/board/brainstorm";
import { parseSnapshot, toSnapshot } from "@/lib/board/export";
import {
  boundsIntersect,
  elementAt,
  elementBounds,
  normalizePointed,
  nextZ,
  rectFromPoints,
  resizeElement,
  screenToWorld,
  unionBounds,
  worldToScreen,
  zoomAt,
} from "@/lib/board/geometry";
import { download, elementsToPng } from "@/lib/board/raster";
import { measureText } from "@/lib/board/render";
import { randomUser } from "@/lib/board/room";
import type { BoardElement, Camera, Point, Tool, UserInfo } from "@/lib/board/types";
import { STICKY_COLORS } from "@/lib/board/types";
import { AiPanel, type AiAction } from "./AiPanel";
import { CodePreviewModal } from "./CodePreviewModal";
import { ElementView } from "./ElementView";
import { TOOL_KEYS, Toolbar } from "./Toolbar";
import { TopBar } from "./TopBar";

type Interaction =
  | { kind: "pan"; startScreen: Point; startCam: Camera }
  | { kind: "draw"; id: string; origin: Point }
  | { kind: "shape"; id: string; origin: Point }
  | { kind: "move"; start: Point; originals: Map<string, Point>; moved: boolean }
  | { kind: "resize"; id: string; start: Point; original: BoardElement }
  | { kind: "marquee"; start: Point; additive: boolean; base: string[] }
  | { kind: "erase" };

interface Toast {
  id: number;
  text: string;
  tone: "info" | "warn" | "error";
}

const USER_KEY = "wb-user";
const snapTo = (v: number) => Math.round(v / 20) * 20;

function loadUser(): UserInfo {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const u = JSON.parse(raw) as UserInfo;
      if (u?.name && u?.color) return u;
    }
  } catch {
    /* ignore */
  }
  const u = randomUser();
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  } catch {
    /* ignore */
  }
  return u;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}

export default function Whiteboard({ roomId }: { roomId: string }) {
  const [user, setUser] = useState<UserInfo>(loadUser);
  const board = useYBoard(roomId, user);
  const { elements, peers } = board;

  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#e2e8f0");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [selection, setSelection] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<AiAction | null>(null);
  const [aiMode, setAiMode] = useState<"live" | "demo" | null>(null);
  const [preview, setPreview] = useState<{ html: string; mode: string } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [spaceDown, setSpaceDown] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const camRef = useRef(cam);
  useLayoutEffect(() => {
    camRef.current = cam;
  }, [cam]);
  const cursorFrame = useRef<number | null>(null);

  const byId = useMemo(() => new Map(elements.map((e) => [e.id, e])), [elements]);
  const selected = useMemo(() => selection.map((id) => byId.get(id)).filter((e): e is BoardElement => !!e), [selection, byId]);

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((j: { mode: "live" | "demo" }) => setAiMode(j.mode))
      .catch(() => setAiMode("demo"));
  }, []);

  useEffect(() => {
    board.setSelection(selection);
  }, [selection, board]);

  const rename = (name: string) => {
    const u = { ...user, name };
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
  };

  /* ------------------------------- coordinates ------------------------------- */

  const screenPoint = (e: { clientX: number; clientY: number }): Point => {
    const r = svgRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const worldPoint = (e: { clientX: number; clientY: number }): Point => {
    const [sx, sy] = screenPoint(e);
    return screenToWorld(camRef.current, sx, sy);
  };

  const viewportCenter = (): Point => {
    const r = svgRef.current?.getBoundingClientRect();
    return screenToWorld(cam, (r?.width ?? 1200) / 2, (r?.height ?? 800) / 2);
  };

  /* --------------------------------- pointer --------------------------------- */

  const baseEl = (type: BoardElement["type"], p: Point): BoardElement => ({
    id: nanoid(10),
    type,
    x: p[0],
    y: p[1],
    w: 1,
    h: 1,
    stroke: color,
    strokeWidth: type === "pen" ? strokeWidth : Math.max(2, strokeWidth / 2),
    z: nextZ(board.all()),
    author: user.name,
  });

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (editingId) return;
    // Keep focus handling in our hands: blur side-panel inputs so shortcuts work, and stop the
    // compatibility mousedown from stealing focus from a text editor we are about to open.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    svgRef.current?.setPointerCapture(e.pointerId);
    const p = worldPoint(e);
    board.checkpoint();

    if (e.button === 1 || tool === "hand" || spaceDown) {
      interaction.current = { kind: "pan", startScreen: screenPoint(e), startCam: camRef.current };
      return;
    }
    const tol = 6 / camRef.current.zoom;

    switch (tool) {
      case "select": {
        const handle = (e.target as Element).closest?.("[data-handle]");
        if (handle && selected.length === 1) {
          interaction.current = { kind: "resize", id: selected[0].id, start: p, original: selected[0] };
          return;
        }
        const hit = elementAt(elements, p, tol);
        if (hit) {
          let next = selection;
          if (e.shiftKey) next = selection.includes(hit.id) ? selection.filter((i) => i !== hit.id) : [...selection, hit.id];
          else if (!selection.includes(hit.id)) next = [hit.id];
          setSelection(next);
          const originals = new Map<string, Point>();
          next.forEach((id) => {
            const el = byId.get(id);
            if (el) originals.set(id, [el.x, el.y]);
          });
          interaction.current = { kind: "move", start: p, originals, moved: false };
        } else {
          interaction.current = { kind: "marquee", start: p, additive: e.shiftKey, base: e.shiftKey ? selection : [] };
          if (!e.shiftKey) setSelection([]);
        }
        return;
      }
      case "pen": {
        const el = { ...baseEl("pen", p), points: [[0, 0]] as Point[] };
        board.upsert(el);
        interaction.current = { kind: "draw", id: el.id, origin: p };
        return;
      }
      case "rect":
      case "ellipse":
      case "diamond": {
        const el = baseEl(tool, p);
        board.upsert(el);
        interaction.current = { kind: "shape", id: el.id, origin: p };
        return;
      }
      case "arrow": {
        const el = { ...baseEl("arrow", p), points: [[0, 0], [0, 0]] as Point[] };
        board.upsert(el);
        interaction.current = { kind: "shape", id: el.id, origin: p };
        return;
      }
      case "sticky": {
        const fill = STICKY_COLORS[elements.filter((x) => x.type === "sticky").length % STICKY_COLORS.length];
        const el: BoardElement = {
          ...baseEl("sticky", [p[0] - 100, p[1] - 65]),
          w: 200,
          h: 130,
          fill,
          stroke: "#0f172a",
          strokeWidth: 1,
          fontSize: 16,
          text: "",
        };
        board.upsert(el);
        setSelection([el.id]);
        setEditingId(el.id);
        setTool("select");
        return;
      }
      case "text": {
        const hit = elementAt(elements, p, tol);
        if (hit && hit.type === "text") {
          setEditingId(hit.id);
          return;
        }
        const fontSize = 24;
        const el: BoardElement = { ...baseEl("text", [p[0], p[1] - fontSize / 2]), fontSize, text: "", ...measureText("", fontSize), strokeWidth: 1 };
        board.upsert(el);
        setSelection([el.id]);
        setEditingId(el.id);
        setTool("select");
        return;
      }
      case "eraser": {
        const hit = elementAt(elements, p, tol * 2);
        if (hit) board.remove([hit.id]);
        interaction.current = { kind: "erase" };
        return;
      }
    }
  };

  const broadcastCursor = (p: Point) => {
    if (cursorFrame.current) return;
    cursorFrame.current = requestAnimationFrame(() => {
      cursorFrame.current = null;
      board.setCursor(p);
    });
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = worldPoint(e);
    broadcastCursor(p);
    const it = interaction.current;
    if (!it) return;
    switch (it.kind) {
      case "pan": {
        const [sx, sy] = screenPoint(e);
        const c = it.startCam;
        setCam({ ...c, x: c.x - (sx - it.startScreen[0]) / c.zoom, y: c.y - (sy - it.startScreen[1]) / c.zoom });
        return;
      }
      case "draw": {
        const el = board.get(it.id);
        if (!el?.points) return;
        const local: Point = [p[0] - el.x, p[1] - el.y];
        const last = el.points[el.points.length - 1];
        if (Math.hypot(local[0] - last[0], local[1] - last[1]) < 1.5 / camRef.current.zoom) return;
        board.patch(it.id, { points: [...el.points, local] });
        return;
      }
      case "shape": {
        const el = board.get(it.id);
        if (!el) return;
        if (el.type === "arrow") {
          board.patch(it.id, { points: [[0, 0], [p[0] - it.origin[0], p[1] - it.origin[1]]] });
        } else {
          let end = p;
          if (e.shiftKey) {
            const s = Math.max(Math.abs(p[0] - it.origin[0]), Math.abs(p[1] - it.origin[1]));
            end = [it.origin[0] + Math.sign(p[0] - it.origin[0]) * s, it.origin[1] + Math.sign(p[1] - it.origin[1]) * s];
          }
          board.patch(it.id, rectFromPoints(it.origin, end));
        }
        return;
      }
      case "move": {
        const dx = p[0] - it.start[0];
        const dy = p[1] - it.start[1];
        if (!it.moved && Math.hypot(dx, dy) < 2 / camRef.current.zoom) return;
        it.moved = true;
        board.patchMany([...it.originals].map(([id, [ox, oy]]) => ({ id, changes: { x: ox + dx, y: oy + dy } })));
        return;
      }
      case "resize": {
        const o = it.original;
        const next = resizeElement(o, o.w + (p[0] - it.start[0]), o.h + (p[1] - it.start[1]));
        board.patch(it.id, { w: next.w, h: next.h, points: next.points, fontSize: next.fontSize });
        return;
      }
      case "marquee": {
        const r = rectFromPoints(it.start, p);
        setMarquee(r);
        const mb = { minX: r.x, minY: r.y, maxX: r.x + r.w, maxY: r.y + r.h };
        const hits = elements.filter((el) => boundsIntersect(elementBounds(el), mb)).map((el) => el.id);
        setSelection([...new Set([...it.base, ...hits])]);
        return;
      }
      case "erase": {
        const hit = elementAt(elements, p, (12 / camRef.current.zoom));
        if (hit) board.remove([hit.id]);
        return;
      }
    }
  };

  const onPointerUp = () => {
    const it = interaction.current;
    interaction.current = null;
    setMarquee(null);
    if (!it) return;
    if (it.kind === "draw") {
      const el = board.get(it.id);
      if (el) board.upsert(normalizePointed(el));
    } else if (it.kind === "shape") {
      const el = board.get(it.id);
      if (!el) return;
      if (el.type === "arrow") {
        const n = normalizePointed(el);
        if (Math.hypot(n.w, n.h) < 8) board.remove([el.id]);
        else board.upsert(n);
      } else if (el.w < 6 && el.h < 6) {
        board.patch(el.id, { x: el.x - 80, y: el.y - 50, w: 160, h: 100 });
      }
      setSelection([el.id]);
    }
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const p = worldPoint(e);
    const hit = elementAt(elements, p, 6 / cam.zoom);
    if (hit && ["sticky", "text", "rect", "ellipse", "diamond"].includes(hit.type)) {
      setSelection([hit.id]);
      setEditingId(hit.id);
    } else if (!hit && tool === "select") {
      const fontSize = 24;
      const el: BoardElement = { ...baseEl("text", [p[0], p[1] - fontSize / 2]), fontSize, text: "", ...measureText("", fontSize), strokeWidth: 1 };
      board.upsert(el);
      setSelection([el.id]);
      setEditingId(el.id);
    }
  };

  /* ------------------------------ wheel zoom/pan ------------------------------ */

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        setCam((c) => zoomAt(c, e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01)));
      } else {
        setCam((c) => ({ ...c, x: c.x + e.deltaX / c.zoom, y: c.y + e.deltaY / c.zoom }));
      }
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (f: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    setCam((c) => zoomAt(c, r.width / 2, r.height / 2, f));
  };

  const zoomToFit = useCallback(
    (els?: BoardElement[]) => {
      const b = unionBounds(els ?? board.all());
      const r = svgRef.current?.getBoundingClientRect();
      if (!b || !r) return setCam({ x: 0, y: 0, zoom: 1 });
      // Leave room for the floating AI panel (right) and toolbar (bottom) on wide screens.
      const right = r.width >= 900 ? 320 : 0;
      const usableW = r.width - right;
      const usableH = r.height - 90;
      const pad = 60;
      const zoom = Math.min(1.25, Math.max(0.2, Math.min(usableW / (b.maxX - b.minX + pad * 2), usableH / (b.maxY - b.minY + pad * 2))));
      setCam({ zoom, x: (b.minX + b.maxX) / 2 - usableW / 2 / zoom, y: (b.minY + b.maxY) / 2 - usableH / 2 / zoom });
    },
    [board],
  );

  /* -------------------------------- keyboard -------------------------------- */

  const deleteSelection = useCallback(() => {
    if (!selection.length) return;
    board.checkpoint();
    board.remove(selection);
    setSelection([]);
  }, [board, selection]);

  const duplicateSelection = useCallback(() => {
    if (!selected.length) return;
    board.checkpoint();
    let z = nextZ(board.all());
    const copies = selected.map((el) => ({ ...el, id: nanoid(10), x: el.x + 24, y: el.y + 24, z: z++ }));
    board.upsert(copies);
    setSelection(copies.map((c) => c.id));
  }, [board, selected]);

  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) board.redo();
        else board.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        board.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelection(board.all().map((el) => el.id));
        return;
      }
      if (mod) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === "Escape") {
        setSelection([]);
        setTool("select");
      } else if (e.key === " ") {
        e.preventDefault();
        setSpaceDown(true);
      } else if (e.key === "Enter" && selection.length === 1) {
        e.preventDefault();
        setEditingId(selection[0]);
      } else if (TOOL_KEYS[e.key.toLowerCase()]) {
        setTool(TOOL_KEYS[e.key.toLowerCase()]);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") setSpaceDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [board, deleteSelection, duplicateSelection, selection]);

  /* ----------------------------------- AI ----------------------------------- */

  const targets = () => (selected.length ? selected : board.all());

  const runTidy = async () => {
    const els = targets();
    if (!els.length) return toast("Draw some rough shapes first", "warn");
    setBusy("tidy");
    try {
      const res = await postJson<{ elements: BoardElement[]; removedIds: string[]; summary: string; mode: string; warning?: string }>(
        "/api/ai/tidy",
        { elements: els },
      );
      board.checkpoint();
      board.replace(res.elements, res.removedIds);
      board.checkpoint();
      setSelection(res.elements.map((e) => e.id));
      toast(`✨ ${res.summary}`);
      if (res.warning) toast(res.warning, "warn");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const runSketch = async () => {
    const els = targets();
    if (!els.length) return toast("Sketch a wireframe first (boxes + text)", "warn");
    setBusy("sketch");
    try {
      const image = await elementsToPng(els, { scale: 1.5, maxSize: 1568, background: "#ffffff" }).catch(() => "");
      const res = await postJson<{ html: string; mode: string; warning?: string }>("/api/ai/sketch", {
        elements: els,
        image,
      });
      setPreview({ html: res.html, mode: res.mode });
      if (res.warning) toast(res.warning, "warn");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const runBrainstorm = async (prompt: string) => {
    setBusy("brainstorm");
    try {
      const res = await postJson<{ ideas: Idea[]; mode: string; warning?: string }>("/api/ai/brainstorm", { prompt, count: 8 });
      const groups = new Set(res.ideas.map((i) => i.group)).size;
      // Put new notes below existing content so nothing gets covered; otherwise centre them.
      const existing = unionBounds(board.all());
      const [cx, cy] = viewportCenter();
      const origin: Point = existing ? [snapTo(existing.minX), snapTo(existing.maxY + 80)] : [cx - (groups * 224) / 2, cy - 220];
      const notes = layoutIdeas(res.ideas, origin, nextZ(board.all()), user.name);
      board.checkpoint();
      board.upsert(notes);
      board.checkpoint();
      setSelection(notes.map((n) => n.id));
      setTimeout(() => zoomToFit(), 30);
      toast(`💡 Added ${res.ideas.length} ideas`);
      if (res.warning) toast(res.warning, "warn");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  /* --------------------------------- export --------------------------------- */

  const exportPng = async () => {
    const els = targets();
    if (!els.length) return toast("Board is empty", "warn");
    try {
      download(`board-${roomId}.png`, await elementsToPng(els, { scale: 2 }));
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(toSnapshot(board.all()), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    download(`board-${roomId}.json`, url);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importJson = async (file: File) => {
    try {
      const els = parseSnapshot(await file.text());
      let z = nextZ(board.all());
      const fresh = els.map((el) => ({ ...el, id: nanoid(10), z: z++ }));
      board.checkpoint();
      board.upsert(fresh);
      setSelection(fresh.map((e) => e.id));
      toast(`Imported ${fresh.length} elements`);
      setTimeout(() => zoomToFit(), 50);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  };

  const clearBoard = () => {
    if (!board.all().length) return;
    board.checkpoint();
    board.clear();
    setSelection([]);
    toast("Board cleared — press ⌘Z to undo");
  };

  /* -------------------------------- rendering -------------------------------- */

  const editing = editingId ? byId.get(editingId) : undefined;
  const gridSize = 24 * cam.zoom;
  const cursorClass =
    tool === "hand" || spaceDown ? "cursor-grab" : tool === "select" ? "cursor-default" : tool === "eraser" ? "cursor-cell" : "cursor-crosshair";
  const single = selected.length === 1 ? selected[0] : null;
  const selBounds = unionBounds(selected);

  return (
    <div className="board-bg relative h-dvh w-full overflow-hidden select-none" data-testid="board">
      <svg
        ref={svgRef}
        data-testid="canvas"
        className={`absolute inset-0 h-full w-full touch-none ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => board.setCursor(null)}
        onDoubleClick={onDoubleClick}
      >
        <defs>
          <pattern
            id="grid"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
            x={-cam.x * cam.zoom}
            y={-cam.y * cam.zoom}
          >
            <circle cx={1} cy={1} r={Math.max(0.6, cam.zoom)} fill="rgba(148,163,184,0.18)" />
          </pattern>
          <filter id="sticky-shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <g transform={`scale(${cam.zoom}) translate(${-cam.x} ${-cam.y})`}>
          {elements.map((el) => (
            <ElementView key={el.id} el={el} hideText={el.id === editingId} />
          ))}

          {/* collaborator selections */}
          {peers.flatMap((p) =>
            (p.selection ?? []).map((id) => {
              const el = byId.get(id);
              if (!el) return null;
              return (
                <rect
                  key={`${p.clientId}-${id}`}
                  x={el.x - 6}
                  y={el.y - 6}
                  width={el.w + 12}
                  height={el.h + 12}
                  rx={8}
                  fill="none"
                  stroke={p.user.color}
                  strokeWidth={1.5 / cam.zoom}
                  strokeDasharray={`${4 / cam.zoom} ${3 / cam.zoom}`}
                  pointerEvents="none"
                />
              );
            }),
          )}

          {/* local selection */}
          {selected.map((el) => (
            <rect
              key={`sel-${el.id}`}
              data-testid="selection-box"
              x={el.x - 4}
              y={el.y - 4}
              width={el.w + 8}
              height={el.h + 8}
              rx={6}
              fill="none"
              stroke="#22d3ee"
              strokeWidth={1.5 / cam.zoom}
              pointerEvents="none"
            />
          ))}
          {selected.length > 1 && selBounds && (
            <rect
              x={selBounds.minX - 10}
              y={selBounds.minY - 10}
              width={selBounds.maxX - selBounds.minX + 20}
              height={selBounds.maxY - selBounds.minY + 20}
              fill="rgba(34,211,238,0.04)"
              stroke="rgba(34,211,238,0.5)"
              strokeDasharray={`${6 / cam.zoom} ${4 / cam.zoom}`}
              strokeWidth={1 / cam.zoom}
              pointerEvents="none"
            />
          )}
          {single && !editingId && (
            <rect
              data-handle="resize"
              data-testid="resize-handle"
              x={single.x + single.w + 4 - 6 / cam.zoom}
              y={single.y + single.h + 4 - 6 / cam.zoom}
              width={12 / cam.zoom}
              height={12 / cam.zoom}
              rx={3 / cam.zoom}
              fill="#0b1020"
              stroke="#22d3ee"
              strokeWidth={2 / cam.zoom}
              className="cursor-nwse-resize"
            />
          )}
          {marquee && (
            <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="rgba(167,139,250,0.08)"
              stroke="#a78bfa"
              strokeWidth={1 / cam.zoom}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {/* inline text editor */}
      {editing && (
        <TextEditor
          key={editing.id}
          el={editing}
          cam={cam}
          onChange={(text) => {
            const changes: Partial<BoardElement> = { text };
            if (editing.type === "text") Object.assign(changes, measureText(text, editing.fontSize ?? 24));
            board.patch(editing.id, changes);
          }}
          onDone={() => {
            const el = board.get(editing.id);
            if (el && el.type === "text" && !el.text?.trim()) board.remove([el.id]);
            setEditingId(null);
            board.checkpoint();
          }}
        />
      )}

      {/* remote cursors */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {peers.map((p) => {
          if (!p.cursor) return null;
          const [sx, sy] = worldToScreen(cam, p.cursor[0], p.cursor[1]);
          return (
            <div
              key={p.clientId}
              data-testid="remote-cursor"
              className="absolute left-0 top-0 transition-transform duration-75 ease-linear"
              style={{ transform: `translate(${sx}px, ${sy}px)` }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" style={{ filter: `drop-shadow(0 0 6px ${p.user.color})` }}>
                <path d="M2 2 L17 9 L10 11 L7 18 Z" fill={p.user.color} stroke="#0b1020" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
              <span
                className="ml-4 -mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold text-slate-950"
                style={{ background: p.user.color }}
              >
                {p.user.name}
              </span>
            </div>
          );
        })}
      </div>

      {elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" data-testid="empty-hint">
          <div className="text-center animate-fade-in">
            <p className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-2xl font-semibold text-transparent">
              Sketch something rough.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Press <Kbd>P</Kbd> to draw, <Kbd>S</Kbd> for a sticky, or ask the AI copilot to brainstorm.
            </p>
            <p className="mt-1 text-xs text-slate-500">Share the link — everyone in the room sees live cursors.</p>
          </div>
        </div>
      )}

      <TopBar roomId={roomId} status={board.status} peers={peers} user={user} onRename={rename} />
      <Toolbar tool={tool} onTool={setTool} color={color} onColor={(c) => {
        setColor(c);
        if (selected.length) board.patchMany(selected.filter((s) => s.type !== "sticky").map((s) => ({ id: s.id, changes: { stroke: c } })));
      }} strokeWidth={strokeWidth} onStrokeWidth={setStrokeWidth} />
      <AiPanel
        busy={busy}
        aiMode={aiMode}
        hasSelection={selected.length > 0}
        onTidy={runTidy}
        onSketch={runSketch}
        onBrainstorm={runBrainstorm}
        onExportPng={exportPng}
        onExportJson={exportJson}
        onImportJson={importJson}
        onClear={clearBoard}
      />

      <div className="glass absolute bottom-20 left-3 z-20 hidden items-center gap-0.5 rounded-xl p-1 sm:flex lg:bottom-4">
        <IconBtn label="Undo" testId="undo" disabled={!board.canUndo} onClick={board.undo}><Undo2 size={16} /></IconBtn>
        <IconBtn label="Redo" testId="redo" disabled={!board.canRedo} onClick={board.redo}><Redo2 size={16} /></IconBtn>
        <span className="mx-1 h-5 w-px bg-white/10" />
        <IconBtn label="Zoom out" onClick={() => zoomBy(1 / 1.2)}><Minus size={16} /></IconBtn>
        <button type="button" className="w-12 text-center text-xs text-slate-300" onClick={() => setCam((c) => ({ ...c, zoom: 1 }))} data-testid="zoom-level">
          {Math.round(cam.zoom * 100)}%
        </button>
        <IconBtn label="Zoom in" onClick={() => zoomBy(1.2)}><Plus size={16} /></IconBtn>
        <IconBtn label="Zoom to fit" onClick={() => zoomToFit()}><Maximize size={15} /></IconBtn>
      </div>
      {/* mobile undo */}
      <div className="glass absolute bottom-20 left-3 z-20 flex rounded-xl p-1 sm:hidden">
        <IconBtn label="Undo" disabled={!board.canUndo} onClick={board.undo}><Undo2 size={16} /></IconBtn>
        <IconBtn label="Redo" disabled={!board.canRedo} onClick={board.redo}><Redo2 size={16} /></IconBtn>
      </div>

      <div className="pointer-events-none absolute bottom-20 right-3 z-40 flex flex-col items-end gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid="toast"
            className={`glass-strong animate-slide-up rounded-xl px-3.5 py-2 text-sm ${
              t.tone === "error" ? "text-red-200" : t.tone === "warn" ? "text-amber-200" : "text-slate-100"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {preview && <CodePreviewModal html={preview.html} mode={preview.mode} onClose={() => setPreview(null)} />}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="mx-0.5 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">{children}</kbd>;
}

function IconBtn(p: { label: string; onClick: () => void; disabled?: boolean; testId?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={p.label}
      title={p.label}
      data-testid={p.testId}
      disabled={p.disabled}
      onClick={p.onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
    >
      {p.children}
    </button>
  );
}

function TextEditor({
  el,
  cam,
  onChange,
  onDone,
}: {
  el: BoardElement;
  cam: Camera;
  onChange: (text: string) => void;
  onDone: () => void;
}) {
  const [sx, sy] = worldToScreen(cam, el.x, el.y);
  const fs = (el.fontSize ?? 16) * cam.zoom;
  const isSticky = el.type === "sticky";
  const isShape = ["rect", "ellipse", "diamond"].includes(el.type);
  const pad = (isSticky ? 14 : el.type === "text" ? 2 : 10) * cam.zoom;
  return (
    <textarea
      autoFocus
      data-testid="text-editor"
      defaultValue={el.text ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      placeholder={isSticky ? "Write an idea…" : "Type…"}
      className="absolute z-30 resize-none overflow-hidden border-none bg-transparent outline-none placeholder:text-slate-500/70"
      style={{
        left: sx,
        top: sy,
        width: Math.max(el.type === "text" ? 160 : el.w, el.w) * cam.zoom + (el.type === "text" ? 40 : 0),
        height: Math.max(el.h * cam.zoom, fs * 1.6),
        padding: pad,
        paddingTop: isShape ? Math.max(pad, (el.h * cam.zoom) / 2 - fs * 0.7) : pad,
        fontSize: fs,
        lineHeight: 1.25,
        textAlign: isShape ? "center" : "left",
        color: isSticky ? "#0f172a" : el.stroke,
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
      }}
    />
  );
}
