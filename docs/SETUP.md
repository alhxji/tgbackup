# Setup Guide

Complete guide to setting up and running the WhatsApp Backup to Telegram tool.

---

## Prerequisites

- **Node.js** v18 or later
- **pnpm** package manager (`npm install -g pnpm`)
- A **Telegram account**
- A **WhatsApp chat export** (from your phone)

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
5. Copy this token. You will need it for the `.env` file.

> **Keep your bot token private.** Anyone with it can control your bot.

---

## Step 2: Create a Private Telegram Channel

1. Open Telegram
2. Tap the **pencil/compose** icon → **New Channel**
3. Give it a name (e.g., `WhatsApp Backup`)
4. Set it to **Private**
5. Skip adding members for now
6. The channel is created

---

## Step 3: Add the Bot to Your Channel as Admin

1. Open the channel you just created
2. Tap the channel name at the top to view info
3. Tap **Administrators** → **Add Administrator**
4. Search for your bot by its username (e.g., `@my_backup_2026_bot`)
5. Select it and **grant all permissions** (especially "Post Messages")
6. Tap **Done** / **Save**

---

## Step 4: Get Your Channel ID

1. Open Telegram and search for **@userinfobot**
2. Start a conversation with it
3. Tap **🔀 Channels** (or send the bot a message — it may show a "Select Channel" option)
4. Select the private channel you created
5. The bot will reply with your channel's info, including a numeric **ID** like:
   ```
   -1001234567890
   ```
6. Copy this ID. You will need it for the `.env` file.

> The channel ID for private channels is always a negative number starting with `-100`.

---

## Step 5: Configure the .env File

1. In the project root, open the `.env` file (or create one if it doesn't exist)
2. Add your bot token and channel ID:

```env
BOT_TOKEN=1234567890:ABCDEFghijklmnopQRSTuvwxyz123456789
CHANNEL_ID=-1001234567890
```

Replace the values above with your actual token and channel ID.

> The `.env` file is already in `.gitignore` so it will not be pushed to GitHub.

---

## Step 6: Install Dependencies

```bash
pnpm install
```

---

## Step 7: Add Your Backup Files

Place WhatsApp exports or any folders you want to back up into the `backups/` folder in the project root.

For **WhatsApp chat exports**, export from WhatsApp on your phone:
1. Open a chat in WhatsApp
2. Tap **⋮ Menu** → **More** → **Export chat**
3. Choose **Include Media** (to get images, videos, etc.)
4. Send or save the export — it will be a `.zip` file
5. Place the `.zip` file directly into the `backups/` folder:
   ```
   backups/
     WhatsApp Chat - John.zip
     WhatsApp Chat - Family Group.zip
     some-folder-to-upload/
   ```

The tool will automatically extract the `.zip`, process it, upload everything, and clean up the extracted files when done.

The `backups/` folder contents are git-ignored so nothing gets pushed to GitHub.

---

## Step 8: Run the Tool

```bash
pnpm dev
```

You will see a menu:

```
  1. Backup a whole folder
  2. Backup a WhatsApp chat
  3. Exit
```

- **Backup a whole folder** — lists folders inside `backups/` for you to pick from (or enter a custom path), then uploads every file to the channel as documents
- **Backup a WhatsApp chat** — lists `.zip` files inside `backups/` for you to pick, extracts the archive, parses the chat, groups by month and day, uploads media per day, sends daily chat `.txt` files, sends the full chat at the end, then cleans up extracted files

---

## Limitations

### Telegram Bot API Limits

| Limit | Value |
|---|---|
| Max file size per upload | **50 MB** |
| Rate limiting | ~20 messages per minute to a channel |

- Files larger than 50MB are detected before upload. You'll be shown which files will be skipped and asked whether to continue.
- The tool adds a delay between uploads to avoid hitting Telegram's rate limits.
- If rate-limited, uploads will be retried up to 3 times with increasing wait times.

### WhatsApp Export Specifics

- The tool looks for a chat text file named `_chat.txt`, `chat.txt`, or any file starting with `WhatsApp Chat`. If there's only one `.txt` file in the folder, it uses that.
- Media files are matched to dates using the WhatsApp naming convention: `IMG-YYYYMMDD-WA0001.jpg`, `VID-YYYYMMDD-WA0001.mp4`, `PTT-YYYYMMDD-WA0001.opus`, etc.
- **Stickers (`STK-*`) are excluded** from backups, as they are third-party content and don't render properly when re-uploaded.
- Media files that don't follow the WhatsApp naming pattern will not be grouped by date.
- WhatsApp exports vary slightly between Android and iOS — the parser handles both common date formats.

### General

- The tool does not compress or transcode media. Files are sent exactly as-is in original quality.
- There is no resume support yet: if the process is interrupted, you would need to re-run the backup. (Duplicates in the Telegram channel would need to be manually cleared.)
- The bot must remain an admin in the channel for the entire duration of the upload.

---

## Troubleshooting

**"BOT_TOKEN is missing from .env file"**
→ Make sure your `.env` file exists in the project root and contains `BOT_TOKEN=your_token_here`.

**"CHANNEL_ID is missing from .env file"**
→ Add `CHANNEL_ID=-100xxxxxxxxxx` to your `.env` file. See Step 4 above.

**"Invalid bot token or connection failed"**
→ Double-check your token from BotFather. Make sure there are no extra spaces.

**"400: Bad Request: chat not found"**
→ The bot hasn't been added to the channel as an admin. See Step 3.

**Files being skipped with 50MB warning**
→ Telegram's Bot API doesn't support files larger than 50MB. These files must be uploaded manually or split.

**Uploads seem slow**
→ There's a built-in 3-second delay between uploads to prevent Telegram rate limits. This is intentional.
