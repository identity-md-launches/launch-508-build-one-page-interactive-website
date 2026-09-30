import { hexToBigInt, hexToNumber, isTxHash } from './format';
import { fractionBelow, median, percentile } from './stats';

export interface Endpoint {
  id: string;
  label: string;
  url: string;
}

/** Public, keyless JSON-RPC endpoints. The user can also enter their own URL. */
export const ENDPOINTS: readonly Endpoint[] = [
  { id: 'drpc', label: 'dRPC public node', url: 'https://eth.drpc.org' },
  { id: 'publicnode', label: 'PublicNode', url: 'https://ethereum-rpc.publicnode.com' },
];

export type LookupErrorKind = 'invalid' | 'not_found' | 'pending' | 'network' | 'rpc';

export class LookupError extends Error {
  readonly kind: LookupErrorKind;
  constructor(kind: LookupErrorKind, message: string) {
    super(message);
    this.name = 'LookupError';
    this.kind = kind;
  }
}

interface RpcTx {
  hash: string;
  blockNumber: string | null;
  blockHash: string | null;
  transactionIndex: string | null;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice?: string | null;
  maxFeePerGas?: string | null;
  maxPriorityFeePerGas?: string | null;
  nonce: string;
  type?: string;
}

interface RpcReceipt {
  status?: string | null;
  gasUsed: string;
  effectiveGasPrice?: string | null;
  contractAddress: string | null;
}

interface RpcBlock {
  number: string;
  hash: string;
  timestamp: string;
  baseFeePerGas?: string | null;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  transactions: RpcTx[];
}

export type TxStatus = 'success' | 'failed' | 'unknown';

export interface TxReport {
  hash: string;
  endpoint: string;
  blockNumber: bigint;
  blockHash: string;
  timestamp: number;
  transactionIndex: number;
  from: string;
  to: string | null;
  contractAddress: string | null;
  value: bigint;
  nonce: number;
  type: number;
  gasLimit: bigint;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
  feeWei: bigint;
  status: TxStatus;
  headBlock: bigint;
  block: BlockContext;
}

export interface BlockContext {
  baseFeePerGas: bigint | null;
  gasUsed: bigint;
  gasLimit: bigint;
  miner: string;
  txCount: number;
  /** Effective gas price of every transaction in the block, ascending. */
  sortedPrices: bigint[];
  min: bigint;
  median: bigint;
  p90: bigint;
  max: bigint;
  /** Fraction of the block's transactions that paid strictly less than this one. */
  fractionBelow: number;
  /** 1-based rank from the cheapest transaction. */
  rankFromCheapest: number;
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

async function call<T>(url: string, method: string, params: unknown[], signal: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal,
    });
  } catch (e) {
    if (signal.aborted) {
      throw new LookupError('network', 'The node did not answer within 25 seconds. Try again or choose another data source.');
    }
    throw new LookupError('network', 'Unable to reach the node. Check your connection or choose another data source.');
  }
  if (!res.ok) {
    throw new LookupError('rpc', `The node answered with HTTP ${res.status}. Try again or choose another data source.`);
  }
  const body = (await res.json()) as JsonRpcResponse<T>;
  if (body.error) {
    throw new LookupError('rpc', `The node rejected the request: ${body.error.message}. Try another data source.`);
  }
  return body.result as T;
}

/** Effective gas price of a mined transaction from its own fields plus the block base fee. */
export function effectivePriceOf(tx: RpcTx, baseFee: bigint | null): bigint {
  if (tx.gasPrice) return hexToBigInt(tx.gasPrice);
  const maxFee = hexToBigInt(tx.maxFeePerGas);
  const tip = hexToBigInt(tx.maxPriorityFeePerGas);
  if (baseFee === null) return maxFee;
  const withTip = baseFee + tip;
  return withTip < maxFee ? withTip : maxFee;
}

export function buildBlockContext(block: RpcBlock, ownPrice: bigint): BlockContext {
  const baseFee = block.baseFeePerGas ? hexToBigInt(block.baseFeePerGas) : null;
  const prices = block.transactions.map((t) => effectivePriceOf(t, baseFee));
  prices.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const below = fractionBelow(prices, ownPrice);
  return {
    baseFeePerGas: baseFee,
    gasUsed: hexToBigInt(block.gasUsed),
    gasLimit: hexToBigInt(block.gasLimit),
    miner: block.miner,
    txCount: prices.length,
    sortedPrices: prices,
    min: prices[0] ?? 0n,
    median: median(prices),
    p90: percentile(prices, 0.9),
    max: prices[prices.length - 1] ?? 0n,
    fractionBelow: below,
    rankFromCheapest: Math.round(below * prices.length) + 1,
  };
}

export async function lookupTransaction(hash: string, endpointUrl: string, signal?: AbortSignal): Promise<TxReport> {
  if (!isTxHash(hash)) {
    throw new LookupError('invalid', 'Enter a 66-character transaction hash: 0x followed by 64 hex characters.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  signal?.addEventListener('abort', () => controller.abort(), { once: true });
  const sig = controller.signal;

  try {
    const tx = await call<RpcTx | null>(endpointUrl, 'eth_getTransactionByHash', [hash], sig);
    if (!tx) {
      throw new LookupError(
        'not_found',
        'No transaction with this hash is known to the node. Check the hash, or try another data source if it was sent moments ago.',
      );
    }
    if (!tx.blockNumber) {
      throw new LookupError('pending', 'This transaction is still pending and has no block yet. Try again once it is mined.');
    }
    const [receipt, block, head] = await Promise.all([
      call<RpcReceipt | null>(endpointUrl, 'eth_getTransactionReceipt', [hash], sig),
      call<RpcBlock | null>(endpointUrl, 'eth_getBlockByNumber', [tx.blockNumber, true], sig),
      call<string>(endpointUrl, 'eth_blockNumber', [], sig),
    ]);
    if (!receipt || !block) {
      throw new LookupError('rpc', 'The node returned the transaction but not its receipt or block. Try another data source.');
    }
    const baseFee = block.baseFeePerGas ? hexToBigInt(block.baseFeePerGas) : null;
    const effectiveGasPrice = receipt.effectiveGasPrice
      ? hexToBigInt(receipt.effectiveGasPrice)
      : effectivePriceOf(tx, baseFee);
    const gasUsed = hexToBigInt(receipt.gasUsed);
    let status: TxStatus = 'unknown';
    if (receipt.status === '0x1') status = 'success';
    else if (receipt.status === '0x0') status = 'failed';

    return {
      hash: tx.hash,
      endpoint: endpointUrl,
      blockNumber: hexToBigInt(tx.blockNumber),
      blockHash: block.hash,
      timestamp: hexToNumber(block.timestamp),
      transactionIndex: hexToNumber(tx.transactionIndex),
      from: tx.from,
      to: tx.to,
      contractAddress: receipt.contractAddress,
      value: hexToBigInt(tx.value),
      nonce: hexToNumber(tx.nonce),
      type: hexToNumber(tx.type ?? '0x0'),
      gasLimit: hexToBigInt(tx.gas),
      gasUsed,
      effectiveGasPrice,
      maxFeePerGas: tx.maxFeePerGas ? hexToBigInt(tx.maxFeePerGas) : null,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? hexToBigInt(tx.maxPriorityFeePerGas) : null,
      feeWei: gasUsed * effectiveGasPrice,
      status,
      headBlock: hexToBigInt(head),
      block: buildBlockContext(block, effectiveGasPrice),
    };
  } finally {
    clearTimeout(timer);
  }
}
