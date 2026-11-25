"use client";

import { useAccount } from "../AccountProvider";
import { BillingPricing } from "../BillingPricing";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { StartBoardButton } from "./StartBoardButton";

export const PLANS = {
  free: {
    name: "Free",
    tagline: "For trying it out, hack nights and small study groups.",
    monthly: 0,
    annual: 0,
    features: [
      "3 active boards",
      "Up to 5 live collaborators per board",
      "Live cursors, presence & share links",
      "Pen, shapes, sticky notes, text, undo",
      "25 AI actions / month",
      "PNG & JSON export",
    ],
  },
  team: {
    name: "Team",
    tagline: "For dev teams and classrooms that whiteboard every week.",
    monthly: 10,
    annual: 8,
    features: [
      "Unlimited boards & collaborators",
      "1,000 AI actions / user / month",
      "Sketch → UI code with Claude vision",
      "Private rooms & board history",
      "Classroom mode: follow the teacher",
      "Priority support",
    ],
  },
} as const;

export function Pricing() {
  const [annual, setAnnual] = useState(true);
  const { billing } = useAccount();
  // Real UPI plans when Razorpay + Supabase are configured; otherwise the original preview plans.
  if (billing) return <BillingPricing compact />;
  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div className="glass flex items-center gap-1 rounded-full p-1 text-sm" role="group" aria-label="Billing period">
          {[false, true].map((a) => (
            <button
              key={String(a)}
              type="button"
              data-testid={a ? "billing-annual" : "billing-monthly"}
              onClick={() => setAnnual(a)}
              className={`rounded-full px-4 py-1.5 transition ${annual === a ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {a ? "Annual · save 20%" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {(["free", "team"] as const).map((id) => {
          const plan = PLANS[id];
          const price = annual ? plan.annual : plan.monthly;
          const featured = id === "team";
          return (
            <div
              key={id}
              data-testid={`plan-${id}`}
              className={`relative rounded-3xl p-[1px] ${featured ? "bg-gradient-to-b from-cyan-400/70 via-violet-500/60 to-fuchsia-500/40" : "bg-white/10"}`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-1 text-xs font-semibold text-slate-950">
                  <Sparkles size={12} /> Most popular
                </span>
              )}
              <div className="h-full rounded-3xl bg-[#0a0d1c]/95 p-7">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-5xl font-bold tracking-tight text-white" data-testid={`price-${id}`}>
                    ${price}
                  </span>
                  <span className="pb-1.5 text-sm text-slate-400">{id === "free" ? "forever" : "/ user / month"}</span>
                </div>
                {featured && (
                  <p className="mt-1 text-xs text-slate-500">
                    {annual ? "Billed annually." : "Billed monthly."} 50% off for schools & universities.
                  </p>
                )}
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <Check size={16} className={`mt-0.5 shrink-0 ${featured ? "text-cyan-300" : "text-slate-500"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {featured ? (
                    <a
                      href="mailto:sales@example.com?subject=Collab%20Board%20Team"
                      className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 py-3 font-semibold text-slate-950 transition hover:brightness-110"
                    >
                      Start 14-day Team trial
                    </a>
                  ) : (
                    <div className="[&>button]:w-full [&>button]:justify-center">
                      <StartBoardButton label="Start for free" size="sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
