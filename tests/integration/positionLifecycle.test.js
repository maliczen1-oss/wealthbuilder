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
    assert(

        openResponse.clusterId,

        "Trade cluster was not assigned."

    );

    /*
    ======================================================
    Verify Position Exists
    ======================================================
    */

    const openPosition =

        await positionService.getPosition(

            request.symbol

        );

    assert(

        openPosition,

        "Position not found after execution."

    );

    assertEqual(

        String(openPosition.symbol).toUpperCase(),

        request.symbol,

        "Position symbol mismatch."

    );

    console.log(

        "Position successfully opened."

    );

    /*
    ======================================================
    Close Position
    ======================================================
    */

    const closeResponse =

        await tradeService.closePosition(

            openResponse.positionId ||

            openResponse.orderId

        );

    assert(

        closeResponse.success,

        "Position failed to close."

    );

    assertEqual(

        closeResponse.positionId,

        openResponse.positionId ||

        openResponse.orderId,

        "Closed position identifier mismatch."

    );

    console.log(

        "Position successfully closed."

    );

    /*
    ======================================================
    Verify Position Closed
    ======================================================
    */

    const closedPosition =

        await positionService.getPosition(

            request.symbol

        );

    assert(

        closedPosition === null,

        "Position still exists after close."

    );

    console.log(

        "Position removal verified."

    );

    /*
    ======================================================
    Verify Trade Cluster
    ======================================================
    */

    const cluster =

        tradeClusterService.getCluster(

            openResponse.clusterId

        );

    assert(

        cluster,

        "Trade cluster not found."

    );

    assertEqual(

        cluster.id,

        openResponse.clusterId,

        "Cluster ID mismatch."

    );

    assert(

        cluster.trades.length >= 1,

        "Trade cluster contains no trades."

    );

    console.log(

        `Cluster ${cluster.id} contains ${cluster.trades.length} trade(s).`

    );

    console.log(

        "Position Lifecycle integration test passed."

    );

    return true;

};
