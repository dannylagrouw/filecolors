// Boundary-anchored hex color scanning (3-digit and 6-digit forms).
// Longest-match-first so a 6-digit code is never misread as a 3-digit prefix.
// `#` must not be glued to a preceding word character (so `id#abc123` doesn't
// match), and the digit run must not be glued to a following word character
// (so `#abcdef12` doesn't match as a 6-digit code followed by stray digits).

export interface ColorMatch {
  hex: string;
  start: number;
  end: number; // exclusive
}

const HEX_COLOR_RE = /(?<![0-9a-zA-Z_])#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

export function scanHexColors(text: string): ColorMatch[] {
  const matches: ColorMatch[] = [];
  HEX_COLOR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HEX_COLOR_RE.exec(text)) !== null) {
    matches.push({ hex: m[0], start: m.index, end: m.index + m[0].length });
  }
  return matches;
}
