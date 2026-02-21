import { Api, InputFile } from "grammy";
import * as fs from "fs";
import * as path from "path";
import { colors } from "../utils/colors";
import { MAX_FILE_SIZE, getMediaType } from "../utils/files";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000;
const UPLOAD_DELAY = 3000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TelegramApi {
  private api: Api;
  private channelId: number | string;
  private lastSendTime: number = 0;

  constructor(botToken: string, channelId: string) {
    this.api = new Api(botToken);
    this.channelId = /^-?\d+$/.test(channelId) ? parseInt(channelId) : channelId;
  }

  async validate(): Promise<boolean> {
    try {
      const me = await this.api.getMe();
      console.log(colors.green(`  ✓ Connected as @${me.username}`));
    } catch {
      console.log(colors.red("  ✗ Invalid bot token or connection failed."));
      return false;
    }

    try {
      await this.api.getChat(this.channelId);
      console.log(colors.green(`  ✓ Channel access verified`));
      return true;
    } catch (error: any) {
      const msg = error.message || "";
      if (msg.includes("chat not found")) {
        console.log(colors.red("\n  ✗ Channel not found."));
        console.log(colors.yellow("  Make sure:"));
        console.log(colors.yellow("    1. The CHANNEL_ID in .env is correct"));
        console.log(colors.yellow("    2. The bot has been added to the channel as an admin"));
        console.log(colors.yellow("    3. The bot has permission to post messages\n"));
        console.log(colors.gray("  See docs/SETUP.md for detailed instructions."));
      } else if (msg.includes("bot was kicked") || msg.includes("Forbidden")) {
        console.log(colors.red("\n  ✗ Bot was removed from the channel or lacks permissions."));
        console.log(colors.yellow("  Re-add the bot as an admin with full privileges.\n"));
      } else {
        console.log(colors.red(`\n  ✗ Cannot access channel: ${msg}`));
      }
      return false;
    }
  }

  private async rateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastSendTime;
    if (elapsed < UPLOAD_DELAY) {
      await delay(UPLOAD_DELAY - elapsed);
    }
    this.lastSendTime = Date.now();
  }

  getMessageLink(messageId: number): string {
    const raw = String(this.channelId);
    const stripped = raw.startsWith("-100") ? raw.substring(4) : raw;
    return `https://t.me/c/${stripped}/${messageId}`;
  }

  async sendMessage(text: string, parseMode?: "HTML" | "Markdown"): Promise<number | null> {
    await this.rateLimit();

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const msg = await this.api.sendMessage(this.channelId, text, {
          parse_mode: parseMode,
        });
        return msg.message_id;
      } catch (error: any) {
        if (attempt < RETRY_ATTEMPTS) {
          const waitTime = RETRY_DELAY * attempt;
          console.log(colors.yellow(`  ⟳ Retry ${attempt}/${RETRY_ATTEMPTS} in ${waitTime / 1000}s...`));
          await delay(waitTime);
        } else {
          console.log(colors.red(`  ✗ Failed to send message: ${error.message}`));
          return null;
        }
      }
    }
    return null;
  }

  async sendFile(filePath: string, caption?: string): Promise<number | null> {
    const mediaType = getMediaType(filePath);
    switch (mediaType) {
      case "photo":
        return this.sendPhoto(filePath, caption);
      case "video":
        return this.sendVideo(filePath, caption);
      default:
        return this.sendDocument(filePath, caption);
    }
  }

  async sendPhoto(filePath: string, caption?: string): Promise<number | null> {
    await this.rateLimit();

    const fileSize = fs.statSync(filePath).size;
    if (fileSize > MAX_FILE_SIZE) {
      console.log(colors.yellow(`  ⚠ Skipping ${path.basename(filePath)} (exceeds 50MB limit)`));
      return null;
    }

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const msg = await this.api.sendPhoto(this.channelId, new InputFile(filePath), {
          caption,
        });
        return msg.message_id;
      } catch (error: any) {
        if (attempt < RETRY_ATTEMPTS) {
          const waitTime = RETRY_DELAY * attempt;
          console.log(colors.yellow(`  ⟳ Retry ${attempt}/${RETRY_ATTEMPTS} in ${waitTime / 1000}s...`));
          await delay(waitTime);
        } else {
          console.log(colors.red(`  ✗ Failed: ${path.basename(filePath)} — ${error.message}`));
          return null;
        }
      }
    }
    return null;
  }

  async sendVideo(filePath: string, caption?: string): Promise<number | null> {
    await this.rateLimit();

    const fileSize = fs.statSync(filePath).size;
    if (fileSize > MAX_FILE_SIZE) {
      console.log(colors.yellow(`  ⚠ Skipping ${path.basename(filePath)} (exceeds 50MB limit)`));
      return null;
    }

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const msg = await this.api.sendVideo(this.channelId, new InputFile(filePath), {
          caption,
        });
        return msg.message_id;
      } catch (error: any) {
        if (attempt < RETRY_ATTEMPTS) {
          const waitTime = RETRY_DELAY * attempt;
          console.log(colors.yellow(`  ⟳ Retry ${attempt}/${RETRY_ATTEMPTS} in ${waitTime / 1000}s...`));
          await delay(waitTime);
        } else {
          console.log(colors.red(`  ✗ Failed: ${path.basename(filePath)} — ${error.message}`));
          return null;
        }
      }
    }
    return null;
  }

  async sendDocument(filePath: string, caption?: string): Promise<number | null> {
    await this.rateLimit();

    const fileSize = fs.statSync(filePath).size;
    if (fileSize > MAX_FILE_SIZE) {
      console.log(colors.yellow(`  ⚠ Skipping ${path.basename(filePath)} (exceeds 50MB limit)`));
      return null;
    }

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const msg = await this.api.sendDocument(this.channelId, new InputFile(filePath), {
          caption,
        });
        return msg.message_id;
      } catch (error: any) {
        if (attempt < RETRY_ATTEMPTS) {
          const waitTime = RETRY_DELAY * attempt;
          console.log(colors.yellow(`  ⟳ Retry ${attempt}/${RETRY_ATTEMPTS} in ${waitTime / 1000}s...`));
          await delay(waitTime);
        } else {
          console.log(colors.red(`  ✗ Failed: ${path.basename(filePath)} — ${error.message}`));
          return null;
        }
      }
    }
    return null;
  }

  async sendDocumentFromBuffer(buffer: Buffer, filename: string, caption?: string): Promise<number | null> {
    await this.rateLimit();

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        const msg = await this.api.sendDocument(this.channelId, new InputFile(buffer, filename), {
          caption,
        });
        return msg.message_id;
      } catch (error: any) {
        if (attempt < RETRY_ATTEMPTS) {
          const waitTime = RETRY_DELAY * attempt;
          console.log(colors.yellow(`  ⟳ Retry ${attempt}/${RETRY_ATTEMPTS} in ${waitTime / 1000}s...`));
          await delay(waitTime);
        } else {
          console.log(colors.red(`  ✗ Failed: ${filename} — ${error.message}`));
          return null;
        }
      }
    }
    return null;
  }
}
