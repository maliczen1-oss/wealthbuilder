const express = require("express");
const router = express.Router();

const automationEngine =
    require("../services/automationEngine");

router.get("/", (req, res) => {

    try {

        res.json(
            automationEngine.getSettings()
        );

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

router.post("/settings", (req, res) => {

    try {

        const settings =
            automationEngine.updateSettings(
                req.body
            );

        res.json(settings);

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
