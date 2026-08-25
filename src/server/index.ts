import index from "../../public/index.html";
import { readFavorites, writeFavorites } from "./favoritesStore";

function resolvePort(): number {
  const argv = process.argv;
  const flagIndex = argv.findIndex((a) => a === "--port" || a === "-p");
  const fromFlag = flagIndex !== -1 ? argv[flagIndex + 1] : undefined;
  const fromEnv = process.env.PORT ?? process.env.FILECOLORS_PORT;
  const raw = fromFlag ?? fromEnv ?? "3000";
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`Invalid port: ${raw}`);
    process.exit(1);
  }
  return port;
}

const port = resolvePort();
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
        await writeFavorites(body as string[]);
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
