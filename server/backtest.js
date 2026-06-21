/**
 * Simple Moving Average
 */
function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];

    if (i >= period) {
      sum -= values[i - period];
    }

    if (i >= period - 1) {
      out[i] = sum / period;
    }
  }

  return out;
}

/**
 * Relative Strength Index
 */
function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);

  let gainSum = 0;
  let lossSum = 0;
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (i <= period) {
      gainSum += gain;
      lossSum += loss;

      if (i === period) {
        avgGain = gainSum / period;
        avgLoss = lossSum / period;

        out[i] =
          avgLoss === 0
            ? 100
            : 100 - 100 / (1 + avgGain / avgLoss);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      out[i] =
        avgLoss === 0
          ? 100
          : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }

  return out;
}

function runStrategy(candles, opts = {}) {
  const {
    fastPeriod = 10,
    slowPeriod = 30,
    rsiPeriod = 14,
    riskPctPerTrade = 1,
    startingBalance = 1000,
    slAtrMultiple = 1.5,
    tpAtrMultiple = 2.5,
  } = opts;

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const fast = sma(closes, fastPeriod);
  const slow = sma(closes, slowPeriod);
  const rsiVals = rsi(closes, rsiPeriod);

  const atr = new Array(closes.length).fill(null);
  const atrPeriod = 14;

  for (let i = atrPeriod; i < candles.length; i++) {
    let sum = 0;

    for (let j = i - atrPeriod + 1; j <= i; j++) {
      const tr = Math.max(
        highs[j] - lows[j],
        Math.abs(highs[j] - closes[j - 1]),
        Math.abs(lows[j] - closes[j - 1])
      );

      sum += tr;
    }

    atr[i] = sum / atrPeriod;
  }

  let balance = startingBalance;
  let position = null;
  const trades = [];
  const equityCurve = [{ idx: 0, balance }];

  for (let i = Math.max(slowPeriod, atrPeriod) + 1; i < candles.length; i++) {
    const price = closes[i];

    if (position) {
      const hitSL =
        position.dir === "long"
          ? lows[i] <= position.sl
          : highs[i] >= position.sl;

      const hitTP =
        position.dir === "long"
          ? highs[i] >= position.tp
          : lows[i] <= position.tp;

      if (hitSL || hitTP) {
        const exitPrice = hitSL ? position.sl : position.tp;

        const pnl =
          position.dir === "long"
            ? (exitPrice - position.entry) * position.size
            : (position.entry - exitPrice) * position.size;

        balance += pnl;

        trades.push({
          dir: position.dir,
          entry: position.entry,
          exit: exitPrice,
          pnl,
          outcome: hitTP ? "TP" : "SL"
        });

        equityCurve.push({ idx: i, balance });

        position = null;
      }
    }

    if (
      !position &&
      fast[i] != null &&
      slow[i] != null &&
      atr[i]
    ) {
      const crossUp =
        fast[i - 1] <= slow[i - 1] &&
        fast[i] > slow[i];

      const crossDown =
        fast[i - 1] >= slow[i - 1] &&
        fast[i] < slow[i];

      const r = rsiVals[i];

      let dir = null;

      if (crossUp && r < 70) dir = "long";
      if (crossDown && r > 30) dir = "short";

      if (dir) {
        const slDist = atr[i] * slAtrMultiple;
        const tpDist = atr[i] * tpAtrMultiple;

        const riskAmount =
          balance * (riskPctPerTrade / 100);

        const size = riskAmount / slDist;

        position = {
          dir,
          entry: price,
          sl:
            dir === "long"
              ? price - slDist
              : price + slDist,
          tp:
            dir === "long"
              ? price + tpDist
              : price - tpDist,
          size
        };
      }
    }
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(
    losses.reduce((s, t) => s + t.pnl, 0)
  );

  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : 0;

  const totalReturnPct =
    ((balance - startingBalance) / startingBalance) * 100;

  return {
    startingBalance,
    endingBalance: Number(balance.toFixed(2)),
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct:
      trades.length > 0
        ? Number(
            ((wins.length / trades.length) * 100).toFixed(2)
          )
        : 0,
    profitFactor: Number(profitFactor.toFixed(2)),
    candleCount: candles.length,
    trades,
    equityCurve
  };
}

module.exports = {
  runStrategy,
  sma,
  rsi
};
