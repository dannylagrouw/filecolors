import index from "../../public/index.html";
import { readFavorites, writeFavorites } from "./favoritesStore";
import { readConfig, writeConfig, type Config } from "./config";

const DEFAULT_INFO_PREVIEW_BG = "#ffffff";
const DEFAULT_INFO_PREVIEW_FG = "#000000";
const DEFAULT_THEME_MODE = "system";

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const THEME_MODES = new Set(["light", "dark", "system"]);

function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

function resolvePort(config: Config): number {
  const argv = process.argv;
  const flagIndex = argv.findIndex((a) => a === "--port" || a === "-p");
  const fromFlag = flagIndex !== -1 ? argv[flagIndex + 1] : undefined;
  const fromEnv = process.env.PORT ?? process.env.FILECOLORS_PORT;
  const fromConfig = config.port !== undefined ? String(config.port) : undefined;
  const raw = fromFlag ?? fromEnv ?? fromConfig ?? "3000";
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`Invalid port: ${raw}`);
    process.exit(1);
  }
  return port;
}

const config = await readConfig();
const port = resolvePort(config);
const filePath = process.env.FILECOLORS_FILE;
let preloadedFile: { path: string; filename: string; content: string } | null = null;

if (filePath) {
  const file = Bun.file(filePath);
  const content = await file.text();
  preloadedFile = {
    path: filePath,
    filename: filePath.split("/").pop() ?? filePath,
    content,
  };
}

const isLocalDevMode = preloadedFile !== null;

const server = Bun.serve({
  port,
  routes: {
    "/": index,

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
      POST: async (req) => {
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
      PUT: async (req) => {
        if (!isLocalDevMode) return new Response("Not in local-dev mode", { status: 404 });
        const body = (await req.json()) as unknown;
        if (!Array.isArray(body)) return new Response("Expected an array", { status: 400 });
        for (const entry of body) {
          if (!entry || typeof entry !== "object" || !isValidHexColor((entry as { hex?: unknown }).hex)) {
            return new Response("Each favorite must have a valid hex color", { status: 400 });
          }
        }
        await writeFavorites(body as { hex: string; name: string }[]);
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
      PUT: async (req) => {
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
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`filecolors running at ${server.url}`);
if (preloadedFile) {
  console.log(`Preloaded file: ${preloadedFile.path}`);
}
