export interface Elapsed {
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** Break a non-negative number of seconds into days / hours / minutes / seconds. */
export function breakdownSeconds(totalSeconds: number): Elapsed {
  const t = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(t / 86_400);
  const hours = Math.floor((t % 86_400) / 3_600);
  const minutes = Math.floor((t % 3_600) / 60);
  const seconds = t % 60;
  return { totalSeconds: t, days, hours, minutes, seconds };
}

export function elapsedSince(timestampSeconds: number, nowMs: number): Elapsed {
  return breakdownSeconds(nowMs / 1000 - timestampSeconds);
}

/** "3 days, 4 hours and 12 minutes ago" — full words for screen readers and prose. */
export function describeElapsed(e: Elapsed): string {
  const parts: string[] = [];
  if (e.days > 0) parts.push(plural(e.days, 'day'));
  if (e.days > 0 || e.hours > 0) parts.push(plural(e.hours, 'hour'));
  parts.push(plural(e.minutes, 'minute'));
  if (parts.length === 1) return `${parts[0]} ago`;
  const last = parts.pop();
  return `${parts.join(', ')} and ${last} ago`;
}

function plural(n: number, unit: string): string {
  return `${n.toLocaleString('en-US')} ${unit}${n === 1 ? '' : 's'}`;
}

/** Years as a rough decimal for very old transactions, e.g. "9.4 years". */
export function approxYears(e: Elapsed): string | null {
  if (e.days < 365) return null;
  return `${(e.days / 365.25).toFixed(1)} years`;
}

const utcFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const localFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

export function formatUtc(timestampSeconds: number): string {
  return `${utcFormatter.format(new Date(timestampSeconds * 1000))} UTC`;
}

export function formatLocal(timestampSeconds: number): string {
  return localFormatter.format(new Date(timestampSeconds * 1000));
}
