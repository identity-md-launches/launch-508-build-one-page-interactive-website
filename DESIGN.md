# Gas Time Machine design system

Extracted from the final source on 2026-09-30. Source of truth: `web/src/styles.css` (tokens and all
component styles), the components in `web/src/components/`, and the page composition in
`web/src/App.tsx`. There is no framework theme file, no Tailwind and no CSS-in-JS; everything is
plain CSS with custom properties.

## Overview

Audience: people investigating a single Ethereum transaction, on phone or desktop, who want the
facts fast and a visual sense of whether it overpaid. The visual character is a dark, minimal
"forensic console": near-black navy surfaces, one electric cyan accent used only for the thing being
investigated and the single primary action, monospace for hashes and addresses, and large tabular
numbers for the time-travel clock.

Hierarchy rules that apply to every page:

- One `h1` in the hero, then one `h2` per panel. Panels are the composition unit.
- Facts inside a panel are `dl` grids of small uppercase labels over values.
- The accent colour means "this transaction" or "the primary action". Neutral grays are everything else.
- Status (success, failed, tier) always pairs a colour with an icon or a word.

Page-specific, not system rules: the three-panel order (record, gas comparison, time travel), the
hero grid backdrop and the three-step "how it works" empty state.

## Colors

All colours are `oklch()` in `web/src/styles.css` under `:root`. Primitives are named by hue and are
never used in components; semantic tokens point at them and are the only tier components reference.
The site is dark only; there is no light theme and `color-scheme: dark` is declared.

Neutral ramp, hue 262, chroma 0.016 (except the two lightest steps):

| Primitive | Value | Consumed by |
| --- | --- | --- |
| `--gray-950` | `oklch(0.13 0.016 262)` | `--color-bg-page`, `--color-on-accent` |
| `--gray-900` | `oklch(0.17 0.016 262)` | `--color-bg-surface` (panels, search card) |
| `--gray-850` | `oklch(0.20 0.016 262)` | `--color-bg-raised` (fact tiles, stat tiles, clock units) |
| `--gray-800` | `oklch(0.24 0.016 262)` | `--color-bg-hover`, neutral badges |
| `--gray-700` | `oklch(0.32 0.016 262)` | `--color-border`, `--color-chart-grid` |
| `--gray-600` | `oklch(0.50 0.016 262)` | `--color-border-strong` (inputs, secondary buttons) |
| `--gray-500` | `oklch(0.60 0.016 262)` | `--color-text-muted`, `--color-chart-other` |
| `--gray-400` | `oklch(0.72 0.014 262)` | `--color-text-secondary` |
| `--gray-100` | `oklch(0.95 0.008 262)` | `--color-text-primary`, tooltip backgrounds |

Accent ramp, hue 205:

| Primitive | Value | Consumed by |
| --- | --- | --- |
| `--cyan-900` | `oklch(0.30 0.06 205)` | `--color-accent-subtle` (step number discs) |
| `--cyan-800` | `oklch(0.42 0.09 205)` | `--color-accent-track` (reserved for meter tracks) |
| `--cyan-500` | `oklch(0.82 0.13 205)` | `--color-accent-solid`, `--color-accent-text`, `--color-focus` |
| `--cyan-300` | `oklch(0.90 0.09 205)` | `--color-accent-hover` |

Status ramps, only the two steps each role needs: `--green-500/900` (success text/background),
`--red-500/900` (error text/background), `--amber-500/900` (warning text/background, used by the
"expensive" and "extreme" tier badges).

Role summary:

- Page `--color-bg-page`; panel `--color-bg-surface`; tile `--color-bg-raised`; hover `--color-bg-hover`.
- Text `--color-text-primary` (body, values), `--color-text-secondary` (ledes, sublabels, bar labels),
  `--color-text-muted` (captions, uppercase labels, hints).
- Structure `--color-border` (dividers, ghost buttons, copy buttons); `--color-border-strong` (inputs, select).
- Accent `--color-accent-solid` (primary button fill, this-transaction bars, brand dot),
  `--color-accent-text` (fee value, clock digits, panel icons), `--color-on-accent` (text on the primary button).
- Focus `--color-focus` (2 px outline, 2 px offset, everywhere).
- Charts `--color-chart-other` (all non-highlighted bars), `--color-chart-grid` (axis hairline).

Contrast, computed from the declared token pairs converted to sRGB (WCAG 2 ratios; see
`artifacts/validation.md` for the method and the pairs not measured on rendered pixels):
primary text on surface 16.5:1, secondary on surface 7.7:1, muted on raised 4.6:1, accent text on
surface 11.5:1, on-accent text on the primary button 12.1:1, success 7.6:1, error on its background
5.4:1, warning 7.9:1, neutral chart bars on surface 4.9:1, strong border on surface 3.2:1.

