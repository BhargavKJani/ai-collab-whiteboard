import { describe, expect, it } from "vitest";
import { mockSketchToHtml, previewDocument, sanitizeGeneratedHtml } from "@/lib/board/sketchToUi";
import { el } from "./helpers";

describe("sketch → UI", () => {
  it("maps wireframe primitives to Tailwind components in reading order", () => {
    const html = mockSketchToHtml([
      el({ type: "text", x: 0, y: 0, w: 300, h: 40, text: "Sign in", fontSize: 32 }),
      el({ type: "rect", x: 0, y: 80, w: 400, h: 50, text: "Email" }),
      el({ type: "rect", x: 0, y: 160, w: 140, h: 50, text: "Continue" }),
      el({ type: "ellipse", x: 200, y: 160, w: 50, h: 50, text: "bk" }),
      el({ type: "rect", x: 0, y: 260, w: 300, h: 200, text: "Plan" }),
      el({ type: "arrow", x: 0, y: 0, w: 10, h: 10, points: [[0, 0], [10, 10]] }),
    ]);
    expect(html).toMatch(/<h1[^>]*>Sign in<\/h1>/);
    expect(html).toMatch(/<input[^>]*placeholder="Email"/);
    expect(html).toMatch(/<button[^>]*>Continue<\/button>/);
    expect(html).toContain("BK");
    expect(html).toContain("flex flex-wrap"); // button + avatar share a row
    expect(html.indexOf("Sign in")).toBeLessThan(html.indexOf("Continue"));
    expect(html).toContain("Plan");
  });

  it("escapes user text", () => {
    expect(mockSketchToHtml([el({ type: "text", text: "<img onerror=x>" })])).toContain("&lt;img");
  });

  it("strips scripts, handlers and code fences from model HTML", () => {
    const out = sanitizeGeneratedHtml('```html\n<div onclick="evil()">hi</div><script>alert(1)</script>\n```');
    expect(out).toBe("<div>hi</div>");
  });

  it("wraps fragments in a Tailwind preview document", () => {
    expect(previewDocument("<p>x</p>")).toMatch(/tailwindcss[\s\S]*<p>x<\/p>/);
  });
});
