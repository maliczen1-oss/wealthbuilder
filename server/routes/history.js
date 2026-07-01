const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {

    try {

        const connection = req.connection;

        const startTime = new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000
        );

        const endTime = new Date();

        const deals =
            await connection.getDealsByTimeRange(
                startTime,
                endTime
            );

        res.json(deals);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

module.exports = router;
