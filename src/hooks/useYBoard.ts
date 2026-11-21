"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import type { BoardElement, Point, UserInfo } from "@/lib/board/types";

export interface Peer {
  clientId: number;
  user: UserInfo;
  cursor?: Point | null;
  selection?: string[];
}

export type SyncStatus = "connecting" | "server" | "local";

const LOCAL = { local: true };

export function wsUrl() {
  if (typeof window !== "undefined") {
    // `?ws=ws://host:port` overrides the realtime server (handy for self-hosting + tests).
    const override = new URLSearchParams(window.location.search).get("ws");
    if (override && /^wss?:\/\/[\w.:-]+\/?$/.test(override)) return override;
  }
  if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === "undefined") return "ws://localhost:1234";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.hostname}:1234`;
}

/**
 * A Yjs-backed board: shared `elements` map, awareness-based presence,
 * per-user undo, y-websocket sync (with BroadcastChannel cross-tab fallback)
 * and IndexedDB offline persistence.
 */
export function useYBoard(roomId: string, user: UserInfo) {
  const doc = useMemo(() => new Y.Doc(), []);
  const map = useMemo(() => doc.getMap<BoardElement>("elements"), [doc]);
  const undo = useMemo(
    () => new Y.UndoManager(map, { trackedOrigins: new Set([LOCAL]), captureTimeout: 400 }),
    [map],
  );
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false });

  // --- elements as an external store (stable snapshot between changes)
  const snapRef = useRef<BoardElement[]>([]);
  const subscribe = useCallback(
    (cb: () => void) => {
      const handler = () => {
        snapRef.current = Array.from(map.values()).sort((a, b) => a.z - b.z);
        cb();
      };
      handler();
      map.observe(handler);
      return () => map.unobserve(handler);
    },
    [map],
  );
  const elements = useSyncExternalStore(
    subscribe,
    () => snapRef.current,
    () => snapRef.current,
  );

  useEffect(() => {
    const provider = new WebsocketProvider(wsUrl(), `wb-${roomId}`, doc, {
      connect: true,
      maxBackoffTime: 5000,
    });
    providerRef.current = provider;
    const idb = typeof indexedDB !== "undefined" ? new IndexeddbPersistence(`wb-${roomId}`, doc) : null;

    // If the socket server is unreachable we still sync across tabs via BroadcastChannel.
    const fallback = window.setTimeout(() => {
      if (!provider.wsconnected) setStatus("local");
    }, 2500);
    const onStatus = ({ status: s }: { status: string }) => {
      if (s === "connected") setStatus("server");
      else if (s === "disconnected") setStatus("local");
    };
    provider.on("status", onStatus);

    const aw = provider.awareness;
    const onAwareness = () => {
      const list: Peer[] = [];
      aw.getStates().forEach((state, clientId) => {
        if (clientId === aw.clientID || !state.user) return;
        list.push({ clientId, user: state.user, cursor: state.cursor, selection: state.selection });
      });
      setPeers(list);
    };
    aw.on("change", onAwareness);

    const onUnload = () => aw.setLocalState(null);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener("beforeunload", onUnload);
      aw.off("change", onAwareness);
      provider.off("status", onStatus);
      aw.setLocalState(null);
      provider.destroy();
      idb?.destroy();
      providerRef.current = null;
    };
  }, [doc, roomId]);

  useEffect(() => {
    providerRef.current?.awareness.setLocalStateField("user", user);
  }, [user, status]);

  useEffect(() => {
    const update = () => setUndoState({ canUndo: undo.canUndo(), canRedo: undo.canRedo() });
    undo.on("stack-item-added", update);
    undo.on("stack-item-popped", update);
    undo.on("stack-cleared", update);
    return () => {
      undo.off("stack-item-added", update);
      undo.off("stack-item-popped", update);
      undo.off("stack-cleared", update);
    };
  }, [undo]);

  useEffect(() => () => doc.destroy(), [doc]);

  const transact = useCallback((fn: () => void) => doc.transact(fn, LOCAL), [doc]);

  const api = useMemo(
    () => ({
      upsert(els: BoardElement | BoardElement[]) {
        const list = Array.isArray(els) ? els : [els];
        transact(() => list.forEach((e) => map.set(e.id, e)));
      },
      patch(id: string, changes: Partial<BoardElement>) {
        const cur = map.get(id);
        if (cur) transact(() => map.set(id, { ...cur, ...changes }));
      },
      patchMany(changes: { id: string; changes: Partial<BoardElement> }[]) {
        transact(() =>
          changes.forEach(({ id, changes: c }) => {
            const cur = map.get(id);
            if (cur) map.set(id, { ...cur, ...c });
          }),
        );
      },
      remove(ids: string[]) {
        transact(() => ids.forEach((id) => map.delete(id)));
      },
      replace(upserts: BoardElement[], removeIds: string[]) {
        transact(() => {
          removeIds.forEach((id) => map.delete(id));
          upserts.forEach((e) => map.set(e.id, e));
        });
      },
      clear() {
        transact(() => Array.from(map.keys()).forEach((k) => map.delete(k)));
      },
      get: (id: string) => map.get(id),
      all: () => Array.from(map.values()),
      undo: () => undo.undo(),
      redo: () => undo.redo(),
      /** Start a new undo step (call at the beginning of each gesture). */
      checkpoint: () => undo.stopCapturing(),
      setCursor(p: Point | null) {
        providerRef.current?.awareness.setLocalStateField("cursor", p);
      },
      setSelection(ids: string[]) {
        providerRef.current?.awareness.setLocalStateField("selection", ids);
      },
    }),
    [map, transact, undo],
  );

  return { elements, peers, status, ...undoState, ...api };
}

export type BoardApi = ReturnType<typeof useYBoard>;
