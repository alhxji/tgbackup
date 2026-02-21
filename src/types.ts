export interface BotConfig {
  id: string;
  token: string;
  username: string;
  name: string;
  addedAt: string;
  channels: ChannelConfig[];
}

export interface ChannelConfig {
  id: string;
  title: string;
  addedAt: string;
}

export interface AppStore {
  bots: BotConfig[];
}

export interface ChatMessage {
  date: Date;
  sender: string;
  content: string;
  raw: string;
}

export interface DayGroup {
  date: Date;
  messages: ChatMessage[];
  mediaFiles: string[];
}

export interface MonthGroup {
  year: number;
  month: number;
  days: DayGroup[];
}

export interface BackupOptions {
  botToken: string;
  channelId: string;
  onProgress?: (info: ProgressInfo) => void;
  sessionId?: string;
  resumeFrom?: Set<string>;
}

export interface ProgressInfo {
  completed: number;
  total: number;
  percent: number;
  currentFile: string;
  eta: string;
  elapsed: string;
}

export interface BackupResult {
  success: boolean;
  uploaded: number;
  failed: number;
  skipped: number;
  total: number;
  elapsed: string;
}

export interface SessionData {
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
