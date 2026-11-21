import { customAlphabet } from "nanoid";
import type { UserInfo } from "./types";

const roomAlphabet = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 10);

export function newRoomId() {
  return roomAlphabet();
}

export function isValidRoomId(id: string) {
  return /^[a-z0-9-]{3,48}$/i.test(id);
}

const ADJ = ["Neon", "Cosmic", "Swift", "Quantum", "Pixel", "Lunar", "Solar", "Vivid", "Turbo", "Echo"];
const ANIMAL = ["Otter", "Falcon", "Panda", "Lynx", "Koala", "Orca", "Fox", "Gecko", "Raven", "Tiger"];
export const CURSOR_COLORS = ["#22d3ee", "#a78bfa", "#f472b6", "#facc15", "#4ade80", "#fb923c", "#60a5fa"];

export function randomUser(rand: () => number = Math.random): UserInfo {
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
  return { name: `${pick(ADJ)} ${pick(ANIMAL)}`, color: pick(CURSOR_COLORS) };
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}
