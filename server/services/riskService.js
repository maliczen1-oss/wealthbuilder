const accountService = require("./accountService");

function roundLotSize(lot) {
  return Math.max(0.01, Math.round(lot * 100) / 100);
}

async function calculateRiskAmount(riskPercent = 1) {
  const balance = await accountService.getBalance();

  return balance * (riskPercent / 100);
}

async function calculateLotSize(
  stopLossPips,
  pipValue = 10,
  riskPercent = 1
) {
  const riskAmount = await calculateRiskAmount(riskPercent);

  if (stopLossPips <= 0) {
    return 0.01;
  }

  const lot =
    riskAmount /
    (stopLossPips * pipValue);

  return roundLotSize(lot);
}

async function getMaxRisk(riskPercent = 1) {
  return await calculateRiskAmount(riskPercent);
}

async function canRiskTrade(
  stopLossPips,
  pipValue = 10,
  riskPercent = 1
) {
  const lot = await calculateLotSize(
    stopLossPips,
    pipValue,
    riskPercent
  );

  return lot >= 0.01;
}

module.exports = {
  calculateRiskAmount,
  calculateLotSize,
  getMaxRisk,
  canRiskTrade,
  roundLotSize
};
