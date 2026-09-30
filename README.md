# Gas Time Machine

A one-page Ethereum transaction forensic tool. Paste a mainnet transaction hash and the page shows
the block number, timestamp, gas used, effective gas price, fee in ETH, sender, recipient and status;
compares the transaction's gas price with every other transaction in its block; and shows how long
ago it happened in days, hours and minutes.

- No wallet, no signatures, no private keys. The page only makes read-only JSON-RPC calls.
- Static export in `dist/`, built with Vite, React and TypeScript from `web/`.
- Relative asset URLs (`base: './'`), so it works from any subpath, an IPFS gateway or an ENS name.
- Deep links: `index.html#0x<hash>` loads that transaction on open.

## Layout

| Path | Purpose |
| --- | --- |
| `web/` | Source: Vite + React + TypeScript, `package.json` and `package-lock.json` |
| `web/src/lib/` | Pure logic: JSON-RPC client (`rpc.ts`), formatting, time and block statistics, with unit tests |
| `web/src/components/` | UI: search form, transaction record, gas comparison, rank chart, time travel, copy button |
| `dist/` | Committed production export served as-is by the publisher |
| `DESIGN.md` | Implemented design system: tokens, typography, layout, components |
| `artifacts/validation.md` | Better Interface review record, browser evidence, findings and limitations |

## Install

Node 22 and npm are required (pnpm's store was read-only on the build box, so the lockfile is npm's).

```sh
cd web
npm ci
```

## Preview

```sh
cd web
npm run dev        # Vite dev server with hot reload
npm run preview    # serves the built dist/ locally after a build
```

`dist/index.html` can also be opened through any static file server; it does not need a rewrite rule
because the app is a single page with hash deep links only.

## Rebuild

```sh
cd web
npm run typecheck  # tsc --noEmit
npm test           # vitest unit tests for lib/
npm run build      # writes ../dist with relative asset URLs
```

Commit `dist/` together with the source after every rebuild. The publisher serves the committed
export and does not rebuild it.

## Publish

Upload the contents of `dist/` (`index.html`, `favicon.svg`, `assets/`) to any static host, an IPFS
gateway or an ENS content hash. Nothing else is required at run time: there is no backend, no
environment variable and no credential. The page talks directly from the browser to the Ethereum
node chosen in the "Data source" disclosure.

## Data sources

The site ships two keyless public endpoints, dRPC (`https://eth.drpc.org`) and PublicNode
(`https://ethereum-rpc.publicnode.com`), plus a "Custom JSON-RPC URL" option. A custom URL is kept in
component state only and is never stored. Public nodes are rate limited; the error panel names the
node's reason and offers "Try again". Calls made per lookup: `eth_getTransactionByHash`, then
`eth_getTransactionReceipt`, `eth_getBlockByNumber` (full transactions) and `eth_blockNumber` in
parallel. Each call aborts after 25 seconds.

How the numbers are derived:

- Fee = `gasUsed` × `effectiveGasPrice` from the receipt (falls back to the transaction's price fields).
- Block comparison uses the effective gas price of every transaction in the block (`gasPrice` as
  reported by the node for mined transactions, or `min(maxFeePerGas, baseFee + maxPriorityFeePerGas)`).
- Tier (cheap / typical / expensive / extreme) is by position among the block's prices: below the
  25th percentile, between 25 and 75, above 75, above 95.
- Pre-EIP-1559 blocks have no base fee; pre-Byzantium receipts have no status, shown as
  "No status (pre-Byzantium)".
- "Blocks mined since" is `eth_blockNumber` minus the transaction's block at lookup time.

## Validation performed

Commands run on 2026-09-30 in `web/` after the last source change:

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, no errors |
| `npm test` | 3 files, 25 tests passed (format, time, stats, RPC client with stubbed fetch) |
| `npm run build` | exit 0: `dist/index.html` 0.77 kB, CSS 19.75 kB, JS 250.52 kB (gzip 78.46 kB) |

Browser checks were run against the built `dist/` in the task's Playwright browser at 1280×900,
390×844 and 320×700 CSS pixels. That browser has no internet access, so the live node call was
exercised only as far as its failure (the "Unable to reach the node" state was observed with a real
`ERR_INTERNET_DISCONNECTED`). To render real data, JSON-RPC responses for the two example
transactions were captured with `curl` from `https://eth.drpc.org` and `window.fetch` was stubbed in
the page to replay them. Interactions checked: example buttons, submit via Enter, invalid-hash inline
error with focus return, loading state (submit disabled with spinner, skeletons, `aria-busy`),
not-found and node-rejection error panels with "Try again" (the pending state is covered by a unit
test only), copy buttons via keyboard
and pointer (icon swap, "Copied" tooltip and polite live-region text observed), rank-chart hover
tooltip, skip link, `prefers-reduced-motion: reduce` (panel animation disabled), and no horizontal
overflow at 320 px. Console: no errors or warnings from the app. Full record and limitations in
`artifacts/validation.md`.

Not verified: clipboard contents (the headless browser denies `readText`; success was inferred from
the resolved write call), a real screen reader, browser-native 200% zoom, physical devices, and the
live endpoints from inside the browser. The endpoints themselves were confirmed reachable with `curl`
during the build. Screenshots were inspected during the session but could not be saved into the
repository: the browser tool cannot write to the workspace and its output directory is not reachable
from the build shell.

## Design review

The Better Interface guide pinned with this assignment was applied while building and used for a
consolidated review across accessibility, layout, writing, typography, colors and UI. Findings and
their fixes are listed in `artifacts/validation.md`; the implemented system is documented in
`DESIGN.md`.
