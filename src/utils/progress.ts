import { colors } from "./colors";

export class ProgressTracker {
  private totalFiles: number;
  private completedFiles: number;
  private failedFiles: number;

  constructor(totalFiles: number) {
    this.totalFiles = totalFiles;
    this.completedFiles = 0;
    this.failedFiles = 0;
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
    console.log(colors.green(`    ✓ ${fileName}`) + colors.gray(`  ${counter} ${pct}%`));
  }

  logFail(fileName: string, error: string): void {
    this.failedFiles++;
    console.log(colors.red(`    ✗ ${fileName} — ${error}`));
  }

  logSkip(fileName: string, reason: string): void {
    console.log(colors.yellow(`    ⚠ ${fileName} — ${reason}`));
  }

  summary(): void {
    console.log(colors.bold(colors.green(`\n  ✓ Backup complete`)));
    console.log(
      colors.white(`    ${this.completedFiles} uploaded, ${this.failedFiles} failed, ${this.totalFiles} total\n`)
    );
  }
}
