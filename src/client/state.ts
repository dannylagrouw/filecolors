import { extractPalette, type PaletteEntry } from "./palette";
import { createFavoritesStore, type FavoritesStore } from "./favorites";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface AppState {
  filename: string | null;
  fileText: string;
  entries: PaletteEntry[];
  favorites: Set<string>;
  localDevMode: boolean;
  favoritesStore: FavoritesStore;
  uploadError: string | null;
  expandedShadesId: string | null;
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
    expandedShadesId: null,
  };
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
