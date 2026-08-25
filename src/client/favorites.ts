const STORAGE_KEY = "filecolors:favorites";

export interface FavoritesStore {
  load(): Promise<Set<string>>;
  toggle(hex: string, favorited: boolean): Promise<void>;
}

class LocalStorageFavorites implements FavoritesStore {
  async load(): Promise<Set<string>> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch {
      return new Set();
    }
  }

  async toggle(hex: string, favorited: boolean): Promise<void> {
    const current = await this.load();
    if (favorited) current.add(hex);
    else current.delete(hex);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  }
}

class ServerFavorites implements FavoritesStore {
  async load(): Promise<Set<string>> {
    const res = await fetch("/api/favorites");
    if (!res.ok) return new Set();
    const arr = (await res.json()) as string[];
    return new Set(arr);
  }

  async toggle(hex: string, favorited: boolean): Promise<void> {
    const current = await this.load();
    if (favorited) current.add(hex);
    else current.delete(hex);
    await fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([...current]),
    });
  }
}

export function createFavoritesStore(localDevMode: boolean): FavoritesStore {
  return localDevMode ? new ServerFavorites() : new LocalStorageFavorites();
}
