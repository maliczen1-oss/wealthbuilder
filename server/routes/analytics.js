"use strict";

/*
==========================================================
WealthBuilder OS

Analytics Route

Version : 2.0.0
Status  : Production
Atlas Certification : Pending

Purpose
-------
Provides trading analytics and performance reporting.

Responsibilities
----------------
✓ Account Analytics
✓ Position Analytics
✓ Performance Reporting
✓ Deal History
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
Route Factory
==========================================================
*/

module.exports = function(connection) {

    /*
    ======================================================
    GET /
    ======================================================
    */

    router.get("/", async (req, res) => {

        try {

            if (!connection) {

                return sendError(

                    res,

                    503,

                    "MetaApi connection unavailable."

                );

            }

            logger.info(

                logger.SOURCES.ANALYTICS,

                "Analytics report requested."

            );

            const account =
                await connection.getAccountInformation();

            const positions =
                await connection.getPositions();

            const startTime =
                new Date(

                    Date.now() -

                    90 * 24 * 60 * 60 * 1000

                );

            const endTime =
                new Date();

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

                buildPerformanceReport(

                    deals

                );

            logger.info(

                logger.SOURCES.ANALYTICS,

                "Analytics report generated.",

                {

                    dealCount:

                        deals.length

                }

            );

            return sendSuccess(

                res,

                {

                    account,

                    positions,

                    performance,

                    history: deals

                },

                "Analytics report generated."

            );

        }

        catch (error) {

            logger.error(

                logger.SOURCES.ANALYTICS,

                "Analytics report failed.",

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
    ======================================================
    GET /health
    ======================================================
    */

    router.get("/health", (req, res) => {

        return sendSuccess(

            res,

            {

                service: "analytics",

                status: connection
                    ? "READY"
                    : "DISCONNECTED",

                version: "2.0.0"

            },

            "Analytics route healthy."

        );

    });

    /*
    ======================================================
    GET /version
    ======================================================
    */

    router.get("/version", (req, res) => {

        return sendSuccess(

            res,

            {

                version: "2.0.0"

            },

            "Analytics Route Version"

        );

    });

    return router;

};
