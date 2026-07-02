require("dotenv").config();

const express = require("express");
const path = require("path");

const metaapi = require("./services/metaapi");

const historyRoute = require("./routes/history");
const performanceRoute = require("./routes/performance");
const analyticsRoute = require("./routes/analytics");
const morningBriefRoute = require("./routes/morningBrief");
const dnaRoute = require("./routes/dna");
const psychologyRoute = require("./routes/psychology");
const automationRoute = require("./routes/automation");
const readinessRoute = require("./routes/readiness");
const systemRoute = require("./routes/system");
const guardianRoute = require("./routes/guardian");

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = process.env.PORT || 3000;

const TOKEN = process.env.METAAPI_TOKEN;
const ACCOUNT_ID = process.env.METAAPI_ACCOUNT_ID;

if (!TOKEN || !ACCOUNT_ID) {

    console.error("Missing MetaApi credentials.");

    process.exit(1);

}

/*
==========================================================
MetaApi Middleware
==========================================================
*/

app.use((req, res, next) => {

    req.connection = metaapi.getConnection();
    req.account = metaapi.getAccount();

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

app.use("/api/system", systemRoute);

app.use("/api/guardian", guardianRoute);

/*
==========================================================
Core API
==========================================================
*/

app.get("/api/health", (req, res) => {

    res.json({

        ok: true,

        broker: req.account?.broker,

        name: req.account?.name

    });

});

app.get("/api/account", async (req, res) => {

    try {

        const info =
            await req.connection.getAccountInformation();

        res.json(info);

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

app.get("/api/positions", async (req, res) => {

    try {

        const positions =
            await req.connection.getPositions();

        res.json(positions);

    } catch (err) {

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

    try {

        console.log("Initializing WealthBuilder OS...");

        await metaapi.initialize(

            TOKEN,

            ACCOUNT_ID

        );

        console.log("MetaApi Connected");

        app.listen(PORT, () => {

            console.log("");
            console.log("======================================");
            console.log("WealthBuilder OS");
            console.log("Powered by Jarvis Intelligence");
            console.log("======================================");
            console.log(`Server Running : http://localhost:${PORT}`);
            console.log(`Environment    : ${process.env.NODE_ENV || "development"}`);
            console.log("======================================");
            console.log("");

        });

    } catch (err) {

        console.error("Startup Failed");
        console.error(err);
        process.exit(1);

    }

}

start();
