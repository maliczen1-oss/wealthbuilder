function calculateStatistics(deals = []) {

  const trades = deals.filter(d =>
    d.profit !== undefined &&
    d.profit !== null
  );

  const winningTrades = trades.filter(t => t.profit > 0);
  const losingTrades = trades.filter(t => t.profit < 0);

  const grossProfit = winningTrades.reduce(
    (sum, trade) => sum + trade.profit,
    0
  );

  const grossLoss = Math.abs(
    losingTrades.reduce(
      (sum, trade) => sum + trade.profit,
      0
    )
  );

  const netProfit = grossProfit - grossLoss;

  const largestWin =
    winningTrades.length
      ? Math.max(...winningTrades.map(t => t.profit))
      : 0;

  const largestLoss =
    losingTrades.length
      ? Math.min(...losingTrades.map(t => t.profit))
      : 0;

  const averageWin =
    winningTrades.length
      ? grossProfit / winningTrades.length
      : 0;

  const averageLoss =
    losingTrades.length
      ? grossLoss / losingTrades.length
      : 0;

  const winRate =
    trades.length
      ? (winningTrades.length / trades.length) * 100
      : 0;

  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : 0;

  return {

    totalTrades: trades.length,

    winningTrades: winningTrades.length,

    losingTrades: losingTrades.length,

    winRate: Number(winRate.toFixed(2)),

    grossProfit: Number(grossProfit.toFixed(2)),

    grossLoss: Number(grossLoss.toFixed(2)),

    netProfit: Number(netProfit.toFixed(2)),

    largestWin: Number(largestWin.toFixed(2)),

    largestLoss: Number(largestLoss.toFixed(2)),

    averageWin: Number(averageWin.toFixed(2)),

    averageLoss: Number(averageLoss.toFixed(2)),

    profitFactor: Number(profitFactor.toFixed(2))

  };

}

module.exports = {
  calculateStatistics
};
