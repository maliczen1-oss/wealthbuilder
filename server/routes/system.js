const express = require("express");
const router = express.Router();

const metaapi = require("../services/metaapi");

router.get("/", async (req, res) => {

    try {

        const account =
            metaapi.getAccount();

        const connection =
            metaapi.getConnection();

        const status = {

            timestamp: new Date(),

            services: {

                metaApi: !!connection,

                account: !!account,

                broker:
                    account?.broker || null,

                connected:
                    !!connection

            },

            overallHealth: 100

        };

        if (!connection)
            status.overallHealth -= 40;

        if (!account)
            status.overallHealth -= 30;

        res.json(status);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
