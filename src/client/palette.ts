import { scanHexColors } from "./colorScan";
import { normalizeHexForCompare } from "./colorUtils";

export interface Occurrence {
  start: number;
  end: number;
}

export interface PaletteEntry {
  id: string;
  /** Original hex string as first found in the file (raw casing, e.g. "#FF0000"). */
  originalHex: string;
  /** Current hex value after any edits (raw casing as typed/picked). */
  hex: string;
  occurrences: Occurrence[];
}

let nextId = 1;
function makeId(): string {
  return `c${nextId++}`;
}

/** Extracts an ordered, de-duplicated palette from file text. */
export function extractPalette(text: string): PaletteEntry[] {
  const matches = scanHexColors(text);
  const byKey = new Map<string, PaletteEntry>();
  const order: PaletteEntry[] = [];

  for (const m of matches) {
    const key = normalizeHexForCompare(m.hex);
    let entry = byKey.get(key);
    if (!entry) {
      entry = { id: makeId(), originalHex: m.hex, hex: m.hex, occurrences: [] };
      byKey.set(key, entry);
      order.push(entry);
    }
    entry.occurrences.push({ start: m.start, end: m.end });
  }

  return order;
}
