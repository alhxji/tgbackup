import { describe, it, expect } from "vitest";
import {
  cleanPath,
  getMediaType,
  formatFileSize,
  isMediaFile,
  partitionBySize,
} from "../src/utils/files";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

describe("cleanPath", () => {
  it("removes surrounding quotes", () => {
    expect(cleanPath("'/some/path'")).toBe("/some/path");
    expect(cleanPath('"/some/path"')).toBe("/some/path");
  });

  it("trims whitespace", () => {
    expect(cleanPath("  /some/path  ")).toBe("/some/path");
  });

  it("unescapes backslash-spaces", () => {
    expect(cleanPath("/some/path\\ with\\ spaces")).toBe("/some/path with spaces");
  });

  it("expands tilde to home directory", () => {
    const result = cleanPath("~/Documents/test");
    expect(result).toBe(path.join(os.homedir(), "Documents/test"));
  });

  it("handles combined cases", () => {
    const result = cleanPath("  '~/my\\ folder'  ");
    expect(result).toBe(path.join(os.homedir(), "my folder"));
  });
});

describe("getMediaType", () => {
  it("detects images", () => {
    expect(getMediaType("photo.jpg")).toBe("photo");
    expect(getMediaType("photo.jpeg")).toBe("photo");
    expect(getMediaType("photo.png")).toBe("photo");
    expect(getMediaType("photo.gif")).toBe("photo");
    expect(getMediaType("photo.webp")).toBe("photo");
    expect(getMediaType("photo.bmp")).toBe("photo");
  });

  it("detects videos", () => {
    expect(getMediaType("clip.mp4")).toBe("video");
    expect(getMediaType("clip.mkv")).toBe("video");
    expect(getMediaType("clip.avi")).toBe("video");
    expect(getMediaType("clip.mov")).toBe("video");
    expect(getMediaType("clip.3gp")).toBe("video");
    expect(getMediaType("clip.wmv")).toBe("video");
  });

  it("defaults to document for other types", () => {
    expect(getMediaType("file.pdf")).toBe("document");
    expect(getMediaType("archive.zip")).toBe("document");
    expect(getMediaType("song.mp3")).toBe("document");
    expect(getMediaType("file.txt")).toBe("document");
    expect(getMediaType("file.docx")).toBe("document");
  });

  it("is case-insensitive", () => {
    expect(getMediaType("PHOTO.JPG")).toBe("photo");
    expect(getMediaType("Video.MP4")).toBe("video");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(5242880)).toBe("5.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1.0 GB");
  });
});

describe("isMediaFile", () => {
  it("recognizes media extensions", () => {
    expect(isMediaFile("photo.jpg")).toBe(true);
    expect(isMediaFile("video.mp4")).toBe(true);
    expect(isMediaFile("audio.mp3")).toBe(true);
    expect(isMediaFile("doc.pdf")).toBe(true);
  });

  it("excludes plain txt files", () => {
    expect(isMediaFile("chat.txt")).toBe(false);
  });

  it("rejects unknown extensions", () => {
    expect(isMediaFile("file.xyz")).toBe(false);
    expect(isMediaFile("file.rs")).toBe(false);
  });
});

describe("partitionBySize", () => {
  it("separates files by 50MB threshold", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tgbackup-test-"));
    const smallFile = path.join(tmpDir, "small.txt");
    fs.writeFileSync(smallFile, "hello");

    const { uploadable, oversized } = partitionBySize([smallFile]);
    expect(uploadable).toContain(smallFile);
    expect(oversized).toHaveLength(0);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("handles empty array", () => {
    const { uploadable, oversized } = partitionBySize([]);
    expect(uploadable).toHaveLength(0);
    expect(oversized).toHaveLength(0);
  });
});
