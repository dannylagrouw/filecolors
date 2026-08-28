import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { readFavorites, writeFavorites, resolveFavoritesPath } from "./favoritesStore";

let tempDir: string;
let originalXdg: string | undefined;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "filecolors-fav-"));
  originalXdg = process.env.XDG_STATE_HOME;
  process.env.XDG_STATE_HOME = tempDir;
});

afterEach(() => {
  if (originalXdg === undefined) delete process.env.XDG_STATE_HOME;
  else process.env.XDG_STATE_HOME = originalXdg;
});

test("resolveFavoritesPath honors XDG_STATE_HOME", () => {
  expect(resolveFavoritesPath()).toBe(join(tempDir, "filecolors", "favorites.json"));
});

test("readFavorites returns [] when no file exists", async () => {
  expect(await readFavorites()).toEqual([]);
});

test("writeFavorites then readFavorites round-trips hex/name records", async () => {
  await writeFavorites([{ hex: "#ff0000", name: "Red" }]);
  expect(await readFavorites()).toEqual([{ hex: "#ff0000", name: "Red" }]);
});

test("readFavorites normalizes legacy hex-only string entries", async () => {
  await Bun.write(resolveFavoritesPath(), JSON.stringify(["#00ff00"]));
  expect(await readFavorites()).toEqual([{ hex: "#00ff00", name: "#00ff00" }]);
});

test("readFavorites ignores malformed entries", async () => {
  await Bun.write(resolveFavoritesPath(), JSON.stringify([{ name: "no hex" }, 42, null]));
  expect(await readFavorites()).toEqual([]);
});

test("writeFavorites leaves no temp files behind", async () => {
  await writeFavorites([{ hex: "#ff0000", name: "Red" }]);
  const files = await readdir(dirname(resolveFavoritesPath()));
  expect(files).toEqual(["favorites.json"]);
});
