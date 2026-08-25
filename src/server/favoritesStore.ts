import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { mkdir } from "node:fs/promises";

export function resolveFavoritesPath(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME?.trim();
  const base = xdgStateHome && xdgStateHome.length > 0 ? xdgStateHome : join(homedir(), ".local", "state");
  return join(base, "filecolors", "favorites.json");
}

export async function readFavorites(): Promise<string[]> {
  const path = resolveFavoritesPath();
  const file = Bun.file(path);
  if (!(await file.exists())) return [];
  try {
    const data = await file.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function writeFavorites(favorites: string[]): Promise<void> {
  const path = resolveFavoritesPath();
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, JSON.stringify(favorites, null, 2));
}
