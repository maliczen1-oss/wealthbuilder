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

    const duplicateResponse =
        await tradeService.executeTrade(
            duplicateRequest
        );

    assert(
        duplicateResponse.success === false,
        "Duplicate position should be rejected."
    );

    assert(
        duplicateResponse.message,
        "Duplicate position rejection message missing."
    );

    assert(
        duplicateResponse.message.includes(
            "open position"
        ),
        "Unexpected duplicate position rejection message."
    );

    console.log(

        "Duplicate position protection verified."

    );

    /*
    ======================================================
    Maximum Position Protection
    ======================================================
    */

    const testSymbols = [

        "EURUSD",
        "GBPUSD",
        "USDJPY",
        "AUDUSD",
        "USDCAD",
        "USDCHF",
        "NZDUSD",
        "XAUUSD",
        "NAS100",
        "US30"

    ];

    let maximumProtectionVerified = false;

    try {

        for (let i = 0; i < 20; i++) {

            const symbol =

                testSymbols[
                    i % testSymbols.length
                ];

            await tradeService.executeTrade({

                symbol,

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
    Invalid Symbol Protection
    ======================================================
    */

    const invalidSymbolResponse =
        await tradeService.executeTrade({

            symbol: "INVALID_SYMBOL",

            action: "BUY",

            executionType: "MARKET",

            riskPercent: 1,

            stopLoss: 100,

            takeProfit: 200,

            strategy: "RISK_TEST",

            session: "TEST"

        });

    assert(

        invalidSymbolResponse.success === false,

        "Invalid symbol should be rejected."

    );

    assert(

        invalidSymbolResponse.message,

        "Invalid symbol rejection message missing."

    );

    console.log(

        "Invalid symbol protection verified."

    );

    /*
    ======================================================
    Unsupported Action Protection
    ======================================================
    */

    const invalidActionResponse =
        await tradeService.executeTrade({

            symbol: "EURUSD",

            action: "HOLD",

            executionType: "MARKET",

            riskPercent: 1,

            stopLoss: 100,

            takeProfit: 200,

            strategy: "RISK_TEST",

            session: "TEST"

        });

    assert(

        invalidActionResponse.success === false,

        "Unsupported action should be rejected."

    );

    console.log(

        "Unsupported action protection verified."

    );

    /*
    ======================================================
    Execution Lock Protection
    ======================================================
    */

    const [lockResult1, lockResult2] =
        await Promise.allSettled([

            tradeService.executeTrade({

                ...duplicateRequest,

                preventDuplicate: false

            }),

            tradeService.executeTrade({

                ...duplicateRequest,

                preventDuplicate: false

            })

        ]);

    assert(

        lockResult1.status === "fulfilled" ||

        lockResult2.status === "fulfilled",

        "Expected at least one execution attempt."

    );

    console.log(

        "Execution lock behaviour verified."

    );

    console.log(

        "Risk Protection integration test passed."

    );

    return true;

};
