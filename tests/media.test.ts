import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { groupMediaByDate, findChatFile } from "../src/whatsapp/media";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tgbackup-media-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("groupMediaByDate", () => {
  it("groups whatsapp media by date from filename", () => {
    fs.writeFileSync(path.join(tmpDir, "IMG-20240115-WA0001.jpg"), "");
    fs.writeFileSync(path.join(tmpDir, "IMG-20240115-WA0002.jpg"), "");
    fs.writeFileSync(path.join(tmpDir, "VID-20240210-WA0001.mp4"), "");

    const grouped = groupMediaByDate(tmpDir);

    expect(grouped.size).toBe(2);
    expect(grouped.get("2024-01-15")).toHaveLength(2);
    expect(grouped.get("2024-02-10")).toHaveLength(1);
  });

  it("includes different media types", () => {
    fs.writeFileSync(path.join(tmpDir, "IMG-20240115-WA0001.jpg"), "");
    fs.writeFileSync(path.join(tmpDir, "VID-20240115-WA0001.mp4"), "");
    fs.writeFileSync(path.join(tmpDir, "PTT-20240115-WA0001.opus"), "");
    fs.writeFileSync(path.join(tmpDir, "AUD-20240115-WA0001.mp3"), "");
    fs.writeFileSync(path.join(tmpDir, "DOC-20240115-WA0001.pdf"), "");

    const grouped = groupMediaByDate(tmpDir);
    expect(grouped.get("2024-01-15")).toHaveLength(5);
  });

  it("excludes stickers (STK pattern)", () => {
    fs.writeFileSync(path.join(tmpDir, "IMG-20240115-WA0001.jpg"), "");
    fs.writeFileSync(path.join(tmpDir, "random-file.txt"), "");

    const grouped = groupMediaByDate(tmpDir);
    expect(grouped.get("2024-01-15")).toHaveLength(1);
  });

  it("returns empty map for nonexistent directory", () => {
    const grouped = groupMediaByDate("/nonexistent/path");
    expect(grouped.size).toBe(0);
  });

  it("returns empty map for directory with no media", () => {
    fs.writeFileSync(path.join(tmpDir, "random.txt"), "");
    const grouped = groupMediaByDate(tmpDir);
    expect(grouped.size).toBe(0);
  });

  it("sorts files within each date group", () => {
    fs.writeFileSync(path.join(tmpDir, "IMG-20240115-WA0003.jpg"), "");
    fs.writeFileSync(path.join(tmpDir, "IMG-20240115-WA0001.jpg"), "");
    fs.writeFileSync(path.join(tmpDir, "IMG-20240115-WA0002.jpg"), "");

    const grouped = groupMediaByDate(tmpDir);
    const files = grouped.get("2024-01-15")!;
    expect(path.basename(files[0])).toBe("IMG-20240115-WA0001.jpg");
    expect(path.basename(files[1])).toBe("IMG-20240115-WA0002.jpg");
    expect(path.basename(files[2])).toBe("IMG-20240115-WA0003.jpg");
  });
});

describe("findChatFile", () => {
  it("finds _chat.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "_chat.txt"), "test");
    const result = findChatFile(tmpDir);
    expect(result).toBe(path.join(tmpDir, "_chat.txt"));
  });

  it("finds chat.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "chat.txt"), "test");
    const result = findChatFile(tmpDir);
    expect(result).toBe(path.join(tmpDir, "chat.txt"));
  });

  it("finds files starting with WhatsApp Chat", () => {
    fs.writeFileSync(path.join(tmpDir, "WhatsApp Chat with John.txt"), "test");
    const result = findChatFile(tmpDir);
    expect(result).toBe(path.join(tmpDir, "WhatsApp Chat with John.txt"));
  });

  it("falls back to single txt file", () => {
    fs.writeFileSync(path.join(tmpDir, "messages.txt"), "test");
    fs.writeFileSync(path.join(tmpDir, "IMG-20240115-WA0001.jpg"), "");
    const result = findChatFile(tmpDir);
    expect(result).toBe(path.join(tmpDir, "messages.txt"));
  });

  it("returns null when multiple txt files exist and none match", () => {
    fs.writeFileSync(path.join(tmpDir, "a.txt"), "");
    fs.writeFileSync(path.join(tmpDir, "b.txt"), "");
    const result = findChatFile(tmpDir);
    expect(result).toBeNull();
  });

  it("returns null for empty directory", () => {
    const result = findChatFile(tmpDir);
    expect(result).toBeNull();
  });
});
