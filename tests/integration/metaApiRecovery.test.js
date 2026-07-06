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
    Response 2 continues here.
    ======================================================
    */

};
