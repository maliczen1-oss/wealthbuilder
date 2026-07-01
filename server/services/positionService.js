const { getConnection } = require("./metaapi");

async function getPositions() {
  const connection = getConnection();

  return await connection.getPositions();
}

async function getPositionCount() {
  const positions = await getPositions();

  return positions.length;
}

async function hasOpenPosition(symbol) {
  const positions = await getPositions();

  return positions.some(
    p => p.symbol === symbol
  );
}

async function getPosition(symbol) {
  const positions = await getPositions();

  return (
    positions.find(
      p => p.symbol === symbol
    ) || null
  );
}

async function getBuyPositions() {
  const positions = await getPositions();

  return positions.filter(
    p => p.type === "POSITION_TYPE_BUY"
  );
}

async function getSellPositions() {
  const positions = await getPositions();

  return positions.filter(
    p => p.type === "POSITION_TYPE_SELL"
  );
}

async function getTotalVolume() {
  const positions = await getPositions();

  return positions.reduce(
    (sum, position) => sum + position.volume,
    0
  );
}

async function canOpenPosition(maxPositions = 4) {
  const count = await getPositionCount();

  return count < maxPositions;
}

module.exports = {
  getPositions,
  getPositionCount,
  hasOpenPosition,
  getPosition,
  getBuyPositions,
  getSellPositions,
  getTotalVolume,
  canOpenPosition
};
