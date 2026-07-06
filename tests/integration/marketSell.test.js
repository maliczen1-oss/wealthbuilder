"use strict";

/*
==========================================================
WealthBuilder OS

Market SELL Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Validates the complete SELL execution pipeline.

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

        "Testing Market SELL..."

    );

    const request = {

        symbol: "EURUSD",

        action: "SELL",

        executionType: "MARKET",

        riskPercent: 1,

        stopLoss: 100,

        takeProfit: 200,

        strategy: "INTEGRATION_TEST",

        session: "TEST",

        comment: "Market SELL Integration Test"

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

        response.transactionId,

        "Transaction ID missing."

    );

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

    assertEqual(

        response.executionType,

        "MARKET",

        "Execution type mismatch."

    );

    console.log(

        "Market SELL executed successfully."

    );

    console.log(

        `Transaction: ${response.transactionId}`

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

    assertEqual(

        cluster.direction,

        request.action,

        "Cluster direction mismatch."

    );

    console.log(

        `Cluster contains ${cluster.trades.length} trade(s).`

    );

    console.log(

        "Market SELL integration test passed."

    );

    return true;

};
