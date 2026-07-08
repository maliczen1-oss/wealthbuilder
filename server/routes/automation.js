"use strict";

/*
==========================================================
WealthBuilder OS

Automation Route

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides HTTP endpoints for managing the
Automation Engine.

Responsibilities
----------------
✓ Retrieve automation settings
✓ Update automation settings
✓ Health endpoint
✓ Version endpoint
✓ Structured responses
✓ Structured logging

Business logic belongs exclusively to
automationEngine.

==========================================================
*/

const express = require("express");

const router = express.Router();

const logger = require("../services/logger");
const automationEngine =
    require("../services/automationEngine");

/*
==========================================================
Response Helpers
==========================================================
*/

function sendSuccess(
    res,
    data,
    message = "Success"
) {

    return res.json({

        success: true,

        message,

        data

    });

}

function sendError(
    res,
    status,
    error
) {

    return res.status(status).json({

        success: false,

        error

    });

}

/*
==========================================================
GET /
==========================================================
*/

router.get("/", (req, res) => {

    try {

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Automation settings requested."

        );

        const settings =
            automationEngine.getSettings();

        return sendSuccess(

            res,

            settings,

            "Automation settings retrieved."

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.AUTOMATION,

            "Failed to retrieve automation settings.",

            {

                error: error.message

            }

        );

        return sendError(

            res,

            500,

            error.message

        );

    }

});

/*
==========================================================
POST /settings
==========================================================
*/

router.post("/settings", (req, res) => {

    try {

        if (

            !req.body ||

            typeof req.body !== "object"

        ) {

            return sendError(

                res,

                400,

                "Settings payload is required."

            );

        }

        logger.info(

            logger.SOURCES.AUTOMATION,

            "Automation settings update requested."

        );

        const settings =
            automationEngine.updateSettings(
                req.body
            );

        return sendSuccess(

            res,

            settings,

            "Automation settings updated."

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.AUTOMATION,

            "Automation settings update failed.",

            {

                error: error.message

            }

        );

        return sendError(

            res,

            500,

            error.message

        );

    }

});

/*
==========================================================
GET /health
==========================================================
*/

router.get("/health", (req, res) => {

    try {

        const health =

            automationEngine.getHealth
                ? automationEngine.getHealth()
                : {

                    service: "automation",

                    status: "READY"

                };

        return sendSuccess(

            res,

            health,

            "Automation service healthy."

        );

    }

    catch (error) {

        return sendError(

            res,

            500,

            error.message

        );

    }

});

/*
==========================================================
GET /version
==========================================================
*/

router.get("/version", (req, res) => {

    return sendSuccess(

        res,

        {

            version:

                automationEngine.getVersion
                    ? automationEngine.getVersion()
                    : "Unknown"

        },

        "Automation Engine Version"

    );

});

/*
==========================================================
Export
==========================================================
*/

module.exports = router;
