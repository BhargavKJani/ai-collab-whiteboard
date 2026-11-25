/**
 * Plans and prices for this app. The same billing module is shared by all of Bhargav's apps;
 * only this file changes between them.
 */

export const APP_ID = "collab";
export const APP_NAME = "Collab Board";
/** What one AI "use" is called in this app. */
export const USE_NAME = { one: "AI action", many: "AI actions" };

export type PaidPlanId = "day" | "month";
export type PlanId = "free" | PaidPlanId;

export interface PaidPlan {
  id: PaidPlanId;
  name: string;
  /** Price in paise (₹1 = 100 paise), as Razorpay expects. */
  amount: number;
  /** How long the plan lasts once paid. */
  durationLabel: string;
  /** Most AI uses allowed while the plan is active. */
  limit: number;
}

export const FREE_LIMIT = 3;

export const PAID_PLANS: Record<PaidPlanId, PaidPlan> = {
  day: { id: "day", name: "Day pass", amount: 900, durationLabel: "24 hours", limit: 15 },
  month: { id: "month", name: "Monthly", amount: 9900, durationLabel: "30 days", limit: 60 },
};

/** Most AI calls one use may make. */
export const MAX_CALLS_PER_USE = 1;

/** Accent colours for the pricing page and checkout. */
export const THEME = { accent: "#22d3ee", accent2: "#ff2d95" };

/** Copy for the pricing page. */
export const PRICING_COPY = {
  "chip": "Pay by UPI · no auto-renewal",
  "title": "Brainstorm more.",
  "titleAccent": "Clean up less.",
  "sub": "Drawing, live cursors and real-time collaboration are free forever. Pay once by UPI only when you want more AI actions. Nothing renews.",
  "free": "Draw together, free forever",
  "day": "For one big workshop day",
  "month": "For teams who brainstorm every week"
};

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    "Unlimited boards and collaborators",
    "Live cursors and real-time sync",
    "3 AI actions by Claude",
    "Export your board anytime",
  ],
  day: [
    "Up to 15 AI actions in 24 hours",
    "AI Tidy: rough sketch to clean diagram",
    "Sketch to UI code and AI Brainstorm",
    "Everything in Free",
  ],
  month: [
    "Up to 60 AI actions in 30 days",
    "AI Tidy: rough sketch to clean diagram",
    "Sketch to UI code and AI Brainstorm",
    "Use it on every board you join",
  ],
};

export function isPaidPlan(v: unknown): v is PaidPlanId {
  return v === "day" || v === "month";
}

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

/** Billing is on only when every key it needs is set. Without them the app stays in free demo mode. */
export function billingEnabled(): boolean {
  return [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.RAZORPAY_KEY_ID,
    process.env.RAZORPAY_KEY_SECRET,
  ].every((v) => Boolean(v?.trim()));
}
