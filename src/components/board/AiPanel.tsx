"use client";

import { FileJson, ImageDown, Lightbulb, Loader2, Sparkles, Upload, Wand2, Trash2, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

export type AiAction = "tidy" | "sketch" | "brainstorm";

export function AiPanel(props: {
  busy: AiAction | null;
  aiMode: "live" | "demo" | null;
  hasSelection: boolean;
  onTidy: () => void;
  onSketch: () => void;
  onBrainstorm: (prompt: string) => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onClear: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  // Collapsed by default on phones so the canvas stays usable.
  const [open, setOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 768);
  const fileRef = useRef<HTMLInputElement>(null);
  const scope = props.hasSelection ? "selection" : "whole board";

  return (
    <aside
      className="glass absolute right-3 top-16 z-20 w-[min(300px,calc(100vw-24px))] rounded-2xl p-3 sm:top-20"
      data-testid="ai-panel"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-slate-950">
          <Sparkles size={15} />
        </span>
        <span className="text-sm font-semibold text-white">AI copilot</span>
        <span
          data-testid="ai-mode"
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            props.aiMode === "live" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"
          }`}
        >
          {props.aiMode === "live" ? "Claude live" : "Demo mode"}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2 animate-fade-in">
          <ActionButton
            testId="ai-tidy"
            icon={<Wand2 size={16} />}
            title="AI Tidy"
            hint={`Rough sketches → clean diagram (${scope})`}
            busy={props.busy === "tidy"}
            disabled={!!props.busy}
            onClick={props.onTidy}
          />
          <ActionButton
            testId="ai-sketch"
            icon={<Sparkles size={16} />}
            title="Sketch → UI code"
            hint={`Wireframe → HTML + Tailwind (${scope})`}
            busy={props.busy === "sketch"}
            disabled={!!props.busy}
            onClick={props.onSketch}
          />
          <form
            className="rounded-xl border border-white/10 bg-white/[0.03] p-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) props.onBrainstorm(prompt.trim());
            }}
          >
            <div className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold text-slate-200">
              <Lightbulb size={14} className="text-amber-300" /> Brainstorm
            </div>
            <div className="flex gap-1.5">
              <input
                data-testid="brainstorm-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. onboarding for new devs"
                maxLength={400}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none"
              />
              <button
                type="submit"
                data-testid="brainstorm-go"
                disabled={!!props.busy || !prompt.trim()}
                className="rounded-lg bg-gradient-to-r from-amber-300 to-pink-400 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
              >
                {props.busy === "brainstorm" ? <Loader2 size={15} className="animate-spin" /> : "Go"}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <SmallButton testId="export-png" onClick={props.onExportPng} icon={<ImageDown size={14} />} label="PNG" />
            <SmallButton testId="export-json" onClick={props.onExportJson} icon={<FileJson size={14} />} label="JSON" />
            <SmallButton testId="import-json" onClick={() => fileRef.current?.click()} icon={<Upload size={14} />} label="Import" />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="import-file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) props.onImportJson(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={props.onClear}
            data-testid="clear-board"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 size={13} /> Clear board
          </button>
        </div>
      )}
    </aside>
  );
}

function ActionButton(p: {
  testId: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={p.testId}
      onClick={p.onClick}
      disabled={p.disabled}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.06] disabled:opacity-50"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-cyan-300 group-hover:shadow-[0_0_14px_rgba(34,211,238,0.35)]">
        {p.busy ? <Loader2 size={16} className="animate-spin" /> : p.icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{p.title}</span>
        <span className="block text-[11px] text-slate-400">{p.hint}</span>
      </span>
    </button>
  );
}

function SmallButton(p: { testId: string; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      data-testid={p.testId}
      onClick={p.onClick}
      className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] py-1.5 text-xs text-slate-200 hover:bg-white/10"
    >
      {p.icon}
      {p.label}
    </button>
  );
}

