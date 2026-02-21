# tgbackup

[![Tests](https://img.shields.io/github/actions/workflow/status/alhxji/tgbackup/tests.yml?label=tests&style=flat-square)](https://github.com/alhxji/tgbackup/actions)
[![npm version](https://img.shields.io/npm/v/tgbackup?style=flat-square)](https://www.npmjs.com/package/tgbackup)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

Backup WhatsApp chats, folders, and files to Telegram channels. Works as a CLI tool and as a Node.js library.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [CLI Usage](#cli-usage)
  - [WhatsApp Chat Backup](#whatsapp-chat-backup)
  - [Folder Backup](#folder-backup)
  - [Single File Backup](#single-file-backup)
- [Library Usage](#library-usage)
  - [TgBackup Class](#tgbackup-class)
  - [Backup Functions](#backup-functions)
  - [Progress Tracking](#progress-tracking)
- [Limitations](#limitations)
- [Documentation](#documentation)
- [License](#license)

---

## Features

- **WhatsApp chat backup** — extracts `.zip` exports, parses messages, groups by month/day, uploads media and daily chat logs
- **Folder backup** — uploads entire directory trees with an HTML index containing deep links
- **Single file backup** — quick upload of any file under 50MB
- **Interactive CLI** — arrow-key navigation, spinners, styled output
- **Library API** — use as a Node.js package with full TypeScript types
- **Bot & channel management** — saved persistently so you only enter them once
- **Session resume** — interrupted backups can be resumed where they left off
- **Progress tracking** — real-time progress with ETA
- **Smart media handling** — images display as photos, videos as videos, everything else as documents
- **Date format detection** — auto-detects M/D/Y, D/M/Y, and Y/M/D formats in WhatsApp exports
- **Unicode support** — uses `ditto` on macOS for correct extraction of non-ASCII filenames

---

## Installation

### Global (CLI)

```bash
# npm
npm install -g tgbackup

# yarn
yarn global add tgbackup

# pnpm
pnpm add -g tgbackup
```

Then run:

```bash
tgbackup
```

### Local (Library)

```bash
# npm
npm install tgbackup

# yarn
yarn add tgbackup

# pnpm
pnpm add tgbackup
```

---

## CLI Usage

Run `tgbackup` to start the interactive menu:

```
◆  tgbackup
│
◆  What would you like to do?
│  ● Backup a WhatsApp chat (.zip export)
│  ○ Backup a folder (any directory)
│  ○ Backup a single file (any file)
```

On first run, you'll be prompted to add a bot and channel. These are saved for reuse.

### WhatsApp Chat Backup

1. Select **Backup a WhatsApp chat**
2. Choose a bot and channel
3. Enter the path to your `.zip` export
4. Confirm the summary and start

The tool extracts the archive, parses messages, groups them by month and day, uploads media per day, sends daily chat `.txt` files, and sends the full chat at the end.

### Folder Backup

1. Select **Backup a folder**
2. Choose a bot and channel
3. Enter the folder path
4. Review the file count and confirm

Every file is uploaded in order. A navigable HTML index with deep links to each section is sent at the end.

### Single File Backup

1. Select **Backup a single file**
2. Choose a bot and channel
3. Enter the file path
4. Confirm and upload

---

## Library Usage

### TgBackup Class

The core class for sending files and messages to a Telegram channel:

```ts
import { TgBackup } from "tgbackup";

const tg = new TgBackup({
  botToken: "123456789:ABCDEFghijklmnopQRSTuvwxyz",
  channelId: "-1001234567890",
  onRetry: (attempt, max, sec) => console.log(`Retry ${attempt}/${max} in ${sec}s`),
  onSkip: (name, reason) => console.log(`Skipped: ${name} — ${reason}`),
  onFail: (name, error) => console.log(`Failed: ${name} — ${error}`),
});

const { valid, botUsername } = await tg.validate();

await tg.sendMessage("Hello from tgbackup");
await tg.sendFile("/path/to/photo.jpg");
await tg.sendPhoto("/path/to/image.png", "Caption");
await tg.sendVideo("/path/to/clip.mp4");
await tg.sendDocument("/path/to/file.pdf", "My PDF");
await tg.sendDocumentFromBuffer(Buffer.from("text"), "file.txt");
```

### Backup Functions

High-level functions that handle the full backup workflow:

```ts
import { backupFolder, backupWhatsAppChat, backupFile } from "tgbackup";

// Backup an entire folder
const result = await backupFolder("/path/to/folder", {
  botToken: "123456789:ABCDEFghijklmnopQRSTuvwxyz",
  channelId: "-1001234567890",
  onProgress: (info) => {
    console.log(`${info.percent}% — ${info.currentFile} — ETA: ${info.eta}`);
  },
});

console.log(`Uploaded: ${result.uploaded}, Failed: ${result.failed}`);

// Backup a WhatsApp chat export
const chatResult = await backupWhatsAppChat("/path/to/WhatsApp Chat.zip", {
  botToken: "123456789:ABCDEFghijklmnopQRSTuvwxyz",
  channelId: "-1001234567890",
});

// Backup a single file
const fileResult = await backupFile("/path/to/document.pdf", {
  botToken: "123456789:ABCDEFghijklmnopQRSTuvwxyz",
  channelId: "-1001234567890",
});
```

### Progress Tracking

All backup functions accept an `onProgress` callback:

```ts
interface ProgressInfo {
  completed: number;
  total: number;
  percent: number;
  currentFile: string;
  eta: string;
  elapsed: string;
}

interface BackupResult {
  success: boolean;
  uploaded: number;
  failed: number;
  skipped: number;
  total: number;
  elapsed: string;
}
```

---

## Limitations

| Limit | Value |
|---|---|
| Max file size per upload | 50 MB (Telegram Bot API) |
| Rate limiting | ~20 messages/min (3s delay between uploads) |
| Retry attempts | 3, with increasing backoff |

- Files over 50MB are detected before upload and skipped with a warning.
- Stickers (`STK-*`) from WhatsApp exports are excluded.
- The bot must be an admin in the target channel with "Post Messages" permission.
- Zip extraction uses `ditto` on macOS, `Expand-Archive` on Windows, and `unzip` on Linux.

---

## Documentation

Detailed docs are in the [docs/](docs/) folder:

- [Setup Guide](docs/SETUP.md) — Creating a bot, channel, getting IDs
- [API Reference](docs/API.md) — Full library API documentation
- [CLI Guide](docs/CLI.md) — Detailed CLI walkthrough

---

## License

[MIT](LICENSE)

---

> Looking for a simpler standalone script version? Check out the [`script`](https://github.com/alhxji/tgbackup/tree/script) branch.

---

## Disclaimer

This project is not affiliated with, endorsed by, or associated with Telegram or WhatsApp. All product names, trademarks, and registered trademarks are the property of their respective owners. This tool interacts with the Telegram Bot API under its [Terms of Service](https://core.telegram.org/api/terms). Use responsibly and at your own risk. The authors are not liable for any misuse, data loss, or account restrictions that may result from using this software.
