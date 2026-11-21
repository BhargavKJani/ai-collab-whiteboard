"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { isValidRoomId } from "@/lib/board/room";

export function BoardSplash() {
  return (
    <div className="board-bg grid h-dvh place-items-center">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="logo-mark h-8 w-8 animate-spin" /> Joining room…
      </div>
    </div>
  );
}

const Whiteboard = dynamic(() => import("./Whiteboard"), { ssr: false, loading: BoardSplash });

export function BoardLoader() {
  const { roomId } = useParams<{ roomId: string }>();
  if (!roomId || !isValidRoomId(roomId)) {
    return <div className="board-bg grid h-dvh place-items-center text-slate-300">Invalid room link.</div>;
  }
  return <Whiteboard roomId={roomId.toLowerCase()} />;
}
