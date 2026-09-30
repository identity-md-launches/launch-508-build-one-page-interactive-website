/** Small bigint statistics over a block's gas prices. Inputs must be sorted ascending. */

export function median(sorted: readonly bigint[]): bigint {
  const n = sorted.length;
  if (n === 0) return 0n;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid] ?? 0n;
  return ((sorted[mid - 1] ?? 0n) + (sorted[mid] ?? 0n)) / 2n;
}

/** Nearest-rank percentile, p in [0, 1]. */
export function percentile(sorted: readonly bigint[], p: number): bigint {
  const n = sorted.length;
  if (n === 0) return 0n;
  const rank = Math.min(n - 1, Math.max(0, Math.ceil(p * n) - 1));
  return sorted[rank] ?? 0n;
}

/** Fraction of entries strictly below `value`. 0 = cheapest, 1 = above everything. */
export function fractionBelow(sorted: readonly bigint[], value: bigint): number {
  if (sorted.length === 0) return 0;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((sorted[mid] ?? 0n) < value) lo = mid + 1;
    else hi = mid;
  }
  return lo / sorted.length;
}

export type ExpenseTier = 'cheap' | 'typical' | 'expensive' | 'extreme';

/**
 * Classify a transaction's gas price by where it sits among the block's prices.
 * The thresholds are position-based so they hold on quiet and congested blocks alike.
 */
export function expenseTier(fraction: number): ExpenseTier {
  if (fraction >= 0.95) return 'extreme';
  if (fraction >= 0.75) return 'expensive';
  if (fraction >= 0.25) return 'typical';
  return 'cheap';
}

export const TIER_LABEL: Record<ExpenseTier, string> = {
  cheap: 'Cheaper than most of its block',
  typical: 'In line with its block',
  expensive: 'Pricier than most of its block',
  extreme: 'Among the priciest in its block',
};
