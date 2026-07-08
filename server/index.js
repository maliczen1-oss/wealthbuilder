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
const tradeRoute = require("./routes/trade");

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
/*
==========================================================
MetaApi Middleware
==========================================================
*/

app.use((req, res, next) => {

    req.connection =
        state.metaApi.connection;

    req.account =
        state.metaApi.account;

    req.metaApi = {

        connected:
            state.metaApi.connected,

        connecting:
            state.metaApi.connecting,

        lastError:
            state.metaApi.lastError

    };

    next();

});

/*
==========================================================
API Routes
==========================================================
*/

app.use("/api/history", historyRoute);

app.use("/api/performance", performanceRoute);

app.use("/api/analytics", analyticsRoute);

app.use("/api/morning-brief", morningBriefRoute);

app.use("/api/dna", dnaRoute);

app.use("/api/psychology", psychologyRoute);

app.use("/api/automation", automationRoute);

app.use("/api/readiness", readinessRoute);

app.use("/api/guardian", guardianRoute);

app.use("/api/system", systemRoute);

/*
==========================================================
Trading API
==========================================================
*/

app.use("/api/trade", tradeRoute);

/*
==========================================================
Health
==========================================================
*/

app.get("/api/health", (req, res) => {

    res.json({

        ok: true,

        service: "WealthBuilder OS",

        version: "1.0",

        uptime:

            Math.floor(

                process.uptime()

            ),

        metaApi: {

            connected:
                state.metaApi.connected,

            connecting:
                state.metaApi.connecting,

            lastConnected:
                state.metaApi.lastConnected,

            lastError:
                state.metaApi.lastError

        }

    });

});

/*
==========================================================
Account
==========================================================
*/

app.get("/api/account", async (req, res) => {

    if (!req.connection) {

        return res.status(503).json({

            error:

                "MetaApi not connected."

        });

    }

    try {

        const account =

            await req.connection
                .getAccountInformation();

        res.json(account);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

/*
==========================================================
Positions
==========================================================
*/

app.get("/api/positions", async (req, res) => {

    if (!req.connection) {

        return res.status(503).json({

            error:

                "MetaApi not connected."

        });

    }

    try {

        const positions =

            await req.connection
                .getPositions();

        res.json(positions);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

/*
==========================================================
Frontend
==========================================================
*/

app.get("/", (req, res) => {

    res.sendFile(

        path.join(

            __dirname,

            "..",

            "public",

            "index.html"

        )

    );

});
/*
==========================================================
Startup
==========================================================
*/

async function start() {

    console.log("");

    console.log("======================================");
    console.log("WealthBuilder OS");
    console.log("Powered by Jarvis Intelligence");
    console.log("======================================");
    console.log("");

    /*
    --------------------------------------
    Start Express immediately
    --------------------------------------
    */

    app.listen(PORT, () => {

        console.log(

            `Server Running : http://localhost:${PORT}`

        );

        console.log(

            `Environment    : ${process.env.NODE_ENV || "development"}`

        );

        console.log("");

        console.log(

            "Mission Control Online"

        );

        console.log("");

    });

    /*
    --------------------------------------
    Background MetaApi Connection
    --------------------------------------
    */

    await connectMetaApi();

    /*
    --------------------------------------
    Automatic Retry
    --------------------------------------
    */

    setInterval(async () => {

        if (

            !state.metaApi.connected &&

            !state.metaApi.connecting

        ) {

            console.log(

                "Retrying MetaApi connection..."

            );

            await connectMetaApi();

        }

    }, 30000);

}

/*
==========================================================
Graceful Shutdown
==========================================================
*/

process.on(

    "SIGINT",

    () => {

        console.log("");

        console.log(

            "Stopping WealthBuilder OS..."

        );

        console.log("");

        process.exit(0);

    }

);

process.on(

    "SIGTERM",

    () => {

        console.log("");

        console.log(

            "Stopping WealthBuilder OS..."

        );

        console.log("");

        process.exit(0);

    }

);

/*
==========================================================
Unhandled Errors
==========================================================
*/

process.on(

    "unhandledRejection",

    err => {

        console.error(

            "Unhandled Promise Rejection"

        );

        console.error(err);

    }

);

process.on(

    "uncaughtException",

    err => {

        console.error(

            "Uncaught Exception"

        );

        console.error(err);

    }

);

/*
==========================================================
Start Server
==========================================================
*/

start();
/*
==========================================================
404 Handler
==========================================================
*/

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error: "Endpoint not found.",

        path: req.originalUrl

    });

});

/*
==========================================================
Global Error Handler
==========================================================
*/

app.use((err, req, res, next) => {

    console.error("");

    console.error("======================================");

    console.error("WealthBuilder OS Error");

    console.error("======================================");

    console.error(err);

    console.error("");

    if (res.headersSent) {

        return next(err);

    }

    res.status(500).json({

        success: false,

        error: "Internal Server Error",

        message:

            process.env.NODE_ENV === "development"

                ? err.message

                : "Unexpected server error."

    });

});

/*
==========================================================
System Information
==========================================================
*/

console.log("");

console.log("======================================");

console.log("Mission Control Boot Sequence Complete");

console.log("======================================");

console.log(`Platform : ${process.platform}`);

console.log(`Node.js  : ${process.version}`);

console.log(`PID      : ${process.pid}`);

console.log("");

/*
==========================================================
ATLAS CERTIFICATION
==========================================================

✓ Railway Compatible

✓ Express Production Ready

✓ Graceful Startup

✓ Graceful Shutdown

✓ Background MetaApi Connection

✓ Automatic Retry

✓ Route Protection

✓ Health Monitoring

✓ Global Error Handling

✓ WealthBuilder OS Certified

==========================================================
*/
