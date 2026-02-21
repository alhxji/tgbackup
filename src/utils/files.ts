import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

const MEDIA_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp",
  ".mp4", ".mkv", ".avi", ".mov", ".3gp", ".wmv",
  ".mp3", ".m4a", ".opus", ".ogg", ".wav", ".aac",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".zip", ".rar", ".7z",
  ".vcf", ".txt",
]);

export function cleanPath(input: string): string {
  let cleaned = input.replace(/['"]/g, "").replace(/\\ /g, " ").trim();
  if (cleaned.startsWith("~/")) {
    cleaned = path.join(process.env.HOME || "", cleaned.substring(2));
  }
  return cleaned;
}

export function getFilesInDirectory(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dirPath, entry.name))
    .sort();
}

export function getFilesRecursive(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];

  const files: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory()) {
      files.push(...getFilesRecursive(fullPath));
    }
  }

  return files.sort();
}

export function getFileSize(filePath: string): number {
  return fs.statSync(filePath).size;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function isMediaFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return MEDIA_EXTENSIONS.has(ext) && ext !== ".txt";
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".avi", ".mov", ".3gp", ".wmv"]);

export type MediaType = "photo" | "video" | "document";

export function getMediaType(filePath: string): MediaType {
  const ext = path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "photo";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return "document";
}

export function partitionBySize(files: string[]): { uploadable: string[]; oversized: string[] } {
  const uploadable: string[] = [];
  const oversized: string[] = [];

  for (const file of files) {
    if (getFileSize(file) > MAX_FILE_SIZE) {
      oversized.push(file);
    } else {
      uploadable.push(file);
    }
  }

  return { uploadable, oversized };
}

export function extractZip(zipPath: string): string {
  const basename = path.basename(zipPath, ".zip");
  const extractDir = path.join(path.dirname(zipPath), `_extracted_${basename}`);

  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }

  fs.mkdirSync(extractDir, { recursive: true });
  execSync(`ditto -x -k "${zipPath}" "${extractDir}"`);

  const entries = fs.readdirSync(extractDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("__MACOSX"));

  if (dirs.length === 1 && entries.filter((e) => e.isFile()).length === 0) {
    return path.join(extractDir, dirs[0].name);
  }

  return extractDir;
}

export function cleanupExtracted(zipPath: string): void {
  const basename = path.basename(zipPath, ".zip");
  const extractDir = path.join(path.dirname(zipPath), `_extracted_${basename}`);

  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

export interface FolderEntry {
  relativePath: string;
  files: string[];
}

export function buildFolderTree(rootPath: string): FolderEntry[] {
  const entries: FolderEntry[] = [];

  function walk(dirPath: string): void {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = items.filter((i) => i.isFile()).map((i) => path.join(dirPath, i.name)).sort();
    const dirs = items.filter((i) => i.isDirectory()).map((i) => i.name).sort();

    const relative = path.relative(rootPath, dirPath) || path.basename(rootPath);

    if (files.length > 0) {
      entries.push({ relativePath: relative, files });
    }

    for (const dir of dirs) {
      walk(path.join(dirPath, dir));
    }
  }

  walk(rootPath);
  return entries;
}
