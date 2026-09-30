import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from './Icons';

interface Props {
  value: string;
  /** What is being copied, used in the accessible name: "Copy sender address". */
  what: string;
  announce: (message: string) => void;
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Icon button that copies `value`. Feedback is redundant: the icon swaps to a
 * check, the visible tooltip text says "Copied", and a polite live region announces it.
 */
export function CopyButton({ value, what, announce }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function onClick() {
    const ok = await writeClipboard(value);
    setState(ok ? 'copied' : 'failed');
    announce(ok ? `${what} copied to clipboard` : `Unable to copy ${what.toLowerCase()}. Select the text and copy it manually.`);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 1800);
  }

  const label = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : `Copy ${what.toLowerCase()}`;

  return (
    <button
      type="button"
      className={`copy-button${state === 'copied' ? ' is-copied' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
      data-state={state}
    >
      <span className="copy-button__icons" aria-hidden="true">
        <CopyIcon className="copy-button__icon copy-button__icon--copy" />
        <CheckIcon className="copy-button__icon copy-button__icon--check" />
      </span>
      <span className="copy-button__hint" aria-hidden="true">
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Failed' : ''}
      </span>
    </button>
  );
}
