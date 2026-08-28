import { test, expect, beforeEach, afterEach } from "bun:test";
import { createRoutes, type PreloadedFile } from "./routes";
import type { Config } from "./config";
import type { FavoriteRecord } from "./favoritesStore";

let server: ReturnType<typeof Bun.serve>;
let config: Config;
let writtenConfig: Config[];
let favorites: FavoriteRecord[];

function start(preloadedFile: PreloadedFile | null) {
  server = Bun.serve({
    port: 0,
    routes: createRoutes({
      config,
      preloadedFile,
      readFavorites: async () => favorites,
      writeFavorites: async (f) => {
        favorites = f;
      },
      writeConfig: async (c) => {
        writtenConfig.push({ ...c });
      },
    }),
  });
}

beforeEach(() => {
  config = {};
  writtenConfig = [];
  favorites = [];
});

afterEach(() => {
  server?.stop(true);
});

test("PUT /api/config is rejected outside local-dev mode", async () => {
  start(null);
  const res = await fetch(new URL("/api/config", server.url), {
    method: "PUT",
    body: JSON.stringify({ themeMode: "dark" }),
  });
  expect(res.status).toBe(404);
  expect(writtenConfig).toEqual([]);
});

test("PUT /api/config rejects an invalid infoPreviewBg", async () => {
  start({ path: "/tmp/x", filename: "x", content: "" });
  const res = await fetch(new URL("/api/config", server.url), {
    method: "PUT",
    body: JSON.stringify({ infoPreviewBg: "not-a-color" }),
  });
  expect(res.status).toBe(400);
  expect(writtenConfig).toEqual([]);
});

test("PUT /api/config rejects an invalid themeMode", async () => {
  start({ path: "/tmp/x", filename: "x", content: "" });
  const res = await fetch(new URL("/api/config", server.url), {
    method: "PUT",
    body: JSON.stringify({ themeMode: "bogus" }),
  });
  expect(res.status).toBe(400);
  expect(writtenConfig).toEqual([]);
});

test("PUT /api/config persists valid values in local-dev mode", async () => {
  start({ path: "/tmp/x", filename: "x", content: "" });
  const res = await fetch(new URL("/api/config", server.url), {
    method: "PUT",
    body: JSON.stringify({ themeMode: "dark", infoPreviewBg: "#123456" }),
  });
  expect(res.status).toBe(200);
  expect(writtenConfig).toEqual([{ themeMode: "dark", infoPreviewBg: "#123456" }]);

  const getRes = await fetch(new URL("/api/config", server.url));
  expect(await getRes.json()).toEqual({
    themeMode: "dark",
    infoPreviewBg: "#123456",
    infoPreviewFg: "#000000",
  });
});

test("PUT /api/favorites rejects an entry with an invalid hex color", async () => {
  start({ path: "/tmp/x", filename: "x", content: "" });
  const res = await fetch(new URL("/api/favorites", server.url), {
    method: "PUT",
    body: JSON.stringify([{ hex: "not-a-color", name: "x" }]),
  });
  expect(res.status).toBe(400);
  expect(favorites).toEqual([]);
});

test("PUT /api/favorites accepts a valid entry", async () => {
  start({ path: "/tmp/x", filename: "x", content: "" });
  const res = await fetch(new URL("/api/favorites", server.url), {
    method: "PUT",
    body: JSON.stringify([{ hex: "#ff0000", name: "Red" }]),
  });
  expect(res.status).toBe(200);
  expect(favorites).toEqual([{ hex: "#ff0000", name: "Red" }]);
});
