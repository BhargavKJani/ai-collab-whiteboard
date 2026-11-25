import { brainstorm } from "@/lib/ai/handlers";
import { aiGate } from "@/lib/billing/gate";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  // Claude only for a signed-in user with an open AI session (free uses or a paid plan).
  const { status, json } = await brainstorm(body, await aiGate(req, body));
  return Response.json(json, { status });
}
