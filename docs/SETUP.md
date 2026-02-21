# Setup Guide

Complete guide to setting up tgbackup.

---

## Prerequisites

- **Node.js** v18 or later
- A **Telegram account**

---

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a conversation and send `/newbot`
3. Follow the prompts:
   - Enter a **display name** for your bot (e.g., `My Backup Bot`)
   - Enter a **username** for your bot (must end in `bot`, e.g., `my_backup_2026_bot`)
4. BotFather will reply with your **Bot Token** — it looks like this:
   ```
   1234567890:ABCDEFghijklmnopQRSTuvwxyz123456789
   ```
5. Copy this token.

> **Keep your bot token private.** Anyone with it can control your bot.

---

## Step 2: Create a Private Telegram Channel

1. Open Telegram
2. Tap the **pencil/compose** icon → **New Channel**
3. Give it a name (e.g., `WhatsApp Backup`)
4. Set it to **Private**
5. Skip adding members for now

---

## Step 3: Add the Bot as Admin

1. Open the channel you just created
2. Tap the channel name at the top to view info
3. Tap **Administrators** → **Add Administrator**
4. Search for your bot by its username (e.g., `@my_backup_2026_bot`)
5. Select it and **grant all permissions** (especially "Post Messages")
6. Tap **Done** / **Save**

---

## Step 4: Get Your Channel ID

1. Open Telegram and search for **@userinfobot**
2. Forward any message from your channel to this bot
3. The bot will reply with the channel's numeric **ID** like:
   ```
   -1001234567890
   ```
4. Copy this ID.

> Private channel IDs are always negative numbers starting with `-100`.

---

## Step 5: Install tgbackup

### CLI (Global)

```bash
# Pick your package manager
npm install -g tgbackup
yarn global add tgbackup
pnpm add -g tgbackup
```

### Library (Local)

```bash
npm install tgbackup
yarn add tgbackup
pnpm add tgbackup
```

---

## Step 6: Run

### CLI

```bash
tgbackup
```

The interactive menu will guide you through:
1. Adding your bot token (validated on entry)
2. Adding your channel ID (verified on entry)
3. Selecting a backup type
4. Entering the source path
5. Confirming and starting the backup

Your bot and channel are saved so you only enter them once.

### Library

```ts
import { TgBackup, backupFolder } from "tgbackup";

const result = await backupFolder("/path/to/folder", {
  botToken: "YOUR_BOT_TOKEN",
  channelId: "YOUR_CHANNEL_ID",
});
```

---

## Exporting a WhatsApp Chat

To get a `.zip` export from WhatsApp:

1. Open a chat in WhatsApp
2. Tap **⋮ Menu** → **More** → **Export chat**
3. Choose **Include Media** to get images, videos, and audio
4. Save or share the `.zip` file to your computer
5. Use the path to this zip when running tgbackup

The tool extracts the archive, parses the chat file, identifies all media, groups everything by date, and uploads it in chronological order.

---

## Troubleshooting

**"Invalid bot token or connection failed"**
→ Double-check your token from BotFather. Make sure there are no extra spaces.

**"Chat not found" or "Forbidden"**
→ The bot hasn't been added to the channel as an admin, or was removed. See Step 3.

**Files being skipped with 50MB warning**
→ Telegram's Bot API has a 50MB per-file limit. These files must be uploaded manually.

**Uploads seem slow**
→ There's a 3-second delay between uploads to prevent Telegram rate limits. This is intentional.

**Zip extraction fails**
→ On macOS, tgbackup uses `ditto` for Unicode support. On Linux, you may need to install `unzip` or modify the extraction logic.
