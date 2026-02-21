const esc = (code: string) => `\x1b[${code}m`;
const reset = esc("0");
const wrap = (code: string) => (text: string) => `${esc(code)}${text}${reset}`;

export const colors = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  blue: wrap("34"),
  magenta: wrap("35"),
  cyan: wrap("36"),
  white: wrap("37"),
  gray: wrap("90"),
};
