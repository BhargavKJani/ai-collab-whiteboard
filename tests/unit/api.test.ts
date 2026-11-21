import { describe, expect, it } from "vitest";
import { POST as brainstorm } from "@/app/api/ai/brainstorm/route";
import { POST as sketch } from "@/app/api/ai/sketch/route";
import { POST as tidy } from "@/app/api/ai/tidy/route";
import { isLive } from "@/lib/ai/claude";
import { el, pen, rough } from "./helpers";

const req = (body: unknown) =>
  new Request("http://test/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

describe("AI routes in demo mode", () => {
  it("runs without an API key", () => {
    expect(isLive()).toBe(false);
  });

  it("brainstorm returns grouped ideas", async () => {
    const res = await brainstorm(req({ prompt: "sprint retro", count: 6 }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.mode).toBe("demo");
    expect(json.ideas).toHaveLength(6);
  });

  it("brainstorm validates input", async () => {
    expect((await brainstorm(req({ prompt: "  " }))).status).toBe(400);
    expect((await brainstorm(req("{bad"))).status).toBe(400);
  });

  it("tidy converts strokes to shapes", async () => {
    const stroke = pen(rough([[0, 0], [200, 0], [200, 120], [0, 120], [0, 0]]));
    const res = await tidy(req({ elements: [stroke] }));
    const json = await res.json();
    expect(json.mode).toBe("demo");
    expect(json.elements[0].type).toBe("rect");
    expect((await tidy(req({ elements: [] }))).status).toBe(400);
  });

  it("sketch returns HTML", async () => {
    const res = await sketch(req({ elements: [el({ type: "rect", w: 120, h: 40, text: "Buy" })] }));
    const json = await res.json();
    expect(json.html).toContain("<button");
    expect(json.mode).toBe("demo");
  });
});
