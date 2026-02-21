import { colors } from "./colors";
import { ProgressInfo, BackupResult } from "../types";

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return `${min}m ${sec}s`;
  const hr = Math.floor(min / 60);
  const rm = min % 60;
  return `${hr}h ${rm}m`;
}

export class ProgressTracker {
  private totalFiles: number;
  private completedFiles: number;
  private failedFiles: number;
  private skippedFiles: number;
  private startTime: number;
  private onProgress?: (info: ProgressInfo) => void;

  constructor(totalFiles: number, onProgress?: (info: ProgressInfo) => void) {
    this.totalFiles = totalFiles;
    this.completedFiles = 0;
    this.failedFiles = 0;
    this.skippedFiles = 0;
    this.startTime = Date.now();
    this.onProgress = onProgress;
  }

  private getEta(): string {
    if (this.completedFiles === 0) return "calculating...";
    const elapsed = Date.now() - this.startTime;
    const avgPerFile = elapsed / this.completedFiles;
    const remaining = avgPerFile * (this.totalFiles - this.completedFiles - this.failedFiles - this.skippedFiles);
    return `~${formatDuration(remaining)}`;
  }

  private getElapsed(): string {
    return formatDuration(Date.now() - this.startTime);
  }

  private emitProgress(currentFile: string): void {
    if (!this.onProgress) return;
    const done = this.completedFiles + this.failedFiles + this.skippedFiles;
    this.onProgress({
      completed: done,
      total: this.totalFiles,
      percent: Math.round((done / this.totalFiles) * 100),
      currentFile,
      eta: this.getEta(),
      elapsed: this.getElapsed(),
    });
  }

  logMonth(month: string): void {
    console.log(colors.magenta(`\n  📅 ${month}`));
  }

  logDay(day: string): void {
    console.log(colors.cyan(`\n  ${day}`));
  }

  logUpload(fileName: string): void {
    this.completedFiles++;
    const pct = ((this.completedFiles / this.totalFiles) * 100).toFixed(1);
    const counter = `[${this.completedFiles}/${this.totalFiles}]`;
    const eta = this.getEta();
    console.log(
      colors.green(`    ✓ ${fileName}`) +
      colors.gray(`  ${counter} ${pct}%`) +
      colors.dim(`  ETA: ${eta}`)
    );
    this.emitProgress(fileName);
  }

  logFail(fileName: string, error: string): void {
    this.failedFiles++;
    console.log(colors.red(`    ✗ ${fileName} — ${error}`));
    this.emitProgress(fileName);
  }

  logSkip(fileName: string, reason: string): void {
    this.skippedFiles++;
    console.log(colors.yellow(`    ⚠ ${fileName} — ${reason}`));
    this.emitProgress(fileName);
  }

  getResult(): BackupResult {
    return {
      success: this.failedFiles === 0,
      uploaded: this.completedFiles,
      failed: this.failedFiles,
      skipped: this.skippedFiles,
      total: this.totalFiles,
      elapsed: this.getElapsed(),
    };
  }

  summary(): void {
    const result = this.getResult();
    console.log(colors.bold(colors.green(`\n  ✓ Backup complete in ${result.elapsed}`)));
    console.log(
      colors.white(`    ${result.uploaded} uploaded, ${result.failed} failed, ${result.skipped} skipped, ${result.total} total\n`)
    );
  }
}
