export { TgBackup } from "./telegram/api";
export type { TgBackupOptions } from "./telegram/api";

export { backupFolder } from "./backup/folder";
export { backupWhatsAppChat } from "./backup/chat";
export { backupFile } from "./backup/file";

export { parseWhatsAppChat, groupMessagesByMonth, generateDailyChatText } from "./whatsapp/parser";
export { groupMediaByDate, findChatFile } from "./whatsapp/media";

export { getMediaType, extractZip, cleanupExtracted, getFileSize, formatFileSize, partitionBySize } from "./utils/files";
export type { MediaType } from "./utils/files";

export { formatMonthHeader, formatDayHeader, formatDateForFilename, dateToKey, monthKey, getMonthName } from "./utils/dates";

export type {
  BotConfig,
  ChannelConfig,
  AppStore,
  ChatMessage,
  DayGroup,
  MonthGroup,
  BackupOptions,
  ProgressInfo,
  BackupResult,
  SessionData,
} from "./types";
