import { nanoid } from "nanoid";
import { STICKY_COLORS, type BoardElement, type Point } from "./types";

export interface Idea {
  text: string;
  group: string;
}

export const STICKY_W = 200;
export const STICKY_H = 130;
const GAP = 24;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const TEMPLATES: Record<string, string[]> = {
  "Quick wins": [
    "Ship a tiny MVP of {t} this week",
    "Interview 5 users about {t}",
    "Add a feedback button for {t}",
    "Write a one-page brief on {t}",
    "Reuse existing tooling for {t}",
  ],
  "Big bets": [
    "Make {t} collaborative in real time",
    "Automate the boring parts of {t} with AI",
    "Turn {t} into a self-serve product",
    "Build a community around {t}",
    "Open an API so others can extend {t}",
  ],
  Risks: [
    "Scope creep could stall {t}",
    "Unclear owner for {t}",
    "Users may not value {t} enough to pay",
    "Privacy concerns around {t} data",
  ],
  "Open questions": [
    "Who feels the pain of {t} most?",
    "How will we measure success for {t}?",
    "What does a 10x better {t} look like?",
    "What would we cut from {t} first?",
  ],
};

/** Offline, deterministic brainstorm used in demo mode (no API key). */
export function mockBrainstorm(prompt: string, count = 8): Idea[] {
  const topic = prompt.trim().replace(/[.?!]+$/, "") || "our project";
  const short = topic.length > 48 ? `${topic.slice(0, 45)}…` : topic;
  const seed = hash(topic.toLowerCase());
  const groups = Object.keys(TEMPLATES);
  const ideas: Idea[] = [];
  let i = 0;
  while (ideas.length < count && i < 64) {
    const group = groups[i % groups.length];
    const list = TEMPLATES[group];
    const tpl = list[(seed + Math.floor(i / groups.length)) % list.length];
    const text = tpl.replace("{t}", short);
    if (!ideas.some((x) => x.text === text)) ideas.push({ text, group });
    i++;
  }
  return ideas;
}

/** Lay out ideas as coloured columns of sticky notes, one column per group, with a header. */
export function layoutIdeas(ideas: Idea[], origin: Point, startZ: number, author?: string): BoardElement[] {
  const groups = [...new Set(ideas.map((i) => i.group))];
  const out: BoardElement[] = [];
  let z = startZ;
  groups.forEach((g, gi) => {
    const x = origin[0] + gi * (STICKY_W + GAP);
    out.push({
      id: nanoid(10),
      type: "text",
      x,
      y: origin[1],
      w: STICKY_W,
      h: 32,
      text: g,
      fontSize: 22,
      stroke: "#e2e8f0",
      strokeWidth: 1,
      z: z++,
      author,
    });
    ideas
      .filter((i) => i.group === g)
      .forEach((idea, ii) => {
        out.push({
          id: nanoid(10),
          type: "sticky",
          x,
          y: origin[1] + 48 + ii * (STICKY_H + GAP),
          w: STICKY_W,
          h: STICKY_H,
          text: idea.text,
          fill: STICKY_COLORS[gi % STICKY_COLORS.length],
          stroke: "#0f172a",
          strokeWidth: 1,
          fontSize: 16,
          z: z++,
          author,
        });
      });
  });
  return out;
}

/** Validate untrusted idea lists (e.g. from the model) into a safe shape. */
export function sanitizeIdeas(raw: unknown, max = 16): Idea[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is { text: unknown; group?: unknown } => !!i && typeof i === "object" && "text" in i)
    .map((i) => ({
      text: String(i.text).slice(0, 140).trim(),
      group: String(i.group ?? "Ideas").slice(0, 32).trim() || "Ideas",
    }))
    .filter((i) => i.text)
    .slice(0, max);
}
