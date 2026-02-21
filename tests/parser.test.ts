import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseWhatsAppChat,
  groupMessagesByMonth,
  generateDailyChatText,
} from "../src/whatsapp/parser";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tgbackup-parser-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeChatFile(content: string): string {
  const filePath = path.join(tmpDir, "_chat.txt");
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

describe("parseWhatsAppChat", () => {
  it("parses M/D/Y format messages", () => {
    const chatFile = writeChatFile(
      `1/15/2024, 10:30 AM - Alice: Hello there
1/15/2024, 10:31 AM - Bob: Hey! How are you?
1/15/2024, 10:32 AM - Alice: I'm doing great`
    );

    const messages = parseWhatsAppChat(chatFile);
    expect(messages).toHaveLength(3);
    expect(messages[0].sender).toBe("Alice");
    expect(messages[0].content).toBe("Hello there");
    expect(messages[1].sender).toBe("Bob");
    expect(messages[1].content).toBe("Hey! How are you?");
  });

  it("parses D/M/Y format messages", () => {
    const chatFile = writeChatFile(
      `15/1/2024, 10:30 AM - Alice: Hello
16/1/2024, 10:31 AM - Bob: World`
    );

    const messages = parseWhatsAppChat(chatFile);
    expect(messages).toHaveLength(2);
    expect(messages[0].date.getDate()).toBe(15);
    expect(messages[0].date.getMonth()).toBe(0);
  });

  it("parses bracketed format [D/M/Y, time]", () => {
    const chatFile = writeChatFile(
      `[15/01/2024, 14:30:00] Alice: First message
[15/01/2024, 14:31:00] Bob: Second message`
    );

    const messages = parseWhatsAppChat(chatFile);
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe("Alice");
    expect(messages[1].sender).toBe("Bob");
  });

  it("handles multiline messages", () => {
    const chatFile = writeChatFile(
      `1/15/2024, 10:30 AM - Alice: Line one
Line two
Line three
1/15/2024, 10:31 AM - Bob: Next message`
    );

    const messages = parseWhatsAppChat(chatFile);
    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain("Line one");
    expect(messages[0].content).toContain("Line two");
    expect(messages[0].content).toContain("Line three");
  });

  it("returns empty array for empty file", () => {
    const chatFile = writeChatFile("");
    const messages = parseWhatsAppChat(chatFile);
    expect(messages).toHaveLength(0);
  });

  it("stores raw text per message", () => {
    const chatFile = writeChatFile(
      `1/15/2024, 10:30 AM - Alice: Hello world`
    );

    const messages = parseWhatsAppChat(chatFile);
    expect(messages[0].raw).toBe("1/15/2024, 10:30 AM - Alice: Hello world");
  });
});

describe("groupMessagesByMonth", () => {
  it("groups messages into month blocks", () => {
    const chatFile = writeChatFile(
      `1/5/2024, 10:00 AM - Alice: Jan message
2/10/2024, 11:00 AM - Bob: Feb message
2/15/2024, 12:00 PM - Alice: Feb again`
    );

    const messages = parseWhatsAppChat(chatFile);
    const months = groupMessagesByMonth(messages);

    expect(months).toHaveLength(2);
    expect(months[0].month).toBe(0);
    expect(months[0].year).toBe(2024);
    expect(months[0].days).toHaveLength(1);
    expect(months[1].month).toBe(1);
    expect(months[1].days).toHaveLength(2);
  });

  it("groups messages within same day", () => {
    const chatFile = writeChatFile(
      `1/5/2024, 10:00 AM - Alice: First
1/5/2024, 11:00 AM - Bob: Second
1/5/2024, 12:00 PM - Alice: Third`
    );

    const messages = parseWhatsAppChat(chatFile);
    const months = groupMessagesByMonth(messages);

    expect(months).toHaveLength(1);
    expect(months[0].days).toHaveLength(1);
    expect(months[0].days[0].messages).toHaveLength(3);
  });

  it("sorts months chronologically", () => {
    const chatFile = writeChatFile(
      `12/1/2023, 10:00 AM - Alice: Dec
1/1/2024, 10:00 AM - Alice: Jan`
    );

    const messages = parseWhatsAppChat(chatFile);
    const months = groupMessagesByMonth(messages);

    expect(months).toHaveLength(2);
    expect(months[0].year).toBe(2023);
    expect(months[0].month).toBe(11);
    expect(months[1].year).toBe(2024);
    expect(months[1].month).toBe(0);
  });
});

describe("generateDailyChatText", () => {
  it("joins raw message text with newlines", () => {
    const chatFile = writeChatFile(
      `1/5/2024, 10:00 AM - Alice: Hello
1/5/2024, 11:00 AM - Bob: World`
    );

    const messages = parseWhatsAppChat(chatFile);
    const text = generateDailyChatText(messages);

    expect(text).toBe(
      "1/5/2024, 10:00 AM - Alice: Hello\n1/5/2024, 11:00 AM - Bob: World"
    );
  });
});
