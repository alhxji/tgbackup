import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AppStore, BotConfig, ChannelConfig } from "../types";

const CONFIG_DIR = path.join(os.homedir(), ".tgbackup");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

function ensureDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readStore(): AppStore {
  ensureDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return { bots: [] };
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as AppStore;
  } catch {
    return { bots: [] };
  }
}

function writeStore(store: AppStore): void {
  ensureDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function getBots(): BotConfig[] {
  return readStore().bots;
}

export function getBotById(id: string): BotConfig | undefined {
  return readStore().bots.find((b) => b.id === id);
}

export function addBot(bot: BotConfig): void {
  const store = readStore();
  store.bots.push(bot);
  writeStore(store);
}

export function removeBot(id: string): void {
  const store = readStore();
  store.bots = store.bots.filter((b) => b.id !== id);
  writeStore(store);
}

export function addChannel(botId: string, channel: ChannelConfig): void {
  const store = readStore();
  const bot = store.bots.find((b) => b.id === botId);
  if (!bot) return;
  bot.channels.push(channel);
  writeStore(store);
}

export function removeChannel(botId: string, channelId: string): void {
  const store = readStore();
  const bot = store.bots.find((b) => b.id === botId);
  if (!bot) return;
  bot.channels = bot.channels.filter((c) => c.id !== channelId);
  writeStore(store);
}

export function getConfigDir(): string {
  ensureDir();
  return CONFIG_DIR;
}