Backgrounds with alpha: the fixed `.backdrop` (cyan glow at 14% plus a 48 px grid at 3.5% white,
masked out by 100% page height) and `.panel--time` (cyan glow at 10% over the surface). Their rendered
pairs were not measured; text over them uses the same primary/secondary tokens.

## Typography

No font files are bundled. `--font-sans` is
`'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`: Inter renders when
installed locally, otherwise the platform sans (the review browser rendered DejaVu Sans).
`--font-mono` is `ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace` for
hashes, addresses, the hash input and the loading-state hash. Weights used: 400, 500 (ghost buttons),
600 (headings, buttons, badges, values), 650 (h1, clock digits); 300 only on the decorative clock colon.

Scale (semantic names in `:root`):

| Token | Size | Used for |
| --- | --- | --- |
| `--text-caption` | 13 px | uppercase labels, captions, hints, footer, chart key |
| `--text-label` | 14 px | buttons, badges, bar labels, hex values, field errors |
| `--text-body` | 16 px | body, fact values, inputs (16 px keeps iOS from zooming) |
| `--text-title` | 18 px | hero lede, stat values, fee value, loading title |
| `--text-heading` | 22 px | panel `h2` |
| `--text-display` | clamp(32–48 px) | `h1` |
| `--text-hero-number` | clamp(40–72 px) | time-travel clock digits and colons |

Line height 1.5 on the body, 1.15 on headings, 1.2 on buttons. Headings use `text-wrap: balance`;
ledes, captions and empty-state copy use `text-wrap: pretty`. Uppercase labels carry 0.06 to 0.1 em
tracking; the `h1` is tightened to -0.02 em and the clock digits to -0.03 em. Changing or aligned
numbers use the `.num` class (`font-variant-numeric: tabular-nums`). Long hex values use
`overflow-wrap: anywhere` when shown in full and a head…tail truncation (`shortHex`) with the full
value in `title` and in the copy button otherwise. Font smoothing is set once on `html`.

## Layout

Spacing steps `--space-1` to `--space-8` are 4, 8, 12, 16, 24, 32, 48 and 64 px. Within a group use
one step (8 or 12 px); between groups use at least two steps (16 to 24 px); between panels 24 px;
`main` has 48 px top and 64 px bottom padding.

- `.container` caps content at `--container` (72 rem) with `--gutter` = `clamp(1rem, 4vw, 2rem)` inline
  padding, raised to the safe-area inset when larger. Backgrounds bleed; controls stay inside.
- `.hero` is capped at 48 rem, the lede at 60 ch; panel ledes and error copy at 70 ch.
- `.facts`, `.skeleton-grid` and `.empty__steps` use `repeat(auto-fill|auto-fit, minmax(min(100%, 16rem), 1fr))`,
  so columns collapse by content, not by device preset. `.fact--wide` spans all columns.
- `.gas-grid` is `3fr 2fr` (bars beside stats) and collapses to one column at `max-width: 52rem`.
- `.stats` is two columns, one column below 22 rem. `.bar` rows stack the label above the track below 30 rem.
- `.search__row` wraps; the submit button goes full width below 30 rem. The clock units drop their
  colons and flex-wrap below 26 rem.
- Logical properties (`inset-inline-start`, `padding-inline`, `border-inline-start`, `margin-block`)
  are used for anything direction-dependent; `dir="ltr"` and `lang="en"` are set on `html`.

Observed in the browser: no horizontal overflow and all text readable at 320, 390 and 1280 CSS pixels.
Widths between 390 and 1280 were not individually screenshotted; the single breakpoints listed above
were verified by their collapse at 320/390 and expansion at 1280.

## Elevation & Depth

Tonal layering does most of the work: page → surface → raised. Shadows are used for elevation, borders
for structure.

- `--shadow-surface`: `0 0 0 1px oklch(1 0 0 / 0.06), 0 1px 2px oklch(0 0 0 / 0.4)` on panels and empty-state cards.
- `--shadow-raised`: `0 0 0 1px oklch(1 0 0 / 0.08), 0 8px 24px oklch(0 0 0 / 0.45)` on the search card only.
- 1 px hairlines of `oklch(1 0 0 / 0.06)` separate header and footer from the page; `--color-border`
  divides the data-source disclosure and the rank chart from the content above them.
- Tooltips (`.copy-button__hint`, `.rank__tooltip`) invert: primary-text background, page-colour text.

## Shapes

- `--radius-sm` 6 px: copy buttons, tooltips, skip link, key swatches (2 px).
- `--radius-md` 10 px: buttons, inputs, select, fact/stat tiles, clock units, skeletons, error/empty cards.
- `--radius-lg` 16 px: panels and the search card (concentric with 10 px tiles inside 24 px padding is
  not exact; the outer radius was chosen for the 6 px visual step, see Do's and Don'ts).
