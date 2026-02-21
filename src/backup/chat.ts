import * as path from "path";
import * as fs from "fs";
import { AppConfig } from "../types";
import { TelegramApi } from "../telegram/api";
import { BACKUPS_DIR } from "../config";
import { parseWhatsAppChat, groupMessagesByMonth, generateDailyChatText } from "../whatsapp/parser";
import { groupMediaByDate, findChatFile } from "../whatsapp/media";
import { formatMonthHeader, formatDayHeader, formatDateForFilename, dateToKey, getMonthName } from "../utils/dates";
import { getFileSize, formatFileSize, MAX_FILE_SIZE, partitionBySize, cleanPath, extractZip, cleanupExtracted } from "../utils/files";
import { ProgressTracker } from "../utils/progress";
import { askConfirmation, pickZipFile } from "../utils/prompt";
import { colors } from "../utils/colors";

export async function backupWhatsAppChat(config: AppConfig): Promise<void> {
  const rawPath = await pickZipFile(BACKUPS_DIR, "Pick a WhatsApp export (.zip):");
  if (!rawPath) return;

  const zipPath = cleanPath(rawPath);

  if (!fs.existsSync(zipPath)) {
    console.log(colors.red("  File not found."));
    return;
  }

  if (!zipPath.toLowerCase().endsWith(".zip")) {
    console.log(colors.red("  Expected a .zip file."));
    return;
  }

  console.log(colors.gray("  Extracting archive..."));
  let folderPath: string;
  try {
    folderPath = extractZip(zipPath);
  } catch (err: any) {
    console.log(colors.red(`  Failed to extract: ${err.message}`));
    return;
  }
  console.log(colors.green(`  ✓ Extracted to ${path.basename(folderPath)}`));

  try {
    await processChat(config, folderPath);
  } finally {
    console.log(colors.gray("\n  Cleaning up extracted files..."));
    cleanupExtracted(zipPath);
    console.log(colors.green("  ✓ Cleanup done"));
  }
}

async function processChat(config: AppConfig, folderPath: string): Promise<void> {
  const chatFile = findChatFile(folderPath);
  if (!chatFile) {
    console.log(colors.red("  No chat file found in the archive."));
    console.log(colors.gray("  Expected: _chat.txt or a single .txt file"));
    return;
  }

  console.log(colors.green(`  ✓ Chat file: ${path.basename(chatFile)}`));

  const messages = parseWhatsAppChat(chatFile);
  if (messages.length === 0) {
    console.log(colors.red("  No messages found in chat file."));
    return;
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

  const { uploadable: uploadableMedia, oversized } = partitionBySize(allMediaFiles);
  const totalUploads = uploadableMedia.length + totalDays + 1;

  console.log(colors.bold(colors.white("\n  Backup Summary")));
  console.log(colors.white(`  Channel:     ${config.channelId}`));
  console.log(colors.white(`  Messages:    ${messages.length} across ${totalDays} days`));
  console.log(colors.white(`  Media files: ${allMediaFiles.length}`));
  console.log(colors.white(`  Months:      ${months.length}`));

  if (oversized.length > 0) {
    console.log(colors.yellow(`\n  ⚠ ${oversized.length} media file(s) are larger than 50MB.`));
    console.log(colors.yellow("  Telegram's Bot API has a 50MB upload limit per file."));
    console.log(colors.yellow("  These files will be skipped:\n"));

    for (const file of oversized) {
      console.log(colors.gray(`    - ${path.basename(file)} (${formatFileSize(getFileSize(file))})`));
    }

    console.log("");
    const proceed = await askConfirmation("Continue without these files?");
    if (!proceed) return;
  }

  const confirmed = await askConfirmation(`Upload ${totalUploads} items to ${config.channelId}?`);
  if (!confirmed) return;

  const telegram = new TelegramApi(config.botToken, config.channelId);
  const isValid = await telegram.validate();
  if (!isValid) return;

  const progress = new ProgressTracker(totalUploads);

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
        const fileSize = getFileSize(mediaFile);

        if (fileSize > MAX_FILE_SIZE) {
          progress.logSkip(fileName, "Exceeds 50MB limit");
          continue;
        }

        const success = await telegram.sendFile(mediaFile);
        if (success) {
          progress.logUpload(`${fileName} (${formatFileSize(fileSize)})`);
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
      } else {
        progress.logFail(dailyChatFilename, "Upload failed");
      }
    }
  }

  const fullChatContent = fs.readFileSync(chatFile);
  const fullChatSuccess = await telegram.sendDocumentFromBuffer(fullChatContent, "Full-Chat.txt", "📋 Full Chat Backup");

  if (fullChatSuccess) {
    progress.logUpload("Full-Chat.txt");
  } else {
    progress.logFail("Full-Chat.txt", "Upload failed");
  }

  progress.summary();
}
