import { createInitialState, loadFile, MAX_FILE_SIZE_BYTES, type AppState, type ConfigDefaults } from "./state";
import { scheduleRender, type RenderHandlers } from "./render";

async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}

async function detectLocalDevMode(): Promise<{ localDevMode: boolean; filename?: string; content?: string }> {
  try {
    const res = await fetch("/api/local-file");
    if (res.ok) {
      const data = (await res.json()) as { filename: string; content: string };
      return { localDevMode: true, filename: data.filename, content: data.content };
    }
  } catch {
    // network error treated as hosted mode
  }
  return { localDevMode: false };
}

async function fetchConfigDefaults(): Promise<Partial<ConfigDefaults>> {
  try {
    const res = await fetch("/api/config");
    if (res.ok) return (await res.json()) as Partial<ConfigDefaults>;
  } catch {
    // network error; fall back to built-in defaults
  }
  return {};
}

async function bootstrap(): Promise<void> {
  const [preload, configDefaults] = await Promise.all([detectLocalDevMode(), fetchConfigDefaults()]);
  const state = createInitialState(preload.localDevMode, configDefaults);
  state.favorites = await state.favoritesStore.load();

  const handlers: RenderHandlers = {
    onFileSelected: (file) => handleFileSelected(state, handlers, file),
    onSaveToDisk: () => handleSaveToDisk(state),
  };

  if (preload.localDevMode && preload.filename !== undefined && preload.content !== undefined) {
    loadFile(state, preload.filename, preload.content);
  }

  scheduleRender(state, handlers);
}

function handleFileSelected(state: AppState, handlers: RenderHandlers, file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    state.uploadError = `File too large (max ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB)`;
    scheduleRender(state, handlers);
    return;
  }
  readFileAsText(file)
    .then((text) => {
      loadFile(state, file.name, text);
      scheduleRender(state, handlers);
    })
    .catch(() => {
      state.uploadError = "Could not read that file";
      scheduleRender(state, handlers);
    });
}

async function handleSaveToDisk(state: AppState): Promise<void> {
  await fetch("/api/local-file/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: state.fileText }),
  });
}

bootstrap();
