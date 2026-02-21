import * as fs from "fs";
import { ChatMessage, DayGroup, MonthGroup } from "../types";
import { dateToKey, monthKey } from "../utils/dates";

const MESSAGE_PATTERN =
  /^\[?(\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]?\s*[-–]?\s*(.+)/;

const SENDER_PATTERN = /^([^:]+?):\s*([\s\S]*)/;

type DateFormat = "MDY" | "DMY" | "YMD";

function detectDateFormat(lines: string[]): DateFormat {
  let maxFirst = 0;
  let maxSecond = 0;

  for (const line of lines) {
    const match = line.match(MESSAGE_PATTERN);
    if (!match) continue;

    const parts = match[1].split(/[\/.-]/).map(Number);
    if (parts.length !== 3) continue;

    const [a, b, c] = parts;

    if (a > 1000) return "YMD";

    if (a > maxFirst) maxFirst = a;
    if (b > maxSecond) maxSecond = b;
  }

  if (maxFirst > 12 && maxSecond <= 12) return "DMY";
  if (maxSecond > 12 && maxFirst <= 12) return "MDY";
  if (maxFirst > 12 && maxSecond > 12) return "DMY";

  return "MDY";
}

function parseDate(dateStr: string, format: DateFormat): Date | null {
  const parts = dateStr.split(/[\/.-]/);
  if (parts.length !== 3) return null;

  let [a, b, c] = parts.map(Number);

  if (c < 100) c += 2000;

  switch (format) {
    case "YMD":
      return new Date(a > 1000 ? a : c, b - 1, a > 1000 ? c : a);
    case "DMY":
      return new Date(c, b - 1, a);
    case "MDY":
      return new Date(c, a - 1, b);
  }
}

export function parseWhatsAppChat(filePath: string): ChatMessage[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const format = detectDateFormat(lines);
  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;

  for (const line of lines) {
    const match = line.match(MESSAGE_PATTERN);

    if (match) {
      if (current) messages.push(current);

      const date = parseDate(match[1], format);
      if (!date || isNaN(date.getTime())) {
        if (current) {
          current.content += "\n" + line;
          current.raw += "\n" + line;
        }
        continue;
      }

      const rest = match[3];
      const senderMatch = rest.match(SENDER_PATTERN);

      current = {
        date,
        sender: senderMatch ? senderMatch[1].trim() : "",
        content: senderMatch ? senderMatch[2].trim() : rest.trim(),
        raw: line,
      };
    } else if (current) {
      current.content += "\n" + line;
      current.raw += "\n" + line;
    }
  }

  if (current) messages.push(current);

  return messages;
}

export function groupMessagesByMonth(messages: ChatMessage[]): MonthGroup[] {
  const monthMap = new Map<string, Map<string, ChatMessage[]>>();

  for (const msg of messages) {
    const mKey = monthKey(msg.date.getFullYear(), msg.date.getMonth());
    const dKey = dateToKey(msg.date);

    if (!monthMap.has(mKey)) monthMap.set(mKey, new Map());

    const dayMap = monthMap.get(mKey)!;
    if (!dayMap.has(dKey)) dayMap.set(dKey, []);

    dayMap.get(dKey)!.push(msg);
  }

  const months: MonthGroup[] = [];

  for (const mKey of Array.from(monthMap.keys()).sort()) {
    const [yearStr, monthStr] = mKey.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr) - 1;

    const dayMap = monthMap.get(mKey)!;
    const days: DayGroup[] = [];

    for (const dKey of Array.from(dayMap.keys()).sort()) {
      const dayMessages = dayMap.get(dKey)!;
      days.push({
        date: dayMessages[0].date,
        messages: dayMessages,
        mediaFiles: [],
      });
    }

    months.push({ year, month, days });
  }

  return months;
}

export function generateDailyChatText(messages: ChatMessage[]): string {
  return messages.map((m) => m.raw).join("\n");
}
