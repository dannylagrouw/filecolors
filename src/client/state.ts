import { extractPalette, type PaletteEntry } from "./palette";
import { createFavoritesStore, type FavoritesStore } from "./favorites";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type SortMode = "original" | "hex-asc" | "hex-desc";
export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "filecolors-theme";

export interface AppState {
  filename: string | null;
  fileText: string;
  entries: PaletteEntry[];
  favorites: Set<string>;
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
}

export function createInitialState(localDevMode: boolean): AppState {
  return {
    filename: null,
    fileText: "",
    entries: [],
    favorites: new Set(),
    localDevMode,
    favoritesStore: createFavoritesStore(localDevMode),
    uploadError: null,
    sortMode: "original",
    themeMode: loadThemeMode(),
    hoveredEntryId: null,
    selectedEntryId: null,
    infoOpenId: null,
    infoPreviewBg: "#ffffff",
    infoPreviewFg: "#000000",
  };
}

export function loadThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable; fall back to system
  }
  return "system";
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