- `--radius-pill`: badges. Bars have a 4 px rounded data end and a square baseline end.
- Icons: one set in `web/src/components/Icons.tsx`, 16 px, 1.75 px stroke, `currentColor`, `aria-hidden`.

## Components

All components live in `web/src/components/` and are plain React function components without a
published package API. Reuse them by importing the file.

- **Button** (`.button` in `styles.css`, used directly in JSX): `--primary` (filled accent, one per view),
  `--secondary` (raised with strong border), `--ghost` (bordered, secondary text). 44 px minimum height,
  verb-first labels, `scale: 0.96` on `:active`, 150 ms colour transitions, `hover:` styles gated by
  `@media (hover: hover)`. Disabled: native `disabled`, 60% opacity; the submit keeps its label and
  swaps the icon for `Spinner` while loading.
- **SearchForm** (`SearchForm.tsx`): labelled text input with example placeholder, 16 px mono text,
  `aria-invalid` and `aria-describedby` wiring to `.field-error` (`role="alert"`), example buttons,
  and a `<details>` "Data source" disclosure with a `<select>` and optional custom URL input. Props:
  `value`, `onChange`, `onSubmit`, `loading`, `fieldError`, `inputRef`, `onExample`, `endpoint`,
  `onEndpointChange`. Exported helper `resolveEndpointUrl`.
- **CopyButton** (`CopyButton.tsx`): 36 px icon button (hit area extended to 44 px on coarse pointers),
  `aria-label="Copy <what>"`, cross-fades copy → check icons (opacity, scale 0.25→1, blur 4→0 px,
  200 ms `cubic-bezier(0.2, 0, 0, 1)`), shows a "Copied"/"Failed" tooltip for 1.8 s and calls
  `announce()` for the shared polite live region. Falls back to `execCommand('copy')`.
- **Summary** (`Summary.tsx`): panel with `StatusBadge` and a `.facts` grid of `Fact` rows; `HexValue`
  renders truncated/full hex with a `CopyButton`. Export `StatusBadge` for success/failed/no-status.
- **Badge** (`.badge`): pill, 14 px semibold, icon + word. Variants `--success`, `--error`, `--neutral`,
  `--tier` with `--tier-cheap|typical|expensive|extreme`.
- **GasComparison** (`GasComparison.tsx`): verdict sentence, horizontal bar list (`.bars`, accent bar
  for this transaction, values at the tip), `.stats` tiles, and `RankChart`. Hidden tier badge and
  chart when the block has one transaction.
- **RankChart** (`RankChart.tsx`): SVG of every block transaction sorted by price, width from a
  `ResizeObserver`, square-root scale when the max exceeds four times the 95th percentile (stated in
  the caption), pointer hover tooltip, `role="img"` with a full-sentence `aria-label` and a
  visually-hidden summary. Not keyboard-navigable per bar by design; the numbers live in `.stats`.
- **TimeTravel** (`TimeTravel.tsx`): elapsed sentence, three `.clock__unit` tiles (days, hours, minutes,
  tabular, re-rendered every 30 s) with visually-hidden full text, and a `.timeline` of block time,
  local time and blocks since.
- **Panels and states** (`App.tsx`): `.panel` container; `LoadingState` (`.panel--loading` with shimmer
  skeletons), `ErrorState` (`.panel--error`, `role="alert"`, "Try again"), and the idle `.empty` steps.
  Result panels enter with a 360 ms fade-and-rise staggered 100 ms, only under
  `prefers-reduced-motion: no-preference`.
- **Live region**: one stable `role="status"` div in `App.tsx`; call `announce(message)` rather than
  adding new live regions.

## Do's and Don'ts

- Start a new section as a `.panel` with a `.panel__head` (`h2` plus optional badge) and, for data, a
  `.facts` or `.stats` grid. Keep panel content 24 px apart and grid gaps at 12 to 16 px.
- Use exactly one `.button--primary` per view. Everything else is `--secondary` or `--ghost`.
- Put new colours through a semantic token in `:root`. Never reference a `--gray-*` or `--cyan-*`
  primitive from a component, and do not add a light theme block piecemeal.
- Cyan means "this transaction" or "primary action". Do not use it for decoration or for a second data
  series; a second highlighted series needs a new, distinguishable hue token.
- Status colours always come with an icon or word (`.badge`), never colour alone.
- Numbers that update or align get `.num`. Hashes and addresses get `.hex` with a `CopyButton`.
- Any new motion goes inside `@media (prefers-reduced-motion: no-preference)` and transitions name their
  properties.
- Keep inputs at 16 px, targets at 44 px or extended with a pseudo-element, and keep `:focus-visible`
  styles untouched.

Recipe for another page: copy `web/index.html` and `web/src/main.tsx`, render a new root component
that reuses `.container`, `.hero`, `.panel`, `.facts` and the components above, add any new tokens to
`:root` in `styles.css`, run `npm run typecheck && npm test && npm run build`, and commit `dist/`.
