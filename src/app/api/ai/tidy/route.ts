import { tidy } from "@/lib/ai/handlers";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { status, json } = await tidy(body);
  return Response.json(json, { status });
}
