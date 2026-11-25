import Link from "next/link";
import { StartBoardButton } from "./StartBoardButton";
import { AccountButton } from "../AccountButton";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#05060f]/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="logo-mark h-8 w-8" />
          <span className="font-semibold tracking-tight text-white">Collab Board</span>
        </Link>
        <div className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
          <Link href="/#features" className="hover:text-white">Features</Link>
          <Link href="/#ai" className="hover:text-white">AI</Link>
          <Link href="/#use-cases" className="hover:text-white">Teams & classrooms</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <AccountButton />
          <StartBoardButton label="Open a board" size="sm" />
        </div>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-slate-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="logo-mark h-6 w-6" /> Collab Board · MIT licensed open-source MVP
        </div>
        <div className="flex gap-5">
          <Link href="/pricing" className="hover:text-slate-300">Pricing</Link>
          <a href="https://github.com/BhargavKJani/ai-collab-whiteboard" className="hover:text-slate-300">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
