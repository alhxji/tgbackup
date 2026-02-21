const MONTHS_UPPER = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export function formatMonthHeader(year: number, month: number): string {
  return `━━━━━━━━━━━━━━\n📅 ${MONTHS_UPPER[month]} ${year}\n━━━━━━━━━━━━━━`;
}

export function formatDayHeader(date: Date): string {
  const dayName = DAYS[date.getDay()];
  const dayNum = date.getDate();
  const suffix = getOrdinalSuffix(dayNum);
  const monthName = MONTHS_FULL[date.getMonth()];
  const year = date.getFullYear();
  return `🗓️ ${dayName}, ${dayNum}${suffix} ${monthName} ${year}`;
}

export function formatDateForFilename(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function getMonthName(month: number): string {
  return MONTHS_FULL[month];
}
