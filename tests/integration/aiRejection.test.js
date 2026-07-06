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

    /*
    ======================================================
    Response 2 continues here.
    ======================================================
    */

};
