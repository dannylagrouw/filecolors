import index from "../../public/index.html";
import { readFavorites, writeFavorites } from "./favoritesStore";
import { readConfig, writeConfig, type Config } from "./config";
import { createRoutes } from "./routes";

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

const server = Bun.serve({
  port,
  routes: {
    "/": index,
    ...createRoutes({
      config,
      preloadedFile,
      readFavorites,
      writeFavorites,
      writeConfig,
    }),
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
