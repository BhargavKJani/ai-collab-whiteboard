"use client";

import { Check, Link2, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Peer, SyncStatus } from "@/hooks/useYBoard";
import { initials } from "@/lib/board/room";
import type { UserInfo } from "@/lib/board/types";

export function TopBar(props: {
  roomId: string;
  status: SyncStatus;
  peers: Peer[];
  user: UserInfo;
  onRename: (name: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard may be blocked; the URL is still visible in the address bar */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <div className="glass absolute left-3 top-3 z-30 flex items-center gap-2 rounded-2xl py-1.5 pl-2 pr-1.5">
        <Link href="/" className="flex items-center gap-2" aria-label="Home">
          <span className="logo-mark h-7 w-7" />
          <span className="hidden text-sm font-semibold text-white md:block">Collab Board</span>
        </Link>
        <span className="hidden rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] text-slate-400 sm:block" data-testid="room-id">
          {props.roomId}
        </span>
        <span
          data-testid="sync-status"
          data-status={props.status}
          title={
            props.status === "server"
              ? "Connected to realtime server"
              : props.status === "local"
                ? "Server offline — syncing between tabs on this device"
                : "Connecting…"
          }
          className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] ${
            props.status === "server" ? "text-emerald-300" : props.status === "local" ? "text-amber-300" : "text-slate-400"
          }`}
        >
          {props.status === "server" ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className="hidden sm:inline">{props.status === "server" ? "Live" : props.status === "local" ? "Local" : "…"}</span>
        </span>
        <button
          type="button"
          onClick={share}
          data-testid="share"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:brightness-110"
        >
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? "Link copied" : "Share"}
        </button>
      </div>

      <div className="glass absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-2xl p-1.5" data-testid="presence">
        <div className="flex -space-x-2">
          {props.peers.slice(0, 5).map((p) => (
            <span
              key={p.clientId}
              title={p.user.name}
              data-testid="peer-avatar"
              className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#0b0f1f] text-[10px] font-bold text-slate-950 animate-pop-in"
              style={{ background: p.user.color }}
            >
              {initials(p.user.name)}
            </span>
          ))}
          {props.peers.length > 5 && (
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#0b0f1f] bg-slate-700 text-[10px] text-white">
              +{props.peers.length - 5}
            </span>
          )}
        </div>
        {editing ? (
          <input
            autoFocus
            defaultValue={props.user.name}
            maxLength={24}
            className="w-28 rounded-lg bg-black/40 px-2 py-1 text-xs text-white outline-none ring-1 ring-cyan-400/50"
            onBlur={(e) => {
              props.onRename(e.target.value.trim() || props.user.name);
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <button
            type="button"
            title="Rename yourself"
            onClick={() => setEditing(true)}
            data-testid="me"
            className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: props.user.color }} />
            <span className="max-w-24 truncate">{props.user.name}</span>
          </button>
        )}
      </div>
    </>
  );
}
