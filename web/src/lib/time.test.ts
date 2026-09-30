import { describe, expect, it } from 'vitest';
import { approxYears, breakdownSeconds, describeElapsed, elapsedSince } from './time';

describe('elapsed time', () => {
  it('splits seconds into days, hours, minutes', () => {
    const e = breakdownSeconds(3 * 86_400 + 4 * 3_600 + 12 * 60 + 9);
    expect(e).toMatchObject({ days: 3, hours: 4, minutes: 12, seconds: 9 });
  });
  it('never goes negative for a block timestamp in the future', () => {
    expect(elapsedSince(2_000_000_000, 1_000_000_000_000)).toMatchObject({ days: 0, hours: 0, minutes: 0 });
  });
  it('describes elapsed time in words', () => {
    expect(describeElapsed(breakdownSeconds(60))).toBe('1 minute ago');
    expect(describeElapsed(breakdownSeconds(2 * 3_600 + 5 * 60))).toBe('2 hours and 5 minutes ago');
    expect(describeElapsed(breakdownSeconds(86_400 + 60))).toBe('1 day, 0 hours and 1 minute ago');
    expect(describeElapsed(breakdownSeconds(4_072 * 86_400))).toBe('4,072 days, 0 hours and 0 minutes ago');
  });
  it('gives approximate years only past one year', () => {
    expect(approxYears(breakdownSeconds(200 * 86_400))).toBeNull();
    expect(approxYears(breakdownSeconds(3_800 * 86_400))).toBe('10.4 years');
  });
});
