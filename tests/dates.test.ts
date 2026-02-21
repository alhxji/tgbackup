import { describe, it, expect } from "vitest";
import {
  formatMonthHeader,
  formatDayHeader,
  formatDateForFilename,
  dateToKey,
  monthKey,
  getMonthName,
} from "../src/utils/dates";

describe("formatMonthHeader", () => {
  it("formats with uppercase month name", () => {
    const result = formatMonthHeader(2024, 0);
    expect(result).toContain("JANUARY");
    expect(result).toContain("2024");
  });

  it("uses separator lines", () => {
    const result = formatMonthHeader(2024, 11);
    expect(result).toContain("━━━━━━━━━━━━━━");
    expect(result).toContain("DECEMBER 2024");
  });
});

describe("formatDayHeader", () => {
  it("includes day name and ordinal suffix", () => {
    const date = new Date(2024, 0, 1);
    const result = formatDayHeader(date);
    expect(result).toContain("Monday");
    expect(result).toContain("1st");
    expect(result).toContain("January");
    expect(result).toContain("2024");
  });

  it("handles 2nd suffix", () => {
    const date = new Date(2024, 5, 2);
    const result = formatDayHeader(date);
    expect(result).toContain("2nd");
  });

  it("handles 3rd suffix", () => {
    const date = new Date(2024, 5, 3);
    const result = formatDayHeader(date);
    expect(result).toContain("3rd");
  });

  it("handles 11th/12th/13th as th", () => {
    expect(formatDayHeader(new Date(2024, 0, 11))).toContain("11th");
    expect(formatDayHeader(new Date(2024, 0, 12))).toContain("12th");
    expect(formatDayHeader(new Date(2024, 0, 13))).toContain("13th");
  });

  it("handles 21st, 22nd, 23rd", () => {
    expect(formatDayHeader(new Date(2024, 0, 21))).toContain("21st");
    expect(formatDayHeader(new Date(2024, 0, 22))).toContain("22nd");
    expect(formatDayHeader(new Date(2024, 0, 23))).toContain("23rd");
  });
});

describe("formatDateForFilename", () => {
  it("formats as DD-MM-YYYY", () => {
    const date = new Date(2024, 0, 5);
    expect(formatDateForFilename(date)).toBe("05-01-2024");
  });

  it("zero-pads single digits", () => {
    const date = new Date(2024, 2, 9);
    expect(formatDateForFilename(date)).toBe("09-03-2024");
  });
});

describe("dateToKey", () => {
  it("formats as YYYY-MM-DD", () => {
    const date = new Date(2024, 0, 15);
    expect(dateToKey(date)).toBe("2024-01-15");
  });

  it("zero-pads months and days", () => {
    const date = new Date(2024, 8, 3);
    expect(dateToKey(date)).toBe("2024-09-03");
  });
});

describe("monthKey", () => {
  it("formats as YYYY-MM", () => {
    expect(monthKey(2024, 0)).toBe("2024-01");
    expect(monthKey(2024, 11)).toBe("2024-12");
  });

  it("zero-pads month", () => {
    expect(monthKey(2024, 5)).toBe("2024-06");
  });
});

describe("getMonthName", () => {
  it("returns full month name", () => {
    expect(getMonthName(0)).toBe("January");
    expect(getMonthName(6)).toBe("July");
    expect(getMonthName(11)).toBe("December");
  });
});
