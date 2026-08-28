import type { FavoriteRecord } from "./favoritesStore";
import type { Config } from "./config";

const DEFAULT_INFO_PREVIEW_BG = "#ffffff";
const DEFAULT_INFO_PREVIEW_FG = "#000000";
const DEFAULT_THEME_MODE = "system";

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const THEME_MODES = new Set(["light", "dark", "system"]);

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export interface PreloadedFile {
  path: string;
  filename: string;
  content: string;
}

export interface CreateRoutesOptions {
  config: Config;
  preloadedFile: PreloadedFile | null;
  readFavorites: () => Promise<FavoriteRecord[]>;
  writeFavorites: (favorites: FavoriteRecord[]) => Promise<void>;
  writeConfig: (config: Config) => Promise<void>;
}

/** Route definitions shared between the real server and tests. */
export function createRoutes({ config, preloadedFile, readFavorites, writeFavorites, writeConfig }: CreateRoutesOptions) {
  const isLocalDevMode = preloadedFile !== null;

  return {
    "/api/health": {
      GET: () => Response.json({ status: "ok" }),
    },

    "/api/local-file": {
      GET: () => {
        if (!preloadedFile) return new Response("Not in local-dev mode", { status: 404 });
        return Response.json({ filename: preloadedFile.filename, content: preloadedFile.content });
      },
    },

    "/api/local-file/save": {
      POST: async (req: Request) => {
        if (!preloadedFile) return new Response("Not in local-dev mode", { status: 404 });
        const body = (await req.json()) as { content?: string };
        if (typeof body.content !== "string") {
          return new Response("Missing content", { status: 400 });
        }
        await Bun.write(preloadedFile.path, body.content);
        preloadedFile.content = body.content;
        return Response.json({ ok: true });
      },
    },

    "/api/favorites": {
      GET: async () => {
        if (!isLocalDevMode) return new Response("Not in local-dev mode", { status: 404 });
        return Response.json(await readFavorites());
      },
      PUT: async (req: Request) => {
        if (!isLocalDevMode) return new Response("Not in local-dev mode", { status: 404 });
        const body = (await req.json()) as unknown;
        if (!Array.isArray(body)) return new Response("Expected an array", { status: 400 });
        for (const entry of body) {
          if (!entry || typeof entry !== "object" || !isValidHexColor((entry as { hex?: unknown }).hex)) {
            return new Response("Each favorite must have a valid hex color", { status: 400 });
          }
        }
        await writeFavorites(body as FavoriteRecord[]);
        return Response.json({ ok: true });
      },
    },

    "/api/config": {
      GET: () =>
        Response.json({
          infoPreviewBg: config.infoPreviewBg ?? DEFAULT_INFO_PREVIEW_BG,
          infoPreviewFg: config.infoPreviewFg ?? DEFAULT_INFO_PREVIEW_FG,
          themeMode: config.themeMode ?? DEFAULT_THEME_MODE,
        }),
      PUT: async (req: Request) => {
        if (!isLocalDevMode) return new Response("Not in local-dev mode", { status: 404 });
        const body = (await req.json()) as Partial<Config>;
        if (body.infoPreviewBg !== undefined) {
          if (!isValidHexColor(body.infoPreviewBg)) return new Response("Invalid infoPreviewBg", { status: 400 });
          config.infoPreviewBg = body.infoPreviewBg;
        }
        if (body.infoPreviewFg !== undefined) {
          if (!isValidHexColor(body.infoPreviewFg)) return new Response("Invalid infoPreviewFg", { status: 400 });
          config.infoPreviewFg = body.infoPreviewFg;
        }
        if (body.themeMode !== undefined) {
          if (!THEME_MODES.has(body.themeMode)) return new Response("Invalid themeMode", { status: 400 });
          config.themeMode = body.themeMode;
        }
        await writeConfig(config);
        return Response.json({ ok: true });
      },
    },
  };
}
