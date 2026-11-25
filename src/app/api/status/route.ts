import { connection } from "next/server";
import { isLive, MODEL } from "@/lib/ai/claude";
import { billingEnabled } from "@/lib/billing/config";

/** Claude runs only when payments are configured, so every AI call belongs to a signed-in user's plan. */
export async function GET() {
  await connection();
  const billing = billingEnabled();
  const ai = isLive() && billing;
  return Response.json({ mode: ai ? "live" : "demo", model: MODEL, ai, billing });
}
