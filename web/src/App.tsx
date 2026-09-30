import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveEndpointUrl, SearchForm, type EndpointChoice, type SearchSubmit } from './components/SearchForm';
import { Summary } from './components/Summary';
import { GasComparison } from './components/GasComparison';
import { TimeTravel } from './components/TimeTravel';
import { AlertIcon } from './components/Icons';
import { isTxHash, normalizeTxHash } from './lib/format';
import { ENDPOINTS, LookupError, lookupTransaction, type TxReport } from './lib/rpc';

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; hash: string }
  | { kind: 'error'; hash: string; error: LookupError }
  | { kind: 'ready'; report: TxReport };

function hashFromLocation(): string {
  const h = normalizeTxHash(decodeURIComponent(window.location.hash.replace(/^#/, '')));
  return isTxHash(h) ? h : '';
}

export function App() {
  const [input, setInput] = useState<string>(() => hashFromLocation());
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [endpoint, setEndpoint] = useState<EndpointChoice>({ id: ENDPOINTS[0]?.id ?? 'custom', customUrl: '' });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSubmit = useRef<SearchSubmit | null>(null);

  const announce = useCallback((message: string) => {
    // Clear first so a repeated identical message is announced again.
    setLiveMessage('');
    window.setTimeout(() => setLiveMessage(message), 30);
  }, []);

  const run = useCallback(
    async (submit: SearchSubmit) => {
      const hash = normalizeTxHash(submit.hash);
      if (!isTxHash(hash)) {
        setFieldError(
          hash.length === 0
            ? 'Enter a transaction hash to trace.'
            : 'Use a 66-character hash: 0x followed by 64 hex characters (0-9, a-f).',
        );
        inputRef.current?.focus();
        return;
      }
      if (!submit.endpointUrl) {
        setFieldError('Choose a data source or enter a JSON-RPC URL before tracing.');
        return;
      }
      setFieldError(null);
      lastSubmit.current = { hash, endpointUrl: submit.endpointUrl };
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPhase({ kind: 'loading', hash });
      announce('Fetching transaction');
      try {
        const report = await lookupTransaction(hash, submit.endpointUrl, controller.signal);
        if (controller.signal.aborted) return;
        setPhase({ kind: 'ready', report });
        setInput(hash);
        if (window.location.hash !== `#${hash}`) {
          window.history.replaceState(null, '', `#${hash}`);
        }
        announce(`Transaction found in block ${report.blockNumber.toString()}`);
      } catch (e) {
        if (controller.signal.aborted) return;
        const error = e instanceof LookupError ? e : new LookupError('rpc', 'Unexpected response from the node. Try again.');
        // The error panel is a role="alert"; clear the polite status so it is not read twice.
        setLiveMessage('');
        setPhase({ kind: 'error', hash, error });
      }
    },
    [announce],
  );

  // Deep link: #0x… loads on first paint with the default node.
  useEffect(() => {
    const h = hashFromLocation();
    if (h) void run({ hash: h, endpointUrl: ENDPOINTS[0]?.url ?? '' });
  }, [run]);

  function onExample(hash: string) {
    setInput(hash);
    void run({ hash, endpointUrl: resolveEndpointUrl(endpoint) });
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="backdrop" aria-hidden="true" />
      <header className="site-header">
        <div className="container site-header__inner">
          <p className="brand">
            <span className="brand__mark" aria-hidden="true" />
            Gas Time Machine
          </p>
          <p className="brand__tag">Ethereum transaction forensics</p>
        </div>
      </header>

      <main id="main" className="container" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-heading">
          <h1 id="hero-heading">Rewind any Ethereum transaction</h1>
          <p className="hero__lede">
            Paste a transaction hash to see when it was mined, what it cost, how its gas price compared with the rest of its
            block, and how far back in time it sits.
          </p>
          <SearchForm
            value={input}
            onChange={(v) => {
              setInput(v);
              if (fieldError) setFieldError(null);
            }}
            onSubmit={(s) => void run(s)}
            loading={phase.kind === 'loading'}
            fieldError={fieldError}
            inputRef={inputRef}
            onExample={onExample}
            endpoint={endpoint}
            onEndpointChange={setEndpoint}
          />
        </section>

        <div className="live-region" role="status" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </div>

        {phase.kind === 'loading' ? <LoadingState hash={phase.hash} /> : null}

        {phase.kind === 'error' ? (
          <ErrorState
            error={phase.error}
            onRetry={() => {
              if (lastSubmit.current) void run(lastSubmit.current);
            }}
          />
        ) : null}

        {phase.kind === 'ready' ? (
          <div className="results" key={phase.report.hash}>
            <Summary report={phase.report} announce={announce} />
            <GasComparison report={phase.report} />
            <TimeTravel report={phase.report} />
          </div>
        ) : null}

        {phase.kind === 'idle' ? (
          <section className="empty" aria-label="How it works">
            <ol className="empty__steps">
              <li>
                <span className="empty__step-n num">1</span>
                <span>Enter a mainnet transaction hash, or pick an example above.</span>
              </li>
              <li>
                <span className="empty__step-n num">2</span>
                <span>The page asks a public Ethereum node for the transaction, its receipt and its block.</span>
              </li>
              <li>
                <span className="empty__step-n num">3</span>
                <span>Read the fee, compare its gas price with every neighbour in the block, and see how long ago it happened.</span>
              </li>
            </ol>
          </section>
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Read-only. Data comes straight from the Ethereum node you choose. No wallet, no signatures, no tracking.
          </p>
        </div>
      </footer>
    </>
  );
}

function LoadingState({ hash }: { hash: string }) {
  return (
    <section className="panel panel--loading" aria-labelledby="loading-heading">
      <h2 id="loading-heading" className="loading__title">
        Fetching transaction…
      </h2>
      <p className="loading__hash num" aria-hidden="true">
        {hash}
      </p>
      <div className="skeleton-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    </section>
  );
}

function ErrorState({ error, onRetry }: { error: LookupError; onRetry: () => void }) {
  const title =
    error.kind === 'not_found'
      ? 'Transaction not found'
      : error.kind === 'pending'
        ? 'Transaction is still pending'
        : error.kind === 'invalid'
          ? 'Hash format not recognised'
          : 'Unable to load the transaction';
  return (
    <section className="panel panel--error" role="alert" aria-labelledby="error-heading">
      <div className="error__head">
        <AlertIcon />
        <h2 id="error-heading">{title}</h2>
      </div>
      <p className="error__body">{error.message}</p>
      {error.kind !== 'invalid' ? (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </section>
  );
}
