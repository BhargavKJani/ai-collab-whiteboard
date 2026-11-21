"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { newRoomId } from "@/lib/board/room";

export function StartBoardButton({ label = "Start a free board", size = "lg" }: { label?: string; size?: "lg" | "sm" }) {
  const router = useRouter();
  return (
    <button
      type="button"
      data-testid="start-board"
      onClick={() => router.push(`/board/${newRoomId()}`)}
      className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 font-semibold text-slate-950 shadow-[0_0_40px_-6px_rgba(139,92,246,0.7)] transition hover:shadow-[0_0_60px_-4px_rgba(34,211,238,0.8)] ${
        size === "lg" ? "px-6 py-3.5 text-base" : "px-4 py-2 text-sm"
      }`}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative">{label}</span>
      <ArrowRight size={size === "lg" ? 18 : 15} className="relative transition group-hover:translate-x-0.5" />
    </button>
  );
}
