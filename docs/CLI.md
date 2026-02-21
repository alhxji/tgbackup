# CLI Guide

Detailed walkthrough of the tgbackup command-line interface.

---

## Table of Contents

- [Starting](#starting)
- [Main Menu](#main-menu)
- [Managing Bots](#managing-bots)
- [Managing Channels](#managing-channels)
- [WhatsApp Chat Backup](#whatsapp-chat-backup)
- [Folder Backup](#folder-backup)
- [Single File Backup](#single-file-backup)
- [Resuming Backups](#resuming-backups)

---

## Starting

After installing globally:

```bash
tgbackup
```

Or run from source during development:

```bash
pnpm dev
```

---

## Main Menu

On startup, you see the backup type selector:

```
◆  tgbackup
│
◆  What would you like to do?
│  ● Backup a WhatsApp chat (.zip export)
│  ○ Backup a folder (any directory)
│  ○ Backup a single file (any file)
```

Use **arrow keys** to move between options and **Enter** to select. Press **Ctrl+C** at any prompt to exit.

---

## Managing Bots

After selecting a backup type, you pick a bot. On first run, you'll be asked to enter a bot token:

```
◆  Enter bot token (from @BotFather)
│  123456789:ABCDEFghijklmnopQRSTuvwxyz
│
◇  Validating bot token...
│  Connected as @my_backup_bot
│
◇  Bot saved: @my_backup_bot
```

The token is validated immediately by calling the Telegram API. If valid, the bot is saved for future use.

On subsequent runs, saved bots appear as options:

```
◆  Select a bot
│  ● @my_backup_bot (My Backup Bot)
│  ○ Add a new bot
```

---

## Managing Channels

After selecting a bot, pick a channel. When adding a new channel:

```
◆  Enter channel ID
│  -1001234567890
│
◇  Verifying channel access...
│  Channel found: WhatsApp Backup
│
◇  Channel saved: WhatsApp Backup
```

The channel ID is verified by checking that the bot can access it. Saved channels appear per-bot:

```
◆  Select a channel
│  ● WhatsApp Backup (-1001234567890)
│  ○ Add a new channel
```

---

## WhatsApp Chat Backup

1. Export a chat from WhatsApp (**Include Media**)
2. Transfer the `.zip` to your computer
3. Select **Backup a WhatsApp chat**
4. Enter the path to the `.zip` file (drag and drop works in most terminals)

The tool will:
- Extract the archive
- Detect the chat text file
- Parse all messages and detect the date format
- Count media files and calculate sizes
- Show a summary for confirmation:

```
◇  Backup Summary
│    Chat: WhatsApp Chat - John
│    Channel: -1001234567890
│    Messages: 2,847 across 156 days
│    Media: 423
│    Months: 14
│
◆  Start backup?
│  Yes
```

During upload, you see real-time progress:

```
  📅 January 2024

  🗓️ Monday, 1st January 2024
    ✓ IMG-20240101-WA0001.jpg (245.3 KB)  [1/423] 0.2%  ETA: ~21m 8s
    ✓ IMG-20240101-WA0002.jpg (1.2 MB)    [2/423] 0.5%  ETA: ~20m 45s
    ✓ Chat-01-01-2024.txt                 [3/423] 0.7%  ETA: ~20m 30s
```

At the end, the full chat text is uploaded and extracted files are cleaned up:

```
  ✓ Backup complete in 22m 15s
    423 uploaded, 0 failed, 2 skipped, 425 total
```

---

## Folder Backup

1. Select **Backup a folder**
2. Enter the path to any directory

The tool scans all files recursively and shows:

```
◇  Backup Summary
│    Folder: my-documents
│    Channel: -1001234567890
│    Sections: 8
│    Files: 145
│    Skipped (>50MB): 3 file(s)
│
◆  Start backup?
│  Yes
```

Each subfolder gets a header message in the channel. At the end, an HTML index is sent with clickable links to each section.

---

## Single File Backup

1. Select **Backup a single file**
2. Enter the file path

```
◇  Backup Summary
│    File: presentation.pdf
│    Size: 12.4 MB
│    Channel: -1001234567890
│
◆  Start backup?
│  Yes
```

The file is uploaded and the result is shown immediately.

---

## Resuming Backups

If a folder or chat backup is interrupted (Ctrl+C, crash, network error), the session is saved. On the next run with the same backup type, you'll be asked:

```
◆  Found an incomplete backup for /path/to/folder (started 1/15/2024, 2:30 PM)
│  ● Resume where it left off
│  ○ Start over
│  ○ Cancel
```

Choosing **Resume** skips files that were already uploaded successfully.

Single file backups don't use sessions since they're atomic.
