import * as fs from "fs";
import * as path from "path";
import { AppConfig } from "./types";
import { colors } from "./utils/colors";

const ENV_PATH = path.join(process.cwd(), ".env");
export const BACKUPS_DIR = path.join(process.cwd(), "backups");

function loadEnvFile(): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(ENV_PATH)) return env;

  const content = fs.readFileSync(ENV_PATH, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed
      .substring(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    env[key] = value;
  }

  return env;
}

export function loadConfig(): AppConfig {
  const env = loadEnvFile();

  const botToken = env.BOT_TOKEN || process.env.BOT_TOKEN || "";
  const channelId = env.CHANNEL_ID || process.env.CHANNEL_ID || "";

  if (!botToken) {
    console.log(colors.red("\n  BOT_TOKEN is missing from .env file."));
    console.log(colors.gray("  See docs/SETUP.md for instructions on getting your bot token.\n"));
    process.exit(1);
  }

  if (!channelId) {
    console.log(colors.red("\n  CHANNEL_ID is missing from .env file."));
    console.log(colors.gray("  See docs/SETUP.md for instructions on getting your channel ID.\n"));
    process.exit(1);
  }

  return { botToken, channelId };
}
