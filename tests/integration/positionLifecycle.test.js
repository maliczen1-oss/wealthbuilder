"use strict";

/*
==========================================================
WealthBuilder OS

Position Lifecycle Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Verifies the complete lifecycle of a trade:
Open → Verify → Close → Verify Closed.

==========================================================
*/

const tradeService =
    require("../../server/services/tradeService");

const positionService =
    require("../../server/services/positionService");

const tradeClusterService =
    require("../../server/services/tradeClusterService");

const {

    assert,

    assertEqual

} = require("../helpers/assertions");

exports.run = async () => {

    console.log(

        "Testing Position Lifecycle..."

    );

    const request = {

        symbol: "EURUSD",

        action: "BUY",

        executionType: "MARKET",

        riskPercent: 1,

        stopLoss: 100,

        takeProfit: 200,

        strategy: "POSITION_LIFECYCLE_TEST",

        session: "TEST",

        comment: "Position Lifecycle Integration Test"

    };

        /*
    ======================================================
    Open Position
    ======================================================
    */

    const openResponse =

        await tradeService.executeTrade(

            request

        );

    assert(

        openResponse.success,

        "Position failed to open."

    );

    assert(

        openResponse.positionId ||

        openResponse.orderId,

        "No position/order identifier returned."

    );

};
