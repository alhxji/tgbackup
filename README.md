# WhatsApp Backup to Telegram

Back up WhatsApp chat exports and folders to a private Telegram channel using a bot.

- Uploads media in original quality (no compression)
- Groups WhatsApp chats by month and day
- Sends daily chat `.txt` files and a full chat archive
- Folder uploads include navigable section headers with a clickable index
- Handles large files, retries, and rate limiting

## Quick Start

```bash
pnpm install
```

Configure your `.env` with your bot token and channel ID, then:

```bash
pnpm dev
```

## Documentation

See **[docs/SETUP.md](docs/SETUP.md)** for the full setup guide — creating a bot, getting your channel ID, configuring `.env`, exporting from WhatsApp, and troubleshooting.
