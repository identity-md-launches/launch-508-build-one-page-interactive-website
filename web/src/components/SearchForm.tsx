import { useId, type FormEvent, type RefObject } from 'react';
import { ENDPOINTS } from '../lib/rpc';
import { SearchIcon, Spinner } from './Icons';

export interface SearchSubmit {
  hash: string;
  endpointUrl: string;
}

export interface EndpointChoice {
  id: string;
  customUrl: string;
}

export const CUSTOM_ENDPOINT = 'custom';

export function resolveEndpointUrl(choice: EndpointChoice): string {
  if (choice.id === CUSTOM_ENDPOINT) return choice.customUrl.trim();
  return ENDPOINTS.find((e) => e.id === choice.id)?.url ?? '';
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (s: SearchSubmit) => void;
  loading: boolean;
  /** Field-level error shown next to the input (format problems). */
  fieldError: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onExample: (hash: string) => void;
  endpoint: EndpointChoice;
  onEndpointChange: (choice: EndpointChoice) => void;
}

export const EXAMPLES = [
  {
    label: 'First mainnet transaction (2015)',
    hash: '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060',
  },
  {
    label: 'A recent EIP-1559 transaction',
    hash: '0xbf2ec8b1e30d2092f60d19e69ea7c1f04af18af048f4467a9923ad320838f474',
  },
] as const;

export function SearchForm({
  value,
  onChange,
  onSubmit,
  loading,
  fieldError,
  inputRef,
  onExample,
  endpoint,
  onEndpointChange,
}: Props) {
  const id = useId();
  const endpointId = endpoint.id;
  const customUrl = endpoint.customUrl;

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ hash: value, endpointUrl: resolveEndpointUrl(endpoint) });
  }

  const inputId = `${id}-hash`;
  const errorId = `${id}-hash-error`;
  const hintId = `${id}-hash-hint`;

  return (
    <form className="search" onSubmit={submit} noValidate aria-busy={loading}>
      <label className="search__label" htmlFor={inputId}>
        Transaction hash
      </label>
      <div className="search__row">
        <input
          ref={inputRef}
          id={inputId}
          className="search__input"
          name="txhash"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${errorId} ${hintId}` : hintId}
          aria-errormessage={fieldError ? errorId : undefined}
        />
        <button type="submit" className="button button--primary search__submit" disabled={loading}>
          {loading ? <Spinner /> : <SearchIcon />}
          <span>Trace transaction</span>
        </button>
      </div>
      {fieldError ? (
        <p id={errorId} className="field-error" role="alert">
          {fieldError}
        </p>
      ) : null}
      <p id={hintId} className="search__hint">
        Paste a mainnet hash: 0x followed by 64 hex characters. Nothing is signed and no wallet is needed.
      </p>

      <div className="search__examples">
        <span className="search__examples-label">Try an example</span>
        <ul className="search__example-list">
          {EXAMPLES.map((ex) => (
            <li key={ex.hash}>
              <button type="button" className="button button--ghost" onClick={() => onExample(ex.hash)} disabled={loading}>
                {ex.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <details className="search__source">
        <summary>Data source</summary>
        <div className="search__source-body">
          <label htmlFor={`${id}-endpoint`}>Ethereum node</label>
          <select
            id={`${id}-endpoint`}
            className="select"
            value={endpointId}
            onChange={(e) => onEndpointChange({ id: e.target.value, customUrl })}
          >
            {ENDPOINTS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
            <option value={CUSTOM_ENDPOINT}>Custom JSON-RPC URL</option>
          </select>
          {endpointId === CUSTOM_ENDPOINT ? (
            <>
              <label htmlFor={`${id}-custom`}>JSON-RPC URL</label>
              <input
                id={`${id}-custom`}
                className="search__input"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="https://mainnet.example.org/rpc"
                value={customUrl}
                onChange={(e) => onEndpointChange({ id: endpointId, customUrl: e.target.value })}
              />
            </>
          ) : null}
          <p className="search__hint">
            Public nodes are rate limited and only answer read-only calls. The URL you enter stays in this page and is never
            stored.
          </p>
        </div>
      </details>
    </form>
  );
}
