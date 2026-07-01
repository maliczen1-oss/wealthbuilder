const { getConnection } = require("./metaapi");
const symbolService = require("./symbolService");

async function getPrice(symbol) {

  const connection = getConnection();

  return await connection.getSymbolPrice(symbol);

}

async function getSpecification(symbol) {

  const connection = getConnection();

  return await connection.getSymbolSpecification(symbol);

}

async function getMarketSnapshot(baseSymbol) {

  const symbol =
    await symbolService.findSymbol(baseSymbol);

  if (!symbol) {

    throw new Error(
      `${baseSymbol} not found.`
    );

  }

  const price =
    await getPrice(symbol);

  const specification =
    await getSpecification(symbol);

  return {

    symbol,

    bid: price.bid,

    ask: price.ask,

    spread:
      Math.abs(
        price.ask - price.bid
      ),

    digits:
      specification.digits,

    point:
      specification.point,

    contractSize:
      specification.contractSize,

    minLot:
      specification.minVolume,

    maxLot:
      specification.maxVolume,

    lotStep:
      specification.volumeStep

  };

}

module.exports = {

  getPrice,

  getSpecification,

  getMarketSnapshot

};
