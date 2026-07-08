"use strict";

/*
==========================================================
WealthBuilder OS

Guardian Route

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides HTTP endpoints for the WealthBuilder
Guardian Capital Protection Layer.

Responsibilities
----------------
✓ Capital Protection Evaluation
✓ Automation Integration
✓ Health Endpoint
✓ Version Endpoint
✓ Structured Responses
✓ Structured Logging

Business logic belongs exclusively to
guardianService.

==========================================================
*/

const express = require("express");

const router = express.Router();

const logger = require("../services/logger");
const guardianService =
    require("../services/guardianService");
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

router.get("/", async (req, res) => {

    try {

        if (!req.connection) {

            return sendError(

                res,

                503,

                "MetaApi not connected."

            );

        }

        logger.info(

            logger.SOURCES.GUARDIAN,

            "Guardian evaluation requested."

        );

        const account =
            await req.connection.getAccountInformation();

        const settings =
            automationEngine.getSettings();

        const report =
            guardianService.evaluate(

                account,

                settings

            );

        logger.info(

            logger.SOURCES.GUARDIAN,

            "Guardian evaluation completed."

        );

        return sendSuccess(

            res,

            report,

            "Guardian evaluation completed."

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.GUARDIAN,

            "Guardian evaluation failed.",

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

            guardianService.getHealth
                ? guardianService.getHealth()
                : {

                    service: "guardian",

                    status: "READY"

                };

        return sendSuccess(

            res,

            health,

            "Guardian service healthy."

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

                guardianService.getVersion
                    ? guardianService.getVersion()
                    : "Unknown"

        },

        "Guardian Service Version"

    );

});

/*
==========================================================
Export
==========================================================
*/

module.exports = router;
