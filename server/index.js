require("dotenv").config();

const express = require("express");
const path = require("path");
const MetaApi = require("metaapi.cloud-sdk").default;

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

let account = null;
let connection = null;

async function initialize() {

    const api = new MetaApi(TOKEN);

    account = await api.metatraderAccountApi.getAccount(
        ACCOUNT_ID
    );

    if (account.state !== "DEPLOYED") {
        await account.deploy();
    }

    await account.waitConnected();

    connection = account.getRPCConnection();

    await connection.connect();

    await connection.waitSynchronized();

    console.log("Connected to:", account.name);
}

// Makes the connection available to every route
app.use((req, res, next) => {
    req.connection = connection;
    req.account = account;
    next();
});

// Route modules
app.use("/api/history", require("./routes/history"));
app.use("/api/performance", require("./routes/performance"));
app.use("/api/analytics", require("./routes/analytics"));

// Existing endpoints
app.get("/api/health", (req, res) => {

    res.json({
        ok: true,
        name: account?.name,
        broker: account?.broker
    });

});

app.get("/api/account", async (req, res) => {

    try {

        const info =
            await connection.getAccountInformation();

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
            await connection.getPositions();

        res.json(positions);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

// Dashboard
app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "..", "public", "index.html")
    );

});

initialize()

.then(() => {

    app.listen(PORT, () => {

        console.log(
            `WealthBuilder running on ${PORT}`
        );

    });

})

.catch(err => {

    console.error(err);

    process.exit(1);

});
