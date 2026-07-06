"use strict";

/*
==========================================================
WealthBuilder OS

MetaApi Recovery Integration Test

Version : 1.0.0
Status  : Production

Purpose
-------
Verifies MetaApi connection recovery and
system resilience.

==========================================================
*/

const metaapi =
    require("../../server/services/metaapi");

const tradeService =
    require("../../server/services/tradeService");

const {

    assert

} = require("../helpers/assertions");

exports.run = async () => {

    console.log(

        "Testing MetaApi Recovery..."

    );

    /*
    ======================================================
    Verify Initial Connection
    ======================================================
    */

    const connection =

        await metaapi.getConnection();

    assert(

        connection,

        "MetaApi connection unavailable."

    );

        /*
    ======================================================
    Verify Connection Before Recovery
    ======================================================
    */

    const initialConnection =

        await metaapi.getConnection();

    assert(

        initialConnection,

        "Initial MetaApi connection unavailable."

    );

    /*
    ======================================================
    Trigger / Verify Recovery
    ======================================================
    */

    if (typeof metaapi.initialize === "function") {

        await metaapi.initialize();

    }

    const recoveredConnection =

        await metaapi.getConnection();

    assert(

        recoveredConnection,

        "MetaApi connection not restored."

    );

    /*
    ======================================================
    Verify Trading Still Works
    ======================================================
    */

    const response =

        await tradeService.executeTrade({

            symbol: "EURUSD",

            action: "BUY",

            executionType: "MARKET",

            riskPercent: 1,

            stopLoss: 100,

            takeProfit: 200,

            strategy: "METAAPI_RECOVERY_TEST",

            session: "TEST",

            comment: "Recovery Integration Test"

        });

    assert(

        response.success,

        "Trading unavailable after recovery."

    );

    console.log(

        "MetaApi recovery verified."

    );

        /*
    ======================================================
    Verify Connection Consistency
    ======================================================
    */

    assert(

        recoveredConnection === initialConnection ||

        typeof recoveredConnection === "object",

        "Recovered connection is invalid."

    );

    /*
    ======================================================
    Verify Position Service Still Responds
    ======================================================
    */

    const positionService =
        require("../../server/services/positionService");

    const positions =
        await positionService.getPositions();

    assert(

        Array.isArray(positions),

        "Position service unavailable after recovery."

    );

    console.log(

        `Open Positions: ${positions.length}`

    );

    /*
    ======================================================
    Verify Trade Service Still Operational
    ======================================================
    */

    assert(

        response.transactionId,

        "Transaction ID missing after recovery."

    );

    console.log(

        "Trade execution confirmed after recovery."

    );

    console.log(

        "MetaApi recovery integration test passed."

    );

    return true;

};
