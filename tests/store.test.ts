import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

let tmpDir: string;
let originalHome: string | undefined;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tgbackup-store-"));
  originalHome = process.env.HOME;
  process.env.HOME = tmpDir;
  vi.resetModules();
});

afterEach(() => {
  process.env.HOME = originalHome;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

async function loadStore() {
  return await import("../src/config/store");
}

describe("config store", () => {
  it("returns empty bots array initially", async () => {
    const store = await loadStore();
    expect(store.getBots()).toEqual([]);
  });

  it("adds and retrieves a bot", async () => {
    const store = await loadStore();
    const bot = {
      id: "test-123",
      token: "123:ABC",
      username: "testbot",
      name: "Test Bot",
      addedAt: new Date().toISOString(),
      channels: [],
    };

    store.addBot(bot);
    const bots = store.getBots();
    expect(bots).toHaveLength(1);
    expect(bots[0].username).toBe("testbot");
  });

  it("retrieves bot by id", async () => {
    const store = await loadStore();
    const bot = {
      id: "test-456",
      token: "456:DEF",
      username: "bot2",
      name: "Bot Two",
      addedAt: new Date().toISOString(),
      channels: [],
    };

    store.addBot(bot);
    const found = store.getBotById("test-456");
    expect(found).toBeDefined();
    expect(found!.token).toBe("456:DEF");
  });

  it("returns undefined for unknown bot id", async () => {
    const store = await loadStore();
    expect(store.getBotById("nonexistent")).toBeUndefined();
  });

  it("removes a bot", async () => {
    const store = await loadStore();
    const bot = {
      id: "rm-1",
      token: "tok",
      username: "rmbot",
      name: "RM",
      addedAt: new Date().toISOString(),
      channels: [],
    };

    store.addBot(bot);
    expect(store.getBots()).toHaveLength(1);

    store.removeBot("rm-1");
    expect(store.getBots()).toHaveLength(0);
  });

  it("adds a channel to a bot", async () => {
    const store = await loadStore();
    const bot = {
      id: "ch-1",
      token: "tok",
      username: "chbot",
      name: "CH",
      addedAt: new Date().toISOString(),
      channels: [],
    };

    store.addBot(bot);
    store.addChannel("ch-1", {
      id: "-100123",
      title: "Test Channel",
      addedAt: new Date().toISOString(),
    });

    const updated = store.getBotById("ch-1");
    expect(updated!.channels).toHaveLength(1);
    expect(updated!.channels[0].title).toBe("Test Channel");
  });

  it("removes a channel from a bot", async () => {
    const store = await loadStore();
    const bot = {
      id: "ch-2",
      token: "tok",
      username: "chbot2",
      name: "CH2",
      addedAt: new Date().toISOString(),
      channels: [{ id: "-100999", title: "Ch", addedAt: new Date().toISOString() }],
    };

    store.addBot(bot);
    store.removeChannel("ch-2", "-100999");

    const updated = store.getBotById("ch-2");
    expect(updated!.channels).toHaveLength(0);
  });

  it("creates config directory", async () => {
    const store = await loadStore();
    const configDir = store.getConfigDir();
    expect(fs.existsSync(configDir)).toBe(true);
    expect(configDir).toContain(".tgbackup");
  });
});
