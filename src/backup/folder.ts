import * as path from "path";
import * as fs from "fs";
import { AppConfig } from "../types";
import { TelegramApi } from "../telegram/api";
import { BACKUPS_DIR } from "../config";
import { getFileSize, formatFileSize, partitionBySize, cleanPath, buildFolderTree, FolderEntry } from "../utils/files";
import { ProgressTracker } from "../utils/progress";
import { askConfirmation, pickFolder } from "../utils/prompt";
import { colors } from "../utils/colors";

export async function backupFolder(config: AppConfig): Promise<void> {
  const rawPath = await pickFolder(BACKUPS_DIR, "Pick a folder to upload:");
  if (!rawPath) return;

  const folderPath = cleanPath(rawPath);

  if (!fs.existsSync(folderPath)) {
    console.log(colors.red("  Folder not found."));
    return;
  }

  const tree = buildFolderTree(folderPath);
  if (tree.length === 0) {
    console.log(colors.red("  No files found in the specified folder."));
    return;
  }

  const allFiles = tree.flatMap((e) => e.files);
  const { uploadable, oversized } = partitionBySize(allFiles);
  const folderName = path.basename(folderPath);

  console.log(colors.bold(colors.white("\n  Upload Summary")));
  console.log(colors.white(`  Folder:      ${folderName}`));
  console.log(colors.white(`  Channel:     ${config.channelId}`));
  console.log(colors.white(`  Subfolders:  ${tree.length}`));
  console.log(colors.white(`  Total files: ${allFiles.length}`));
  console.log(colors.green(`  Uploadable:  ${uploadable.length}`));

  if (oversized.length > 0) {
    console.log(colors.yellow(`\n  ⚠ ${oversized.length} file(s) are larger than 50MB.`));
    console.log(colors.yellow("  Telegram's Bot API has a 50MB upload limit per file."));
    console.log(colors.yellow("  These files will be skipped:\n"));

    for (const file of oversized) {
      console.log(colors.gray(`    - ${path.relative(folderPath, file)} (${formatFileSize(getFileSize(file))})`));
    }

    console.log("");
    const proceed = await askConfirmation("Continue without these files?");
    if (!proceed) return;
  }

  if (uploadable.length === 0) {
    console.log(colors.red("  No files within the 50MB limit to upload."));
    return;
  }

  const confirmed = await askConfirmation(`Upload ${uploadable.length} files to ${config.channelId}?`);
  if (!confirmed) return;

  const telegram = new TelegramApi(config.botToken, config.channelId);
  const isValid = await telegram.validate();
  if (!isValid) return;

  const progress = new ProgressTracker(uploadable.length);
  const index: { label: string; messageId: number }[] = [];

  await telegram.sendMessage(`📁 Folder Backup: ${folderName}\n${uploadable.length} files across ${tree.length} sections`);

  for (const section of tree) {
    const sectionFiles = section.files.filter((f) => getFileSize(f) <= 50 * 1024 * 1024);
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

  progress.summary();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
