/**
 * WealthBuilder — Real Data Server
 * ---------------------------------------------------------------
 * This is the ONLY place your MetaApi token should ever live.
 * It never gets sent to the browser. The frontend talks to THIS
 * server, and this server talks to MetaApi.
 *
 * Run this with Node.js on a machine/host YOU control
 * (your laptop, a VPS, Railway, Render, Replit, etc).
 * Never commit your .env file or paste your token in chat again.
 * ---------------------------------------------------------------
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { runStrategy } = require('./backtest');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const METAAPI_TOKEN = process.env.METAAPI_TOKEN;
const ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID;
const PORT = process.env.PORT || 3000;

// MetaApi region-aware base URLs. MetaApi tells you the correct
// region/host for your account when you fetch account details —
// we resolve this dynamically rather than hardcoding one region.
const METAAPI_PROVISIONING_URL = 'https://mt-provisioning-api-v1.agiliumtrade.ai';
let CLIENT_API_URL = null; // resolved at startup from account region

if (!METAAPI_TOKEN || !ACCOUNT_ID) {
  console.error('\n[FATAL] Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in your .env file.');
  console.error('Copy .env.example to .env and fill in your own values.\n');
  process.exit(1);
}

async function metaApiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'auth-token': METAAPI_TOKEN,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MetaApi ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

/**
 * Resolve which regional Client API host this account lives on.
 * MetaApi accounts are pinned to a region (new-york, london, etc).
 * We fetch this once at startup and cache it.
 */
async function resolveClientApiUrl() {
  const account = await metaApiFetch(
    `${METAAPI_PROVISIONING_URL}/users/current/accounts/${ACCOUNT_ID}`
  );
  const region = account.region || 'new-york';
  CLIENT_API_URL = `https://mt-client-api-v1.${region}.agiliumtrade.ai`;
  console.log(`[OK] Account resolved. Region: ${region}`);
  console.log(`[OK] Connection status: ${account.connectionStatus || 'unknown'}`);
  if (account.connectionStatus !== 'CONNECTED') {
    console.warn(
      '[WARN] Account is not currently CONNECTED in MetaApi. ' +
      'Check that the MT5 terminal/account is online in your MetaApi dashboard.'
    );
  }
  return account;
}

// ---------------------------------------------------------------
// READ-ONLY ENDPOINTS — live account data
// ---------------------------------------------------------------

// Live account summary: balance, equity, margin, currency — real numbers only.
app.get('/api/account', async (req, res) => {
  try {
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/account-information`
    );
    res.json({ source: 'live', data });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Open positions, live.
app.get('/api/positions', async (req, res) => {
  try {
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/positions`
    );
    res.json({ source: 'live', data });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Pending orders, live.
app.get('/api/orders', async (req, res) => {
  try {
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/orders`
    );
    res.json({ source: 'live', data });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Real historical deals (closed trades) — used for the REAL trade history /
// journal, replacing the fabricated "auto-logged" journal entries.
app.get('/api/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days || '90', 10);
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - days * 86400000).toISOString();
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/history-deals/time/` +
      `${encodeURIComponent(startTime)}/${encodeURIComponent(endTime)}`
    );
    res.json({ source: 'live', data });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Live current price for a symbol.
app.get('/api/price/:symbol', async (req, res) => {
  try {
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/symbols/${req.params.symbol}/current-price`
    );
    res.json({ source: 'live', data });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Real historical candles — this is what the backtest engine runs on.
// timeframe examples: 1m, 5m, 15m, 1h, 4h, 1d
app.get('/api/candles/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const limit = parseInt(req.query.limit || '1000', 10);
    const startTime = req.query.startTime || new Date().toISOString();
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/historical-market-data/symbols/` +
      `${symbol}/timeframes/${timeframe}/candles?startTime=${encodeURIComponent(startTime)}&limit=${limit}`
    );
    res.json({ source: 'live', data });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// REAL BACKTEST — fetches actual historical candles, then runs
// the strategy in backtest.js against them. No random data.
// ---------------------------------------------------------------
app.get('/api/backtest/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const candleLimit = Math.min(parseInt(req.query.candles || '2000', 10), 5000);
    const startingBalance = parseFloat(req.query.balance || '1000');
    const riskPct = parseFloat(req.query.riskPct || '1');

    const raw = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/historical-market-data/symbols/` +
      `${symbol}/timeframes/${timeframe}/candles?startTime=${encodeURIComponent(new Date().toISOString())}&limit=${candleLimit}`
    );

    if (!Array.isArray(raw) || raw.length < 50) {
      return res.status(422).json({
        error: 'Not enough real historical candle data returned by MetaApi to run a meaningful backtest.',
        candlesReceived: Array.isArray(raw) ? raw.length : 0,
      });
    }

    const candles = raw
      .map(c => ({
        time: c.time || c.brokerTime,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .filter(c => Number.isFinite(c.open) && Number.isFinite(c.close))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    const result = runStrategy(candles, { startingBalance, riskPctPerTrade: riskPct });

    res.json({
      source: 'live-historical',
      symbol,
      timeframe,
      dataRange: { from: candles[0]?.time, to: candles[candles.length - 1]?.time },
      result,
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------
// NOTE: There are intentionally NO trade-execution endpoints here
// (no place-order, no close-position, no modify-sl-tp).
// This server is READ-ONLY by design for this build phase.
// See README.md for why, and what's required before adding them.
// ---------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ ok: true, region: CLIENT_API_URL ? 'resolved' : 'unresolved' });
});

resolveClientApiUrl()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nWealthBuilder server running: http://localhost:${PORT}`);
      console.log('Read-only mode. No trade execution endpoints are exposed.\n');
    });
  })
  .catch((err) => {
    console.error('[FATAL] Could not resolve MetaApi account/region:', err.message);
    console.error('Check your METAAPI_TOKEN and METAAPI_ACCOUNT_ID in .env');
    process.exit(1);
  });
