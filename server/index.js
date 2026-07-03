/*
==========================================================
WealthBuilder OS
Mission Control Server
Powered by Jarvis Intelligence
Production Edition
==========================================================
*/

require("dotenv").config();

const express = require("express");
const path = require("path");

/*
==========================================================
Services
==========================================================
*/

const metaapi = require("./services/metaapi");

/*
==========================================================
Routes
==========================================================
*/

const historyRoute = require("./routes/history");
const performanceRoute = require("./routes/performance");
const analyticsRoute = require("./routes/analytics");
const morningBriefRoute = require("./routes/morningBrief");
const dnaRoute = require("./routes/dna");
const psychologyRoute = require("./routes/psychology");
const automationRoute = require("./routes/automation");
const readinessRoute = require("./routes/readiness");
const guardianRoute = require("./routes/guardian");
const systemRoute = require("./routes/system");

/*
==========================================================
Application
==========================================================
*/

const app = express();

app.use(express.json());

app.use(
    express.static(
        path.join(
            __dirname,
            "..",
            "public"
        )
    )
);

/*
==========================================================
Environment
==========================================================
*/

const PORT =
    process.env.PORT || 3000;

const TOKEN =
    process.env.METAAPI_TOKEN;

const ACCOUNT_ID =
    process.env.METAAPI_ACCOUNT_ID;

if (!TOKEN || !ACCOUNT_ID) {

    console.error("");

    console.error(
        "Missing MetaApi environment variables."
    );

    console.error("");

    process.exit(1);

}

/*
==========================================================
Application State
==========================================================
*/

const state = {

    startedAt:
        new Date(),

    metaApi: {

        connected: false,

        connecting: false,

        account: null,

        connection: null,

        lastError: null,

        lastConnected: null

    }

};

/*
==========================================================
MetaApi Background Connection
==========================================================
*/

async function connectMetaApi() {

    if (state.metaApi.connecting) {

        return;

    }

    state.metaApi.connecting = true;

    console.log("");

    console.log(
        "Connecting to MetaApi..."
    );

    try {

        await metaapi.initialize(

            TOKEN,

            ACCOUNT_ID

        );

        state.metaApi.connected = true;

        state.metaApi.connecting = false;

        state.metaApi.connection =
            metaapi.getConnection();

        state.metaApi.account =
            metaapi.getAccount();

        state.metaApi.lastConnected =
            new Date();

        state.metaApi.lastError =
            null;

        console.log("");

        console.log(
            "MetaApi Connected"
        );

        console.log("");

    }

    catch (err) {

        state.metaApi.connected = false;

        state.metaApi.connecting = false;

        state.metaApi.lastError =
            err.message;

        console.error("");

        console.error(
            "MetaApi Connection Failed"
        );

        console.error(
            err.message
        );

        console.error("");

    }

}
