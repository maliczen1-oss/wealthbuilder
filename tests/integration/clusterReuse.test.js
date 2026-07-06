"use strict";

/*
==========================================================
WealthBuilder OS

Trade Cluster Reuse Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Verifies that multiple compatible trades reuse
the same trade cluster.

==========================================================
*/

const tradeService =
    require("../../server/services/tradeService");

const tradeClusterService =
    require("../../server/services/tradeClusterService");

const {

    assert,

    assertEqual

} = require("../helpers/assertions");

exports.run = async () => {

    console.log(

        "Testing Smart Cluster Reuse..."

    );

    const request = {

        symbol: "EURUSD",

        action: "BUY",

        executionType: "MARKET",

        riskPercent: 1,

        stopLoss: 100,

        takeProfit: 200,

        strategy: "CLUSTER_REUSE_TEST",

        session: "TEST",

        comment: "Cluster Reuse Integration Test"

    };

        /*
    ======================================================
    Execute First Trade
    ======================================================
    */

    const firstResponse =

        await tradeService.executeTrade(

            request

        );

    assert(

        firstResponse.success,

        "First trade failed."

    );

    /*
    ======================================================
    Execute Second Trade
    ======================================================
    */

    const secondResponse =

        await tradeService.executeTrade({

            ...request,

            preventDuplicate: false

        });

    assert(

        secondResponse.success,

        "Second trade failed."

    );

    /*
    ======================================================
    Execute Third Trade
    ======================================================
    */

    const thirdResponse =

        await tradeService.executeTrade({

            ...request,

            preventDuplicate: false

        });

    assert(

        thirdResponse.success,

        "Third trade failed."

    );

    /*
    ======================================================
    Validate Cluster Reuse
    ======================================================
    */

    assertEqual(

        firstResponse.clusterId,

        secondResponse.clusterId,

        "Second trade created a new cluster."

    );

    assertEqual(

        secondResponse.clusterId,

        thirdResponse.clusterId,

        "Third trade created a new cluster."

    );

    console.log(

        `Shared Cluster: ${firstResponse.clusterId}`

    );

    /*
    ======================================================
    Response 3 continues here.
    ======================================================
    */
};
