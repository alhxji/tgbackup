import * as path from "path";
import * as fs from "fs";
import { BackupOptions, BackupResult } from "../types";
import { TgBackup } from "../telegram/api";
import { getFileSize, formatFileSize, MAX_FILE_SIZE } from "../utils/files";
import { ProgressTracker } from "../utils/progress";
import { colors } from "../utils/colors";

export async function backupFile(
  filePath: string,
  options: BackupOptions
): Promise<BackupResult> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }

  const fileSize = stat.size;
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(
      `File exceeds 50MB limit: ${path.basename(filePath)} (${formatFileSize(fileSize)})`
    );
  }

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

  const progress = new ProgressTracker(1, options.onProgress);
  const fileName = path.basename(filePath);

  const msgId = await telegram.sendFile(filePath);

  if (msgId) {
    progress.logUpload(`${fileName} (${formatFileSize(fileSize)})`);
  } else {
    progress.logFail(fileName, "Upload failed after retries");
  }

  const result = progress.getResult();
  progress.summary();
  return result;
}
