/*
==========================================================
WealthBuilder OS
Guardian API
Capital Protection Layer
==========================================================
*/

const express = require("express");
const router = express.Router();

const guardian =
    require("../services/guardianService");

const automation =
    require("../services/automationEngine");

router.get("/", async (req, res) => {

    try {

        const account =
            await req.connection.getAccountInformation();

        const settings =
            automation.getSettings();

        const report =
            guardian.evaluate(
                account,
                settings
            );

        res.json(report);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
