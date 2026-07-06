"use strict";

/*
==========================================================
WealthBuilder OS

Market BUY Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Validates the complete BUY execution pipeline.

==========================================================
*/

const tradeService =
    require("../../server/services/tradeService");

const {

    assert,

    assertEqual

} = require("../helpers/assertions");

exports.run = async () => {

    console.log(

        "Testing Market BUY..."

    );

    const request = {

        symbol: "EURUSD",

        action: "BUY",

        riskPercent: 1,

        stopLoss: 100,

        takeProfit: 200,

        strategy: "INTEGRATION_TEST",

        session: "TEST"

    };

        const response =

        await tradeService.executeTrade(

            request

        );

    /*
    ======================================================
    Validate Response
    ======================================================
    */

    assert(

        response,

        "Trade service returned no response."

    );

    assertEqual(

        typeof response.success,

        "boolean",

        "Response.success should be boolean."

    );

    if (!response.success) {

        throw new Error(

            `Trade rejected: ${response.message}`

        );

    }

    assert(

        response.positionId ||

        response.orderId,

        "No position/order identifier returned."

    );

    assert(

        response.clusterId,

        "Trade cluster was not assigned."

    );

    assertEqual(

        response.symbol,

        request.symbol,

        "Returned symbol mismatch."

    );

    assertEqual(

        response.action,

        request.action,

        "Returned action mismatch."

    );

    console.log(

        `Trade executed successfully.`

    );

    console.log(

        `Cluster: ${response.clusterId}`

    );

    console.log(

        `Position: ${

            response.positionId ||

            response.orderId

        }`

    );

        /*
    ======================================================
    Verify Trade Cluster
    ======================================================
    */

    const tradeClusterService =
        require("../../server/services/tradeClusterService");

    const cluster =

        tradeClusterService.getCluster(

            response.clusterId

        );

    assert(

        cluster,

        "Trade cluster not found."

    );

    assert(

        cluster.trades.length > 0,

        "Trade was not registered inside the cluster."

    );

    assertEqual(

        cluster.symbol,

        request.symbol,

        "Cluster symbol mismatch."

    );

    assertEqual(

        cluster.strategy,

        request.strategy,

        "Cluster strategy mismatch."

    );

    console.log(

        `Cluster contains ${cluster.trades.length} trade(s).`

    );

    console.log(

        "Market BUY integration test passed."

    );

    return true;
};
