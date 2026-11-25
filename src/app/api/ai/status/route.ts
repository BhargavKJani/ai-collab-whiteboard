import { connection } from "next/server";
import { isLive, MODEL } from "@/lib/ai/claude";
import { billingEnabled } from "@/lib/billing/config";

export async function GET() {
  await connection();
  return Response.json({ mode: isLive() && billingEnabled() ? "live" : "demo", model: MODEL });
}
