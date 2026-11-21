import { connection } from "next/server";
import { isLive, MODEL } from "@/lib/ai/claude";

export async function GET() {
  await connection();
  return Response.json({ mode: isLive() ? "live" : "demo", model: MODEL });
}
