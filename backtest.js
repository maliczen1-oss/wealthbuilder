/**
 * Real Backtest Engine
 * ---------------------------------------------------------------
 * Runs a defined, deterministic strategy against REAL historical
 * candles fetched from MetaApi. No random numbers anywhere.
 *
 * If the strategy loses money in the backtest, this engine will
 * report a loss. That's the point — a backtest that can't show
 * a loss isn't measuring anything real.
 * ---------------------------------------------------------------
 */

/**
 * Simple Moving Average
 */
function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/**
 * Relative Strength Index
 */
function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  let gainSum = 0, lossSum = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    if (i <= period) {
      gainSum += gain;
      lossSum += loss;
      if (i === period) {
        const avgGain = gainSum / period;
        const avgLoss = lossSum / period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      }
    } else {
      const prevAvgGain = out._avgGain ?? gainSum / period;
      const prevAvgLoss = out._avgLoss ?? lossSum / period;
      const avgGain = (prevAvgGain * (period - 1) + gain) / period;
      const avgLoss = (prevAvgLoss * (period - 1) + loss) / period;
      out._avgGain = avgGain;
      out._avgLoss = avgLoss;
      out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
  }
  return out;
}

/**
 * Strategy: MA Crossover + RSI filter
 * - Long when fastMA crosses above slowMA AND RSI is not overbought (<70)
 * - Short when fastMA crosses below slowMA AND RSI is not oversold (>30)
 * - Fixed stop loss / take profit in price terms, derived from ATR-like
 *   recent volatility, not invented numbers.
 *
 * This is intentionally a plain, well-known strategy so the backtest
 * numbers are easy to sanity-check against known behavior. It is NOT
 * tuned to look good — swap in your own ruleset here if you have one.
 */
function runStrategy(candles, opts = {}) {
  const {
    fastPeriod = 10,
    slowPeriod = 30,
    rsiPeriod = 14,
    riskPctPerTrade = 1,      // % of account risked per trade
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

  // Simple ATR approximation for SL/TP distance
  const atr = new Array(closes.length).fill(null);
  const atrPeriod = 14;
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    if (i < atrPeriod) continue;
    let sum = 0;
    for (let j = i - atrPeriod + 1; j <= i; j++) {
      sum += Math.max(
        highs[j] - lows[j],
        j > 0 ? Math.abs(highs[j] - closes[j - 1]) : highs[j] - lows[j],
        j > 0 ? Math.abs(lows[j] - closes[j - 1]) : highs[j] - lows[j]
      );
    }
    atr[i] = sum / atrPeriod;
  }

  let balance = startingBalance;
  let position = null; // { dir, entry, sl, tp, size, entryIdx }
  const trades = [];
  const equityCurve = [{ idx: 0, balance }];

  for (let i = Math.max(slowPeriod, atrPeriod) + 1; i < candles.length; i++) {
    const price = closes[i];

    // Manage open position first
    if (position) {
      const hitSL = position.dir === 'long' ? lows[i] <= position.sl : highs[i] >= position.sl;
      const hitTP = position.dir === 'long' ? highs[i] >= position.tp : lows[i] <= position.tp;
      if (hitSL || hitTP) {
        const exitPrice = hitSL ? position.sl : position.tp;
        const pnl = position.dir === 'long'
          ? (exitPrice - position.entry) * position.size
          : (position.entry - exitPrice) * position.size;
        balance += pnl;
        trades.push({
          dir: position.dir,
          entry: position.entry,
          exit: exitPrice,
          entryIdx: position.entryIdx,
          exitIdx: i,
          pnl,
          outcome: hitTP ? 'TP' : 'SL',
        });
        equityCurve.push({ idx: i, balance });
        position = null;
      }
    }

    // Look for new entry only if flat
    if (!position && fast[i] != null && slow[i] != null && fast[i - 1] != null && slow[i - 1] != null && atr[i]) {
      const crossUp = fast[i - 1] <= slow[i - 1] && fast[i] > slow[i];
      const crossDown = fast[i - 1] >= slow[i - 1] && fast[i] < slow[i];
      const r = rsiVals[i];

      let dir = null;
      if (crossUp && r != null && r < 70) dir = 'long';
      else if (crossDown && r != null && r > 30) dir = 'short';

      if (dir) {
        const slDist = atr[i] * slAtrMultiple;
        const tpDist = atr[i] * tpAtrMultiple;
        const sl = dir === 'long' ? price - slDist : price + slDist;
        const tp = dir === 'long' ? price + tpDist : price - tpDist;
        const riskAmount = balance * (riskPctPerTrade / 100);
        const size = riskAmount / slDist; // units such that hitting SL loses riskAmount

        position = { dir, entry: price, sl, tp, size, entryIdx: i };
      }
    }
  }

  // Close any still-open position at the last available price
  if (position) {
    const exitPrice = closes[closes.length - 1];
    const pnl = position.dir === 'long'
      ? (exitPrice - position.entry) * position.size
      : (position.entry - exitPrice) * position.size;
    balance += pnl;
    trades.push({
      dir: position.dir,
      entry: position.entry,
      exit: exitPrice,
      entryIdx: position.entryIdx,
      exitIdx: closes.length - 1,
      pnl,
      outcome: 'EOD_CLOSE',
    });
    equityCurve.push({ idx: closes.length - 1, balance });
  }

  // ---- Honest stats, computed from actual trade results ----
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  const totalReturn = ((balance - startingBalance) / startingBalance) * 100;

  // Max drawdown from equity curve
  let peak = startingBalance;
  let maxDD = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.balance);
    const dd = ((peak - point.balance) / peak) * 100;
    maxDD = Math.max(maxDD, dd);
  }

  return {
    startingBalance,
    endingBalance: Math.round(balance * 100) / 100,
    totalReturnPct: Math.round(totalReturn * 100) / 100,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct: Math.round(winRate * 100) / 100,
    profitFactor: Number.isFinite(profitFactor) ? Math.round(profitFactor * 100) / 100 : null,
    maxDrawdownPct: Math.round(maxDD * 100) / 100,
    trades,
    equityCurve,
    candleCount: candles.length,
    params: { fastPeriod, slowPeriod, rsiPeriod, riskPctPerTrade, slAtrMultiple, tpAtrMultiple },
  };
}

module.exports = { runStrategy, sma, rsi };
