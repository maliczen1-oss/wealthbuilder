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

    /*
    ======================================================
    Response 2 continues here.
    ======================================================
    */

};
