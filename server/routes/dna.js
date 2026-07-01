const express = require("express");
const router = express.Router();

const dnaEngine = require("../services/dnaEngine");

router.get("/", (req, res) => {

    try {

        const dna = dnaEngine.analyse();

        res.json(dna);

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
