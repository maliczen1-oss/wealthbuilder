const learningEngine = require("./learningEngine");

const activeTrades = new Map();

function createTrade(id, setup, decision) {

    activeTrades.set(id, {

        id,

        status: "OPEN",

        created: new Date().toISOString(),

        setup,

        decision,

        events: [

            {

                time: new Date().toISOString(),

                event: "TRADE_OPENED"

            }

        ]

    });

}

function updateStatus(id, status) {

    const trade =
        activeTrades.get(id);

    if (!trade) return;

    trade.status = status;

    trade.events.push({

        time: new Date().toISOString(),

        event: status

    });

}

function closeTrade(id, result) {

    const trade =
        activeTrades.get(id);

    if (!trade) return;

    trade.status = "CLOSED";

    trade.closed =
        new Date().toISOString();

    trade.result = result;

    trade.events.push({

        time: trade.closed,

        event: "TRADE_CLOSED"

    });

    learningEngine.recordTrade(trade);

    activeTrades.delete(id);

}

function getTrade(id) {

    return activeTrades.get(id);

}

function getActiveTrades() {

    return Array.from(
        activeTrades.values()
    );

}

module.exports = {

    createTrade,

    updateStatus,

    closeTrade,

    getTrade,

    getActiveTrades

};
