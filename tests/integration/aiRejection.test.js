"use strict";

/*
==========================================================
WealthBuilder OS

AI Rejection Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Verifies that AI optimisation rejects an
unsafe trade before execution.

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

        "Testing AI Rejection..."

    );

    /*
    ======================================================
    This request should be rejected by the AI
    optimisation layer.
    ======================================================
    */

    const request = {

        symbol: "EURUSD",

        action: "BUY",

        executionType: "MARKET",

        riskPercent: 100,

        stopLoss: 1,

        takeProfit: 100000,

        strategy: "AI_REJECTION_TEST",

        session: "TEST",

        comment: "AI rejection integration test"

    };

        const response =

        await tradeService.executeTrade(

            request

        );

    /*
    ======================================================
    Validate AI Rejection
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

    assert(

        response.success === false,

        "AI should reject this trade."

    );

    assert(

        response.message,

        "Rejection reason missing."

    );

    assertEqual(

        response.message,

        "AI optimisation rejected trade.",

        "Unexpected rejection message."

    );

    assert(

        response.transactionId,

        "Transaction ID missing."

    );

    console.log(

        "AI correctly rejected the trade."

    );

        /*
    ======================================================
    Verify No Execution Occurred
    ======================================================
    */

    assert(

        !response.orderId,

        "Rejected trade should not create an order."

    );

    assert(

        !response.positionId,

        "Rejected trade should not create a position."

    );

    assert(

        !response.clusterId,

        "Rejected trade should not create a trade cluster."

    );

    assert(

        !response.executedAt,

        "Rejected trade should not have an execution timestamp."

    );

    console.log(

        "No MetaApi execution occurred."

    );

    console.log(

        "No position was opened."

    );

    console.log(

        "No trade cluster was created."

    );

    console.log(

        "AI rejection integration test passed."

    );

    return true;

};
