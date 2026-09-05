import { describe, expect, it } from "vitest";

import { hideBottomNav, isMorePath } from "@/lib/app-nav";

describe("hideBottomNav", () => {
  it("hides on create, edit, and import so the save bar is free", () => {
    expect(hideBottomNav("/examples/new")).toBe(true);
    expect(hideBottomNav("/structures/abc/edit")).toBe(true);
    expect(hideBottomNav("/import")).toBe(true);
    expect(hideBottomNav("/import/run-1")).toBe(true);
  });

  it("shows on study routes", () => {
    expect(hideBottomNav("/")).toBe(false);
    expect(hideBottomNav("/today")).toBe(false);
    expect(hideBottomNav("/texts/abc")).toBe(false);
    expect(hideBottomNav("/examples")).toBe(false);
  });
});

describe("isMorePath", () => {
  it("marks archive routes as More", () => {
    expect(isMorePath("/structures")).toBe(true);
    expect(isMorePath("/examples/abc")).toBe(true);
    expect(isMorePath("/")).toBe(false);
    expect(isMorePath("/texts")).toBe(false);
  });
});
