import { useMemo } from 'react';
import type { TxReport } from '../lib/rpc';
import { formatGwei, formatInteger, formatPercent, formatRatio } from '../lib/format';
import { expenseTier, TIER_LABEL } from '../lib/stats';
import { RankChart } from './RankChart';

interface Props {
  report: TxReport;
}

interface Row {
  key: string;
  label: string;
  value: bigint;
  own?: boolean;
}

/**
 * Visual comparison of the transaction's effective gas price against its block:
 * a horizontal bar set (base fee, median, this transaction, 90th percentile) and a
 * rank strip of every transaction in the block.
 */
export function GasComparison({ report }: Props) {
  const { block } = report;
  const price = report.effectiveGasPrice;
  const tier = expenseTier(block.fractionBelow);

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    if (block.baseFeePerGas !== null) list.push({ key: 'base', label: 'Block base fee', value: block.baseFeePerGas });
    list.push({ key: 'min', label: 'Cheapest in block', value: block.min });
    list.push({ key: 'median', label: 'Block median', value: block.median });
    list.push({ key: 'own', label: 'This transaction', value: price, own: true });
    list.push({ key: 'p90', label: 'Block 90th percentile', value: block.p90 });
    return list;
  }, [block, price]);

  const scaleMax = rows.reduce((m, r) => (r.value > m ? r.value : m), 0n);
  const priority = block.baseFeePerGas !== null ? price - block.baseFeePerGas : null;
  const pctAboveMedian = block.median > 0n ? Number(((price - block.median) * 1000n) / block.median) / 1000 : 0;

  const verdict =
    block.txCount <= 1
      ? 'This is the only transaction in its block, so there is nothing to compare it against.'
      : `${TIER_LABEL[tier]}: it paid more than ${formatPercent(block.fractionBelow, 0)} of the ${formatInteger(
          block.txCount,
        )} transactions mined alongside it.`;

  return (
    <section className="panel" aria-labelledby="gas-heading">
      <div className="panel__head">
        <h2 id="gas-heading">Gas price versus its block</h2>
        {block.txCount > 1 ? <span className={`badge badge--tier badge--tier-${tier}`}>{tierWord(tier)}</span> : null}
      </div>
      <p className="panel__lede">{verdict}</p>

      <div className="gas-grid">
        <figure className="bars" aria-labelledby="bars-caption">
          <figcaption id="bars-caption" className="figure__caption">
            Effective gas price in gwei. The accent bar is this transaction.
          </figcaption>
          <ol className="bars__list">
            {rows.map((r) => {
              const width = scaleMax > 0n ? Number((r.value * 10_000n) / scaleMax) / 100 : 0;
              return (
                <li key={r.key} className={`bar${r.own ? ' bar--own' : ''}`}>
                  <span className="bar__label">{r.label}</span>
                  <span className="bar__track" aria-hidden="true">
                    <span className="bar__fill" style={{ width: `${Math.max(width, 0.6)}%` }} />
                  </span>
                  <span className="bar__value num">{formatGwei(r.value)} gwei</span>
                </li>
              );
            })}
          </ol>
        </figure>

        <dl className="stats">
          <div className="stat">
            <dt>Rank by price</dt>
            <dd className="num">
              #{formatInteger(block.txCount - block.rankFromCheapest + 1)}
              <span className="stat__sub">of {formatInteger(block.txCount)} (1 = priciest)</span>
            </dd>
          </div>
          <div className="stat">
            <dt>Versus block median</dt>
            <dd className="num">
              {pctAboveMedian >= 0 ? '+' : ''}
              {formatPercent(pctAboveMedian)}
              <span className="stat__sub">{formatRatio(price, block.median)} the median price</span>
            </dd>
          </div>
          {priority !== null && block.baseFeePerGas !== null ? (
            <div className="stat">
              <dt>Priority fee paid</dt>
              <dd className="num">
                {formatGwei(priority)} gwei
                <span className="stat__sub">{formatRatio(price, block.baseFeePerGas)} the base fee</span>
              </dd>
            </div>
          ) : (
            <div className="stat">
              <dt>Block range</dt>
              <dd className="num">
                {formatGwei(block.min)}–{formatGwei(block.max)} gwei
                <span className="stat__sub">legacy pricing, no base fee</span>
              </dd>
            </div>
          )}
          <div className="stat">
            <dt>Block fullness</dt>
            <dd className="num">
              {block.gasLimit > 0n ? formatPercent(Number((block.gasUsed * 1000n) / block.gasLimit) / 1000) : '–'}
              <span className="stat__sub">
                {formatInteger(block.gasUsed)} of {formatInteger(block.gasLimit)} gas
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {block.txCount > 1 ? <RankChart report={report} /> : null}
    </section>
  );
}

function tierWord(t: ReturnType<typeof expenseTier>): string {
  switch (t) {
    case 'cheap':
      return 'Cheap';
    case 'typical':
      return 'Typical';
    case 'expensive':
      return 'Expensive';
    case 'extreme':
      return 'Extreme';
  }
}
