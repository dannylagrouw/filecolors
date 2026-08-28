import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig, writeConfig, resolveConfigPath } from "./config";

let tempDir: string;
let originalXdg: string | undefined;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "filecolors-config-"));
  originalXdg = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = tempDir;
});

afterEach(() => {
  if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = originalXdg;
});

test("resolveConfigPath honors XDG_CONFIG_HOME", () => {
  expect(resolveConfigPath()).toBe(join(tempDir, "filecolors", "config.json"));
});

test("readConfig returns {} when no file exists", async () => {
  expect(await readConfig()).toEqual({});
});

test("writeConfig then readConfig round-trips values", async () => {
  await writeConfig({ port: 4000, infoPreviewBg: "#ffffff", infoPreviewFg: "#000000", themeMode: "dark" });
  expect(await readConfig()).toEqual({
    port: 4000,
    infoPreviewBg: "#ffffff",
    infoPreviewFg: "#000000",
    themeMode: "dark",
  });
});

test("readConfig falls back to {} on malformed JSON", async () => {
  await Bun.write(resolveConfigPath(), "{not valid json");
  expect(await readConfig()).toEqual({});
});

test("readConfig falls back to {} when JSON is not an object", async () => {
  await Bun.write(resolveConfigPath(), JSON.stringify(["not", "an", "object"]));
  expect(await readConfig()).toEqual({});
});
