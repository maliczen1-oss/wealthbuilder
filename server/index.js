require("dotenv").config();

const express = require("express");
const path = require("path");

const metaapi = require("./services/metaapi");

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

app.use(async (req, res, next) => {

    req.connection = metaapi.getConnection();

    req.account = metaapi.getAccount();

    next();

});

app.use("/api/history", require("./routes/history"));

app.use("/api/performance", require("./routes/performance"));

app.use("/api/analytics", require("./routes/analytics"));

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

    }

    catch (err) {

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

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

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

async function start() {

    await metaapi.initialize(

        TOKEN,

        ACCOUNT_ID

    );

    app.listen(PORT, () => {

        console.log(

            `WealthBuilder running on ${PORT}`

        );

    });

}

start().catch(console.error);
