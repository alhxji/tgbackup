import { loadConfig } from "./config";
import { showMenu } from "./utils/prompt";
import { backupFolder } from "./backup/folder";
import { backupWhatsAppChat } from "./backup/chat";
import { colors } from "./utils/colors";

async function main() {
  console.log(colors.bold(colors.cyan("\n  WhatsApp Backup to Telegram\n")));

  const config = loadConfig();

  console.log(colors.green(`  ✓ Bot token loaded`));
  console.log(colors.green(`  ✓ Channel: ${config.channelId}\n`));

  while (true) {
    const choice = await showMenu([
      "Backup a whole folder",
      "Backup a WhatsApp chat",
      "Exit",
    ]);

    switch (choice) {
      case 0:
        await backupFolder(config);
        break;
      case 1:
        await backupWhatsAppChat(config);
        break;
      case 2:
        console.log(colors.gray("\n  Goodbye.\n"));
        process.exit(0);
    }
  }
}

main().catch((error) => {
  console.error(colors.red(`\n  Error: ${error.message}\n`));
  process.exit(1);
});
