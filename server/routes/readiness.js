"use strict";

/*
==========================================================
WealthBuilder OS

Readiness Route

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides consolidated trading readiness analysis
using WealthBuilder intelligence engines.

Responsibilities
----------------
✓ Trading Readiness Evaluation
✓ DNA Integration
✓ Psychology Integration
✓ Automation Integration
✓ Health Endpoint
✓ Version Endpoint
✓ Structured Responses
✓ Structured Logging

Business logic belongs exclusively to the
underlying intelligence services.

==========================================================
*/

const express = require("express");

const router = express.Router();

const logger = require("../services/logger");

const dnaEngine =
    require("../services/dnaEngine");

const psychologyEngine =
    require("../services/psychologyEngine");

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

            logger.SOURCES.READINESS,

            "Trading readiness evaluation requested."

        );

        const dna =
            dnaEngine.analyse?.() || {};

        const psychology =
            psychologyEngine.analyse?.() || {};

        const automation =
            automationEngine.getSettings?.() || {};

        let score = 100;

        if ((dna.winRate ?? 100) < 50) {

            score -= 15;

        }

        if (

            Array.isArray(psychology.alerts) &&

            psychology.alerts.length > 0

        ) {

            score -= 10;

        }

        if (automation.enabled === false) {

            score -= 5;

        }

        const readiness = {

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

        };

        logger.info(

            logger.SOURCES.READINESS,

            "Trading readiness evaluation completed.",

            {

                score,

                status: readiness.status

            }

        );

        return sendSuccess(

            res,

            readiness,

            "Trading readiness evaluated."

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.READINESS,

            "Trading readiness evaluation failed.",

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

        const health = {

            service: "readiness",

            status: "READY",

            version: "2.0.0"

        };

        return sendSuccess(

            res,

            health,

            "Readiness service healthy."

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

            version: "2.0.0"

        },

        "Readiness Route Version"

    );

});

/*
==========================================================
Export
==========================================================
*/

module.exports = router;
