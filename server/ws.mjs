#!/usr/bin/env node
// Tiny self-hosted realtime server for Collab Board.
// Speaks the standard y-websocket protocol (sync + awareness) using Yjs 13 + y-protocols,
// keeps one in-memory Y.Doc per room and relays updates + presence between clients.
import http from "node:http";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const host = process.env.WS_HOST || "0.0.0.0";
const port = Number(process.env.WS_PORT || 1234);
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const ROOM_RE = /^\/wb-[a-z0-9-]{3,48}$/i;
const EMPTY_ROOM_TTL = 1000 * 60 * 30; // drop idle rooms from memory after 30 min

/** @type {Map<string, Room>} */
const rooms = new Map();

class Room {
  constructor(name) {
    this.name = name;
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);
    this.awareness.setLocalState(null);
    /** @type {Map<import("ws").WebSocket, Set<number>>} */
    this.conns = new Map();
    this.timer = null;

    this.doc.on("update", (update, origin) => {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_SYNC);
      syncProtocol.writeUpdate(enc, update);
      const msg = encoding.toUint8Array(enc);
      this.conns.forEach((_, conn) => conn !== origin && send(this, conn, msg));
    });

    this.awareness.on("update", ({ added, updated, removed }, origin) => {
      const changed = added.concat(updated, removed);
      const ids = this.conns.get(origin);
      if (ids) {
        added.forEach((id) => ids.add(id));
        removed.forEach((id) => ids.delete(id));
      }
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MSG_AWARENESS);
      encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed));
      const msg = encoding.toUint8Array(enc);
      this.conns.forEach((_, conn) => send(this, conn, msg));
    });
  }
}

function getRoom(name) {
  let room = rooms.get(name);
  if (!room) {
    room = new Room(name);
    rooms.set(name, room);
  }
  clearTimeout(room.timer);
  return room;
}

function send(room, conn, msg) {
  if (conn.readyState !== conn.OPEN) return close(room, conn);
  conn.send(msg, (err) => err && close(room, conn));
}

function close(room, conn) {
  const ids = room.conns.get(conn);
  if (!ids) return;
  room.conns.delete(conn);
  awarenessProtocol.removeAwarenessStates(room.awareness, [...ids], null);
  if (room.conns.size === 0) {
    room.timer = setTimeout(() => {
      if (room.conns.size === 0) {
        room.doc.destroy();
        rooms.delete(room.name);
      }
    }, EMPTY_ROOM_TTL);
  }
  try {
    conn.close();
  } catch {
    /* already closed */
  }
}

function onConnection(conn, req) {
  conn.binaryType = "arraybuffer";
  const room = getRoom(req.url.split("?")[0].slice(1));
  room.conns.set(conn, new Set());

  conn.on("message", (data) => {
    try {
      const dec = decoding.createDecoder(new Uint8Array(data));
      const enc = encoding.createEncoder();
      const type = decoding.readVarUint(dec);
      if (type === MSG_SYNC) {
        encoding.writeVarUint(enc, MSG_SYNC);
        syncProtocol.readSyncMessage(dec, enc, room.doc, conn);
        if (encoding.length(enc) > 1) send(room, conn, encoding.toUint8Array(enc));
      } else if (type === MSG_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(dec), conn);
      }
    } catch (err) {
      console.error("bad message", err);
    }
  });

  // keep-alive so dead connections get cleaned up
  let alive = true;
  conn.on("pong", () => (alive = true));
  const ping = setInterval(() => {
    if (!alive) {
      clearInterval(ping);
      return close(room, conn);
    }
    alive = false;
    try {
      conn.ping();
    } catch {
      clearInterval(ping);
      close(room, conn);
    }
  }, 30_000);
  conn.on("close", () => {
    clearInterval(ping);
    close(room, conn);
  });

  // sync step 1 + current presence
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, MSG_SYNC);
  syncProtocol.writeSyncStep1(enc, room.doc);
  send(room, conn, encoding.toUint8Array(enc));
  const states = room.awareness.getStates();
  if (states.size) {
    const aw = encoding.createEncoder();
    encoding.writeVarUint(aw, MSG_AWARENESS);
    encoding.writeVarUint8Array(aw, awarenessProtocol.encodeAwarenessUpdate(room.awareness, [...states.keys()]));
    send(room, conn, encoding.toUint8Array(aw));
  }
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });
wss.on("connection", onConnection);
server.on("upgrade", (req, socket, head) => {
  if (!ROOM_RE.test((req.url || "").split("?")[0])) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});
server.listen(port, host, () => console.log(`Collab Board realtime server on ws://${host}:${port}`));
