import type { ReactNode } from 'react';
import type { TxReport } from '../lib/rpc';
import { formatEth, formatGwei, formatInteger, shortHex, txTypeLabel } from '../lib/format';
import { formatLocal, formatUtc } from '../lib/time';
import { CopyButton } from './CopyButton';
import { AlertIcon, CheckIcon, XIcon } from './Icons';

interface Props {
  report: TxReport;
  announce: (m: string) => void;
}

function Fact({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`fact${wide ? ' fact--wide' : ''}`}>
      <dt className="fact__label">{label}</dt>
      <dd className="fact__value">{children}</dd>
    </div>
  );
}

function HexValue({ value, what, announce }: { value: string; what: string; announce: (m: string) => void }) {
  return (
    <span className="hex">
      <span className="hex__short" title={value}>
        {shortHex(value, 8, 6)}
      </span>
      <span className="hex__full">{value}</span>
      <CopyButton value={value} what={what} announce={announce} />
    </span>
  );
}

export function StatusBadge({ status }: { status: TxReport['status'] }) {
  if (status === 'success') {
    return (
      <span className="badge badge--success">
        <CheckIcon /> Success
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="badge badge--error">
        <XIcon /> Failed
      </span>
    );
  }
  return (
    <span className="badge badge--neutral">
      <AlertIcon /> No status (pre-Byzantium)
    </span>
  );
}

export function Summary({ report, announce }: Props) {
  const gasPct = report.gasLimit > 0n ? Number((report.gasUsed * 1000n) / report.gasLimit) / 10 : 0;

  return (
    <section className="panel" aria-labelledby="summary-heading">
      <div className="panel__head">
        <h2 id="summary-heading">Transaction record</h2>
        <StatusBadge status={report.status} />
      </div>

      <dl className="facts">
        <Fact label="Transaction hash" wide>
          <HexValue value={report.hash} what="Transaction hash" announce={announce} />
        </Fact>
        <Fact label="Sender">
          <HexValue value={report.from} what="Sender address" announce={announce} />
        </Fact>
        <Fact label={report.to ? 'Recipient' : 'Contract created'}>
          {report.to ? (
            <HexValue value={report.to} what="Recipient address" announce={announce} />
          ) : report.contractAddress ? (
            <HexValue value={report.contractAddress} what="Created contract address" announce={announce} />
          ) : (
            <span className="muted">Contract creation</span>
          )}
        </Fact>
        <Fact label="Block number">
          <span className="num">{formatInteger(report.blockNumber)}</span>
          <span className="fact__sub">position {report.transactionIndex + 1} of {report.block.txCount}</span>
        </Fact>
        <Fact label="Timestamp">
          <span className="num">{formatUtc(report.timestamp)}</span>
          <span className="fact__sub">{formatLocal(report.timestamp)}</span>
        </Fact>
        <Fact label="Gas used">
          <span className="num">{formatInteger(report.gasUsed)}</span>
          <span className="fact__sub">
            {gasPct}% of {formatInteger(report.gasLimit)} limit
          </span>
        </Fact>
        <Fact label="Effective gas price">
          <span className="num">{formatGwei(report.effectiveGasPrice)} gwei</span>
          {report.block.baseFeePerGas !== null ? (
            <span className="fact__sub">base fee {formatGwei(report.block.baseFeePerGas)} gwei</span>
          ) : (
            <span className="fact__sub">pre-EIP-1559 block, no base fee</span>
          )}
        </Fact>
        <Fact label="Transaction fee">
          <span className="num num--strong">{formatEth(report.feeWei)} ETH</span>
          <span className="fact__sub">gas used × effective gas price</span>
        </Fact>
        <Fact label="Value transferred">
          <span className="num">{formatEth(report.value)} ETH</span>
          <span className="fact__sub">
            {txTypeLabel(report.type)}, nonce {formatInteger(report.nonce)}
          </span>
        </Fact>
      </dl>
    </section>
  );
}
