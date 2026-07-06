"use strict";

/*
==========================================================
WealthBuilder OS

Risk Protection Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Validates all production safety mechanisms.

Coverage
--------
✓ Duplicate Position Protection
✓ Maximum Position Protection
✓ Invalid Symbol Protection
✓ Unsupported Action Protection
✓ Execution Lock Protection

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

        "Testing Risk Protection..."

    );

    /*
    ======================================================
    Test 1
    Duplicate Position Protection
    ======================================================
    */

    const duplicateRequest = {

        symbol: "EURUSD",

        action: "BUY",

        executionType: "MARKET",

        riskPercent: 1,

        stopLoss: 100,

        takeProfit: 200,

        strategy: "RISK_TEST",

        session: "TEST"

    };

        /*
    ======================================================
    Duplicate Position Protection
    ======================================================
    */

    const firstTrade =

        await tradeService.executeTrade(

            duplicateRequest

        );

    assert(

        firstTrade.success,

        "Initial trade failed."

    );

    let duplicateRejected = false;

    try {

        await tradeService.executeTrade(

            duplicateRequest

        );

    }

    catch (error) {

        duplicateRejected = true;

        assert(

            error.message.includes(

                "already has an open position"

            ),

            "Unexpected duplicate position error."

        );

    }

    assert(

        duplicateRejected,

        "Duplicate position protection failed."

    );

    console.log(

        "Duplicate position protection verified."

    );

    /*
    ======================================================
    Maximum Position Protection
    ======================================================
    */

    let maximumProtectionVerified = false;

    try {

        for (let i = 0; i < 20; i++) {

            await tradeService.executeTrade({

                symbol: `TEST${i}`,

                action: "BUY",

                executionType: "MARKET",

                riskPercent: 1,

                stopLoss: 100,

                takeProfit: 200,

                strategy: "MAX_POSITION_TEST",

                session: "TEST",

                preventDuplicate: false

            });

        }

    }

    catch (error) {

        maximumProtectionVerified = true;

        assert(

            error.message.includes(

                "Maximum open positions"

            ),

            "Unexpected maximum position error."

        );

    }

    assert(

        maximumProtectionVerified,

        "Maximum position protection failed."

    );

    console.log(

        "Maximum position protection verified."

    );

    /*
    ======================================================
    Response 3 continues here.
    ======================================================
    */

};
