import { Api, InputFile } from "grammy";
import * as fs from "fs";
import * as path from "path";
import { MAX_FILE_SIZE, getMediaType } from "../utils/files";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 5000;
const UPLOAD_DELAY = 3000;

export interface TgBackupOptions {
  botToken: string;
  channelId: string;
  onRetry?: (attempt: number, maxAttempts: number, waitSec: number) => void;
  onSkip?: (fileName: string, reason: string) => void;
  onFail?: (fileName: string, error: string) => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TgBackup {
  private api: Api;
  private channelId: number | string;
  private lastSendTime: number = 0;
  private opts: TgBackupOptions;

  constructor(options: TgBackupOptions) {
    this.opts = options;
    this.api = new Api(options.botToken);
    this.channelId = /^-?\d+$/.test(options.channelId)
      ? parseInt(options.channelId)
      : options.channelId;
  }

  async validate(): Promise<{ valid: boolean; botUsername?: string; error?: string }> {
    try {
      const me = await this.api.getMe();
      await this.api.getChat(this.channelId);
      return { valid: true, botUsername: me.username };
    } catch (error: any) {
      return { valid: false, error: error.message || "Unknown error" };
    }
  }

  private async rateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastSendTime;
    if (elapsed < UPLOAD_DELAY) {
      await delay(UPLOAD_DELAY - elapsed);
    }
    this.lastSendTime = Date.now();
  }

  private logRetry(attempt: number, waitTime: number): void {
    if (this.opts.onRetry) {
      this.opts.onRetry(attempt, RETRY_ATTEMPTS, waitTime / 1000);
    }
  }

  private logSkip(fileName: string, reason: string): void {
    if (this.opts.onSkip) {
      this.opts.onSkip(fileName, reason);
    }
  }

  private logFail(fileName: string, error: string): void {
    if (this.opts.onFail) {
      this.opts.onFail(fileName, error);
    }
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
          this.logRetry(attempt, waitTime);
          await delay(waitTime);
        } else {
          this.logFail("message", error.message);
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
      this.logSkip(path.basename(filePath), "Exceeds 50MB limit");
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
          this.logRetry(attempt, waitTime);
          await delay(waitTime);
        } else {
          this.logFail(path.basename(filePath), error.message);
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
      this.logSkip(path.basename(filePath), "Exceeds 50MB limit");
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
          this.logRetry(attempt, waitTime);
          await delay(waitTime);
        } else {
          this.logFail(path.basename(filePath), error.message);
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
      this.logSkip(path.basename(filePath), "Exceeds 50MB limit");
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
          this.logRetry(attempt, waitTime);
          await delay(waitTime);
        } else {
          this.logFail(path.basename(filePath), error.message);
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
          this.logRetry(attempt, waitTime);
          await delay(waitTime);
        } else {
          this.logFail(filename, error.message);
          return null;
        }
      }
    }
    return null;
  }
}
