/*
==========================================================
WealthBuilder OS
Logs API
Powered by Jarvis Intelligence
==========================================================
*/

const express = require("express");
const router = express.Router();

const logger = require("../services/logger");

router.get("/", (req, res) => {

    try {

        res.json(logger.getLogs());

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
