const express = require("express");
const router = express.Router();

const morningBrief =
    require("../services/morningBrief");

router.get("/", async (req, res) => {

    try {

        const report =
            await morningBrief.generate();

        res.json(report);

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
