"use strict";

/*
==========================================================
WealthBuilder OS

Pending Orders Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Validates the pending order execution framework.

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

        "Testing Pending Order Framework..."

    );

    const request = {

        symbol: "EURUSD",

        action: "BUY",

        executionType: "BUY_LIMIT",

        riskPercent: 1,

        stopLoss: 100,

        takeProfit: 200,

        strategy: "INTEGRATION_TEST",

        session: "TEST",

        comment: "Pending Order Integration Test"

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

    /*
    ======================================================
    Version 2.1 Expected Behaviour
    ======================================================
    */

    assert(

        response.success === false,

        "Pending orders should not execute in Version 2.1."

    );

    assert(

        response.transactionId,

        "Transaction ID missing."

    );

    assertEqual(

        response.executionType,

        "BUY_LIMIT",

        "Execution type mismatch."

    );

    assert(

        response.message,

        "Response message missing."

    );

    assert(

        response.message.includes(

            "Pending order framework"

        ),

        "Unexpected pending order message."

    );

    console.log(

        "Pending order framework responded correctly."

    );

    /*
    ======================================================
    Response 3 continues here.
    ======================================================
    */

};
