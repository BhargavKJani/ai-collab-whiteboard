import {
  Code2,
  Download,
  GraduationCap,
  Lightbulb,
  MousePointer2,
  Share2,
  Terminal,
  Undo2,
  Users,
  Wand2,
  WifiOff,
  Workflow,
} from "lucide-react";
import { Footer, Nav } from "@/components/landing/Chrome";
import { HeroBoard } from "@/components/landing/HeroBoard";
import { Pricing } from "@/components/landing/Pricing";
import { StartBoardButton } from "@/components/landing/StartBoardButton";

const FEATURES = [
  { Icon: MousePointer2, title: "Live cursors & presence", body: "See every teammate's cursor, name and selection in real time — powered by Yjs CRDTs." },
  { Icon: Share2, title: "Rooms via share link", body: "Every board is a room. Copy the link, drop it in Slack or your LMS, and you're collaborating." },
  { Icon: Workflow, title: "Pen, shapes, stickies, text", body: "Pressure-smoothed ink, rectangles, ellipses, diamonds, arrows, sticky notes and free text." },
  { Icon: Undo2, title: "Per-user undo", body: "Undo only your own changes — never wipe out what a collaborator just drew." },
  { Icon: Download, title: "Export PNG & JSON", body: "Crisp 2× PNGs for docs and slides, lossless JSON you can re-import or version in git." },
  { Icon: WifiOff, title: "Works offline", body: "IndexedDB persistence and cross-tab sync keep you drawing even when the server drops." },
];

const AI = [
  {
    Icon: Wand2,
    title: "AI Tidy",
    body: "Scribble boxes, circles and arrows at whiteboard speed. AI Tidy recognises each stroke, snaps to the grid, aligns rows, attaches labels and connects arrows.",
    tag: "rough → clean diagram",
  },
  {
    Icon: Code2,
    title: "Sketch → UI code",
    body: "Select a wireframe and Claude's vision turns it into responsive HTML + Tailwind with a live preview you can copy straight into your repo.",
    tag: "selection → HTML/Tailwind",
  },
  {
    Icon: Lightbulb,
    title: "Brainstorm",
    body: "Type a prompt — “onboarding for new devs”, “causes of WW1” — and get colour-grouped sticky notes laid out on the board, ready to vote on.",
    tag: "prompt → sticky notes",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="grid-lines pointer-events-none absolute inset-x-0 top-0 h-[900px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
      <Nav />

      <main>
        <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 text-center sm:pt-28">
          <div className="glass mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-slate-300 animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-glow" /> Multiplayer · AI-native · Open source
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl animate-slide-up">
            The whiteboard that <span className="neon-text">cleans up after you</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 animate-slide-up" style={{ animationDelay: "80ms" }}>
            A real-time collaborative board for dev teams and classrooms. Sketch rough, then let AI tidy diagrams,
            turn wireframes into Tailwind code and brainstorm sticky notes — together, live.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "160ms" }}>
            <StartBoardButton />
            <a href="#pricing" className="glass rounded-2xl px-6 py-3.5 font-semibold text-slate-200 transition hover:text-white">
              See pricing
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">No sign-up. Runs in demo mode without an API key.</p>
          <HeroBoard />
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-20">
          <SectionTitle kicker="Realtime core" title="Everything a shared board needs" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="glass group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-cyan-400/30">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-300 transition group-hover:shadow-[0_0_24px_rgba(34,211,238,0.35)]">
                  <Icon size={19} />
                </span>
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="ai" className="mx-auto max-w-6xl px-5 py-20">
          <SectionTitle kicker="Powered by Claude" title="Three AI moves you'll use every meeting" />
          <div className="grid gap-5 lg:grid-cols-3">
            {AI.map(({ Icon, title, body, tag }) => (
              <div key={title} className="relative rounded-3xl bg-gradient-to-b from-violet-500/40 via-cyan-500/20 to-transparent p-[1px]">
                <div className="h-full rounded-3xl bg-[#090c1b] p-7">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-slate-950 shadow-[0_0_30px_rgba(167,139,250,0.45)]">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-1 font-mono text-xs text-cyan-300/80">{tag}</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="use-cases" className="mx-auto max-w-6xl px-5 py-20">
          <SectionTitle kicker="Niche by design" title="Built for dev teams and classrooms" />
          <div className="grid gap-5 md:grid-cols-2">
            <UseCase
              Icon={Terminal}
              title="Dev teams"
              points={[
                "Architecture & system-design sessions that end as clean diagrams",
                "Wireframe a feature, export real Tailwind markup",
                "Sprint retros and incident post-mortems with AI-grouped stickies",
                "JSON export you can commit next to the code",
              ]}
            />
            <UseCase
              Icon={GraduationCap}
              title="Classrooms"
              points={[
                "One link for the whole class — no student accounts",
                "Brainstorm warm-ups generated from today's topic",
                "Tidy messy student diagrams into readable concept maps",
                "Export PNGs straight into slides or the LMS",
              ]}
            />
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
          <SectionTitle kicker="Pricing" title="Start free. Upgrade when your team is hooked." />
          <Pricing />
        </section>

        <section className="mx-auto max-w-4xl px-5 py-24 text-center">
          <div className="glass rounded-[32px] px-6 py-14">
            <Users className="mx-auto text-cyan-300" />
            <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">Your next whiteboard session is one link away</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">Open a board, share the URL, and watch the cursors arrive.</p>
            <div className="mt-8 flex justify-center">
              <StartBoardButton label="Open a new board" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">{kicker}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
    </div>
  );
}

function UseCase({ Icon, title, points }: { Icon: typeof Terminal; title: string; points: string[] }) {
  return (
    <div className="glass rounded-3xl p-7">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-violet-300">
          <Icon size={20} />
        </span>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
      </div>
      <ul className="mt-5 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3 text-sm text-slate-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
