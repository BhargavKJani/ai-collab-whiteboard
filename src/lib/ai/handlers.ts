import { mockBrainstorm, sanitizeIdeas, type Idea } from "@/lib/board/brainstorm";
import { sanitizeElement } from "@/lib/board/export";
import { mockSketchToHtml, sanitizeGeneratedHtml } from "@/lib/board/sketchToUi";
import { tidyElements, type TidyResult } from "@/lib/board/tidy";
import type { BoardElement } from "@/lib/board/types";
import { askClaudeJson, describeError, isLive } from "./claude";

export type AiMode = "live" | "demo";

const MAX_ELEMENTS = 400;

function readElements(raw: unknown): BoardElement[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_ELEMENTS).map(sanitizeElement).filter((e): e is BoardElement => !!e);
}

/* ---------------------------------- Brainstorm --------------------------------- */

export async function brainstorm(body: { prompt?: unknown; count?: unknown }) {
  const prompt = String(body.prompt ?? "").slice(0, 400).trim();
  if (!prompt) return { status: 400, json: { error: "Prompt is required" } };
  const count = Math.min(16, Math.max(3, Number(body.count) || 8));

  let ideas: Idea[] = [];
  let mode: AiMode = "demo";
  let warning: string | undefined;
  if (isLive()) {
    try {
      const out = await askClaudeJson<{ ideas: Idea[] }>({
        system:
          "You are a facilitation assistant on a collaborative whiteboard for dev teams and classrooms. " +
          "Generate concise, concrete sticky-note ideas (max 12 words each), grouped into 3-4 short theme names.",
        content: [{ type: "text", text: `Brainstorm ${count} sticky notes about: ${prompt}` }],
        schema: {
          type: "object",
          properties: {
            ideas: {
              type: "array",
              items: {
                type: "object",
                properties: { text: { type: "string" }, group: { type: "string" } },
                required: ["text", "group"],
                additionalProperties: false,
              },
            },
          },
          required: ["ideas"],
          additionalProperties: false,
        },
        effort: "low",
        maxTokens: 4000,
      });
      ideas = sanitizeIdeas(out.ideas, count);
      mode = "live";
    } catch (err) {
      warning = `${describeError(err)} — used demo ideas instead`;
    }
  }
  if (!ideas.length) ideas = mockBrainstorm(prompt, count);
  return { status: 200, json: { ideas, mode, warning } };
}

/* ------------------------------------ Tidy ------------------------------------ */

interface ClaudeTidy {
  shapes: { id: string; x: number; y: number; w: number; h: number; label: string }[];
}

export async function tidy(body: { elements?: unknown }) {
  const elements = readElements(body.elements);
  if (!elements.length) return { status: 400, json: { error: "Nothing to tidy" } };

  // Deterministic recognition always runs first — it is the "rough → clean" core.
  const result: TidyResult = tidyElements(elements);
  let mode: AiMode = "demo";
  let warning: string | undefined;

  if (isLive()) {
    try {
      const boxes = result.elements.filter((e) => ["rect", "ellipse", "diamond", "sticky"].includes(e.type));
      if (boxes.length >= 2) {
        const out = await askClaudeJson<ClaudeTidy>({
          system:
            "You lay out whiteboard diagrams. Given shapes (already recognised from sketches), return improved " +
            "positions so the diagram reads clearly: align to a 20px grid, consistent spacing, logical flow " +
            "left→right or top→bottom, no overlaps. Keep every id. Fix obvious label typos; keep labels short.",
          content: [
            {
              type: "text",
              text: JSON.stringify(
                boxes.map(({ id, type, x, y, w, h, text }) => ({ id, type, x, y, w, h, label: text ?? "" })),
              ),
            },
          ],
          schema: {
            type: "object",
            properties: {
              shapes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    w: { type: "number" },
                    h: { type: "number" },
                    label: { type: "string" },
                  },
                  required: ["id", "x", "y", "w", "h", "label"],
                  additionalProperties: false,
                },
              },
            },
            required: ["shapes"],
            additionalProperties: false,
          },
          effort: "medium",
          maxTokens: 8000,
        });
        const byId = new Map(out.shapes.map((s) => [s.id, s]));
        for (const el of result.elements) {
          const s = byId.get(el.id);
          if (!s || ![s.x, s.y, s.w, s.h].every(Number.isFinite)) continue;
          Object.assign(el, { x: s.x, y: s.y, w: Math.max(20, s.w), h: Math.max(20, s.h) });
          if (s.label && el.type !== "sticky") el.text = s.label.slice(0, 200);
        }
        // Re-run connector snapping against the new layout.
        const relaid = tidyElements(result.elements);
        result.elements = relaid.elements;
        result.removedIds = [...new Set([...result.removedIds, ...relaid.removedIds])];
        result.summary = `${result.summary} · layout refined by Claude`;
        mode = "live";
      }
    } catch (err) {
      warning = `${describeError(err)} — applied local tidy only`;
    }
  }
  return { status: 200, json: { ...result, mode, warning } };
}

/* -------------------------------- Sketch → UI -------------------------------- */

export async function sketchToUi(body: { elements?: unknown; image?: unknown }) {
  const elements = readElements(body.elements);
  if (!elements.length) return { status: 400, json: { error: "Select some shapes first" } };
  const image = typeof body.image === "string" ? body.image.replace(/^data:image\/png;base64,/, "") : "";

  let html = "";
  let mode: AiMode = "demo";
  let warning: string | undefined;
  if (isLive() && image && image.length < 6_000_000) {
    try {
      const out = await askClaudeJson<{ html: string }>({
        system:
          "You turn whiteboard wireframe sketches into production-quality UI. Return a single HTML fragment " +
          "(no <html>, <head> or <script>) styled only with Tailwind CSS v4 utility classes. Dark, modern, " +
          "accessible, responsive. Rectangles are usually cards, inputs or buttons; circles are avatars; " +
          "text gives headings and labels. Use realistic placeholder copy.",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/png", data: image } },
          {
            type: "text",
            text:
              "Convert this wireframe into UI. Element hints (type, size, text): " +
              JSON.stringify(elements.map(({ type, w, h, text }) => ({ type, w: Math.round(w), h: Math.round(h), text }))),
          },
        ],
        schema: {
          type: "object",
          properties: { html: { type: "string" } },
          required: ["html"],
          additionalProperties: false,
        },
        effort: "medium",
      });
      html = sanitizeGeneratedHtml(out.html);
      mode = "live";
    } catch (err) {
      warning = `${describeError(err)} — generated demo UI instead`;
    }
  }
  if (!html) html = mockSketchToHtml(elements);
  return { status: 200, json: { html, mode, warning } };
}

