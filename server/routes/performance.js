"use strict";

/*
==========================================================
WealthBuilder OS

Performance Route

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides trading performance reporting using the
certified Performance Service.

Responsibilities
----------------
✓ Performance Reporting
✓ MetaApi Integration
✓ Health Endpoint
✓ Version Endpoint
✓ Structured Responses
✓ Structured Logging

Business logic belongs exclusively to
performanceService.

==========================================================
*/

const express = require("express");

const router = express.Router();

const logger = require("../services/logger");

const {
    buildPerformanceReport
} = require("../services/performance");

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

        const connection = req.connection;

        if (!connection) {

            return sendError(

                res,

                503,

                "MetaApi connection unavailable."

            );

        }

        logger.info(

            logger.SOURCES.PERFORMANCE,

            "Performance report requested."

        );

        const startTime = new Date(

            Date.now() -

            90 * 24 * 60 * 60 * 1000

        );

        const endTime = new Date();

        const result =
            await connection.getDealsByTimeRange(

                startTime,

                endTime

            );

        const deals =

            Array.isArray(result)

                ? result

                : result?.deals ||

                  result?.items ||

                  result?.history ||

                  [];

        const performance =
            buildPerformanceReport(deals);

        logger.info(

            logger.SOURCES.PERFORMANCE,

            "Performance report generated.",

            {

                dealCount: deals.length,

                totalTrades:
                    performance.totalTrades,

                winRate:
                    performance.winRate,

                netProfit:
                    performance.netProfit

            }

        );

        return sendSuccess(

            res,

            {

                startTime,

                endTime,

                performance

            },

            "Performance report generated."

        );

    }

    catch (error) {

        logger.error(

            logger.SOURCES.PERFORMANCE,

            "Performance report failed.",

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

    return sendSuccess(

        res,

        {

            service: "performance",

            status:

                req.connection
                    ? "READY"
                    : "DISCONNECTED",

            version: "2.0.0"

        },

        "Performance route healthy."

    );

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

        "Performance Route Version"

    );

});

/*
==========================================================
Export
==========================================================
*/

module.exports = router;
