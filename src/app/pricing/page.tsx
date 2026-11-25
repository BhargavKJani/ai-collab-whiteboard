import { Footer, Nav } from "@/components/landing/Chrome";
import { Pricing } from "@/components/landing/Pricing";

export const metadata = { title: "Pricing — Collab Board" };

const FAQ = [
  ["What counts as an AI action?", "One AI Tidy, one Sketch → UI generation or one Brainstorm run. Drawing, sharing and exporting are always free."],
  ["Do students need accounts?", "No. Anyone with the board link can join and draw. Only AI actions need a Google sign-in."],
  ["Can I self-host?", "Yes — the MVP is MIT-licensed. Run the Next.js app plus the tiny y-websocket server and bring your own Claude API key."],
  ["Do paid plans renew automatically?", "No. You pay once by UPI and the plan ends on its own, so there is nothing to cancel."],
];

export default function PricingPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="grid-lines pointer-events-none absolute inset-x-0 top-0 h-[700px]" />
      <Nav />
      <main className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Simple plans for <span className="neon-text">teams & classrooms</span>
          </h1>
        </div>
        <Pricing />
        <div className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="glass rounded-2xl p-6">
              <h3 className="font-semibold text-white">{q}</h3>
              <p className="mt-2 text-sm text-slate-400">{a}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
