import * as p from "@clack/prompts";
import { Api } from "grammy";
import { v4 as uuidv4 } from "uuid";
import { BotConfig, ChannelConfig } from "../types";
import * as store from "../config/store";

export async function selectBot(): Promise<BotConfig | null> {
  const bots = store.getBots();

  if (bots.length === 0) {
    p.log.info("No saved bots found. Let's add one.");
    return addNewBot();
  }

  const options = bots.map((b) => ({
    value: b.id,
    label: `@${b.username}`,
    hint: b.name,
  }));

  options.push({ value: "__new__", label: "Add a new bot", hint: "" });

  const selected = await p.select({
    message: "Select a bot",
    options,
  });

  if (p.isCancel(selected)) return null;

  if (selected === "__new__") {
    return addNewBot();
  }

  const bot = store.getBotById(selected as string);
  if (!bot) return null;

  p.log.success(`Bot: @${bot.username} (${bot.name})`);
  return bot;
}

async function addNewBot(): Promise<BotConfig | null> {
  const token = await p.text({
    message: "Enter bot token (from @BotFather)",
    placeholder: "123456789:ABCDEFghijklmnopQRSTuvwxyz",
    validate: (val) => {
      if (!val || !val.includes(":")) return "Invalid token format";
    },
  });

  if (p.isCancel(token)) return null;

  const s = p.spinner();
  s.start("Validating bot token...");

  try {
    const api = new Api(token as string);
    const me = await api.getMe();

    s.stop(`Connected as @${me.username}`);

    const bot: BotConfig = {
      id: uuidv4(),
      token: token as string,
      username: me.username || "unknown",
      name: `${me.first_name}${me.last_name ? " " + me.last_name : ""}`,
      addedAt: new Date().toISOString(),
      channels: [],
    };

    store.addBot(bot);
    p.log.success(`Bot saved: @${bot.username}`);
    return bot;
  } catch {
    s.stop("Failed to validate bot token");
    p.log.error("Invalid bot token or connection failed.");
    return null;
  }
}

export async function selectChannel(bot: BotConfig): Promise<ChannelConfig | null> {
  if (bot.channels.length === 0) {
    p.log.info("No channels added for this bot. Let's add one.");
    return addNewChannel(bot);
  }

  const options = bot.channels.map((c) => ({
    value: c.id,
    label: c.title,
    hint: c.id,
  }));

  options.push({ value: "__new__", label: "Add a new channel", hint: "" });

  const selected = await p.select({
    message: "Select a channel",
    options,
  });

  if (p.isCancel(selected)) return null;

  if (selected === "__new__") {
    return addNewChannel(bot);
  }

  const channel = bot.channels.find((c) => c.id === selected);
  if (!channel) return null;

  const s = p.spinner();
  s.start("Verifying channel access...");

  try {
    const api = new Api(bot.token);
    const chatId = /^-?\d+$/.test(channel.id) ? parseInt(channel.id) : channel.id;
    await api.getChat(chatId);
    s.stop(`Channel verified: ${channel.title}`);
    return channel;
  } catch (error: any) {
    s.stop("Channel access failed");
    const msg = error.message || "";
    if (msg.includes("chat not found")) {
      p.log.error("Channel not found. Make sure the bot is still an admin.");
    } else if (msg.includes("bot was kicked") || msg.includes("Forbidden")) {
      p.log.error("Bot was removed from the channel. Re-add it as admin.");
    } else {
      p.log.error(`Cannot access channel: ${msg}`);
    }
    return null;
  }
}

async function addNewChannel(bot: BotConfig): Promise<ChannelConfig | null> {
  const channelId = await p.text({
    message: "Enter channel ID",
    placeholder: "-1001234567890",
    validate: (val) => {
      if (!val || !val.trim()) return "Channel ID is required";
    },
  });

  if (p.isCancel(channelId)) return null;

  const s = p.spinner();
  s.start("Verifying channel access...");

  try {
    const api = new Api(bot.token);
    const numericId = /^-?\d+$/.test(channelId as string)
      ? parseInt(channelId as string)
      : (channelId as string);
    const chat = await api.getChat(numericId);

    const title = ("title" in chat ? chat.title : null) || `Channel ${channelId}`;
    s.stop(`Channel found: ${title}`);

    const channel: ChannelConfig = {
      id: channelId as string,
      title,
      addedAt: new Date().toISOString(),
    };

    store.addChannel(bot.id, channel);
    p.log.success(`Channel saved: ${title}`);
    return channel;
  } catch (error: any) {
    s.stop("Channel verification failed");
    const msg = error.message || "";
    if (msg.includes("chat not found")) {
      p.log.error("Channel not found. Check the ID and ensure the bot is added as admin.");
    } else if (msg.includes("bot was kicked") || msg.includes("Forbidden")) {
      p.log.error("Bot doesn't have access. Add it as an admin to the channel.");
    } else {
      p.log.error(`Cannot access channel: ${msg}`);
    }
    return null;
  }
}

export async function selectBackupType(): Promise<"chat" | "folder" | "file" | null> {
  const action = await p.select({
    message: "What would you like to do?",
    options: [
      { value: "chat" as const, label: "Backup a WhatsApp chat", hint: ".zip export" },
      { value: "folder" as const, label: "Backup a folder", hint: "any directory" },
      { value: "file" as const, label: "Backup a single file", hint: "any file" },
    ],
  });

  if (p.isCancel(action)) return null;
  return action;
}

export async function getSourcePath(type: "chat" | "folder" | "file"): Promise<string | null> {
  const message =
    type === "chat"
      ? "Path to WhatsApp export (.zip)"
      : type === "file"
      ? "Path to file"
      : "Path to folder";

  const placeholder =
    type === "chat"
      ? "/path/to/WhatsApp Chat.zip"
      : type === "file"
      ? "/path/to/file.pdf"
      : "/path/to/folder";

  const value = await p.text({
    message,
    placeholder,
    validate: (val) => {
      if (!val || !val.trim()) return "Path is required";
      if (type === "chat" && !val.trim().toLowerCase().endsWith(".zip")) {
        return "Expected a .zip file";
      }
    },
  });

  if (p.isCancel(value)) return null;
  return (value as string).trim();
}

export async function confirmBackup(details: Record<string, string>): Promise<boolean> {
  p.log.info("Backup Summary");
  for (const [key, value] of Object.entries(details)) {
    p.log.message(`  ${key}: ${value}`);
  }

  const confirmed = await p.confirm({
    message: "Start backup?",
  });

  if (p.isCancel(confirmed)) return false;
  return confirmed;
}

export async function askResume(sourcePath: string, startedAt: string): Promise<"resume" | "restart" | "cancel"> {
  const date = new Date(startedAt).toLocaleString();

  const action = await p.select({
    message: `Found an incomplete backup for ${sourcePath} (started ${date})`,
    options: [
      { value: "resume" as const, label: "Resume where it left off" },
      { value: "restart" as const, label: "Start over" },
      { value: "cancel" as const, label: "Cancel" },
    ],
  });

  if (p.isCancel(action)) return "cancel";
  return action;
}
