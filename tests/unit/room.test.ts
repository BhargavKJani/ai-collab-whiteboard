import { describe, expect, it } from "vitest";
import { initials, isValidRoomId, newRoomId, randomUser } from "@/lib/board/room";

describe("rooms & users", () => {
  it("generates valid, unique room ids", () => {
    const ids = new Set(Array.from({ length: 200 }, newRoomId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(isValidRoomId(id)).toBe(true);
    expect(isValidRoomId("../etc")).toBe(false);
    expect(isValidRoomId("ab")).toBe(false);
  });

  it("creates friendly users with initials", () => {
    const u = randomUser(() => 0);
    expect(u).toEqual({ name: "Neon Otter", color: "#22d3ee" });
    expect(initials(u.name)).toBe("NO");
    expect(initials("")).toBe("?");
  });
});
