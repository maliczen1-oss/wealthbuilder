"use strict";

/*
==========================================================
WealthBuilder OS

Integration Test Environment

Version : 1.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides a shared environment for all integration tests.

==========================================================
*/

module.exports = {

    mode: "integration",

    allowLiveTrading: false,

    useMockMetaApi: true,

    timeout: 30000,

    retries: 2,

    logging: true,

    async initialize() {

        process.env.NODE_ENV = "test";

        process.env.ALLOW_LIVE_TRADING = "false";

        process.env.METAAPI_MOCK = "true";

        return true;

    }

};
