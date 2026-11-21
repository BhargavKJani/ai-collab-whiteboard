"use client";

import {
  ArrowUpRight,
  Circle,
  Diamond,
  Eraser,
  Hand,
  MousePointer2,
  Pencil,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { PALETTE, type Tool } from "@/lib/board/types";

const TOOLS: { id: Tool; label: string; key: string; Icon: typeof Square }[] = [
  { id: "select", label: "Select & move", key: "V", Icon: MousePointer2 },
  { id: "hand", label: "Pan", key: "H", Icon: Hand },
  { id: "pen", label: "Pen", key: "P", Icon: Pencil },
  { id: "rect", label: "Rectangle", key: "R", Icon: Square },
  { id: "ellipse", label: "Ellipse", key: "O", Icon: Circle },
  { id: "diamond", label: "Diamond", key: "D", Icon: Diamond },
  { id: "arrow", label: "Arrow", key: "A", Icon: ArrowUpRight },
  { id: "sticky", label: "Sticky note", key: "S", Icon: StickyNote },
  { id: "text", label: "Text", key: "T", Icon: Type },
  { id: "eraser", label: "Eraser", key: "E", Icon: Eraser },
];

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.key.toLowerCase(), t.id]));

export function Toolbar(props: {
  tool: Tool;
  onTool: (t: Tool) => void;
  color: string;
  onColor: (c: string) => void;
  strokeWidth: number;
  onStrokeWidth: (w: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3">
      <div className="glass pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl p-1.5">
        {TOOLS.map(({ id, label, key, Icon }) => (
          <button
            key={id}
            type="button"
            title={`${label} (${key})`}
            aria-label={label}
            aria-pressed={props.tool === id}
            data-testid={`tool-${id}`}
            onClick={() => props.onTool(id)}
            className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
              props.tool === id
                ? "bg-gradient-to-br from-cyan-400/90 to-violet-500/90 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.45)]"
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={17} strokeWidth={2.2} />
          </button>
        ))}
        <div className="mx-1 h-6 w-px shrink-0 bg-white/10" />
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            data-testid={`color-${c.slice(1)}`}
            onClick={() => props.onColor(c)}
            className={`h-5 w-5 shrink-0 rounded-full border transition ${
              props.color === c ? "scale-110 border-white ring-2 ring-white/40" : "border-white/20 hover:scale-110"
            }`}
            style={{ background: c }}
          />
        ))}
        <div className="mx-1 h-6 w-px shrink-0 bg-white/10" />
        {[2, 4, 8].map((w) => (
          <button
            key={w}
            type="button"
            aria-label={`Stroke ${w}`}
            onClick={() => props.onStrokeWidth(w)}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
              props.strokeWidth === w ? "bg-white/15" : "hover:bg-white/10"
            }`}
          >
            <span className="rounded-full bg-slate-200" style={{ width: w + 3, height: w + 3 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
