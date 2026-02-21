import * as path from "path";
import * as fs from "fs";
import { BackupOptions, BackupResult } from "../types";
import { TgBackup } from "../telegram/api";
import { parseWhatsAppChat, groupMessagesByMonth, generateDailyChatText } from "../whatsapp/parser";
import { groupMediaByDate, findChatFile } from "../whatsapp/media";
import { formatMonthHeader, formatDayHeader, formatDateForFilename, dateToKey, getMonthName } from "../utils/dates";
import { getFileSize, formatFileSize, MAX_FILE_SIZE, partitionBySize, extractZip, cleanupExtracted } from "../utils/files";
import { ProgressTracker } from "../utils/progress";
import { colors } from "../utils/colors";
import { createSession, updateSession, completeSession, failSession } from "./session";

export async function backupWhatsAppChat(
  zipPath: string,
  options: BackupOptions
): Promise<BackupResult> {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`File not found: ${zipPath}`);
  }

  if (!zipPath.toLowerCase().endsWith(".zip")) {
    throw new Error("Expected a .zip file.");
  }

  console.log(colors.gray("  Extracting archive..."));
  let folderPath: string;
  try {
    folderPath = extractZip(zipPath);
  } catch (err: any) {
    throw new Error(`Failed to extract: ${err.message}`);
  }
  console.log(colors.green(`  ✓ Extracted to ${path.basename(folderPath)}`));

  try {
    return await processChat(folderPath, options);
  } finally {
    console.log(colors.gray("\n  Cleaning up extracted files..."));
    cleanupExtracted(zipPath);
    console.log(colors.green("  ✓ Cleanup done"));
  }
}

async function processChat(
  folderPath: string,
  options: BackupOptions
): Promise<BackupResult> {
  const chatFile = findChatFile(folderPath);
  if (!chatFile) {
    throw new Error("No chat file found in the archive. Expected _chat.txt or a single .txt file.");
  }

  console.log(colors.green(`  ✓ Chat file: ${path.basename(chatFile)}`));

  const messages = parseWhatsAppChat(chatFile);
  if (messages.length === 0) {
    throw new Error("No messages found in chat file.");
  }

  const months = groupMessagesByMonth(messages);
  const mediaByDate = groupMediaByDate(folderPath);

  let totalDays = 0;
  const allMediaFiles: string[] = [];

  for (const month of months) {
    for (const day of month.days) {
      const key = dateToKey(day.date);
      day.mediaFiles = mediaByDate.get(key) || [];
      allMediaFiles.push(...day.mediaFiles);
      totalDays++;
    }
  }

  const { uploadable: uploadableMedia } = partitionBySize(allMediaFiles);
  const resumeSet = options.resumeFrom || new Set<string>();

  const mediaToUpload = uploadableMedia.filter((f) => !resumeSet.has(path.basename(f)));
  const totalUploads = mediaToUpload.length + totalDays + 1;

  const telegram = new TgBackup({
    botToken: options.botToken,
    channelId: options.channelId,
    onRetry: (attempt, max, sec) => {
      console.log(colors.yellow(`  ⟳ Retry ${attempt}/${max} in ${sec}s...`));
    },
    onSkip: (name, reason) => {
      console.log(colors.yellow(`  ⚠ ${name} — ${reason}`));
    },
    onFail: (name, error) => {
      console.log(colors.red(`  ✗ ${name} — ${error}`));
    },
  });

  const progress = new ProgressTracker(totalUploads, options.onProgress);

  const session = options.sessionId
    ? null
    : createSession("chat", options.botToken, options.channelId, folderPath, totalUploads);

  const sessionId = options.sessionId || session?.id;

  try {
    for (const month of months) {
      const monthLabel = `${getMonthName(month.month)} ${month.year}`;
      progress.logMonth(monthLabel);

      await telegram.sendMessage(formatMonthHeader(month.year, month.month));

      for (const day of month.days) {
        const dayHeader = formatDayHeader(day.date);
        progress.logDay(dayHeader);

        await telegram.sendMessage(dayHeader);

        for (const mediaFile of day.mediaFiles) {
          const fileName = path.basename(mediaFile);

          if (resumeSet.has(fileName)) continue;

          const fileSize = getFileSize(mediaFile);

          if (fileSize > MAX_FILE_SIZE) {
            progress.logSkip(fileName, "Exceeds 50MB limit");
            continue;
          }

          const success = await telegram.sendFile(mediaFile);
          if (success) {
            progress.logUpload(`${fileName} (${formatFileSize(fileSize)})`);
            if (sessionId) updateSession(sessionId, fileName);
          } else {
            progress.logFail(fileName, "Upload failed after retries");
          }
        }

        const dailyChatContent = generateDailyChatText(day.messages);
        const dailyChatFilename = `Chat-${formatDateForFilename(day.date)}.txt`;

        const dailySuccess = await telegram.sendDocumentFromBuffer(
          Buffer.from(dailyChatContent, "utf-8"),
          dailyChatFilename,
          `📝 ${dailyChatFilename}`
        );

        if (dailySuccess) {
          progress.logUpload(dailyChatFilename);
          if (sessionId) updateSession(sessionId, dailyChatFilename);
        } else {
          progress.logFail(dailyChatFilename, "Upload failed");
        }
      }
    }

    const fullChatContent = fs.readFileSync(chatFile);
    const fullChatSuccess = await telegram.sendDocumentFromBuffer(fullChatContent, "Full-Chat.txt", "📋 Full Chat Backup");

    if (fullChatSuccess) {
      progress.logUpload("Full-Chat.txt");
      if (sessionId) updateSession(sessionId, "Full-Chat.txt");
    } else {
      progress.logFail("Full-Chat.txt", "Upload failed");
    }

    if (sessionId) completeSession(sessionId);
  } catch (error) {
    if (sessionId) failSession(sessionId);
    throw error;
  }

  const result = progress.getResult();
  progress.summary();
  return result;
}
