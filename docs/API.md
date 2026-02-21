# API Reference

Full reference for the tgbackup library API.

---

## Table of Contents

- [TgBackup](#tgbackup)
  - [Constructor](#constructor)
  - [validate()](#validate)
  - [sendMessage()](#sendmessage)
  - [sendFile()](#sendfile)
  - [sendPhoto()](#sendphoto)
  - [sendVideo()](#sendvideo)
  - [sendDocument()](#senddocument)
  - [sendDocumentFromBuffer()](#senddocumentfrombuffer)
  - [getMessageLink()](#getmessagelink)
- [Backup Functions](#backup-functions)
  - [backupFolder()](#backupfolder)
  - [backupWhatsAppChat()](#backupwhatsappchat)
  - [backupFile()](#backupfile)
- [Parser Functions](#parser-functions)
  - [parseWhatsAppChat()](#parsewhatsappchat)
  - [groupMessagesByMonth()](#groupmessagesbymonth)
  - [generateDailyChatText()](#generatedailychattext)
- [Media Functions](#media-functions)
  - [groupMediaByDate()](#groupmediabydate)
  - [findChatFile()](#findchatfile)
- [File Utilities](#file-utilities)
  - [getMediaType()](#getmediatype)
  - [formatFileSize()](#formatfilesize)
  - [getFileSize()](#getfilesize)
  - [partitionBySize()](#partitionbysize)
  - [extractZip()](#extractzip)
  - [cleanupExtracted()](#cleanupextracted)
- [Date Utilities](#date-utilities)
- [Types](#types)

---

## TgBackup

The core class for interacting with the Telegram Bot API.

### Constructor

```ts
import { TgBackup } from "tgbackup";

const tg = new TgBackup(options: TgBackupOptions);
```

#### TgBackupOptions

| Property | Type | Required | Description |
|---|---|---|---|
| `botToken` | `string` | Yes | Bot token from @BotFather |
| `channelId` | `string` | Yes | Channel ID (e.g., `-1001234567890`) |
| `onRetry` | `(attempt: number, max: number, sec: number) => void` | No | Called when a retry occurs |
| `onSkip` | `(fileName: string, reason: string) => void` | No | Called when a file is skipped |
| `onFail` | `(fileName: string, error: string) => void` | No | Called when a file fails after all retries |

### validate()

Validates the bot token and channel access.

```ts
const result = await tg.validate();
// { valid: true, botUsername: "my_bot" }
// { valid: false, error: "chat not found" }
```

**Returns:** `Promise<{ valid: boolean; botUsername?: string; error?: string }>`

### sendMessage()

Sends a text message to the channel.

```ts
const messageId = await tg.sendMessage("Hello!", "HTML");
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | — | Message text |
| `parseMode` | `"HTML" \| "Markdown"` | `undefined` | Parse mode for formatting |

**Returns:** `Promise<number | null>` — Message ID on success, `null` on failure.

### sendFile()

Sends a file, automatically detecting whether to use photo, video, or document mode.

```ts
const messageId = await tg.sendFile("/path/to/file.jpg", "My photo");
```

| Parameter | Type | Description |
|---|---|---|
| `filePath` | `string` | Absolute path to the file |
| `caption` | `string?` | Optional caption |

**Returns:** `Promise<number | null>`

**Detection logic:**
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp` → sent as photo
- `.mp4`, `.mkv`, `.avi`, `.mov`, `.3gp`, `.wmv` → sent as video
- Everything else → sent as document

### sendPhoto()

Sends a file as a photo (displayed inline in Telegram).

```ts
const messageId = await tg.sendPhoto("/path/to/image.png", "Caption");
```

### sendVideo()

Sends a file as a video (playable in Telegram).

```ts
const messageId = await tg.sendVideo("/path/to/clip.mp4");
```

### sendDocument()

Sends a file as a document (download link in Telegram).

```ts
const messageId = await tg.sendDocument("/path/to/file.pdf", "My PDF");
```

### sendDocumentFromBuffer()

Sends a buffer as a document with a given filename.

```ts
const buffer = Buffer.from("file content", "utf-8");
const messageId = await tg.sendDocumentFromBuffer(buffer, "output.txt", "Generated file");
```

| Parameter | Type | Description |
|---|---|---|
| `buffer` | `Buffer` | File content |
| `filename` | `string` | Display filename |
| `caption` | `string?` | Optional caption |

### getMessageLink()

Generates a `t.me` deep link to a message in the channel.

```ts
const link = tg.getMessageLink(42);
// "https://t.me/c/1234567890/42"
```

---

## Backup Functions

### backupFolder()

Uploads an entire directory tree to a Telegram channel, with section headers and an HTML index.

```ts
import { backupFolder } from "tgbackup";

const result = await backupFolder("/path/to/folder", options);
```

| Parameter | Type | Description |
|---|---|---|
| `folderPath` | `string` | Path to the folder |
| `options` | `BackupOptions` | Bot token, channel ID, progress callback, session info |

**Returns:** `Promise<BackupResult>`

**Behavior:**
- Scans all files recursively
- Skips files over 50MB
- Sends a header message for each subfolder
- Uploads files in each subfolder
- Sends an HTML index at the end with deep links to each section
- Supports resume via `sessionId` and `resumeFrom`

### backupWhatsAppChat()

Processes a WhatsApp `.zip` export and uploads everything chronologically.

```ts
import { backupWhatsAppChat } from "tgbackup";

const result = await backupWhatsAppChat("/path/to/export.zip", options);
```

**Behavior:**
1. Extracts the zip archive
2. Finds the chat text file
3. Parses all messages
4. Groups by month and day
5. Matches media files to dates
6. For each month: sends header, then for each day: sends day header, media, daily chat `.txt`
7. Sends full chat backup at the end
8. Cleans up extracted files

### backupFile()

Uploads a single file to the channel.

```ts
import { backupFile } from "tgbackup";

const result = await backupFile("/path/to/document.pdf", options);
```

**Throws** if the file doesn't exist, isn't a file, or exceeds 50MB.

---

## Parser Functions

### parseWhatsAppChat()

Parses a WhatsApp chat text file into structured messages.

```ts
import { parseWhatsAppChat } from "tgbackup";

const messages = parseWhatsAppChat("/path/to/_chat.txt");
```

**Returns:** `ChatMessage[]`

Automatically detects date format (M/D/Y, D/M/Y, Y/M/D) by scanning all timestamps.

### groupMessagesByMonth()

Groups parsed messages into month blocks, then day blocks within each month.

```ts
import { groupMessagesByMonth } from "tgbackup";

const months = groupMessagesByMonth(messages);
```

**Returns:** `MonthGroup[]` — Sorted chronologically.

### generateDailyChatText()

Joins message raw text into a single string for a daily chat file.

```ts
const text = generateDailyChatText(dayMessages);
```

---

## Media Functions

### groupMediaByDate()

Scans a directory for WhatsApp media files and groups them by date extracted from filename.

```ts
import { groupMediaByDate } from "tgbackup";

const mediaMap = groupMediaByDate("/path/to/extracted");
// Map<string, string[]> — date key → file paths
```

Recognizes patterns: `IMG-YYYYMMDD-WA*`, `VID-*`, `PTT-*`, `AUD-*`, `DOC-*`, `PHOTO-*`.
Excludes stickers (`STK-*`).

### findChatFile()

Locates the chat text file in a WhatsApp export directory.

```ts
const chatPath = findChatFile("/path/to/extracted");
```

Search order:
1. `_chat.txt`
2. `chat.txt`
3. Files starting with `WhatsApp Chat`
4. If exactly one `.txt` file exists, uses that

---

## File Utilities

### getMediaType()

```ts
getMediaType("photo.jpg")  // "photo"
getMediaType("clip.mp4")   // "video"
getMediaType("file.pdf")   // "document"
```

**Returns:** `"photo" | "video" | "document"`

### formatFileSize()

```ts
formatFileSize(1048576)  // "1.0 MB"
formatFileSize(512)      // "512 B"
```

### getFileSize()

```ts
getFileSize("/path/to/file")  // number (bytes)
```

### partitionBySize()

Splits files into uploadable (≤50MB) and oversized (>50MB).

```ts
const { uploadable, oversized } = partitionBySize(filePaths);
```

### extractZip()

Extracts a `.zip` archive using `ditto` (macOS).

```ts
const extractedPath = extractZip("/path/to/archive.zip");
```

### cleanupExtracted()

Removes the extracted directory created by `extractZip`.

```ts
cleanupExtracted("/path/to/archive.zip");
```

---

## Date Utilities

| Function | Signature | Example Output |
|---|---|---|
| `formatMonthHeader` | `(year, month) → string` | `━━━━━━━━━━━━━━\n📅 JANUARY 2024\n━━━━━━━━━━━━━━` |
| `formatDayHeader` | `(date) → string` | `🗓️ Monday, 1st January 2024` |
| `formatDateForFilename` | `(date) → string` | `01-01-2024` |
| `dateToKey` | `(date) → string` | `2024-01-01` |
| `monthKey` | `(year, month) → string` | `2024-01` |
| `getMonthName` | `(month) → string` | `January` |

---

## Types

### BackupOptions

```ts
interface BackupOptions {
  botToken: string;
  channelId: string;
  onProgress?: (info: ProgressInfo) => void;
  sessionId?: string;
  resumeFrom?: Set<string>;
}
```

### ProgressInfo

```ts
interface ProgressInfo {
  completed: number;
  total: number;
  percent: number;
  currentFile: string;
  eta: string;
  elapsed: string;
}
```

### BackupResult

```ts
interface BackupResult {
  success: boolean;
  uploaded: number;
  failed: number;
  skipped: number;
  total: number;
  elapsed: string;
}
```

### ChatMessage

```ts
interface ChatMessage {
  date: Date;
  sender: string;
  content: string;
  raw: string;
}
```

### MonthGroup

```ts
interface MonthGroup {
  year: number;
  month: number;
  days: DayGroup[];
}
```

### DayGroup

```ts
interface DayGroup {
  date: Date;
  messages: ChatMessage[];
  mediaFiles: string[];
}
```

### SessionData

```ts
interface SessionData {
  id: string;
  type: "chat" | "folder" | "file";
  botToken: string;
  channelId: string;
  sourcePath: string;
  startedAt: string;
  totalFiles: number;
  completedFiles: string[];
  status: "in-progress" | "completed" | "failed";
}
```

### BotConfig

```ts
interface BotConfig {
  id: string;
  token: string;
  username: string;
  name: string;
  addedAt: string;
  channels: ChannelConfig[];
}
```

### ChannelConfig

```ts
interface ChannelConfig {
  id: string;
  title: string;
  addedAt: string;
}
```
