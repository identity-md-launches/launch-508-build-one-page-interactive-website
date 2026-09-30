import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildBlockContext, effectivePriceOf, LookupError, lookupTransaction } from './rpc';
import { expenseTier, fractionBelow, median, percentile } from './stats';

const HASH = '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060';

function tx(gasPrice: string, extra: Record<string, unknown> = {}) {
  return {
    hash: '0x' + '1'.repeat(64),
    blockNumber: '0x10',
    blockHash: '0x' + '2'.repeat(64),
    transactionIndex: '0x0',
    from: '0x' + 'a'.repeat(40),
    to: '0x' + 'b'.repeat(40),
    value: '0x0',
    gas: '0x5208',
    gasPrice,
    nonce: '0x1',
    type: '0x2',
    ...extra,
  };
}

describe('stats', () => {
  const sorted = [1n, 2n, 3n, 4n, 10n];
  it('median and percentile', () => {
    expect(median(sorted)).toBe(3n);
    expect(median([1n, 2n, 3n, 4n])).toBe(2n);
    expect(percentile(sorted, 0.9)).toBe(10n);
    expect(percentile([], 0.5)).toBe(0n);
  });
  it('fractionBelow counts strictly lower prices', () => {
    expect(fractionBelow(sorted, 1n)).toBe(0);
    expect(fractionBelow(sorted, 3n)).toBe(0.4);
    expect(fractionBelow(sorted, 100n)).toBe(1);
  });
  it('tiers by position', () => {
    expect(expenseTier(0)).toBe('cheap');
    expect(expenseTier(0.5)).toBe('typical');
    expect(expenseTier(0.8)).toBe('expensive');
    expect(expenseTier(0.99)).toBe('extreme');
  });
});

describe('effective price', () => {
  it('prefers the node-reported gasPrice', () => {
    expect(effectivePriceOf(tx('0x10'), 5n)).toBe(16n);
  });
  it('derives min(maxFee, base + tip) for 1559 transactions without gasPrice', () => {
    const t = tx('', { gasPrice: null, maxFeePerGas: '0x64', maxPriorityFeePerGas: '0x2' });
    expect(effectivePriceOf(t, 50n)).toBe(52n);
    expect(effectivePriceOf(t, 200n)).toBe(100n);
  });
});

describe('block context', () => {
  it('sorts prices and ranks the transaction', () => {
    const block = {
      number: '0x10',
      hash: '0x' + '2'.repeat(64),
      timestamp: '0x5f5e100',
      baseFeePerGas: '0x5',
      gasUsed: '0x100',
      gasLimit: '0x200',
      miner: '0x' + 'c'.repeat(40),
      transactions: [tx('0x30'), tx('0x10'), tx('0x20'), tx('0x40')],
    };
    const ctx = buildBlockContext(block, 0x20n);
    expect(ctx.sortedPrices).toEqual([0x10n, 0x20n, 0x30n, 0x40n]);
    expect(ctx.min).toBe(0x10n);
    expect(ctx.max).toBe(0x40n);
    expect(ctx.median).toBe(0x28n);
    expect(ctx.fractionBelow).toBe(0.25);
    expect(ctx.rankFromCheapest).toBe(2);
    expect(ctx.baseFeePerGas).toBe(5n);
  });
});

describe('lookupTransaction', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubRpc(handler: (method: string, params: unknown[]) => unknown) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { method: string; params: unknown[] };
        const result = handler(body.method, body.params);
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), { status: 200 });
      }),
    );
  }

  it('rejects malformed hashes before any request', async () => {
    await expect(lookupTransaction('0x123', 'https://example.invalid')).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('reports not_found and pending', async () => {
    stubRpc(() => null);
    await expect(lookupTransaction(HASH, 'https://example.invalid')).rejects.toMatchObject({ kind: 'not_found' });
    stubRpc(() => tx('0x1', { blockNumber: null }));
    await expect(lookupTransaction(HASH, 'https://example.invalid')).rejects.toMatchObject({ kind: 'pending' });
  });

  it('assembles a report from tx, receipt, block and head', async () => {
    stubRpc((method) => {
      switch (method) {
        case 'eth_getTransactionByHash':
          return tx('0x20');
        case 'eth_getTransactionReceipt':
          return { status: '0x1', gasUsed: '0x5208', effectiveGasPrice: '0x20', contractAddress: null };
        case 'eth_getBlockByNumber':
          return {
            number: '0x10',
            hash: '0x' + '2'.repeat(64),
            timestamp: '0x5f5e100',
            baseFeePerGas: '0x8',
            gasUsed: '0x100',
            gasLimit: '0x200',
            miner: '0x' + 'c'.repeat(40),
            transactions: [tx('0x10'), tx('0x20'), tx('0x30')],
          };
        case 'eth_blockNumber':
          return '0x20';
        default:
          throw new Error(`unexpected ${method}`);
      }
    });
    const r = await lookupTransaction(HASH, 'https://example.invalid');
    expect(r.blockNumber).toBe(16n);
    expect(r.headBlock).toBe(32n);
    expect(r.status).toBe('success');
    expect(r.gasUsed).toBe(21_000n);
    expect(r.effectiveGasPrice).toBe(32n);
    expect(r.feeWei).toBe(21_000n * 32n);
    expect(r.timestamp).toBe(100_000_000);
    expect(r.block.txCount).toBe(3);
    expect(r.block.median).toBe(32n);
  });

  it('turns node errors into rpc lookup errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'rate limited' } })),
      ),
    );
    const err = await lookupTransaction(HASH, 'https://example.invalid').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LookupError);
    expect((err as LookupError).kind).toBe('rpc');
    expect((err as LookupError).message).toContain('rate limited');
  });

  it('turns network failures into network lookup errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    await expect(lookupTransaction(HASH, 'https://example.invalid')).rejects.toMatchObject({ kind: 'network' });
  });
});
