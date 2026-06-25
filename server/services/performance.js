const { calculateStatistics } = require('./statistics');

function buildPerformanceReport(deals = []) {

  const stats = calculateStatistics(deals);

  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);

  const monthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const todayPnL = deals
    .filter(d =>
      new Date(d.time) >= todayStart
    )
    .reduce(
      (sum, d) => sum + (d.profit || 0),
      0
    );

  const weekPnL = deals
    .filter(d =>
      new Date(d.time) >= weekStart
    )
    .reduce(
      (sum, d) => sum + (d.profit || 0),
      0
    );

  const monthPnL = deals
    .filter(d =>
      new Date(d.time) >= monthStart
    )
    .reduce(
      (sum, d) => sum + (d.profit || 0),
      0
    );

  return {

    ...stats,

    todayPnL: Number(todayPnL.toFixed(2)),

    weekPnL: Number(weekPnL.toFixed(2)),

    monthPnL: Number(monthPnL.toFixed(2))

  };

}

module.exports = {
  buildPerformanceReport
};
