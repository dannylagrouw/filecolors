import type { PaletteEntry, Occurrence } from "./palette";

export interface EditResult {
  text: string;
  entries: PaletteEntry[];
}

/**
 * Replaces every tracked occurrence of `entryId`'s current hex value with
 * `newHex` in `text`, and rewrites every entry's occurrence positions to
 * match the resulting text. Only tracked occurrences are touched (never a
 * naive substring replace), so editing one color can never affect another
 * entry's occurrences, even if their hex values happen to collide elsewhere
 * in untracked text.
 */
export function applyColorEdit(
  text: string,
  entries: PaletteEntry[],
  entryId: string,
  newHex: string,
): EditResult {
  const target = entries.find((e) => e.id === entryId);
  if (!target) return { text, entries };

  type Slot = { entry: PaletteEntry; occ: Occurrence };
  const slots: Slot[] = [];
  for (const entry of entries) {
    for (const occ of entry.occurrences) {
      slots.push({ entry, occ });
    }
  }
  slots.sort((a, b) => a.occ.start - b.occ.start);

  let out = "";
  let cursor = 0;
  const newOccurrences = new Map<string, Occurrence[]>();
  for (const entry of entries) newOccurrences.set(entry.id, []);

  for (const slot of slots) {
    out += text.slice(cursor, slot.occ.start);
    const replacement = slot.entry.id === entryId ? newHex : slot.entry.hex;
    const start = out.length;
    out += replacement;
    const end = out.length;
    newOccurrences.get(slot.entry.id)!.push({ start, end });
    cursor = slot.occ.end;
  }
  out += text.slice(cursor);

  const newEntries = entries.map((entry) => ({
    ...entry,
    hex: entry.id === entryId ? newHex : entry.hex,
    occurrences: newOccurrences.get(entry.id) ?? [],
  }));

  return { text: out, entries: newEntries };
}
