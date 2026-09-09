const WIB_TIME_ZONE = "Asia/Jakarta";
const WIB_LABEL = "WIB";

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatInWib(value: string | Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: WIB_TIME_ZONE }).format(toDate(value));
}

export function getGreeting(date: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: WIB_TIME_ZONE }).format(date),
  );

  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 18) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

export function formatDate(value: string | Date): string {
  return formatInWib(value, { day: "numeric", month: "short", year: "numeric" });
}

export function formatSessionSchedule(value: string | Date): string {
  const weekday = formatInWib(value, { weekday: "long" });
  const time = formatInWib(value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${weekday} · ${time} ${WIB_LABEL}`;
}

export function formatDuration(durationSeconds: number): string {
  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${minutes} min`;
}

export function formatPrice(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - toDate(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (hours < 48) {
    return "Yesterday";
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} days ago`;
  }
  return formatDate(value);
}
