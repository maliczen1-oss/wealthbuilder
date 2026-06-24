require('dotenv').config();

const express = require('express');
const path = require('path');
const MetaApi = require('metaapi.cloud-sdk').default;

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.METAAPI_TOKEN;
const ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID;

if (!TOKEN || !ACCOUNT_ID) {
  console.error('Missing MetaApi credentials');
  process.exit(1);
}

let account = null;
let connection = null;

async function initialize() {
  const api = new MetaApi(TOKEN);

  account = await api.metatraderAccountApi.getAccount(
    ACCOUNT_ID
  );

  if (account.state !== 'DEPLOYED') {
    await account.deploy();
  }

  await account.waitConnected();

  connection = account.getRPCConnection();

  await connection.connect();
  await connection.waitSynchronized();

  console.log('Connected to MT5:', account.name);
}

app.get('/api/health', async (req, res) => {
  res.json({
    ok: true,
    name: account?.name,
    broker: account?.broker
  });
});

app.get('/api/account', async (req, res) => {
  try {
    const info =
      await connection.getAccountInformation();

    res.json(info);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.get('/api/positions', async (req, res) => {
  try {
    const positions =
      await connection.getPositions();

    res.json(positions);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const startTime = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    );

    const endTime = new Date();

    const deals =
      await connection.getDealsByTimeRange(
        startTime,
        endTime
      );

    res.json(deals);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
app.get('/api/performance', async (req, res) => {
  try {
    const startTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endTime = new Date();

    const deals = await connection.getDealsByTimeRange(startTime, endTime);

    const trades = deals.filter(d =>
      d.type === 'DEAL_TYPE_BUY' || d.type === 'DEAL_TYPE_SELL'
    );

    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit < 0);

    const grossProfit = winningTrades.reduce((a, b) => a + b.profit, 0);
    const grossLoss = Math.abs(
      losingTrades.reduce((a, b) => a + b.profit, 0)
    );

    const netProfit = grossProfit - grossLoss;

    res.json({
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        trades.length > 0
          ? ((winningTrades.length / trades.length) * 100).toFixed(2)
          : 0,
      grossProfit,
      grossLoss,
      netProfit,
      profitFactor:
        grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : "∞"
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(
        `WealthBuilder running on ${PORT}`
      );
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
