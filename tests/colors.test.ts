import { describe, it, expect } from "vitest";
import { colors } from "../src/utils/colors";

describe("colors", () => {
  it("wraps text with ANSI escape codes", () => {
    const result = colors.red("error");
    expect(result).toContain("error");
    expect(result).toContain("\x1b[31m");
    expect(result).toContain("\x1b[0m");
  });

  it("has all expected color functions", () => {
    expect(typeof colors.bold).toBe("function");
    expect(typeof colors.dim).toBe("function");
    expect(typeof colors.red).toBe("function");
    expect(typeof colors.green).toBe("function");
    expect(typeof colors.yellow).toBe("function");
    expect(typeof colors.blue).toBe("function");
    expect(typeof colors.magenta).toBe("function");
    expect(typeof colors.cyan).toBe("function");
    expect(typeof colors.white).toBe("function");
    expect(typeof colors.gray).toBe("function");
  });

  it("nests correctly", () => {
    const result = colors.bold(colors.red("alert"));
    expect(result).toContain("\x1b[1m");
    expect(result).toContain("\x1b[31m");
    expect(result).toContain("alert");
  });
});
