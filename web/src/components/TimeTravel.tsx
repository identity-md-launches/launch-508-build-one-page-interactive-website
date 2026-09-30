import { useEffect, useState } from 'react';
import type { TxReport } from '../lib/rpc';
import { formatInteger } from '../lib/format';
import { approxYears, describeElapsed, elapsedSince, formatLocal, formatUtc } from '../lib/time';
import { ClockIcon } from './Icons';

interface Props {
  report: TxReport;
}

/** How long ago the transaction was mined, ticking once a minute. */
export function TimeTravel({ report }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [report.hash]);

  const elapsed = elapsedSince(report.timestamp, now);
  const years = approxYears(elapsed);
  const blocksSince = report.headBlock > report.blockNumber ? report.headBlock - report.blockNumber : 0n;

  return (
    <section className="panel panel--time" aria-labelledby="time-heading">
      <div className="panel__head">
        <h2 id="time-heading">
          <ClockIcon /> Time travel
        </h2>
      </div>
      <p className="panel__lede">
        Mined {describeElapsed(elapsed)}
        {years ? ` (about ${years})` : ''}.
      </p>

      <div className="clock" role="group" aria-label="Elapsed time since the transaction">
        <div className="clock__unit">
          <span className="clock__value num" aria-hidden="true">
            {formatInteger(elapsed.days)}
          </span>
          <span className="clock__label" aria-hidden="true">
            days
          </span>
          <span className="visually-hidden">{elapsed.days} days</span>
        </div>
        <span className="clock__sep" aria-hidden="true">
          :
        </span>
        <div className="clock__unit">
          <span className="clock__value num" aria-hidden="true">
            {String(elapsed.hours).padStart(2, '0')}
          </span>
          <span className="clock__label" aria-hidden="true">
            hours
          </span>
          <span className="visually-hidden">{elapsed.hours} hours</span>
        </div>
        <span className="clock__sep" aria-hidden="true">
          :
        </span>
        <div className="clock__unit">
          <span className="clock__value num" aria-hidden="true">
            {String(elapsed.minutes).padStart(2, '0')}
          </span>
          <span className="clock__label" aria-hidden="true">
            minutes
          </span>
          <span className="visually-hidden">{elapsed.minutes} minutes</span>
        </div>
      </div>

      <dl className="timeline">
        <div className="timeline__item">
          <dt>Block time</dt>
          <dd className="num">{formatUtc(report.timestamp)}</dd>
        </div>
        <div className="timeline__item">
          <dt>In your time zone</dt>
          <dd className="num">{formatLocal(report.timestamp)}</dd>
        </div>
        <div className="timeline__item">
          <dt>Blocks mined since</dt>
          <dd className="num">{formatInteger(blocksSince)}</dd>
        </div>
      </dl>
    </section>
  );
}
