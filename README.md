# WealthBuilder — Real Account Dashboard

A read-only dashboard for your real MT5 micro account, connected through
MetaApi. Built to replace a previous version that used `Math.random()` to
fabricate prices, balances, and backtest results.

## What this does
- Shows your **real** balance, equity, margin (`/api/account`)
- Shows your **real** open positions (`/api/positions`)
- Shows your **real** closed trade history (`/api/history`)
- Runs a **real backtest** against actual historical candles from your
  broker (`/api/backtest/:symbol/:timeframe`) — using an MA-crossover +
  RSI strategy defined in `server/backtest.js`

## What this deliberately does NOT do
- **No trade execution.** There is no place-order, close-position, or
  modify-SL/TP endpoint. Adding auto-trading is a separate, higher-stakes
  step — see "Adding auto-trading" below before even considering it.
- **No daily-return promises.** There is no code path anywhere that
  targets or fabricates a 5–10%/day figure. That return rate is not
  achievable by any real, sustainable strategy — see note below.

## Setup

```bash
npm install
cp .env.example .env
# edit .env: paste your NEW MetaApi token (generate one at app.metaapi.cloud —
# the token shared in chat earlier was revoked and should never be reused)
node server/index.js
```

Then open `http://localhost:3000`.

**Do this on your own machine or a host you control.** Never paste your
`.env` contents, your token, or any credential into a chat window —
including with Claude. If a token is ever exposed, revoke it immediately
from app.metaapi.cloud and issue a new one.

## On the 5–10% daily target

I want to be straightforward rather than build something that quietly
ignores this: that target isn't included anywhere in this app because
it's not a realistic goal for any real trading system. 5% compounded
daily is about 3.8 million percent annually; 10% daily is far beyond
that. No legitimate strategy — discretionary or algorithmic — produces
this consistently. Dashboards or "AI" tools that claim to hit numbers
like this are either showing fabricated data (as the previous version
of this app did) or are part of a scam pattern.

What's realistic: most systematic retail strategies, when honestly
backtested and run live, land somewhere between modest losses and
low-double-digit annual gains, with real drawdowns along the way. The
backtest endpoint here will show you the real number for the strategy
as written — if you change the rules and it gets worse, that's the
engine working correctly, not a bug to "fix" until the number looks better.

## Adding auto-trading later

If/when you want to move to live execution, the responsible order is:

1. Run the backtest engine across multiple symbols/timeframes/date
   ranges and look at the worst stretches, not just the average.
2. Run the same strategy logic on a **demo account** for real time
   (weeks, not hours) and compare actual fills to backtest assumptions.
3. Add execution endpoints with hard guardrails: max daily loss limit,
   max position size, a kill switch, and trade logging independent of
   the strategy code (so a bug in the strategy can't also hide its own
   damage).
4. Only then connect it to the live account, starting at minimum size.

I'd be glad to help build each of those steps when you're ready — happy
to pick this back up with the backtest results once you've run it.
