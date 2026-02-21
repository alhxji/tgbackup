import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { colors } from "./colors";

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export async function askQuestion(prompt: string): Promise<string> {
  const rl = createInterface();
  return new Promise((resolve) => {
    rl.question(colors.cyan(`  ${prompt} `), (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function askConfirmation(prompt: string): Promise<boolean> {
  const answer = await askQuestion(`${prompt} (y/n):`);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

export async function showMenu(options: string[]): Promise<number> {
  console.log("");
  options.forEach((opt, i) => {
    console.log(colors.white(`  ${i + 1}. ${opt}`));
  });
  console.log("");

  const answer = await askQuestion("Select an option:");
  const index = parseInt(answer) - 1;

  if (isNaN(index) || index < 0 || index >= options.length) {
    console.log(colors.red("  Invalid selection. Try again."));
    return showMenu(options);
  }

  return index;
}

export async function pickFolder(baseDir: string, label: string): Promise<string | null> {
  if (!fs.existsSync(baseDir)) {
    console.log(colors.yellow(`\n  ${baseDir} does not exist.`));
    const custom = await askQuestion("Enter full folder path (or drag & drop):");
    return custom || null;
  }

  const subdirs = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();

  if (subdirs.length === 0) {
    console.log(colors.yellow(`\n  No folders found in ${baseDir}`));
    const custom = await askQuestion("Enter full folder path (or drag & drop):");
    return custom || null;
  }

  console.log(colors.white(`\n  ${label}`));
  console.log(colors.gray(`  Folders in ${baseDir}:\n`));

  subdirs.forEach((dir, i) => {
    const count = countFilesInDir(path.join(baseDir, dir));
    console.log(colors.white(`  ${i + 1}. ${dir}`) + colors.gray(` (${count} items)`));
  });

  console.log(colors.dim(`  ${subdirs.length + 1}. Use a custom path`));
  console.log("");

  const answer = await askQuestion("Select a folder:");
  const index = parseInt(answer) - 1;

  if (index === subdirs.length) {
    const custom = await askQuestion("Enter full folder path (or drag & drop):");
    return custom || null;
  }

  if (isNaN(index) || index < 0 || index >= subdirs.length) {
    console.log(colors.red("  Invalid selection."));
    return null;
  }

  return path.join(baseDir, subdirs[index]);
}

export async function pickZipFile(baseDir: string, label: string): Promise<string | null> {
  if (!fs.existsSync(baseDir)) {
    console.log(colors.yellow(`\n  ${baseDir} does not exist.`));
    const custom = await askQuestion("Enter full path to .zip file (or drag & drop):");
    return custom || null;
  }

  const zips = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith(".zip"))
    .map((d) => d.name)
    .sort();

  if (zips.length === 0) {
    console.log(colors.yellow(`\n  No .zip files found in ${baseDir}`));
    console.log(colors.gray("  Place your WhatsApp export .zip files in the backups/ folder.\n"));
    const custom = await askQuestion("Enter full path to .zip file (or drag & drop):");
    return custom || null;
  }

  console.log(colors.white(`\n  ${label}`));
  console.log(colors.gray(`  Files in ${baseDir}:\n`));

  zips.forEach((name, i) => {
    const size = formatFileSizeSimple(fs.statSync(path.join(baseDir, name)).size);
    console.log(colors.white(`  ${i + 1}. ${name}`) + colors.gray(` (${size})`));
  });

  console.log(colors.dim(`  ${zips.length + 1}. Use a custom path`));
  console.log("");

  const answer = await askQuestion("Select a file:");
  const index = parseInt(answer) - 1;

  if (index === zips.length) {
    const custom = await askQuestion("Enter full path to .zip file (or drag & drop):");
    return custom || null;
  }

  if (isNaN(index) || index < 0 || index >= zips.length) {
    console.log(colors.red("  Invalid selection."));
    return null;
  }

  return path.join(baseDir, zips[index]);
}

function formatFileSizeSimple(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countFilesInDir(dirPath: string): number {
  try {
    return fs.readdirSync(dirPath).length;
  } catch {
    return 0;
  }
}
