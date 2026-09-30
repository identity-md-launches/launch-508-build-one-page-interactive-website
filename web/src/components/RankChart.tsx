import { useEffect, useMemo, useRef, useState } from 'react';
import type { TxReport } from '../lib/rpc';
import { formatGwei, formatInteger } from '../lib/format';

interface Props {
  report: TxReport;
}

const HEIGHT = 160;
const PAD_TOP = 12;
const PAD_BOTTOM = 4;

/**
 * Every transaction in the block as a thin column, sorted from cheapest to
 * priciest. This transaction is the accent column; the base fee is a hairline.
 * When a few outliers dwarf the rest, a square-root scale keeps the body readable
 * and the caption says so.
 */
export function RankChart({ report }: Props) {
  const { block } = report;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const prices = block.sortedPrices;
  const n = prices.length;
  const ownIndex = useMemo(() => {
    // Index of this transaction's price among the sorted prices (first match).
    const target = report.effectiveGasPrice;
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((prices[mid] ?? 0n) < target) lo = mid + 1;
      else hi = mid;
    }
    return Math.min(lo, n - 1);
  }, [prices, n, report.effectiveGasPrice]);

  const max = block.max;
  const p95 = prices[Math.max(0, Math.ceil(0.95 * n) - 1)] ?? max;
  const useSqrt = p95 > 0n && max > p95 * 4n;
  const maxF = Number(max);
  const scaleY = (v: bigint): number => {
    if (maxF === 0) return 0;
    const f = Number(v) / maxF;
    return useSqrt ? Math.sqrt(f) : f;
  };

  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const band = width / n;
  const gap = band > 3 ? 1 : 0;
  const barW = Math.max(band - gap, 1);
  const ownW = Math.max(barW, 3);

  const baseY = block.baseFeePerGas !== null ? PAD_TOP + plotH * (1 - scaleY(block.baseFeePerGas)) : null;

  const hoverInfo = hover !== null ? prices[hover] : undefined;
  const hoverX = hover !== null ? hover * band + band / 2 : 0;

  const summary = `${formatInteger(n)} transactions sorted by effective gas price from ${formatGwei(
    block.min,
  )} to ${formatGwei(block.max)} gwei. This transaction is number ${formatInteger(
    ownIndex + 1,
  )} from the cheapest at ${formatGwei(report.effectiveGasPrice)} gwei.`;

  return (
    <figure className="rank" aria-labelledby="rank-caption">
      <figcaption id="rank-caption" className="figure__caption">
        Every transaction in block {formatInteger(report.blockNumber)}, cheapest to priciest
        {useSqrt ? ' (square-root scale, because a few outliers dwarf the rest)' : ''}.
      </figcaption>
      <ul className="key" aria-hidden="true">
        <li>
          <span className="key__swatch key__swatch--own" /> This transaction
        </li>
        <li>
          <span className="key__swatch key__swatch--other" /> Other transactions
        </li>
        {baseY !== null ? (
          <li>
            <span className="key__swatch key__swatch--line" /> Base fee
          </li>
        ) : null}
      </ul>
      <div
        ref={wrapRef}
        className="rank__plot"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const idx = Math.floor(((e.clientX - rect.left) / rect.width) * n);
          setHover(Math.min(n - 1, Math.max(0, idx)));
        }}
      >
        <svg
          className="rank__svg"
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={summary}
        >
          <line x1={0} x2={width} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM} className="rank__axis" />
          {prices.map((p, i) => {
            if (i === ownIndex) return null;
            const h = Math.max(plotH * scaleY(p), 1);
            return (
              <rect
                key={i}
                x={i * band}
                y={HEIGHT - PAD_BOTTOM - h}
                width={barW}
                height={h}
                className={`rank__bar${hover === i ? ' is-hover' : ''}`}
              />
            );
          })}
          {baseY !== null ? <line x1={0} x2={width} y1={baseY} y2={baseY} className="rank__baseline" /> : null}
          {(() => {
            const h = Math.max(plotH * scaleY(report.effectiveGasPrice), 2);
            const x = Math.min(ownIndex * band, width - ownW);
            return (
              <g>
                <rect x={x - 1} y={HEIGHT - PAD_BOTTOM - h - 1} width={ownW + 2} height={h + 1} className="rank__own-ring" />
                <rect x={x} y={HEIGHT - PAD_BOTTOM - h} width={ownW} height={h} className="rank__own" />
              </g>
            );
          })()}
        </svg>
        {hoverInfo !== undefined && hover !== null ? (
          <div className="rank__tooltip" style={{ insetInlineStart: `${(hoverX / width) * 100}%` }}>
            <span className="num">{formatGwei(hoverInfo)} gwei</span>
            <span className="rank__tooltip-sub">
              {hover === ownIndex ? 'This transaction, ' : ''}#{formatInteger(hover + 1)} from cheapest
            </span>
          </div>
        ) : null}
      </div>
      <p className="visually-hidden">{summary}</p>
    </figure>
  );
}
