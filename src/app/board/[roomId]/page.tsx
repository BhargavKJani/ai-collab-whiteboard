import { Suspense } from "react";
import { BoardLoader, BoardSplash } from "@/components/board/BoardLoader";

export const metadata = { title: "Board — Collab Board" };

export default function BoardPage() {
  return (
    <Suspense fallback={<BoardSplash />}>
      <BoardLoader />
    </Suspense>
  );
}
