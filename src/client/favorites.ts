const STORAGE_KEY = "filecolors:favorites";

export interface FavoriteRecord {
  hex: string;
  name: string;
}

export interface FavoritesStore {
  load(): Promise<Map<string, string>>;
  save(favorites: Map<string, string>): Promise<void>;
}

function toRecords(favorites: Map<string, string>): FavoriteRecord[] {
  return [...favorites.entries()].map(([hex, name]) => ({ hex, name }));
}

function toMap(records: unknown): Map<string, string> {
  if (!Array.isArray(records)) return new Map();
  const map = new Map<string, string>();
  for (const r of records) {
    if (r && typeof r === "object" && typeof (r as FavoriteRecord).hex === "string") {
      const hex = (r as FavoriteRecord).hex;
      const name = typeof (r as FavoriteRecord).name === "string" ? (r as FavoriteRecord).name : hex;
      map.set(hex, name);
    } else if (typeof r === "string") {
      // Backwards compatibility with the old hex-only format.
      map.set(r, r);
    }
  }
  return map;
}

class LocalStorageFavorites implements FavoritesStore {
  async load(): Promise<Map<string, string>> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr: unknown = raw ? JSON.parse(raw) : [];
      return toMap(arr);
    } catch {
      return new Map();
    }
  }

  async save(favorites: Map<string, string>): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toRecords(favorites)));
  }
}

class ServerFavorites implements FavoritesStore {
  async load(): Promise<Map<string, string>> {
    const res = await fetch("/api/favorites");
    if (!res.ok) return new Map();
    const arr: unknown = await res.json();
    return toMap(arr);
  }

  async save(favorites: Map<string, string>): Promise<void> {
    await fetch("/api/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toRecords(favorites)),
    });
  }
}

export function createFavoritesStore(localDevMode: boolean): FavoritesStore {
  return localDevMode ? new ServerFavorites() : new LocalStorageFavorites();
}
