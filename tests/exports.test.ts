import { describe, it, expect } from "vitest";
import {
  TgBackup,
  TgBackupOptions,
  backupFolder,
  backupWhatsAppChat,
  backupFile,
  parseWhatsAppChat,
  groupMessagesByMonth,
  generateDailyChatText,
  groupMediaByDate,
  findChatFile,
  getMediaType,
  extractZip,
  cleanupExtracted,
  getFileSize,
  formatFileSize,
  partitionBySize,
  formatMonthHeader,
  formatDayHeader,
  formatDateForFilename,
  dateToKey,
  monthKey,
  getMonthName,
} from "../src/index";

describe("package exports", () => {
  it("exports TgBackup class", () => {
    expect(TgBackup).toBeDefined();
    expect(typeof TgBackup).toBe("function");
  });

  it("exports backup functions", () => {
    expect(typeof backupFolder).toBe("function");
    expect(typeof backupWhatsAppChat).toBe("function");
    expect(typeof backupFile).toBe("function");
  });

  it("exports parser functions", () => {
    expect(typeof parseWhatsAppChat).toBe("function");
    expect(typeof groupMessagesByMonth).toBe("function");
    expect(typeof generateDailyChatText).toBe("function");
  });

  it("exports media functions", () => {
    expect(typeof groupMediaByDate).toBe("function");
    expect(typeof findChatFile).toBe("function");
  });

  it("exports file utility functions", () => {
    expect(typeof getMediaType).toBe("function");
    expect(typeof extractZip).toBe("function");
    expect(typeof cleanupExtracted).toBe("function");
    expect(typeof getFileSize).toBe("function");
    expect(typeof formatFileSize).toBe("function");
    expect(typeof partitionBySize).toBe("function");
  });

  it("exports date utility functions", () => {
    expect(typeof formatMonthHeader).toBe("function");
    expect(typeof formatDayHeader).toBe("function");
    expect(typeof formatDateForFilename).toBe("function");
    expect(typeof dateToKey).toBe("function");
    expect(typeof monthKey).toBe("function");
    expect(typeof getMonthName).toBe("function");
  });

  it("TgBackup can be instantiated with options", () => {
    const options: TgBackupOptions = {
      botToken: "test:token",
      channelId: "-1001234567890",
    };

    const instance = new TgBackup(options);
    expect(instance).toBeInstanceOf(TgBackup);
  });

  it("TgBackup generates message links", () => {
    const instance = new TgBackup({
      botToken: "test:token",
      channelId: "-1001234567890",
    });

    const link = instance.getMessageLink(42);
    expect(link).toBe("https://t.me/c/1234567890/42");
  });
});
