import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { mkdir } from "node:fs/promises";

export interface Config {
  port?: number;
  host?: string;
  infoPreviewBg?: string;
  infoPreviewFg?: string;
  themeMode?: "light" | "dark" | "system";
}

export function resolveConfigPath(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME?.trim();
  const base = xdgConfigHome && xdgConfigHome.length > 0 ? xdgConfigHome : join(homedir(), ".config");
  return join(base, "filecolors", "config.json");
}

export async function readConfig(): Promise<Config> {
  const path = resolveConfigPath();
  const file = Bun.file(path);
  if (!(await file.exists())) return {};
  try {
    const data = await file.json();
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Config) : {};
  } catch {
    return {};
  }
}

export async function writeConfig(config: Config): Promise<void> {
  const path = resolveConfigPath();
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, JSON.stringify(config, null, 2));
}
