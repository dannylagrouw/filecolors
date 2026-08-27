import { extractPalette, type PaletteEntry } from "./palette";
import { createFavoritesStore, type FavoritesStore } from "./favorites";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type SortMode = "original" | "hex-asc" | "hex-desc";
export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "filecolors-theme";

export interface ConfigDefaults {
  infoPreviewBg: string;
  infoPreviewFg: string;
  themeMode: ThemeMode;
}

export const DEFAULT_CONFIG: ConfigDefaults = {
  infoPreviewBg: "#ffffff",
  infoPreviewFg: "#000000",
  themeMode: "system",
};

export interface AppState {
  filename: string | null;
  fileText: string;
  entries: PaletteEntry[];
  favorites: Map<string, string>;
  localDevMode: boolean;
  favoritesStore: FavoritesStore;
  uploadError: string | null;
  sortMode: SortMode;
  themeMode: ThemeMode;
  hoveredEntryId: string | null;
  selectedEntryId: string | null;
  infoOpenId: string | null;
  infoPreviewBg: string;
  infoPreviewFg: string;
  defaultInfoPreviewBg: string;
  defaultInfoPreviewFg: string;
  favoritesOpen: boolean;
}

export function createInitialState(
  localDevMode: boolean,
  configDefaults: Partial<ConfigDefaults> = {},
): AppState {
  const infoPreviewBg = configDefaults.infoPreviewBg ?? DEFAULT_CONFIG.infoPreviewBg;
  const infoPreviewFg = configDefaults.infoPreviewFg ?? DEFAULT_CONFIG.infoPreviewFg;
  return {
    filename: null,
    fileText: "",
    entries: [],
    favorites: new Map(),
    localDevMode,
    favoritesStore: createFavoritesStore(localDevMode),
    uploadError: null,
    sortMode: "original",
    themeMode: loadThemeMode(configDefaults.themeMode ?? DEFAULT_CONFIG.themeMode),
    hoveredEntryId: null,
    selectedEntryId: null,
    infoOpenId: null,
    infoPreviewBg,
    infoPreviewFg,
    defaultInfoPreviewBg: infoPreviewBg,
    defaultInfoPreviewFg: infoPreviewFg,
    favoritesOpen: false,
  };
}

/** Adds or renames a favorite and persists the change. */
export async function setFavorite(state: AppState, hex: string, name: string): Promise<void> {
  state.favorites.set(hex.toLowerCase(), name);
  await state.favoritesStore.save(state.favorites);
}

/** Removes a favorite and persists the change. */
export async function removeFavorite(state: AppState, hex: string): Promise<void> {
  state.favorites.delete(hex.toLowerCase());
  await state.favoritesStore.save(state.favorites);
}

export function loadThemeMode(fallback: ThemeMode = "system"): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable; fall back to default
  }
  return fallback;
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore persistence failures
  }
}

/** Returns entries in the order they should be displayed for the given sort mode. */
export function sortedEntries(state: AppState): PaletteEntry[] {
  if (state.sortMode === "original") return state.entries;
  const sorted = [...state.entries].sort((a, b) => a.hex.localeCompare(b.hex));
  if (state.sortMode === "hex-desc") sorted.reverse();
  return sorted;
}

export function loadFile(state: AppState, filename: string, text: string): void {
  state.filename = filename;
  state.fileText = text;
  state.entries = extractPalette(text);
  state.uploadError = null;
}

export function rescan(state: AppState): void {
  state.entries = extractPalette(state.fileText);
}
