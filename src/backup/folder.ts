import * as path from "path";
import * as fs from "fs";
import { BackupOptions, BackupResult } from "../types";
import { TgBackup } from "../telegram/api";
import { getFileSize, formatFileSize, partitionBySize, buildFolderTree } from "../utils/files";
import { ProgressTracker } from "../utils/progress";
import { colors } from "../utils/colors";
import { createSession, updateSession, completeSession, failSession } from "./session";

export async function backupFolder(
  folderPath: string,
  options: BackupOptions
): Promise<BackupResult> {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  const tree = buildFolderTree(folderPath);
  if (tree.length === 0) {
    throw new Error("No files found in the specified folder.");
  }

  const allFiles = tree.flatMap((e) => e.files);
  const { uploadable } = partitionBySize(allFiles);

  if (uploadable.length === 0) {
    throw new Error("No files within the 50MB limit to upload.");
  }

  const resumeSet = options.resumeFrom || new Set<string>();

  const filesToUpload = uploadable.filter((f) => !resumeSet.has(path.basename(f)));

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

  const progress = new ProgressTracker(filesToUpload.length, options.onProgress);
  const index: { label: string; messageId: number }[] = [];
  const folderName = path.basename(folderPath);

  const session = options.sessionId
    ? null
    : createSession("folder", options.botToken, options.channelId, folderPath, filesToUpload.length);

  const sessionId = options.sessionId || session?.id;

  try {
    if (resumeSet.size === 0) {
      await telegram.sendMessage(
        `📁 Folder Backup: ${folderName}\n${uploadable.length} files across ${tree.length} sections`
      );
    }

    for (const section of tree) {
      const sectionFiles = section.files.filter(
        (f) => getFileSize(f) <= 50 * 1024 * 1024 && !resumeSet.has(path.basename(f))
      );
      if (sectionFiles.length === 0) continue;

      const headerText = `📂 ${section.relativePath}`;
      console.log(colors.cyan(`\n  ${headerText}`));

      const headerMsgId = await telegram.sendMessage(headerText);

      if (headerMsgId) {
        index.push({ label: section.relativePath, messageId: headerMsgId });
      }

      for (const filePath of sectionFiles) {
        const fileName = path.basename(filePath);
        const fileSize = formatFileSize(getFileSize(filePath));

        const msgId = await telegram.sendFile(filePath);
        if (msgId) {
          progress.logUpload(`${fileName} (${fileSize})`);
          if (sessionId) updateSession(sessionId, fileName);
        } else {
          progress.logFail(fileName, "Upload failed after retries");
        }
      }
    }

    if (index.length > 1) {
      const lines = index.map((entry) => {
        const link = telegram.getMessageLink(entry.messageId);
        return `• <a href="${link}">${escapeHtml(entry.label)}</a>`;
      });

      const indexText = `📋 <b>Index</b>\n\n${lines.join("\n")}`;
      await telegram.sendMessage(indexText, "HTML");
      console.log(colors.green(`\n  ✓ Index sent with ${index.length} sections`));
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
