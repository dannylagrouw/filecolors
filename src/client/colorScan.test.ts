import { test, expect } from "bun:test";
import { scanHexColors } from "./colorScan";
import { extractPalette } from "./palette";
import { applyColorEdit } from "./sync";

test("detects 6-digit and 3-digit hex codes", () => {
  const matches = scanHexColors("color: #AB03F9; other: #fff;");
  expect(matches.map((m) => m.hex)).toEqual(["#AB03F9", "#fff"]);
});

test("ignores hex-like substrings that are not standalone codes", () => {
  const matches = scanHexColors("#abcdef12 and id#abc123");
  expect(matches).toEqual([]);
});

test("dedupes palette by hex value, preserving first-appearance order", () => {
  const text = "#FF0000 #00FF00 #FF0000 #FF0000";
  const palette = extractPalette(text);
  expect(palette.map((p) => p.hex)).toEqual(["#FF0000", "#00FF00"]);
  expect(palette[0]!.occurrences.length).toBe(3);
  expect(palette[1]!.occurrences.length).toBe(1);
});

test("empty palette when no colors found", () => {
  expect(extractPalette("no colors here")).toEqual([]);
});

test("editing one color does not affect other colors' occurrences", () => {
  const text = "a:#111111; b:#333333; c:#111111;";
  const palette = extractPalette(text);
  const target = palette.find((p) => p.hex === "#111111")!;
  const result = applyColorEdit(text, palette, target.id, "#222222");
  expect(result.text).toBe("a:#222222; b:#333333; c:#222222;");
  const other = result.entries.find((e) => e.hex === "#333333")!;
  expect(text.slice(other.occurrences[0]!.start, other.occurrences[0]!.end)).not.toBe(undefined);
  expect(result.text.slice(other.occurrences[0]!.start, other.occurrences[0]!.end)).toBe("#333333");
});
