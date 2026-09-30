// Pure formatting helpers. No DOM, no network: unit-tested in format.test.ts.

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const BARE_HASH_RE = /^[0-9a-fA-F]{64}$/;

/** Trim whitespace and accept a bare 64-hex string by prefixing 0x. */
export function normalizeTxHash(raw: string): string {
  const s = raw.trim();
  if (BARE_HASH_RE.test(s)) return `0x${s}`;
  return s;
}

export function isTxHash(s: string): boolean {
  return TX_HASH_RE.test(s);
}

export function hexToBigInt(hex: string | null | undefined): bigint {
  if (!hex) return 0n;
  return BigInt(hex);
}

export function hexToNumber(hex: string | null | undefined): number {
  if (!hex) return 0;
  return Number(BigInt(hex));
}

/**
 * Format an integer amount of base units as a decimal string.
 * Trailing zeros are trimmed; at least `minFraction` digits are kept.
 */
export function formatUnits(
  value: bigint,
  decimals: number,
  maxFraction: number,
  minFraction = 0,
): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  let fraction = (abs % base).toString().padStart(decimals, '0');
  fraction = fraction.slice(0, maxFraction);
  // Trim trailing zeros but keep the minimum.
  while (fraction.length > minFraction && fraction.endsWith('0')) {
    fraction = fraction.slice(0, -1);
  }
  const wholeStr = groupDigits(whole.toString());
  const out = fraction.length > 0 ? `${wholeStr}.${fraction}` : wholeStr;
  if (abs > 0n && /^[0.,]*$/.test(out)) {
    // Non-zero value that rounds to zero at this precision.
    return `<0.${'0'.repeat(Math.max(maxFraction - 1, 0))}1`;
  }
  return negative ? `-${out}` : out;
}

export function groupDigits(intString: string): string {
  return intString.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatEth(wei: bigint): string {
  return formatUnits(wei, 18, 8);
}

export function formatGwei(wei: bigint, maxFraction = 3): string {
  return formatUnits(wei, 9, maxFraction);
}

export function formatInteger(n: bigint | number): string {
  return groupDigits(BigInt(n).toString());
}

/** 0x1234…abcd style. Never truncates when the input is already short. */
export function shortHex(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Percentage with one decimal, e.g. "12.5%". */
export function formatPercent(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '–';
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Ratio like "3.2×"; falls back to "–" when the base is zero. */
export function formatRatio(numerator: bigint, denominator: bigint): string {
  if (denominator === 0n) return '–';
  const scaled = Number((numerator * 1000n) / denominator) / 1000;
  const digits = scaled >= 10 ? 1 : 2;
  return `${scaled.toFixed(digits)}×`;
}

export function txTypeLabel(type: number): string {
  switch (type) {
    case 0:
      return 'Legacy (type 0)';
    case 1:
      return 'Access list (type 1)';
    case 2:
      return 'EIP-1559 (type 2)';
    case 3:
      return 'Blob (type 3)';
    case 4:
      return 'Set code (type 4)';
    default:
      return `Type ${type}`;
  }
}
