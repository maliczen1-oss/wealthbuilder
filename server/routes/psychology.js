const express = require("express");
const router = express.Router();

const psychologyEngine = require("../services/psychologyEngine");

router.get("/", (req, res) => {

    try {

        const report = psychologyEngine.analyse();

        res.json(report);

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
