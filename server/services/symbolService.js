const { getConnection } = require("./metaapi");

async function getAvailableSymbols() {
  const connection = getConnection();

  return await connection.getSymbols();
}

async function findSymbol(baseSymbol) {
  const symbols = await getAvailableSymbols();

  const exact = symbols.find(
    s => s.symbol === baseSymbol
  );

  if (exact) return exact.symbol;

  const lower = baseSymbol.toLowerCase();

  const match = symbols.find(s => {
    const symbol = s.symbol.toLowerCase();

    return (
      symbol === lower ||
      symbol.includes(lower) ||
      symbol.startsWith(lower) ||
      symbol.endsWith(lower)
    );
  });

  return match ? match.symbol : null;
}

async function getEURUSD() {
  return await findSymbol("EURUSD");
}

async function getGBPUSD() {
  return await findSymbol("GBPUSD");
}

async function getUSDJPY() {
  return await findSymbol("USDJPY");
}

async function getXAUUSD() {
  return await findSymbol("XAUUSD");
}

async function getNAS100() {
  return (
    await findSymbol("NAS100") ||
    await findSymbol("USTEC") ||
    await findSymbol("US100")
  );
}

module.exports = {
  getAvailableSymbols,
  findSymbol,
  getEURUSD,
  getGBPUSD,
  getUSDJPY,
  getXAUUSD,
  getNAS100
};
