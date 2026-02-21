import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { SessionData } from "../types";
import { getConfigDir } from "../config/store";

const SESSIONS_DIR = path.join(getConfigDir(), "sessions");

function ensureDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function sessionPath(id: string): string {
  return path.join(SESSIONS_DIR, `${id}.json`);
}

export function createSession(
  type: "chat" | "folder",
  botToken: string,
  channelId: string,
  sourcePath: string,
  totalFiles: number
): SessionData {
  ensureDir();
  const session: SessionData = {
    id: uuidv4(),
    type,
    botToken,
    channelId,
    sourcePath,
    startedAt: new Date().toISOString(),
    totalFiles,
    completedFiles: [],
    status: "in-progress",
  };
  fs.writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2), "utf-8");
  return session;
}

export function updateSession(id: string, completedFile: string): void {
  const file = sessionPath(id);
  if (!fs.existsSync(file)) return;
  try {
    const session: SessionData = JSON.parse(fs.readFileSync(file, "utf-8"));
    session.completedFiles.push(completedFile);
    fs.writeFileSync(file, JSON.stringify(session, null, 2), "utf-8");
  } catch {}
}

export function completeSession(id: string): void {
  const file = sessionPath(id);
  if (!fs.existsSync(file)) return;
  try {
    const session: SessionData = JSON.parse(fs.readFileSync(file, "utf-8"));
    session.status = "completed";
    fs.writeFileSync(file, JSON.stringify(session, null, 2), "utf-8");
  } catch {}
}

export function failSession(id: string): void {
  const file = sessionPath(id);
  if (!fs.existsSync(file)) return;
  try {
    const session: SessionData = JSON.parse(fs.readFileSync(file, "utf-8"));
    session.status = "failed";
    fs.writeFileSync(file, JSON.stringify(session, null, 2), "utf-8");
  } catch {}
}

export function findIncompleteSessions(type: "chat" | "folder"): SessionData[] {
  ensureDir();
  const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"));
  const sessions: SessionData[] = [];

  for (const file of files) {
    try {
      const data: SessionData = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), "utf-8"));
      if (data.type === type && data.status === "in-progress") {
        sessions.push(data);
      }
    } catch {}
  }

  return sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function getSession(id: string): SessionData | null {
  const file = sessionPath(id);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as SessionData;
  } catch {
    return null;
  }
}

export function deleteSession(id: string): void {
  const file = sessionPath(id);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}
