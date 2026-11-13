import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rateLimit";

// Each test uses its own key so state from one test can't leak into another.
describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const t = 1_000_000;
    expect(checkRateLimit("a", 3, 60_000, t).allowed).toBe(true);
    expect(checkRateLimit("a", 3, 60_000, t).allowed).toBe(true);
    const third = checkRateLimit("a", 3, 60_000, t);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("blocks the request after the limit and reports how long to wait", () => {
    const t = 2_000_000;
    for (let i = 0; i < 3; i++) checkRateLimit("b", 3, 60_000, t);
    const blocked = checkRateLimit("b", 3, 60_000, t + 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(50);
  });

  it("allows requests again once the window has ended", () => {
    const t = 3_000_000;
    for (let i = 0; i < 3; i++) checkRateLimit("c", 3, 60_000, t);
    expect(checkRateLimit("c", 3, 60_000, t + 59_999).allowed).toBe(false);
    expect(checkRateLimit("c", 3, 60_000, t + 60_000).allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    const t = 4_000_000;
    for (let i = 0; i < 3; i++) checkRateLimit("d1", 3, 60_000, t);
    expect(checkRateLimit("d1", 3, 60_000, t).allowed).toBe(false);
    expect(checkRateLimit("d2", 3, 60_000, t).allowed).toBe(true);
  });
});