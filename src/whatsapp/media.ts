import * as path from "path";
import * as fs from "fs";
import { dateToKey } from "../utils/dates";

const WHATSAPP_MEDIA_PATTERN = /^(IMG|VID|PTT|AUD|DOC|PHOTO)-(\d{8})-WA\d+/i;

export function groupMediaByDate(dirPath: string): Map<string, string[]> {
  const mediaMap = new Map<string, string[]>();

  if (!fs.existsSync(dirPath)) return mediaMap;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const match = entry.name.match(WHATSAPP_MEDIA_PATTERN);
    if (!match) continue;

    const dateStr = match[2];
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));

    const date = new Date(year, month, day);
    const key = dateToKey(date);

    if (!mediaMap.has(key)) mediaMap.set(key, []);
    mediaMap.get(key)!.push(path.join(dirPath, entry.name));
  }

  for (const files of mediaMap.values()) {
    files.sort();
  }

  return mediaMap;
}

export function findChatFile(dirPath: string): string | null {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    if (lower === "_chat.txt" || lower === "chat.txt" || lower.startsWith("whatsapp chat")) {
      return path.join(dirPath, entry.name);
    }
  }

  const txtFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".txt"));

  if (txtFiles.length === 1) {
    return path.join(dirPath, txtFiles[0].name);
  }

  return null;
}
