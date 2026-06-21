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

const METAAPI_PROVISIONING_URL =
  'https://mt-provisioning-api-v1.agiliumtrade.ai';

let CLIENT_API_URL = null;

if (!METAAPI_TOKEN || !ACCOUNT_ID) {
  console.error(
    '[FATAL] Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID'
  );
  process.exit(1);
}

async function metaApiFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'auth-token': METAAPI_TOKEN,
      'Content-Type': 'application/json',
      ...(opts.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `MetaApi ${res.status} ${res.statusText}: ${text}`
    );
  }

  return res.json();
}

async function resolveClientApiUrl() {
  const account = await metaApiFetch(
    `${METAAPI_PROVISIONING_URL}/users/current/accounts/${ACCOUNT_ID}`
  );

  const region = account.region || 'new-york';

  CLIENT_API_URL =
    `https://mt-client-api-v1.${region}.agiliumtrade.ai`;

  console.log(
    `[OK] Account resolved. Region: ${region}`
  );

  return account;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    region: CLIENT_API_URL ? 'resolved' : 'unresolved'
  });
});

app.get('/api/account', async (req, res) => {
  try {
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/account-information`
    );

    res.json({
      source: 'live',
      data
    });
  } catch (err) {
    res.status(502).json({
      error: err.message
    });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/positions`
    );

    res.json({
      source: 'live',
      data
    });
  } catch (err) {
    res.status(502).json({
      error: err.message
    });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/orders`
    );

    res.json({
      source: 'live',
      data
    });
  } catch (err) {
    res.status(502).json({
      error: err.message
    });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const days = parseInt(req.query.days || '90', 10);

    const endTime = new Date().toISOString();
    const startTime = new Date(
      Date.now() - days * 86400000
    ).toISOString();

    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/history-deals/time/${encodeURIComponent(startTime)}/${encodeURIComponent(endTime)}`
    );

    res.json({
      source: 'live',
      data
    });
  } catch (err) {
    res.status(502).json({
      error: err.message
    });
  }
});

app.get('/api/candles/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;

    const limit = parseInt(
      req.query.limit || '1000',
      10
    );

    const startTime =
      req.query.startTime ||
      new Date().toISOString();

    const data = await metaApiFetch(
      `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/historical-market-data/symbols/${symbol}/timeframes/${timeframe}/candles?startTime=${encodeURIComponent(startTime)}&limit=${limit}`
    );

    res.json({
      source: 'live',
      data
    });
  } catch (err) {
    res.status(502).json({
      error: err.message
    });
  }
});

app.get(
  '/api/backtest/:symbol/:timeframe',
  async (req, res) => {
    try {
      const { symbol, timeframe } = req.params;

      const candleLimit = Math.min(
        parseInt(req.query.candles || '2000', 10),
        5000
      );

      const startingBalance = parseFloat(
        req.query.balance || '1000'
      );

      const riskPct = parseFloat(
        req.query.riskPct || '1'
      );

      const raw = await metaApiFetch(
        `${CLIENT_API_URL}/users/current/accounts/${ACCOUNT_ID}/historical-market-data/symbols/${symbol}/timeframes/${timeframe}/candles?startTime=${encodeURIComponent(new Date().toISOString())}&limit=${candleLimit}`
      );

      if (!Array.isArray(raw) || raw.length < 50) {
        return res.status(422).json({
          error:
            'Not enough historical candles returned',
          candlesReceived: Array.isArray(raw)
            ? raw.length
            : 0
        });
      }

      const candles = raw
        .map(c => ({
          time: c.time || c.brokerTime,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }))
        .filter(
          c =>
            Number.isFinite(c.open) &&
            Number.isFinite(c.close)
        )
        .sort(
          (a, b) =>
            new Date(a.time) - new Date(b.time)
        );

      const result = runStrategy(candles, {
        startingBalance,
        riskPctPerTrade: riskPct
      });

      res.json({
        source: 'live-historical',
        symbol,
        timeframe,
        dataRange: {
          from: candles[0]?.time,
          to: candles[candles.length - 1]?.time
        },
        result
      });
    } catch (err) {
      res.status(502).json({
        error: err.message
      });
    }
  }
);

resolveClientApiUrl()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `WealthBuilder running on port ${PORT}`
      );
    });
  })
  .catch(err => {
    console.error(
      '[FATAL] Could not resolve MetaApi account:',
      err.message
    );

    process.exit(1);
  });
