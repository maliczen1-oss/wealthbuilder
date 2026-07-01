const { getConnection } = require("./metaapi");

const positionService = require("./positionService");
const riskService = require("./riskService");

async function openBuy(
    symbol,
    stopLossPips,
    takeProfitPips,
    riskPercent = 1
) {

    const connection = getConnection();

    if (!(await positionService.canOpenPosition())) {

        throw new Error(
            "Maximum number of positions reached."
        );

    }

    if (await positionService.hasOpenPosition(symbol)) {

        throw new Error(
            `${symbol} already has an open trade.`
        );

    }

    const volume =
        await riskService.calculateLotSize(
            stopLossPips,
            10,
            riskPercent
        );

    return await connection.createMarketBuyOrder(

        symbol,

        volume,

        stopLossPips,

        takeProfitPips

    );

}

async function openSell(
    symbol,
    stopLossPips,
    takeProfitPips,
    riskPercent = 1
) {

    const connection = getConnection();

    if (!(await positionService.canOpenPosition())) {

        throw new Error(
            "Maximum number of positions reached."
        );

    }

    if (await positionService.hasOpenPosition(symbol)) {

        throw new Error(
            `${symbol} already has an open trade.`
        );

    }

    const volume =
        await riskService.calculateLotSize(
            stopLossPips,
            10,
            riskPercent
        );

    return await connection.createMarketSellOrder(

        symbol,

        volume,

        stopLossPips,

        takeProfitPips

    );

}

async function closePosition(positionId) {

    const connection = getConnection();

    return await connection.closePosition(
        positionId
    );

}

module.exports = {

    openBuy,

    openSell,

    closePosition

};
