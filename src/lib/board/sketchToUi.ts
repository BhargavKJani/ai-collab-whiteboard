import type { BoardElement } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const INPUT_HINT = /(search|email|name|password|input|type|enter|field|username|phone)/i;

function elementHtml(el: BoardElement): string {
  const label = el.text?.trim() ?? "";
  switch (el.type) {
    case "text": {
      const fs = el.fontSize ?? 20;
      if (fs >= 30) return `<h1 class="text-4xl font-bold tracking-tight text-white">${esc(label)}</h1>`;
      if (fs >= 22) return `<h2 class="text-2xl font-semibold text-slate-100">${esc(label)}</h2>`;
      return `<p class="text-slate-300">${esc(label)}</p>`;
    }
    case "rect": {
      if (el.h <= 80 && (INPUT_HINT.test(label) || (!label && el.w > el.h * 4))) {
        return `<input class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400" placeholder="${esc(label || "Type here…")}" />`;
      }
      if (el.h <= 80) {
        return `<button class="w-fit rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110">${esc(label || "Button")}</button>`;
      }
      return `<div class="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"><h3 class="text-lg font-semibold text-white">${esc(label || "Card title")}</h3><p class="mt-2 text-sm text-slate-400">Supporting copy for this section.</p></div>`;
    }
    case "ellipse":
      return `<div class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 font-bold text-white">${esc((label || "AB").slice(0, 2).toUpperCase())}</div>`;
    case "diamond":
      return `<span class="inline-flex items-center rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">${esc(label || "New")}</span>`;
    case "sticky":
      return `<div class="rounded-xl border border-amber-300/30 bg-amber-200/10 p-4 text-sm text-amber-100">${esc(label || "Note")}</div>`;
    case "line":
      return `<hr class="border-white/10" />`;
    case "pen":
      return `<div class="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] text-sm text-slate-500">Image</div>`;
    default:
      return "";
  }
}

/**
 * Offline "Sketch → UI" generator: groups selected elements into rows by their
 * vertical position and maps each wireframe primitive to a Tailwind component.
 */
export function mockSketchToHtml(elements: BoardElement[]): string {
  const els = elements.filter((e) => e.type !== "arrow").sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: BoardElement[][] = [];
  for (const el of els) {
    const row = rows.find((r) => {
      const ref = r[0];
      const c = el.y + el.h / 2;
      return c >= ref.y && c <= ref.y + ref.h;
    });
    if (row) row.push(el);
    else rows.push([el]);
  }
  const body = rows
    .map((r) => {
      const items = r.sort((a, b) => a.x - b.x).map(elementHtml).filter(Boolean);
      if (items.length === 1) return `  ${items[0]}`;
      return `  <div class="flex flex-wrap items-center gap-4">\n    ${items.join("\n    ")}\n  </div>`;
    })
    .join("\n");
  return `<main class="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.15),_transparent_60%)] p-8 font-sans">
<section class="mx-auto flex max-w-3xl flex-col gap-6">
${body || '  <p class="text-slate-400">Select some shapes, then try again.</p>'}
</section>
</main>`;
}

/** Strip anything dangerous-looking from model HTML before it is shown in the sandboxed iframe. */
export function sanitizeGeneratedHtml(html: string): string {
  let out = html.trim();
  const fence = out.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) out = fence[1].trim();
  return out
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .slice(0, 60_000);
}

/** Wrap a body fragment in a full document that loads Tailwind (for iframe srcDoc). */
export function previewDocument(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.11"></script></head><body class="bg-slate-950">${html}</body></html>`;
}
