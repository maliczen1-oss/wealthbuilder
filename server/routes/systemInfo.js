/*
==========================================================
WealthBuilder OS
System Information API
==========================================================
*/

const express = require("express");
const router = express.Router();

const systemInfo =
require("../services/systemInfoService");

const api =
require("../utils/apiResponse");

router.get("/", (req, res) => {

    try {

        return res.json(

            api.success(

                systemInfo.getInfo(),

                "System information loaded successfully."

            )

        );

    }

    catch (err) {

        return res.status(500).json(

            api.failure(

                "Unable to load system information.",

                err.message

            )

        );

    }

});

module.exports = router;
