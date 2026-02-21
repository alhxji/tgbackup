export interface AppConfig {
  botToken: string;
  channelId: string;
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
