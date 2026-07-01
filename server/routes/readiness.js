const express = require("express");
const router = express.Router();

const dnaEngine =
    require("../services/dnaEngine");

const psychologyEngine =
    require("../services/psychologyEngine");

const automationEngine =
    require("../services/automationEngine");

router.get("/", (req, res) => {

    try {

        const dna =
            dnaEngine.analyse();

        const psychology =
            psychologyEngine.analyse();

        const automation =
            automationEngine.getSettings();

        let score = 100;

        if (dna.winRate < 50)
            score -= 15;

        if (
            psychology.alerts &&
            psychology.alerts.length
        )
            score -= 10;

        if (!automation.enabled)
            score -= 5;

        res.json({

            score,

            status:

                score >= 90
                    ? "READY"

                : score >= 70
                    ? "CAUTION"

                : "RECOVERY",

            dna,

            psychology,

            automation

        });

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
