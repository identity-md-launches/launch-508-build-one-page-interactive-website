import { describe, expect, it } from 'vitest';
import {
  formatEth,
  formatGwei,
  formatInteger,
  formatRatio,
  formatUnits,
  isTxHash,
  normalizeTxHash,
  shortHex,
} from './format';

const HASH = '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060';

describe('hash validation', () => {
  it('accepts a 0x-prefixed 64-hex hash', () => {
    expect(isTxHash(HASH)).toBe(true);
  });
  it('rejects wrong lengths and non-hex', () => {
    expect(isTxHash(HASH.slice(0, 65))).toBe(false);
    expect(isTxHash(`${HASH}0`)).toBe(false);
    expect(isTxHash(HASH.replace('5c', 'zz'))).toBe(false);
    expect(isTxHash('')).toBe(false);
  });
  it('normalizes whitespace and a missing 0x prefix', () => {
    expect(normalizeTxHash(`  ${HASH}\n`)).toBe(HASH);
    expect(normalizeTxHash(HASH.slice(2))).toBe(HASH);
    expect(normalizeTxHash('abc')).toBe('abc');
  });
});

describe('unit formatting', () => {
  it('formats wei as ETH with trimmed fraction', () => {
    expect(formatEth(1_000_000_000_000_000_000n)).toBe('1');
    expect(formatEth(1_050_000_000_000_000n)).toBe('0.00105');
    expect(formatEth(0n)).toBe('0');
  });
  it('flags dust that rounds to zero', () => {
    expect(formatEth(1n)).toBe('<0.00000001');
  });
  it('formats gwei with three decimals max', () => {
    expect(formatGwei(50_000_000_000n)).toBe('50');
    expect(formatGwei(1_234_567_890n)).toBe('1.234');
    expect(formatGwei(296_910_000n)).toBe('0.296');
  });
  it('groups thousands', () => {
    expect(formatInteger(21_000n)).toBe('21,000');
    expect(formatInteger(26_089_728)).toBe('26,089,728');
    // Fractions are truncated, not rounded, so a fee is never shown higher than it was.
    expect(formatUnits(1_234_567_000_000_000_000_000n, 18, 2)).toBe('1,234.56');
  });
  it('formats ratios and guards zero denominators', () => {
    expect(formatRatio(3n, 2n)).toBe('1.50×');
    expect(formatRatio(25n, 2n)).toBe('12.5×');
    expect(formatRatio(1n, 0n)).toBe('–');
  });
});

describe('shortHex', () => {
  it('keeps head and tail', () => {
    expect(shortHex('0xa1e4380a3b1f749673e270229993ee55f35663b4')).toBe('0xa1e4…63b4');
  });
  it('leaves short values alone', () => {
    expect(shortHex('0x1234')).toBe('0x1234');
  });
});
