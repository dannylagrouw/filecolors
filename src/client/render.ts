import { saveThemeMode, sortedEntries, type AppState, type SortMode, type ThemeMode } from "./state";
import type { PaletteEntry } from "./palette";
import { expandHex, generateShades } from "./colorUtils";
import { copyText } from "./clipboard";
import { downloadFile } from "./download";
import { applyColorEdit } from "./sync";

export interface RenderHandlers {
  onFileSelected: (file: File) => void;
  onSaveToDisk: () => void;
}

let renderScheduled = false;
let currentState: AppState | null = null;
let handlers: RenderHandlers | null = null;

export function scheduleRender(state: AppState, h: RenderHandlers): void {
  currentState = state;
  handlers = h;
  if (renderScheduled) return;
  renderScheduled = true;
  queueMicrotask(() => {
    renderScheduled = false;
    if (currentState && handlers) renderAll(currentState, handlers);
  });
}

function renderAll(state: AppState, h: RenderHandlers): void {
  applyTheme(state.themeMode);
  renderHeader(state, h);
  renderPalette(state);
  renderFileView(state);
}

function applyTheme(mode: ThemeMode): void {
  if (mode === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
}

function setHighlight(entryId: string | null): void {
  document.querySelectorAll(".highlighted").forEach((el) => el.classList.remove("highlighted"));
  if (!entryId) return;
  document.querySelectorAll(`[data-entry-id="${entryId}"]`).forEach((el) => el.classList.add("highlighted"));
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderHeader(state: AppState, h: RenderHandlers): void {
  const el = document.getElementById("header-section");
  if (!el) return;

  const sortLabels: Record<SortMode, string> = {
    original: "Sort: Original order",
    "hex-asc": "Sort: Hex ↑",
    "hex-desc": "Sort: Hex ↓",
  };
  const themeLabels: Record<ThemeMode, string> = {
    light: "Theme: Light",
    dark: "Theme: Dark",
    system: "Theme: System",
  };

  el.innerHTML = `
    <h1>filecolors</h1>
    <div class="upload-row">
      <label class="file-picker">
        Choose file
        <input type="file" id="file-input" />
      </label>
      <div id="dropzone" class="dropzone">Drop a text file here</div>
      ${state.filename ? `<span class="filename">${esc(state.filename)}</span>` : ""}
      <button id="download-btn" ${state.filename ? "" : "disabled"}>Download</button>
      ${
        state.localDevMode
          ? `<button id="save-disk-btn" ${state.filename ? "" : "disabled"}>Save to disk</button>`
          : ""
      }
      <button id="sort-toggle-btn">${sortLabels[state.sortMode]}</button>
      <button id="theme-toggle-btn">${themeLabels[state.themeMode]}</button>
    </div>
    ${state.uploadError ? `<div class="error">${esc(state.uploadError)}</div>` : ""}
  `;

  const fileInput = document.getElementById("file-input") as HTMLInputElement | null;
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) h.onFileSelected(file);
  });

  const dropzone = document.getElementById("dropzone");
  dropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
  dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
  dropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    const file = e.dataTransfer?.files?.[0];
    if (file) h.onFileSelected(file);
  });

  document.getElementById("download-btn")?.addEventListener("click", () => {
    if (!state.filename) return;
    downloadFile(state.filename, state.fileText);
  });

  document.getElementById("save-disk-btn")?.addEventListener("click", () => {
    h.onSaveToDisk();
  });

  document.getElementById("sort-toggle-btn")?.addEventListener("click", () => {
    const next: Record<SortMode, SortMode> = {
      original: "hex-asc",
      "hex-asc": "hex-desc",
      "hex-desc": "original",
    };
    state.sortMode = next[state.sortMode];
    rerender();
  });

  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    const next: Record<ThemeMode, ThemeMode> = {
      light: "dark",
      dark: "system",
      system: "light",
    };
    state.themeMode = next[state.themeMode];
    saveThemeMode(state.themeMode);
    rerender();
  });
}

