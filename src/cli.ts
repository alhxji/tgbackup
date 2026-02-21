#!/usr/bin/env node
import * as p from "@clack/prompts";
import * as path from "path";
import * as fs from "fs";
import { backupFolder } from "./backup/folder";
import { backupWhatsAppChat } from "./backup/chat";
import { backupFile } from "./backup/file";
import { findIncompleteSessions, deleteSession, getSession } from "./backup/session";
import { selectBot, selectChannel, selectBackupType, getSourcePath, confirmBackup, askResume } from "./ui/prompts";
import { cleanPath, partitionBySize, buildFolderTree, getFileSize, formatFileSize, extractZip, cleanupExtracted } from "./utils/files";
import { parseWhatsAppChat, groupMessagesByMonth } from "./whatsapp/parser";
import { groupMediaByDate, findChatFile } from "./whatsapp/media";
import { dateToKey } from "./utils/dates";

async function main() {
  p.intro("tgbackup");

  while (true) {
    const action = await selectBackupType();
    if (action === null) {
      p.outro("Goodbye!");
      process.exit(0);
    }

    const bot = await selectBot();
    if (!bot) continue;

    const channel = await selectChannel(bot);
    if (!channel) continue;

    const incomplete = action !== "file" ? findIncompleteSessions(action) : [];
    let resumeSet: Set<string> | undefined;
    let resumeSessionId: string | undefined;

    if (incomplete.length > 0) {
      const session = incomplete[0];
      const choice = await askResume(session.sourcePath, session.startedAt);

      if (choice === "cancel") continue;

      if (choice === "resume") {
        resumeSet = new Set(session.completedFiles);
        resumeSessionId = session.id;
        p.log.info(`Resuming: ${session.completedFiles.length} files already uploaded`);
      } else {
        deleteSession(session.id);
      }
    }

    const rawPath = await getSourcePath(action);
    if (!rawPath) continue;

    const sourcePath = cleanPath(rawPath);

    if (!fs.existsSync(sourcePath)) {
      p.log.error("Path not found.");
      continue;
    }

    try {
      if (action === "folder") {
        await runFolderBackup(sourcePath, bot.token, channel.id, resumeSet, resumeSessionId);
      } else if (action === "chat") {
        await runChatBackup(sourcePath, bot.token, channel.id, resumeSet, resumeSessionId);
      } else {
        await runFileBackup(sourcePath, bot.token, channel.id);
      }
    } catch (error: any) {
      p.log.error(error.message);
    }
  }
}

async function runFolderBackup(
  folderPath: string,
  botToken: string,
  channelId: string,
  resumeFrom?: Set<string>,
  sessionId?: string
): Promise<void> {
  const tree = buildFolderTree(folderPath);
  if (tree.length === 0) {
    p.log.error("No files found in the specified folder.");
    return;
  }

  const allFiles = tree.flatMap((e) => e.files);
  const { uploadable, oversized } = partitionBySize(allFiles);
  const folderName = path.basename(folderPath);
  const resumeCount = resumeFrom ? resumeFrom.size : 0;
  const actualUpload = resumeFrom
    ? uploadable.filter((f) => !resumeFrom.has(path.basename(f))).length
    : uploadable.length;

  const details: Record<string, string> = {
    "Folder": folderName,
    "Channel": channelId,
    "Sections": `${tree.length}`,
    "Files": `${actualUpload}${resumeCount > 0 ? ` (${resumeCount} already done)` : ""}`,
  };

  if (oversized.length > 0) {
    details["Skipped (>50MB)"] = `${oversized.length} file(s)`;
    p.log.warn(
      `${oversized.length} file(s) exceed 50MB and will be skipped:\n` +
      oversized.map((f) => `  ${path.relative(folderPath, f)} (${formatFileSize(getFileSize(f))})`).join("\n")
    );
  }

  if (actualUpload === 0) {
    p.log.error("No files to upload.");
    return;
  }

  const confirmed = await confirmBackup(details);
  if (!confirmed) return;

  await backupFolder(folderPath, {
    botToken,
    channelId,
    resumeFrom,
    sessionId,
  });
}

async function runChatBackup(
  zipPath: string,
  botToken: string,
  channelId: string,
  resumeFrom?: Set<string>,
  sessionId?: string
): Promise<void> {
  let folderPath: string | null = null;

  try {
    const s = p.spinner();
    s.start("Extracting archive for analysis...");
    folderPath = extractZip(zipPath);
    s.stop("Extracted successfully");

    const chatFile = findChatFile(folderPath);
    if (!chatFile) {
      p.log.error("No chat file found. Expected _chat.txt or a single .txt file.");
      return;
    }

    const messages = parseWhatsAppChat(chatFile);
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

    const { uploadable, oversized } = partitionBySize(allMediaFiles);
    const resumeCount = resumeFrom ? resumeFrom.size : 0;
    const mediaToUpload = resumeFrom
      ? uploadable.filter((f) => !resumeFrom.has(path.basename(f))).length
      : uploadable.length;

    const details: Record<string, string> = {
      "Chat": path.basename(zipPath, ".zip"),
      "Channel": channelId,
      "Messages": `${messages.length} across ${totalDays} days`,
      "Media": `${mediaToUpload}${resumeCount > 0 ? ` (${resumeCount} already done)` : ""}`,
      "Months": `${months.length}`,
    };

    if (oversized.length > 0) {
      details["Skipped (>50MB)"] = `${oversized.length} file(s)`;
      p.log.warn(
        `${oversized.length} file(s) exceed 50MB and will be skipped:\n` +
        oversized.map((f) => `  ${path.basename(f)} (${formatFileSize(getFileSize(f))})`).join("\n")
      );
    }

    const confirmed = await confirmBackup(details);
    if (!confirmed) return;
  } finally {
    if (folderPath) {
      cleanupExtracted(zipPath);
    }
  }

  await backupWhatsAppChat(zipPath, {
    botToken,
    channelId,
    resumeFrom,
    sessionId,
  });
}

async function runFileBackup(
  filePath: string,
  botToken: string,
  channelId: string
): Promise<void> {
  const fileName = path.basename(filePath);
  const fileSize = formatFileSize(getFileSize(filePath));

  const confirmed = await confirmBackup({
    "File": fileName,
    "Size": fileSize,
    "Channel": channelId,
  });
  if (!confirmed) return;

  await backupFile(filePath, { botToken, channelId });
}

main().catch((error) => {
  p.log.error(error.message || "An unexpected error occurred");
  process.exit(1);
});
