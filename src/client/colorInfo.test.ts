import { test, expect } from "bun:test";
import { colorSchemes, contrastRatio, readableTextColor, simulateColorBlindness, tintsShadesTones } from "./colorInfo";
import { nearestColorName } from "./colorNames";

test("complementary color is the hue-opposite", () => {
  const schemes = colorSchemes("#ff0000");
  const complementary = schemes.find((s) => s.label === "Complementary")!;
  expect(complementary.colors[0]).toBe("#00ffff");
});

test("tints move toward white, shades toward black", () => {
  const { tints, shades } = tintsShadesTones("#808080", 1);
  expect(tints[0]).toBe("#c0c0c0");
  expect(shades[0]).toBe("#404040");
});

test("contrast ratio of black vs white is maximal", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
});

test("readable text color picks white on a dark background", () => {
  expect(readableTextColor("#000000")).toBe("#ffffff");
  expect(readableTextColor("#ffffff")).toBe("#000000");
});

test("achromatopsia simulation desaturates to gray", () => {
  const result = simulateColorBlindness("#ff0000", "achromatopsia");
  expect(result).toBe("#4c4c4c");
});

test("nearest color name matches exact keyword colors", () => {
  expect(nearestColorName("#ff0000")).toBe("Red");
  expect(nearestColorName("#ffffff")).toBe("White");
});
