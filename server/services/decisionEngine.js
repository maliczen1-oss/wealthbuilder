const confidenceEngine = require("./confidenceEngine");
const marketService = require("./marketService");
const positionService = require("./positionService");

async function evaluateTrade(setup) {

    const confidence =
        await confidenceEngine.evaluate(setup);

    const market =
        await marketService.getMarketSnapshot(
            setup.symbol
        );

    const openPositions =
        await positionService.getPositionCount();

    const approved =
        confidence.approved &&
        openPositions < 4;

    return {

        approved,

        confidence,

        market,

        openPositions,

        recommendation:

            approved
                ? "EXECUTE"
                : "WAIT"

    };

}

module.exports = {

    evaluateTrade

};
