// Color scheme generation, tints/shades/tones, contrast, and color-blindness
// simulation — the computations behind the per-color "Info" popup.

import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl } from "./colorUtils";

function normHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function atHue(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(normHue(h), s, l);
  return rgbToHex(r, g, b);
}

export interface ColorScheme {
  label: string;
  colors: string[];
}

/** Standard hue-wheel relationships (complementary, analogous, etc.) for a color. */
export function colorSchemes(hex: string): ColorScheme[] {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  return [
    { label: "Complementary", colors: [atHue(h + 180, s, l)] },
    { label: "Analogous", colors: [atHue(h - 30, s, l), atHue(h + 30, s, l)] },
    { label: "Triadic", colors: [atHue(h + 120, s, l), atHue(h + 240, s, l)] },
    { label: "Split-complementary", colors: [atHue(h + 150, s, l), atHue(h + 210, s, l)] },
    { label: "Tetradic", colors: [atHue(h + 60, s, l), atHue(h + 180, s, l), atHue(h + 240, s, l)] },
  ];
}

/** Small hue-neighborhood variations of a color. */
export function similarColors(hex: string, count = 6): string[] {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const spread = 20;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const offset = -spread + (2 * spread * i) / (count - 1);
    if (Math.abs(offset) < 0.001) continue;
    out.push(atHue(h + offset, s, l));
  }
  return out.slice(0, count);
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount,
  );
}

export interface TintShadeTone {
  tints: string[];
  shades: string[];
  tones: string[];
}

/** Mixes toward white (tints), black (shades), and mid-gray (tones). */
export function tintsShadesTones(hex: string, steps = 5): TintShadeTone {
  const amounts = Array.from({ length: steps }, (_, i) => (i + 1) / (steps + 1));
  return {
    tints: amounts.map((a) => mix(hex, [255, 255, 255], a)),
    shades: amounts.map((a) => mix(hex, [0, 0, 0], a)),
    tones: amounts.map((a) => mix(hex, [128, 128, 128], a)),
  };
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two colors, from 1 (none) to 21 (max). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whichever of black/white reads better against the given background. */
export function readableTextColor(bgHex: string): "#000000" | "#ffffff" {
  return contrastRatio(bgHex, "#000000") >= contrastRatio(bgHex, "#ffffff") ? "#000000" : "#ffffff";
}

export type ColorBlindnessType = "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

const CVD_MATRICES: Record<ColorBlindnessType, [number, number, number, number, number, number, number, number, number]> = {
  protanopia: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  deuteranopia: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  tritanopia: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
  achromatopsia: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
};

/** Approximates how a color appears under a given color-vision deficiency. */
export function simulateColorBlindness(hex: string, type: ColorBlindnessType): string {
  const [r, g, b] = hexToRgb(hex);
  const m = CVD_MATRICES[type];
  return rgbToHex(
    m[0] * r + m[1] * g + m[2] * b,
    m[3] * r + m[4] * g + m[5] * b,
    m[6] * r + m[7] * g + m[8] * b,
  );
}

export const COLOR_BLINDNESS_LABELS: Record<ColorBlindnessType, string> = {
  protanopia: "Protanopia (red-weak)",
  deuteranopia: "Deuteranopia (green-weak)",
  tritanopia: "Tritanopia (blue-weak)",
  achromatopsia: "Achromatopsia (no color)",
};
