import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { mkdir } from "node:fs/promises";

export interface FavoriteRecord {
  hex: string;
  name: string;
}

export function resolveFavoritesPath(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME?.trim();
  const base = xdgStateHome && xdgStateHome.length > 0 ? xdgStateHome : join(homedir(), ".local", "state");
  return join(base, "filecolors", "favorites.json");
}

function normalize(data: unknown): FavoriteRecord[] {
  if (!Array.isArray(data)) return [];
  const out: FavoriteRecord[] = [];
  for (const r of data) {
    if (r && typeof r === "object" && typeof (r as FavoriteRecord).hex === "string") {
      const hex = (r as FavoriteRecord).hex;
      const name = typeof (r as FavoriteRecord).name === "string" ? (r as FavoriteRecord).name : hex;
      out.push({ hex, name });
    } else if (typeof r === "string") {
      // Backwards compatibility with the old hex-only format.
      out.push({ hex: r, name: r });
    }
  }
  return out;
}

export async function readFavorites(): Promise<FavoriteRecord[]> {
  const path = resolveFavoritesPath();
  const file = Bun.file(path);
  if (!(await file.exists())) return [];
  try {
    const data = await file.json();
    return normalize(data);
  } catch {
    return [];
  }
}

export async function writeFavorites(favorites: FavoriteRecord[]): Promise<void> {
  const path = resolveFavoritesPath();
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, JSON.stringify(normalize(favorites), null, 2));
}