function renderPalette(state: AppState): void {
  const el = document.getElementById("palette-section");
  if (!el) return;

  if (state.entries.length === 0) {
    el.innerHTML = `<div class="empty-palette">No colors found</div>`;
    return;
  }

  const displayEntries = sortedEntries(state);
  const canReorder = state.sortMode === "original";

  el.innerHTML = `<div class="palette-bar">${displayEntries
    .map((entry, i) => renderBar(entry, i, displayEntries.length, canReorder, state))
    .join("")}</div>`;

  displayEntries.forEach((entry) => {
    const bar = el.querySelector<HTMLElement>(`.color-bar[data-entry-id="${entry.id}"]`);
    if (!bar) return;

    bar.addEventListener("mouseenter", () => setHighlight(entry.id));
    bar.addEventListener("mouseleave", () => setHighlight(null));

    bar.querySelector(".move-left")?.addEventListener("click", () => {
      moveEntry(state, entry.id, -1);
    });
    bar.querySelector(".move-right")?.addEventListener("click", () => {
      moveEntry(state, entry.id, 1);
    });
    bar.querySelector(".revert-color")?.addEventListener("click", () => {
      applyEdit(state, entry.id, entry.originalHex);
    });
    bar.querySelector(".favorite-toggle")?.addEventListener("click", async () => {
      const isFav = state.favorites.has(entry.hex.toLowerCase());
      if (isFav) state.favorites.delete(entry.hex.toLowerCase());
      else state.favorites.add(entry.hex.toLowerCase());
      await state.favoritesStore.toggle(entry.hex.toLowerCase(), !isFav);
      rerender();
    });
    bar.querySelector(".copy-hex")?.addEventListener("click", async () => {
      const ok = await copyText(entry.hex);
      const confirmEl = bar.querySelector(".copy-confirm");
      if (confirmEl) {
        confirmEl.textContent = ok ? "Copied!" : "Copy failed";
        confirmEl.classList.add("show");
        setTimeout(() => confirmEl.classList.remove("show"), 1200);
      }
    });
    const colorInput = bar.querySelector<HTMLInputElement>(".color-picker");
    // Live preview while dragging inside the native picker: only touch this
    // bar's own styling directly, never re-render (a full re-render would
    // recreate the <input>, closing the browser's native picker popup mid-drag).
    colorInput?.addEventListener("input", () => {
      const hex = colorInput.value;
      bar.style.backgroundColor = hex;
      const label = bar.querySelector(".hex-label");
      if (label) label.textContent = hex;
    });
    // Commit the edit once the picker is closed/confirmed.
    colorInput?.addEventListener("change", () => {
      applyEdit(state, entry.id, colorInput.value);
    });
    bar.querySelector(".shades-toggle")?.addEventListener("click", () => {
      state.expandedShadesId = state.expandedShadesId === entry.id ? null : entry.id;
      rerender();
    });
    bar.querySelectorAll<HTMLElement>(".shade-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        const hex = swatch.dataset.hex;
        if (hex) applyEdit(state, entry.id, hex);
      });
    });
  });
}

function renderBar(
  entry: PaletteEntry,
  index: number,
  total: number,
  canReorder: boolean,
  state: AppState,
): string {
  const hex = expandHex(entry.hex);
  const isFav = state.favorites.has(entry.hex.toLowerCase());
  const showShades = state.expandedShadesId === entry.id;
  const shades = showShades ? generateShades(entry.hex) : [];
  const isEdited = entry.hex.toLowerCase() !== entry.originalHex.toLowerCase();

  return `
    <div class="color-bar" data-entry-id="${entry.id}" style="background-color: ${hex}">
      <div class="color-bar-controls">
        <button class="move-left" title="Move left" ${!canReorder || index === 0 ? "disabled" : ""}>&larr;</button>
        <button class="revert-color" title="Revert to original color" ${isEdited ? "" : "disabled"}>&#8634;</button>
        <button class="favorite-toggle ${isFav ? "active" : ""}" title="Favorite">${isFav ? "★" : "☆"}</button>
        <button class="move-right" title="Move right" ${!canReorder || index === total - 1 ? "disabled" : ""}>&rarr;</button>
      </div>
      <div class="color-bar-body">
        <input type="color" class="color-picker" value="${hex}" />
        <span class="hex-label">${esc(entry.hex)}</span>
        <button class="copy-hex">Copy</button>
        <span class="copy-confirm"></span>
        <button class="shades-toggle">${showShades ? "Hide shades" : "Shades"}</button>
      </div>
      ${
        showShades
          ? `<div class="shades-row">${shades
              .map((s) => `<div class="shade-swatch" data-hex="${s}" style="background-color:${s}" title="${s}"></div>`)
              .join("")}</div>`
          : ""
      }
    </div>
  `;
}

function renderFileView(state: AppState): void {
  const el = document.getElementById("file-section");
  if (!el) return;

  if (!state.fileText) {
    el.innerHTML = `<div class="empty-file">No file loaded</div>`;
    return;
  }

  const sorted = [...state.entries]
    .flatMap((entry) => entry.occurrences.map((occ) => ({ ...occ, hex: expandHex(entry.hex), entryId: entry.id })))
    .sort((a, b) => a.start - b.start);

  let out = "";
  let cursor = 0;
  for (const occ of sorted) {
    out += esc(state.fileText.slice(cursor, occ.start));
    out += `<span class="occurrence" data-entry-id="${occ.entryId}"><span class="inline-swatch" style="background-color:${occ.hex}"></span>${esc(
      state.fileText.slice(occ.start, occ.end),
    )}</span>`;
    cursor = occ.end;
  }
  out += esc(state.fileText.slice(cursor));

  el.innerHTML = `<pre class="file-content">${out}</pre>`;

  el.querySelectorAll<HTMLElement>(".occurrence").forEach((span) => {
    const entryId = span.dataset.entryId;
    if (!entryId) return;
    span.addEventListener("mouseenter", () => setHighlight(entryId));
    span.addEventListener("mouseleave", () => setHighlight(null));
  });
}

function moveEntry(state: AppState, entryId: string, delta: number): void {
  const idx = state.entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return;
  const target = idx + delta;
  if (target < 0 || target >= state.entries.length) return;
  const entries = [...state.entries];
  const tmp = entries[idx]!;
  entries[idx] = entries[target]!;
  entries[target] = tmp;
  state.entries = entries;
  rerender();
}

function applyEdit(state: AppState, entryId: string, newHex: string): void {
  const result = applyColorEdit(state.fileText, state.entries, entryId, newHex);
  state.fileText = result.text;
  state.entries = result.entries;
  rerender();
}

function rerender(): void {
  if (currentState && handlers) scheduleRender(currentState, handlers);
}
