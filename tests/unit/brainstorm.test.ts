import { describe, expect, it } from "vitest";
import { layoutIdeas, mockBrainstorm, sanitizeIdeas, STICKY_W } from "@/lib/board/brainstorm";

describe("brainstorm", () => {
  it("is deterministic, topical, unique and grouped", () => {
    const a = mockBrainstorm("Onboarding for new devs", 8);
    expect(a).toEqual(mockBrainstorm("Onboarding for new devs", 8));
    expect(a).toHaveLength(8);
    expect(new Set(a.map((i) => i.text)).size).toBe(8);
    expect(a.every((i) => i.text.includes("Onboarding for new devs"))).toBe(true);
    expect(new Set(a.map((i) => i.group)).size).toBe(4);
  });

  it("lays out one column of sticky notes per group with a header", () => {
    const ideas = mockBrainstorm("testing", 6);
    const els = layoutIdeas(ideas, [100, 200], 10, "me");
    const stickies = els.filter((e) => e.type === "sticky");
    const headers = els.filter((e) => e.type === "text");
    expect(stickies).toHaveLength(6);
    expect(headers.map((h) => h.text)).toEqual([...new Set(ideas.map((i) => i.group))]);
    expect(new Set(stickies.map((s) => s.x)).size).toBe(headers.length);
    expect(Math.min(...els.map((e) => e.x))).toBe(100);
    expect(headers[1].x - headers[0].x).toBeGreaterThan(STICKY_W);
    expect(els.map((e) => e.z)).toEqual(els.map((_, i) => 10 + i));
    expect(new Set(els.map((e) => e.id)).size).toBe(els.length);
  });

  it("sanitises untrusted model output", () => {
    const out = sanitizeIdeas([{ text: "  ok  ", group: "" }, { nope: 1 }, { text: "x".repeat(500) }, null], 10);
    expect(out[0]).toEqual({ text: "ok", group: "Ideas" });
    expect(out[1].text).toHaveLength(140);
    expect(out).toHaveLength(2);
    expect(sanitizeIdeas("nope")).toEqual([]);
  });
});
