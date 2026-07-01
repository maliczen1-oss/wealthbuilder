/*
==========================================================
WealthBuilder OS
Notification API
Powered by Jarvis Intelligence
==========================================================
*/

const express = require("express");

const router = express.Router();

const notificationService =
require("../services/notificationService");

/*
==========================================================
Get All Notifications
==========================================================
*/

router.get("/", (req, res) => {

    try {

        res.json(

            notificationService.getAll()

        );

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

/*
==========================================================
Clear Notifications
==========================================================
*/

router.delete("/", (req, res) => {

    try {

        notificationService.clear();

        res.json({

            success: true

        });

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
