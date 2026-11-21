"use client";

import { Check, Code2, Copy, Eye, X } from "lucide-react";
import { useState } from "react";
import { previewDocument } from "@/lib/board/sketchToUi";

export function CodePreviewModal({ html, mode, onClose }: { html: string; mode: string; onClose: () => void }) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Generated UI"
      data-testid="code-modal"
      onClick={onClose}
    >
      <div
        className="glass-strong flex h-[min(80vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-sm font-semibold text-white">Sketch → UI</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
            {mode === "live" ? "Claude vision" : "Demo mode"}
          </span>
          <div className="ml-auto flex items-center gap-1 rounded-xl bg-white/5 p-1">
            {(["preview", "code"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                data-testid={`code-tab-${t}`}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  tab === t ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {t === "preview" ? <Eye size={14} /> : <Code2 size={14} />}
                {t === "preview" ? "Preview" : "HTML"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(html);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>
        {tab === "preview" ? (
          <iframe
            title="Generated UI preview"
            data-testid="code-preview"
            sandbox="allow-scripts"
            className="h-full w-full flex-1 bg-slate-950"
            srcDoc={previewDocument(html)}
          />
        ) : (
          <pre className="flex-1 overflow-auto p-5 text-xs leading-relaxed text-cyan-100" data-testid="code-source">
            <code>{html}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
