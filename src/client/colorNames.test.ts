import { test, expect } from "bun:test";
import { nearestColorName } from "./colorNames";

test("finds the nearest named color for an exact match", () => {
  expect(nearestColorName("#FF0000")).toBe("Red");
});

test("returns the same result on repeated lookups (cache hit)", () => {
  const first = nearestColorName("#123456");
  const second = nearestColorName("#123456");
  expect(second).toBe(first);
});
